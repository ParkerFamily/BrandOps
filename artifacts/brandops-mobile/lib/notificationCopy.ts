import type { BrandOpsNotification } from "@workspace/notifications";

function viewerNameCandidates(displayName?: string | null, email?: string | null): string[] {
  const names = new Set<string>();
  if (displayName?.trim()) names.add(displayName.trim());
  const local = email?.split("@")[0]?.trim();
  if (local) {
    names.add(local);
    names.add(local.replace(/[._]/g, " "));
  }
  return [...names];
}

/** Fix legacy brand-facing copy when the viewer is the submitting creator. */
export function personalizeNotificationForViewer(
  notification: BrandOpsNotification,
  viewer: { displayName?: string | null; email?: string | null }
): Pick<BrandOpsNotification, "title" | "body"> {
  if (notification.type === "submission_sent") {
    return { title: notification.title, body: notification.body };
  }

  if (notification.type !== "submission_received") {
    return { title: notification.title, body: notification.body };
  }

  for (const name of viewerNameCandidates(viewer.displayName, viewer.email)) {
    if (!name) continue;
    if (notification.body.includes(`${name} submitted`)) {
      return {
        title: "Submission sent",
        body: notification.body.replace(`${name} submitted`, "You submitted"),
      };
    }
  }

  return { title: notification.title, body: notification.body };
}
