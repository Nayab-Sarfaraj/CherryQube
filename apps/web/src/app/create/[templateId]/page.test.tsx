import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/lib/errors";
import { requireUser } from "@/server/middleware/auth";
import { invitationService } from "@/server/modules/invitations/invitation.service";
import { MobileAuthRequired } from "@/features/editor/mobile-auth-required";
import CreatePage from "./page";

vi.mock("@greetings/remotion/templates", () => ({
  getTemplate: () => ({ id: "harvest-card" }),
}));
vi.mock("@greetings/remotion/themes", () => ({ getTheme: vi.fn() }));
vi.mock("@/lib/site-config", () => ({
  siteConfig: { getBaseUrl: () => "https://example.test" },
}));
vi.mock("@/server/middleware/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/server/modules/invitations/invitation.service", () => ({
  invitationService: { get: vi.fn() },
}));
vi.mock("@/server/modules/invitations/invitation.mapper", () => ({
  invitationDto: (invitation: unknown) => invitation,
}));
vi.mock("@/features/editor/editor", () => ({ default: () => null }));

const params = Promise.resolve({ templateId: "harvest-card" });

describe("embedded saved-draft authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks the native app to restore a missing web session before loading a draft", async () => {
    vi.mocked(requireUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Sign in to continue", 401),
    );
    const page = await CreatePage({
      params,
      searchParams: Promise.resolve({ draft: "draft-1", embed: "1" }),
    });
    expect(page.type).toBe(MobileAuthRequired);
    expect(invitationService.get).not.toHaveBeenCalled();
  });

  it("loads the saved draft directly when the web session is valid", async () => {
    vi.mocked(requireUser).mockResolvedValue("user-1");
    vi.mocked(invitationService.get).mockResolvedValue({
      id: "draft-1",
      templateId: "harvest-card",
    } as Awaited<ReturnType<typeof invitationService.get>>);
    const page = await CreatePage({
      params,
      searchParams: Promise.resolve({ draft: "draft-1", embed: "1" }),
    });
    expect(page.props.initial).toMatchObject({ id: "draft-1" });
    expect(invitationService.get).toHaveBeenCalledWith("user-1", "draft-1");
  });

  it("still rejects an unauthenticated draft outside the app WebView", async () => {
    vi.mocked(requireUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Sign in to continue", 401),
    );
    await expect(
      CreatePage({
        params,
        searchParams: Promise.resolve({ draft: "draft-1" }),
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("asks the native app to sync a mismatched account before retrying an unavailable embedded draft", async () => {
    vi.mocked(requireUser).mockResolvedValue("user-b");
    vi.mocked(invitationService.get).mockRejectedValue(
      new AppError("NOT_FOUND", "Not found", 404),
    );
    const page = await CreatePage({
      params,
      searchParams: Promise.resolve({ draft: "draft-1", embed: "1" }),
    });
    expect(page.type).toBe(MobileAuthRequired);
    expect(page.props.message).toContain("may have been deleted");
    expect(invitationService.get).toHaveBeenCalledWith("user-b", "draft-1");
  });

  it("continues to reject a nonexistent draft outside the app WebView", async () => {
    vi.mocked(requireUser).mockResolvedValue("user-b");
    vi.mocked(invitationService.get).mockRejectedValue(
      new AppError("NOT_FOUND", "Not found", 404),
    );
    await expect(
      CreatePage({
        params,
        searchParams: Promise.resolve({ draft: "draft-1" }),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
