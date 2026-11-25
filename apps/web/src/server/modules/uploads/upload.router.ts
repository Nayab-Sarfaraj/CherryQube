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
  let operation = "request";
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
      ) {
        operation = "s3.start";
        log("info", "upload.s3.start", { s3Enabled: true });
        const ticket = await beginS3PhotoUpload(
          owner,
          body.contentType,
          body.size,
        );
        log("info", "upload.s3.ticket-issued", { s3Enabled: true });
        return Response.json(ticket);
      }
      if (body.action === "complete" && typeof body.key === "string") {
        operation = "s3.complete";
        log("info", "upload.s3.complete", { s3Enabled: true });
        const photo = await completeS3PhotoUpload(owner, body.key);
        log("info", "upload.s3.completed", { s3Enabled: true });
        return Response.json(photo, {
          status: 201,
        });
      }
      throw new ValidationError("Invalid upload request");
    }
    operation = "local-form";
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
      operation,
      s3Enabled: s3StorageEnabled,
    });
    return errorResponse(error);
  }
}
