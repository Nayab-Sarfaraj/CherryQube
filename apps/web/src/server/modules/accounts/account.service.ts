import { entitlementRepository } from "../entitlements/entitlement.repository";
import { removeOwnerPhotos } from "../../integrations/storage.client";
import { rm } from "node:fs/promises";
import path from "node:path";
import { localRenderConfig } from "../../lib/config";
import { accountRepository } from "./account.repository";
export async function purgeAccount(owner: string) {
  await entitlementRepository.detach(owner);
  const hashes = await accountRepository.remove(owner);
  await removeOwnerPhotos(owner);
  const root = path.resolve(localRenderConfig().root);
  await Promise.all(
    hashes
      .filter((hash) => /^[a-f0-9]{64}$/.test(hash))
      .map((hash) =>
        rm(path.join(root, "renders", hash), {
          recursive: true,
          force: true,
        }),
      ),
  );
}
