import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3UploadsConfig } from "../lib/config";
import { assertUploadKey } from "./storage-key";

const signedUrlLifetimeSeconds = 15 * 60;

type S3Command =
  | CopyObjectCommand
  | DeleteObjectCommand
  | GetObjectCommand
  | HeadObjectCommand
  | ListObjectsV2Command
  | PutObjectCommand;

export interface S3StorageDependencies {
  send(command: S3Command): Promise<unknown>;
  sign(command: GetObjectCommand | PutObjectCommand): Promise<string>;
}

export interface S3StorageClient {
  putMedia(key: string, bytes: Buffer, contentType?: string): Promise<void>;
  readMedia(key: string): Promise<Buffer>;
  copyMedia(sourceKey: string, destinationKey: string): Promise<void>;
  removeMedia(key: string): Promise<void>;
  hasMedia(key: string): Promise<boolean>;
  mediaSize(key: string): Promise<number>;
  presignUpload(key: string, contentType: string): Promise<string>;
  signedReadUrl(key: string): Promise<string>;
  listMedia(
    prefix: "photos/" | "temp/",
  ): Promise<{ key: string; lastModified: Date }[]>;
}

function copySource(bucket: string, key: string) {
  return `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

export function createS3StorageClient(
  config: S3UploadsConfig,
  dependencies?: S3StorageDependencies,
): S3StorageClient {
  const client = new S3Client({ region: config.region });
  const deps =
    dependencies ??
    ({
      send: (command: S3Command) => client.send(command as never),
      sign: (command: GetObjectCommand | PutObjectCommand) =>
        getSignedUrl(client, command, {
          expiresIn: signedUrlLifetimeSeconds,
        }),
    } satisfies S3StorageDependencies);

  return {
    async putMedia(key, bytes, contentType = "application/octet-stream") {
      await deps.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
          Body: bytes,
          ContentType: contentType,
        }),
      );
    },

    async readMedia(key) {
      const result = (await deps.send(
        new GetObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
        }),
      )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } };
      if (!result.Body) throw new Error("S3 object has no body");
      return Buffer.from(await result.Body.transformToByteArray());
    },

    async copyMedia(sourceKey, destinationKey) {
      await deps.send(
        new CopyObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(destinationKey),
          CopySource: copySource(config.bucketName, assertUploadKey(sourceKey)),
        }),
      );
    },

    async removeMedia(key) {
      await deps.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
        }),
      );
    },

    async hasMedia(key) {
      try {
        await deps.send(
          new HeadObjectCommand({
            Bucket: config.bucketName,
            Key: assertUploadKey(key),
          }),
        );
        return true;
      } catch (error) {
        if ((error as { name?: string }).name === "NotFound") return false;
        throw error;
      }
    },

    async mediaSize(key) {
      const result = (await deps.send(
        new HeadObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
        }),
      )) as { ContentLength?: number };
      const length = result.ContentLength;
      if (typeof length !== "number" || !Number.isSafeInteger(length))
        throw new Error("S3 object has no content length");
      return length;
    },

    presignUpload(key, contentType) {
      return deps.sign(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
          ContentType: contentType,
        }),
      );
    },

    signedReadUrl(key) {
      return deps.sign(
        new GetObjectCommand({
          Bucket: config.bucketName,
          Key: assertUploadKey(key),
        }),
      );
    },

    async listMedia(prefix) {
      const objects: { key: string; lastModified: Date }[] = [];
      let continuationToken: string | undefined;
      do {
        const page = (await deps.send(
          new ListObjectsV2Command({
            Bucket: config.bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        )) as {
          Contents?: { Key?: string; LastModified?: Date }[];
          IsTruncated?: boolean;
          NextContinuationToken?: string;
        };
        for (const item of page.Contents ?? []) {
          if (item.Key && item.LastModified) {
            try {
              objects.push({
                key: assertUploadKey(item.Key),
                lastModified: item.LastModified,
              });
            } catch {
              // Ignore unexpected keys that do not belong to this adapter.
            }
          }
        }
        continuationToken = page.IsTruncated
          ? page.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return objects;
    },
  };
}
