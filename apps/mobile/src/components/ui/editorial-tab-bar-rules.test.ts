import { describe, expect, it, vi } from "vitest";
import { triggerTabPress } from "./editorial-tab-bar-rules";

describe("triggerTabPress", () => {
  it("navigates to route.name when tab is not focused", () => {
    const navigateMock = vi.fn();
    const emitMock = vi.fn().mockReturnValue({ defaultPrevented: false });

    const navigated = triggerTabPress({
      route: { key: "home-key", name: "index" },
      focused: false,
      navigation: { navigate: navigateMock, emit: emitMock },
    });

    expect(emitMock).toHaveBeenCalledWith({
      type: "tabPress",
      target: "home-key",
      canPreventDefault: true,
    });
    expect(navigateMock).toHaveBeenCalledWith("index");
    expect(navigated).toBe(true);
  });

  it("does not navigate when tab is already focused", () => {
    const navigateMock = vi.fn();
    const emitMock = vi.fn().mockReturnValue({ defaultPrevented: false });

    const navigated = triggerTabPress({
      route: { key: "account-key", name: "account" },
      focused: true,
      navigation: { navigate: navigateMock, emit: emitMock },
    });

    expect(emitMock).toHaveBeenCalledWith({
      type: "tabPress",
      target: "account-key",
      canPreventDefault: true,
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(navigated).toBe(false);
  });

  it("does not navigate when event.defaultPrevented is true", () => {
    const navigateMock = vi.fn();
    const emitMock = vi.fn().mockReturnValue({ defaultPrevented: true });

    const navigated = triggerTabPress({
      route: { key: "creations-key", name: "creations" },
      focused: false,
      navigation: { navigate: navigateMock, emit: emitMock },
    });

    expect(emitMock).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(navigated).toBe(false);
  });

  it("falls back to navigateToTab with route.key if navigation is omitted", () => {
    const navigateToTabMock = vi.fn();

    const navigated = triggerTabPress({
      route: { key: "home-key", name: "index" },
      focused: false,
      navigateToTab: navigateToTabMock,
    });

    expect(navigateToTabMock).toHaveBeenCalledWith("home-key");
    expect(navigated).toBe(true);
  });

  it("does not throw if neither navigation nor navigateToTab is provided", () => {
    expect(() => {
      const navigated = triggerTabPress({
        route: { key: "home-key", name: "index" },
        focused: false,
      });
      expect(navigated).toBe(false);
    }).not.toThrow();
  });
});
