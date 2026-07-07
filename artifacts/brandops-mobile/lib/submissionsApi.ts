import { updateSubmission } from "@workspace/api-client-react";
import { isApiConfigured } from "@/lib/apiClient";
import { updateFirestoreSubmissionStatus } from "@/lib/submissionsFirestore";

export async function updateSubmissionStatus(
  submissionId: number,
  status: "approved" | "rejected" | "revision_requested",
  notes?: string,
  firestoreDocId?: string
): Promise<boolean> {
  if (firestoreDocId) {
    try {
      await updateFirestoreSubmissionStatus(firestoreDocId, status, notes);
      return true;
    } catch {
      return false;
    }
  }

  if (!isApiConfigured()) return false;

  try {
    await updateSubmission(submissionId, { status, notes });
    return true;
  } catch {
    return false;
  }
}
