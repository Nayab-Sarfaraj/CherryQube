import { createHash } from "node:crypto";

const mediaKey =
  /^(temp|photos|renders)\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|mp4)$/;

export function assertMediaKey(key: string) {
  if (!mediaKey.test(key)) throw new Error("Invalid media key");
  return key;
}

export function assertUploadKey(key: string) {
  assertMediaKey(key);
  if (!key.startsWith("temp/") && !key.startsWith("photos/"))
    throw new Error("Invalid upload key");
  return key;
}

export function ownerPrefix(owner: string) {
  return createHash("sha256").update(owner).digest("hex");
}
