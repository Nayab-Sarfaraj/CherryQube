import { readUploadForm } from "../../lib/read-upload";
import { requireUser } from "../../middleware/auth";
import { errorResponse, ValidationError } from "../../lib/errors";
import { s3StorageEnabled } from "../../integrations/storage.client";
import { log } from "../../lib/logger";
import {
  beginS3PhotoUpload,
  completeS3PhotoUpload,
  uploadPhoto,
} from "./upload.service";
export async function create(request: Request) {
  try {
    const owner = await requireUser();
    if (
      s3StorageEnabled &&
      request.headers.get("content-type")?.includes("application/json")
    ) {
      const body = (await request.json()) as {
        action?: string;
        contentType?: string;
        size?: number;
        key?: string;
      };
      if (
        body.action === "start" &&
        typeof body.contentType === "string" &&
        typeof body.size === "number"
      )
        return Response.json(
          await beginS3PhotoUpload(owner, body.contentType, body.size),
        );
      if (body.action === "complete" && typeof body.key === "string")
        return Response.json(await completeS3PhotoUpload(owner, body.key), {
          status: 201,
        });
      throw new ValidationError("Invalid upload request");
    }
    if (Number(request.headers.get("content-length") ?? 0) > 9 * 1024 * 1024)
      throw new ValidationError("Photo is too large");
    const file = (await readUploadForm(request)).get("photo");
    if (!(file instanceof File)) throw new ValidationError("Choose a photo");
    return Response.json(
      await uploadPhoto(
        owner,
        file,
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      ),
      { status: 201 },
    );
  } catch (error) {
    log("error", "upload.failed", {
      error:
        error instanceof Error ? error.message.slice(0, 500) : "unknown",
      s3Enabled: s3StorageEnabled,
    });
    return errorResponse(error);
  }
}
