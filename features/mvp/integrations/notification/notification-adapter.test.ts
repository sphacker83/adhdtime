import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canShowNotification,
  getNotificationCapability,
  requestNotificationPermission
} from "./notification-adapter";

interface MockNotificationApi {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

function stubWindow(params: {
  secureContext: boolean;
  notification?: MockNotificationApi;
}) {
  const windowStub = {
    isSecureContext: params.secureContext,
    ...(params.notification ? { Notification: params.notification } : {})
  } as unknown as Window;

  vi.stubGlobal("window", windowStub);
}

describe("notification-adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns unsupported capability when Notification API is unavailable", () => {
    const capability = getNotificationCapability();

    expect(capability).toEqual({
      supported: false,
      secureContext: false,
      permission: "unsupported",
      canRequestPermission: false
    });
  });

  it("derives permission capability in secure context", () => {
    stubWindow({
      secureContext: true,
      notification: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted")
      }
    });

    const capability = getNotificationCapability();

    expect(capability).toEqual({
      supported: true,
      secureContext: true,
      permission: "default",
      canRequestPermission: true
    });
  });

  it("requests permission only when supported and secure", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    stubWindow({
      secureContext: true,
      notification: {
        permission: "default",
        requestPermission
      }
    });

    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("returns unsupported when permission request is not available", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    stubWindow({
      secureContext: false,
      notification: {
        permission: "default",
        requestPermission
      }
    });

    await expect(requestNotificationPermission()).resolves.toBe("unsupported");
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("canShowNotification requires granted permission in secure context", () => {
    expect(
      canShowNotification({
        supported: true,
        secureContext: true,
        permission: "granted",
        canRequestPermission: false
      })
    ).toBe(true);

    expect(
      canShowNotification({
        supported: true,
        secureContext: true,
        permission: "default",
        canRequestPermission: true
      })
    ).toBe(false);

    expect(
      canShowNotification({
        supported: true,
        secureContext: false,
        permission: "granted",
        canRequestPermission: false
      })
    ).toBe(false);
  });
});
