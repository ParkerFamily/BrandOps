import { useEffect, useState } from "react";
import { OneSignal } from "react-native-onesignal";
import { isOneSignalConfigured } from "@/lib/onesignal/config";

export function usePushNotificationStatus(): {
  configured: boolean;
  permissionGranted: boolean | null;
  label: string;
} {
  const configured = isOneSignalConfigured();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!configured) {
      setPermissionGranted(null);
      return;
    }

    let active = true;
    void OneSignal.Notifications.getPermissionAsync()
      .then((granted) => {
        if (active) setPermissionGranted(granted);
      })
      .catch(() => {
        if (active) setPermissionGranted(null);
      });

    return () => {
      active = false;
    };
  }, [configured]);

  let label = "Not configured";
  if (configured) {
    if (permissionGranted === true) label = "Enabled";
    else if (permissionGranted === false) label = "Disabled in settings";
    else label = "Checking…";
  }

  return { configured, permissionGranted, label };
}
