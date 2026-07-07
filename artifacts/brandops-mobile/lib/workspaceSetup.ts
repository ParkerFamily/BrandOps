import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hasCompletedCinematicOnboarding,
  readOnboardingAnswers,
  type OnboardingAnswers,
} from "@/lib/onboardingStorage";

export type WorkspaceKind = "brand" | "creator";

export const WORKSPACES_SETUP_KEY = "brandops:workspacesSetup:v1";
export const PENDING_WORKSPACE_SWITCH_KEY = "brandops:pendingWorkspaceSwitch:v1";

export type WorkspacesSetupState = {
  brand: boolean;
  creator: boolean;
  primary: WorkspaceKind | null;
};

const EMPTY_SETUP: WorkspacesSetupState = {
  brand: false,
  creator: false,
  primary: null,
};

export async function readWorkspacesSetup(): Promise<WorkspacesSetupState> {
  const raw = await AsyncStorage.getItem(WORKSPACES_SETUP_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<WorkspacesSetupState>;
      let state: WorkspacesSetupState = {
        brand: Boolean(parsed.brand),
        creator: Boolean(parsed.creator),
        primary: parsed.primary === "brand" || parsed.primary === "creator" ? parsed.primary : null,
      };
      const answers = await readOnboardingAnswers();
      if (answers?.workspace === "creator" && !state.creator) {
        state = { ...state, creator: true, primary: state.primary ?? "creator" };
        await writeWorkspacesSetup(state);
      }
      return state;
    } catch {
      // fall through to migration
    }
  }

  const cinematic = await hasCompletedCinematicOnboarding();
  const answers = await readOnboardingAnswers();
  if (cinematic && (answers?.workspace === "brand" || answers?.workspace === "creator")) {
    const migrated: WorkspacesSetupState = {
      brand: answers.workspace === "brand",
      creator: answers.workspace === "creator",
      primary: answers.workspace,
    };
    await writeWorkspacesSetup(migrated);
    return migrated;
  }

  return { ...EMPTY_SETUP };
}

export async function writeWorkspacesSetup(state: WorkspacesSetupState): Promise<void> {
  await AsyncStorage.setItem(WORKSPACES_SETUP_KEY, JSON.stringify(state));
}

/** Creators who submit UGC always get a creator workspace — no dual-setup gate. */
export async function enableCreatorWorkspace(setPrimary = true): Promise<WorkspacesSetupState> {
  const current = await readWorkspacesSetup();
  const next: WorkspacesSetupState = {
    ...current,
    creator: true,
    primary: setPrimary ? "creator" : current.primary ?? "creator",
  };
  await writeWorkspacesSetup(next);
  return next;
}

export async function setPrimaryWorkspace(workspace: WorkspaceKind): Promise<WorkspacesSetupState> {
  const current = await readWorkspacesSetup();
  const next: WorkspacesSetupState = {
    ...current,
    brand: workspace === "brand" ? true : current.brand,
    creator: workspace === "creator" ? true : current.creator,
    primary: workspace,
  };
  await writeWorkspacesSetup(next);
  return next;
}

export async function hydrateWorkspacesSetupFromFirestore(
  data: Record<string, unknown> | undefined
): Promise<WorkspacesSetupState> {
  const remote = data?.workspacesSetup;
  if (remote && typeof remote === "object") {
    const obj = remote as Partial<WorkspacesSetupState>;
    const state: WorkspacesSetupState = {
      brand: Boolean(obj.brand),
      creator: Boolean(obj.creator),
      primary: obj.primary === "brand" || obj.primary === "creator" ? obj.primary : null,
    };
    if (state.brand || state.creator) {
      await writeWorkspacesSetup(state);
      return state;
    }
  }
  return readWorkspacesSetup();
}

export async function isWorkspaceSetupComplete(workspace: WorkspaceKind): Promise<boolean> {
  const setup = await readWorkspacesSetup();
  return workspace === "brand" ? setup.brand : setup.creator;
}

export async function markWorkspaceSetupComplete(
  workspace: WorkspaceKind,
  options?: { setPrimary?: boolean }
): Promise<WorkspacesSetupState> {
  const current = await readWorkspacesSetup();
  const next: WorkspacesSetupState = {
    brand: workspace === "brand" ? true : current.brand,
    creator: workspace === "creator" ? true : current.creator,
    primary: options?.setPrimary ? workspace : current.primary ?? workspace,
  };
  await writeWorkspacesSetup(next);
  return next;
}

export async function setPendingWorkspaceSwitch(workspace: WorkspaceKind | null): Promise<void> {
  if (!workspace) {
    await AsyncStorage.removeItem(PENDING_WORKSPACE_SWITCH_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_WORKSPACE_SWITCH_KEY, workspace);
}

export async function readPendingWorkspaceSwitch(): Promise<WorkspaceKind | null> {
  const value = await AsyncStorage.getItem(PENDING_WORKSPACE_SWITCH_KEY);
  return value === "brand" || value === "creator" ? value : null;
}

export async function clearPendingWorkspaceSwitch(): Promise<void> {
  await setPendingWorkspaceSwitch(null);
}

export function workspaceKindFromRole(role: string | null | undefined): WorkspaceKind {
  return role === "creator" ? "creator" : "brand";
}

export function workspaceSetupToFirestore(state: WorkspacesSetupState) {
  return {
    brand: state.brand,
    creator: state.creator,
    primary: state.primary,
  };
}

/** Latest onboarding answers keyed by workspace (optional enrichment for Firestore). */
export function onboardingWorkspaceField(answers: OnboardingAnswers, workspace: WorkspaceKind) {
  return {
    workspace,
    profile: answers.profile,
    strategy: answers.strategy,
    goal: answers.goal,
    monthlyBudget: answers.monthlyBudget,
    completedAt: new Date(answers.ts).toISOString(),
  };
}
