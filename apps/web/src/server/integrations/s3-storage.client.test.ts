import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { createS3StorageClient } from "./s3-storage.client";

describe("S3 storage client", () => {
  it("keeps uploads private while supporting upload, read, copy, and deletion", async () => {
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof GetObjectCommand)
        return {
          Body: { transformToByteArray: async () => new Uint8Array([1, 2]) },
        };
      if (command instanceof HeadObjectCommand) return { ContentLength: 2 };
      return {};
    });
    const sign = vi.fn(async (_command: unknown) => {
      void _command;
      return "https://signed.example/object";
    });
    const storage = createS3StorageClient(
      { bucketName: "cherryqube-uploads", region: "us-east-1" },
      { send, sign },
    );
    const temporaryKey =
      "temp/abcdef12/11111111-1111-1111-1111-111111111111.jpg";
    const photoKey = "photos/abcdef12/11111111-1111-1111-1111-111111111111.jpg";

    await storage.putMedia(temporaryKey, Buffer.from("photo"), "image/jpeg");
    await storage.copyMedia(temporaryKey, photoKey);
    await storage.removeMedia(temporaryKey);
    await expect(storage.readMedia(photoKey)).resolves.toEqual(
      Buffer.from([1, 2]),
    );
    await expect(
      storage.presignUpload(temporaryKey, "image/jpeg"),
    ).resolves.toBe("https://signed.example/object");
    await expect(storage.signedReadUrl(photoKey)).resolves.toBe(
      "https://signed.example/object",
    );
    await expect(storage.mediaSize(photoKey)).resolves.toBe(2);

    const commands = send.mock.calls.map(([command]) => command);
    expect(commands[0]).toBeInstanceOf(PutObjectCommand);
    expect((commands[0] as PutObjectCommand).input).toMatchObject({
      Bucket: "cherryqube-uploads",
      Key: temporaryKey,
      ContentType: "image/jpeg",
    });
    expect(commands[1]).toBeInstanceOf(CopyObjectCommand);
    expect((commands[1] as CopyObjectCommand).input.CopySource).toBe(
      `/cherryqube-uploads/${temporaryKey}`,
    );
    expect(commands[2]).toBeInstanceOf(DeleteObjectCommand);
    expect(commands[3]).toBeInstanceOf(GetObjectCommand);
    expect(sign.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect(sign.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectCommand);
  });

  it("returns false only when an object is absent", async () => {
    const storage = createS3StorageClient(
      { bucketName: "cherryqube-uploads", region: "us-east-1" },
      {
        send: async () => {
          const error = new Error("not found");
          error.name = "NotFound";
          throw error;
        },
        sign: async () => "unused",
      },
    );
    await expect(
      storage.hasMedia(
        "photos/abcdef12/11111111-1111-1111-1111-111111111111.jpg",
      ),
    ).resolves.toBe(false);
  });

  it("rejects invalid keys before issuing an AWS request", async () => {
    const send = vi.fn();
    const storage = createS3StorageClient(
      { bucketName: "cherryqube-uploads", region: "us-east-1" },
      { send, sign: async () => "unused" },
    );
    await expect(
      storage.removeMedia("photos/../../secret.jpg"),
    ).rejects.toThrow("Invalid media key");
    await expect(
      storage.removeMedia(
        "renders/abcdef12/11111111-1111-1111-1111-111111111111.mp4",
      ),
    ).rejects.toThrow("Invalid upload key");
    expect(send).not.toHaveBeenCalled();
  });
});
