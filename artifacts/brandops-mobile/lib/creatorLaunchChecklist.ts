import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

export type ChecklistItemId = "photo" | "payout" | "submission";

export type ChecklistItem = {
  id: ChecklistItemId;
  label: string;
  done: boolean;
  hint: string;
};

export function buildCreatorLaunchChecklist(input: {
  photoUrl?: string | null;
  payoutSetup: CreatorPayoutSetup | null;
  submissions: FirestoreSubmission[] | undefined;
}): { items: ChecklistItem[]; completed: number; total: number; allDone: boolean } {
  const hasPhoto = Boolean(input.photoUrl?.trim());
  const hasPayout = Boolean(input.payoutSetup?.isFullySetUp);
  const hasSubmission = (input.submissions?.length ?? 0) > 0;

  const items: ChecklistItem[] = [
    {
      id: "photo",
      label: "Upload profile photo",
      done: hasPhoto,
      hint: "Add a photo in Profile so brands recognize you.",
    },
    {
      id: "payout",
      label: "Add payout method",
      done: hasPayout,
      hint: "Optional — add bank details to receive pay for approved work.",
    },
    {
      id: "submission",
      label: "Submit first campaign",
      done: hasSubmission,
      hint: "Browse open campaigns and upload your first UGC.",
    },
  ];

  const completed = items.filter((i) => i.done).length;
  return { items, completed, total: items.length, allDone: completed === items.length };
}
