import { access } from "node:fs/promises";
import { s3UploadsConfig } from "../lib/config";
import { createS3StorageClient } from "./s3-storage.client";
import {
  mediaPath as localMediaPath,
  putMedia as putLocalMedia,
  readMedia as readLocalMedia,
  removeMedia as removeLocalMedia,
} from "./local-storage.client";
import { assertMediaKey, ownerPrefix } from "./storage-key";

const s3Config = s3UploadsConfig();
const s3 = s3Config ? createS3StorageClient(s3Config) : null;

export { ownerPrefix };
export const s3StorageEnabled = Boolean(s3);

export function mediaUrl(key: string) {
  assertMediaKey(key);
  const appUrl = new URL(process.env.APP_BASE_URL ?? "http://localhost:3000")
    .toString()
    .replace(/\/$/, "");
  return `${appUrl}/api/media/${key}`;
}

export async function putMedia(
  key: string,
  bytes: Buffer,
  contentType = "application/octet-stream",
) {
  assertMediaKey(key);
  if (s3) await s3.putMedia(key, bytes, contentType);
  else await putLocalMedia(key, bytes);
  return mediaUrl(key);
}

export async function readMedia(key: string) {
  assertMediaKey(key);
  if (key.startsWith("renders/")) return readLocalMedia(key);
  return s3 ? s3.readMedia(key) : readLocalMedia(key);
}

export async function copyMedia(sourceKey: string, destinationKey: string) {
  assertMediaKey(sourceKey);
  assertMediaKey(destinationKey);
  if (s3) return s3.copyMedia(sourceKey, destinationKey);
  const bytes = await readLocalMedia(sourceKey);
  await putLocalMedia(destinationKey, bytes);
}

export async function removeMedia(key: string) {
  assertMediaKey(key);
  if (s3) return s3.removeMedia(key);
  return removeLocalMedia(key);
}

export async function presignUpload(key: string, contentType: string) {
  if (!s3) throw new Error("S3 uploads are not configured");
  return s3.presignUpload(assertMediaKey(key), contentType);
}

export async function uploadedMediaSize(key: string) {
  assertMediaKey(key);
  if (s3) return s3.mediaSize(key);
  const { stat } = await import("node:fs/promises");
  return (await stat(localMediaPath(key))).size;
}

export async function signedReadUrl(key: string) {
  if (!s3) return null;
  return s3.signedReadUrl(assertMediaKey(key));
}

export async function listUploadedMedia(prefix: "photos/" | "temp/") {
  return s3 ? s3.listMedia(prefix) : [];
}

export async function removeOwnerPhotos(owner: string) {
  const prefix = `photos/${ownerPrefix(owner)}/`;
  if (s3) {
    // Account photo keys are only returned for known uploaded objects by the
    // application; S3 listing is deliberately scoped to this owner's prefix.
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const config = s3UploadsConfig();
    if (!config) return;
    const client = new (await import("@aws-sdk/client-s3")).S3Client({
      region: config.region,
    });
    let continuationToken: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      await Promise.all(
        (page.Contents ?? [])
          .map((item) => item.Key)
          .filter((key): key is string => Boolean(key))
          .map((key) => s3.removeMedia(key)),
      );
      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);
    return;
  }
  const { rm } = await import("node:fs/promises");
  const { localRenderConfig } = await import("../lib/config");
  const path = await import("node:path");
  await rm(path.join(path.resolve(localRenderConfig().root), prefix), {
    recursive: true,
    force: true,
  });
}

export async function assertOwnedPhoto(url: string, owner: string) {
  const parsed = new URL(url);
  const expectedKeyPrefix = `photos/${ownerPrefix(owner)}/`;
  const key = parsed.pathname.slice("/api/media/".length);
  if (
    parsed.origin !==
      new URL(mediaUrl("photos/0/00000000-0000-0000-0000-000000000000.jpg"))
        .origin ||
    !key.startsWith(expectedKeyPrefix) ||
    !/^[a-f0-9-]+\.jpg$/.test(key.slice(expectedKeyPrefix.length))
  )
    throw new Error("Choose a photo uploaded by this account");
  if (s3) {
    if (!(await s3.hasMedia(key)))
      throw new Error("Choose a photo uploaded by this account");
  } else {
    await access(localMediaPath(key));
  }
}
