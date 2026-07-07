import { readOnboardingAnswers } from "@/lib/onboardingStorage";
import { provisioningSteps, type OnboardingProfile } from "@/lib/onboardingStrategy";
import { syncUserProfileToFirestore } from "@/lib/userProfile";
import type { UserRole } from "@/lib/types";

type ProvisionInput = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  role: UserRole;
  onStep?: (label: string, index: number) => void;
};

export async function provisionWorkspace(input: ProvisionInput): Promise<void> {
  const saved = await readOnboardingAnswers();
  const profile = saved?.profile as OnboardingProfile | undefined;
  const steps = profile ? provisioningSteps(profile) : ["Creating workspace…", "Saving your profile…"];

  for (let i = 0; i < steps.length; i++) {
    input.onStep?.(steps[i]!, i);
    await new Promise((r) => setTimeout(r, 650));
  }

  await syncUserProfileToFirestore({
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
  });
}
