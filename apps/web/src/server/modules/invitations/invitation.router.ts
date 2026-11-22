import { revalidatePath } from "next/cache";
import { requireUser } from "../../middleware/auth";
import { errorResponse } from "../../lib/errors";
import { validate } from "../../lib/validation";
import { invitationInput } from "./invitation.schema";
import { invitationService } from "./invitation.service";
import { invitationDto } from "./invitation.mapper";
import { renderRepository } from "../renders/render.repository";
type Context = { params: Promise<{ id: string }> };
function listRequest(url: string) {
  const params = new URL(url).searchParams;
  const limit = Number(params.get("limit") ?? "50");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Invalid invitation list limit");
  const cursor = params.get("cursor") ?? undefined;
  if (cursor && !/^[a-f0-9]{24}$/i.test(cursor))
    throw new Error("Invalid invitation list cursor");
  return { limit, cursor };
}

async function withRenders(owner: string, items: Record<string, unknown>[]) {
  const ids = items
    .flatMap((item) => [item.pendingRenderId, item.publishedRenderId])
    .filter((id): id is string => typeof id === "string");
  const renders = await renderRepository.getMany(owner, ids);
  const byId = new Map(renders.map((render) => [String(render._id), render]));
  return items.map((item) => {
    const pending = item.pendingRenderId
      ? (byId.get(String(item.pendingRenderId)) ?? null)
      : null;
    const published = item.publishedRenderId
      ? (byId.get(String(item.publishedRenderId)) ?? null)
      : null;
    return invitationDto(item, pending, published);
  });
}

export async function list(request: Request) {
  try {
    const owner = await requireUser();
    const { limit, cursor } = listRequest(request.url);
    const page = await invitationService.list(owner, limit, cursor);
    return Response.json({
      ...page,
      items: await withRenders(owner, page.items),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function create(request: Request) {
  try {
    const owner = await requireUser();
    const input = validate(invitationInput, await request.json());
    return Response.json(
      invitationDto(await invitationService.create(owner, input)),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function get(_request: Request, context: Context) {
  try {
    const owner = await requireUser();
    const item = await invitationService.get(owner, (await context.params).id);
    return Response.json((await withRenders(owner, [item]))[0]);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function update(request: Request, context: Context) {
  try {
    const owner = await requireUser();
    return Response.json(
      invitationDto(
        await invitationService.update(
          owner,
          (await context.params).id,
          validate(invitationInput, await request.json()),
        ),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function remove(_request: Request, context: Context) {
  try {
    const deleted = await invitationService.delete(
      await requireUser(),
      (await context.params).id,
    );
    if (deleted.shareId) revalidatePath(`/c/${String(deleted.shareId)}`);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
