import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { localRenderConfig } from "../../lib/config";
import { mediaPath } from "../../integrations/local-storage.client";
import {
  mediaUrl,
  listUploadedMedia,
  removeMedia,
  s3StorageEnabled,
} from "../../integrations/storage.client";
import { photoIsReferenced } from "./upload.repository";
export async function cleanOrphanPhotos() {
  const cutoff = Date.now() - 7 * 86400000;
  if (s3StorageEnabled) {
    for (const object of await listUploadedMedia("photos/")) {
      if (
        object.lastModified.getTime() < cutoff &&
        !(await photoIsReferenced(mediaUrl(object.key)))
      )
        await removeMedia(object.key);
    }
    for (const object of await listUploadedMedia("temp/")) {
      if (object.lastModified.getTime() < cutoff) await removeMedia(object.key);
    }
    return;
  }
  const root = path.join(path.resolve(localRenderConfig().root), "photos");
  let owners: string[];
  try {
    owners = await readdir(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const owner of owners) {
    if (!/^[a-f0-9]{64}$/.test(owner)) continue;
    for (const file of await readdir(path.join(root, owner))) {
      if (!/^[a-f0-9-]+\.jpg$/.test(file)) continue;
      const key = `photos/${owner}/${file}`;
      const meta = await stat(mediaPath(key));
      if (meta.mtimeMs < cutoff && !(await photoIsReferenced(mediaUrl(key))))
        await removeMedia(key);
    }
  }
}
