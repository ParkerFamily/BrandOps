export type NotificationScreen =
  | "approval"
  | "review"
  | "revision"
  | "submission"
  | "payout"
  | "campaign"
  | "campaign_invite"
  | "messages"
  | "home";

export type NotificationType =
  | "submission_received"
  | "submission_sent"
  | "submission_approved"
  | "submission_revision"
  | "submission_rejected"
  | "payout_sent"
  | "campaign_invite";

export type BrandOpsNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  screen: NotificationScreen;
  entityType: "submission" | "campaign" | "payment";
  entityId: string;
  campaignDocId?: string | null;
  campaignTitle?: string | null;
  read: boolean;
  createdAt: Date;
};

export type NotificationWriteInput = {
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  screen: NotificationScreen;
  entityType: "submission" | "campaign" | "payment";
  entityId: string;
  campaignDocId?: string | null;
  campaignTitle?: string | null;
};

export type PushPayload = {
  screen: NotificationScreen;
  entityType: "submission" | "campaign" | "payment";
  entityId: string;
  campaignDocId?: string;
  title?: string;
  body?: string;
};
