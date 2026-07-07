import type { UserRole } from "@/lib/types";

export type Workspace = "brand" | "creator";
export type BusinessType = "app" | "saas" | "ecommerce" | "local" | "creator_brand" | "other";

export type BrandGoal = "installs" | "sales" | "awareness" | "leads" | "ugc_library";
export type CreatorJoinGoal = "earn_money" | "grow_creator" | "brand_partnerships";
export type OnboardingGoal = BrandGoal | CreatorJoinGoal;

export type ContentStyle = "pov" | "testimonials" | "discovery" | "demos" | "unboxing" | "talking_head";

/** Content types a creator can produce — powers campaign matching. */
export type ContentCapability =
  | "product_demos"
  | "app_promotions"
  | "reviews_testimonials"
  | "lifestyle"
  | "talking_head"
  | "voiceover"
  | "unboxing"
  | "personal_brand";

export type CreatorExperience = "beginner" | "some_paid" | "experienced" | "agency_team";

export type CreatorEquipment =
  | "smartphone_only"
  | "smartphone_tripod"
  | "professional_camera"
  | "studio_setup"
  | "microphone_audio";

export type CreatorPreference = "micro" | "mid" | "mixed" | "ugc_specialists";
export type MonthlyBudget = "0-2k" | "2-10k" | "10-50k" | "50k+";

export type OnboardingProfile = {
  workspace: Workspace | null;
  brandName: string;
  businessType: BusinessType | null;
  goal: OnboardingGoal | null;
  monthlyBudget: MonthlyBudget;
  contentStyles: ContentStyle[];
  contentCapabilities: ContentCapability[];
  experienceLevel: CreatorExperience | null;
  equipment: CreatorEquipment[];
  creatorPreference: CreatorPreference | null;
};

export type WorkspaceStrategy = {
  brandLabel: string;
  goalLabel: string;
  recommendedBudget: string;
  recommendedCreatorCount: number;
  contentFocus: string[];
  tagline: string;
  experienceLabel?: string;
  matchTierLabel?: string;
  equipmentLabels?: string[];
  /** Tags saved for campaign matching (Firestore). */
  matchTags: string[];
};

const BRAND_GOAL_LABELS: Record<BrandGoal, string> = {
  installs: "Drive installs",
  sales: "Drive sales",
  awareness: "Build awareness",
  leads: "Generate leads",
  ugc_library: "Build a UGC library",
};

const CREATOR_GOAL_LABELS: Record<CreatorJoinGoal, string> = {
  earn_money: "Earn money",
  grow_creator: "Grow as a creator",
  brand_partnerships: "Work with brands",
};

const BUDGET_LABELS: Record<MonthlyBudget, string> = {
  "0-2k": "$2,000",
  "2-10k": "$6,000",
  "10-50k": "$25,000",
  "50k+": "$75,000",
};

const PAYOUT_TIER_LABELS: Record<MonthlyBudget, string> = {
  "0-2k": "Starter campaigns ($50–$200/video)",
  "2-10k": "Growth campaigns ($150–$500/video)",
  "10-50k": "Premium campaigns ($400–$1,200/video)",
  "50k+": "Top-tier brand deals ($800+/video)",
};

const CONTENT_LABELS: Record<ContentStyle, string> = {
  pov: "POV videos",
  testimonials: "Direct camera testimonials",
  discovery: "Community discovery content",
  demos: "Product demo clips",
  unboxing: "Unboxing & first impressions",
  talking_head: "Talking-head explainers",
};

export const CAPABILITY_LABELS: Record<ContentCapability, string> = {
  product_demos: "Product demos",
  app_promotions: "App promotions",
  reviews_testimonials: "Reviews & testimonials",
  lifestyle: "Lifestyle content",
  talking_head: "Talking-head videos",
  voiceover: "Voiceover videos",
  unboxing: "Unboxing videos",
  personal_brand: "Personal brand content",
};

export const EXPERIENCE_LABELS: Record<CreatorExperience, string> = {
  experienced: "Professional UGC Creator",
  some_paid: "Intermediate Creator",
  beginner: "Beginner",
  agency_team: "Agency / Production Team",
};

export const EQUIPMENT_LABELS: Record<CreatorEquipment, string> = {
  smartphone_only: "Smartphone only",
  smartphone_tripod: "Smartphone + tripod",
  professional_camera: "Professional camera",
  studio_setup: "Studio setup",
  microphone_audio: "Microphone / audio gear",
};

