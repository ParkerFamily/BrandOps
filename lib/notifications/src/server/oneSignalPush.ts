import type { PushPayload } from "../types";

export type OneSignalPushInput = {
  recipientUid: string;
  subscriptionIds: string[];
  heading: string;
  message: string;
  data: PushPayload;
};

export type OneSignalPushResult = {
  sent: boolean;
  recipients: number;
  error?: string;
};

function getOneSignalConfig(): { appId: string; restApiKey: string } | null {
  const appId = process.env.ONESIGNAL_APP_ID?.trim();
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId || !restApiKey) return null;
  return { appId, restApiKey };
}

/** OneSignal user-model API — subscription id first, then external_id alias. */
export async function sendOneSignalPush(input: OneSignalPushInput): Promise<OneSignalPushResult> {
  const config = getOneSignalConfig();
  if (!config) {
    return { sent: false, recipients: 0, error: "OneSignal not configured" };
  }

  const body: Record<string, unknown> = {
    app_id: config.appId,
    target_channel: "push",
    headings: { en: input.heading },
    contents: { en: input.message },
    data: input.data,
    ios_badgeType: "Increase",
    ios_badgeCount: 1,
  };

  if (input.subscriptionIds.length > 0) {
    body.include_subscription_ids = input.subscriptionIds;
  } else {
    body.include_aliases = { external_id: [input.recipientUid] };
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${config.restApiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    return { sent: false, recipients: 0, error: text.slice(0, 500) };
  }

  try {
    const json = JSON.parse(text) as { recipients?: number; id?: string };
    const recipients = json.recipients ?? 0;
    return {
      sent: recipients > 0 || Boolean(json.id),
      recipients,
      error: recipients === 0 ? "OneSignal accepted but delivered to 0 devices" : undefined,
    };
  } catch {
    return { sent: true, recipients: 0 };
  }
}
