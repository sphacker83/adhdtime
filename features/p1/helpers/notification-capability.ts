export type NotificationPermissionState = NotificationPermission | "unsupported";

export interface NotificationCapability {
  supported: boolean;
  secureContext: boolean;
  permission: NotificationPermissionState;
  canRequestPermission: boolean;
}

function hasNotificationApi(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationCapability(): NotificationCapability {
  if (!hasNotificationApi()) {
    return {
      supported: false,
      secureContext: false,
      permission: "unsupported",
      canRequestPermission: false
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const permission = window.Notification.permission;

  return {
    supported: true,
    secureContext,
    permission,
    canRequestPermission: secureContext && permission === "default"
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const capability = getNotificationCapability();

  if (!capability.supported || !capability.secureContext) {
    return "unsupported";
  }

  return window.Notification.requestPermission();
}

export function canShowNotification(capability = getNotificationCapability()): boolean {
  return capability.supported && capability.secureContext && capability.permission === "granted";
}