const BUSINESS_DEFAULT_STYLES: Record<BusinessType, ContentStyle[]> = {
  app: ["pov", "discovery", "demos"],
  saas: ["demos", "talking_head", "testimonials"],
  ecommerce: ["unboxing", "pov", "testimonials"],
  local: ["discovery", "testimonials", "pov"],
  creator_brand: ["pov", "talking_head", "discovery"],
  other: ["pov", "testimonials", "discovery"],
};

function isCreatorGoal(goal: OnboardingGoal | null): goal is CreatorJoinGoal {
  return goal === "earn_money" || goal === "grow_creator" || goal === "brand_partnerships";
}

export function inferRoleFromProfile(profile: OnboardingProfile): UserRole {
  return profile.workspace === "creator" ? "creator" : "brand";
}

export function buildCreatorMatchTags(profile: OnboardingProfile): string[] {
  const tags = [...profile.contentCapabilities];
  if (profile.experienceLevel) tags.push(`exp:${profile.experienceLevel}`);
  for (const item of profile.equipment) tags.push(`gear:${item}`);
  tags.push(`payout:${profile.monthlyBudget}`);
  return tags;
}

function creatorMatchTier(profile: OnboardingProfile): string {
  const exp = profile.experienceLevel;
  const budget = profile.monthlyBudget;
  if (exp === "agency_team") return "Production-ready · multi-format";
  if (exp === "experienced" && (budget === "10-50k" || budget === "50k+")) return "Priority matching · premium brands";
  if (exp === "some_paid") return "Verified UGC · mid-tier campaigns";
  if (exp === "beginner") return "Starter-friendly · guided briefs";
  return "Matched to your capabilities";
}

export function generateWorkspaceStrategy(profile: OnboardingProfile): WorkspaceStrategy {
  const isCreator = profile.workspace === "creator";

  if (isCreator) {
    const capabilities = profile.contentCapabilities.map((c) => CAPABILITY_LABELS[c]);
    const goalLabel = "Paid brand content";
    const experienceLabel = profile.experienceLevel ? EXPERIENCE_LABELS[profile.experienceLevel] : undefined;
    const equipmentLabels = profile.equipment.map((e) => EQUIPMENT_LABELS[e]);

    return {
      brandLabel: "Creator profile",
      goalLabel,
      recommendedBudget: PAYOUT_TIER_LABELS[profile.monthlyBudget],
      recommendedCreatorCount: 0,
      contentFocus: capabilities,
      tagline: "We'll match you to campaigns that fit your skills and setup.",
      experienceLabel,
      equipmentLabels: equipmentLabels.length > 0 ? equipmentLabels : undefined,
      matchTierLabel: creatorMatchTier(profile),
      matchTags: buildCreatorMatchTags(profile),
    };
  }

  const brandLabel = profile.brandName.trim() || "Your brand";
  const goalLabel = profile.goal && !isCreatorGoal(profile.goal) ? BRAND_GOAL_LABELS[profile.goal as BrandGoal] : "Launch UGC campaigns";

  const styles =
    profile.contentStyles.length > 0
      ? profile.contentStyles
      : profile.businessType
        ? BUSINESS_DEFAULT_STYLES[profile.businessType]
        : (["pov", "testimonials", "discovery"] as ContentStyle[]);

  const creatorCount =
    profile.monthlyBudget === "0-2k" ? 4 : profile.monthlyBudget === "2-10k" ? 12 : profile.monthlyBudget === "10-50k" ? 28 : 50;

  const matchTags = [
    ...styles.map((s) => `content:${s}`),
    ...(profile.creatorPreference ? [`creators:${profile.creatorPreference}`] : []),
    ...(profile.goal ? [`goal:${profile.goal}`] : []),
    `budget:${profile.monthlyBudget}`,
  ];

  return {
    brandLabel,
    goalLabel,
    recommendedBudget: BUDGET_LABELS[profile.monthlyBudget],
    recommendedCreatorCount: creatorCount,
    contentFocus: styles.map((s) => CONTENT_LABELS[s]),
    tagline: "Campaign strategy, creator sourcing, and approval workflows are ready to go.",
    matchTags,
  };
}

export function provisioningSteps(profile: OnboardingProfile): string[] {
  if (profile.workspace === "creator") {
    return [
      "Creating workspace…",
      "Saving your content capabilities…",
      "Matching campaign tiers…",
      "Preparing your creator dashboard…",
    ];
  }
  return [
    "Creating workspace…",
    "Analyzing your answers…",
    "Generating campaign strategy…",
    "Mapping creator recommendations…",
  ];
}
