import { randomUUID, createHash } from "node:crypto";
import sharp from "sharp";
import {
  copyMedia,
  mediaUrl,
  ownerPrefix,
  putMedia,
  presignUpload,
  readMedia,
  removeMedia,
  uploadedMediaSize,
} from "../../integrations/storage.client";
import { ValidationError } from "../../lib/errors";
import { rateLimit } from "../../lib/rate-limit";
async function validateUpload(
  owner: string,
  contentType: string,
  size: number,
  ip?: string,
) {
  await rateLimit(`upload:${owner}`, 30);
  if (ip)
    await rateLimit(
      `upload-ip:${createHash("sha256").update(ip).digest("hex")}`,
      90,
    );
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(contentType) ||
    size > 8 * 1024 * 1024
  )
    throw new ValidationError(
      "Choose a JPEG, PNG, or WebP photo smaller than 8 MB",
    );
}

async function processPhoto(owner: string, sourceBytes: Buffer) {
  let bytes: Buffer;
  try {
    const source = sharp(sourceBytes, {
      limitInputPixels: 40000000,
    });
    const metadata = await source.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
      throw new Error("Unsupported photo");
    bytes = await source
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ValidationError("This photo could not be opened");
  }
  const id = randomUUID();
  const prefix = ownerPrefix(owner);
  const temporaryKey = `temp/${prefix}/${id}.jpg`;
  const photoKey = `photos/${prefix}/${id}.jpg`;
  await putMedia(temporaryKey, bytes, "image/jpeg");
  try {
    await copyMedia(temporaryKey, photoKey);
  } finally {
    await removeMedia(temporaryKey);
  }
  return { url: mediaUrl(photoKey) };
}

export async function uploadPhoto(owner: string, file: File, ip?: string) {
  await validateUpload(owner, file.type, file.size, ip);
  return processPhoto(owner, Buffer.from(await file.arrayBuffer()));
}

export async function beginS3PhotoUpload(
  owner: string,
  contentType: string,
  size: number,
  ip?: string,
) {
  await validateUpload(owner, contentType, size, ip);
  const key = `temp/${ownerPrefix(owner)}/${randomUUID()}.jpg`;
  return { key, uploadUrl: await presignUpload(key, contentType) };
}

export async function completeS3PhotoUpload(owner: string, key: string) {
  const prefix = `temp/${ownerPrefix(owner)}/`;
  if (
    !key.startsWith(prefix) ||
    !/^[a-f0-9-]+\.jpg$/.test(key.slice(prefix.length))
  )
    throw new ValidationError("Invalid upload");
  try {
    if ((await uploadedMediaSize(key)) > 8 * 1024 * 1024)
      throw new ValidationError("Photo is too large");
    const bytes = await readMedia(key);
    return await processPhoto(owner, bytes);
  } finally {
    await removeMedia(key);
  }
}
