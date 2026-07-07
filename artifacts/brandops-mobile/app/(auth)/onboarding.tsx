import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Pressable,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeHaptics } from "@/lib/safeHaptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, H2, P, Label } from "@/components/ui/BrandOpsText";
import { AnimatedWelcomeBackground } from "@/components/onboarding/AnimatedWelcomeBackground";
import { useAuth } from "@/contexts/AuthContext";
import {
  defaultOnboardingProfile,
  ensureOnboardingSession,
  hasCompletedCinematicOnboarding,
  loadOnboardingDraft,
  markCinematicOnboardingComplete,
  ONBOARDING_KEY,
  saveOnboardingDraft,
  type OnboardingProfile,
} from "@/lib/onboardingStorage";
import {
  generateWorkspaceStrategy,
  inferRoleFromProfile,
  CAPABILITY_LABELS,
  EQUIPMENT_LABELS,
  type BusinessType,
  type ContentCapability,
  type ContentStyle,
  type CreatorEquipment,
  type CreatorExperience,
  type CreatorPreference,
  type OnboardingGoal,
  type Workspace,
} from "@/lib/onboardingStrategy";
import {
  clearPendingWorkspaceSwitch,
  markWorkspaceSetupComplete,
  setPendingWorkspaceSwitch,
  type WorkspaceKind,
} from "@/lib/workspaceSetup";
import { syncUserProfileToFirestore } from "@/lib/userProfile";

const { height } = Dimensions.get("window");

export default function Onboarding() {
  const router = useRouter();
  const { switch: switchParam } = useLocalSearchParams<{ switch?: string }>();
  const { setRole, isAuthenticated, authUid, authEmail, user } = useAuth();
  const insets = useSafeAreaInsets();

  const workspaceSwitch: WorkspaceKind | null =
    switchParam === "brand" || switchParam === "creator" ? switchParam : null;
  const isSwitchSetup = Boolean(workspaceSwitch && isAuthenticated);

  const [answers, setAnswers] = useState<OnboardingProfile>(defaultOnboardingProfile);
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;

  const isBrand = answers.workspace === "brand";
  const isCreator = answers.workspace === "creator";
  const questionCount = isCreator ? 5 : 6;
  const buildStep = isCreator ? 6 : 7;
  const lastQuestionStep = questionCount;
  const showProgress = step >= 1 && step < buildStep;

  const progressLabel = step === 0 ? "" : step >= buildStep ? "Generating" : `Step ${Math.min(step, questionCount)} of ${questionCount}`;

  const progressPct = useMemo(() => {
    if (step <= 0) return 0;
    if (step >= buildStep) return 1;
    return Math.min(step, questionCount) / questionCount;
  }, [buildStep, questionCount, step]);

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return Boolean(answers.workspace);
    if (step === 2) {
      if (isCreator) return answers.contentCapabilities.length > 0;
      return answers.brandName.trim().length > 0 && Boolean(answers.businessType);
    }
    if (step === 3) {
      if (isCreator) return Boolean(answers.experienceLevel);
      return Boolean(answers.goal);
    }
    if (step === 4) {
      if (isCreator) return answers.equipment.length > 0;
      return Boolean(answers.monthlyBudget);
    }
    if (step === 5) {
      if (isCreator) return Boolean(answers.monthlyBudget);
      return answers.contentStyles.length > 0;
    }
    if (step === 6) return isBrand ? Boolean(answers.creatorPreference) : true;
    return true;
  }, [answers, isBrand, isCreator, step]);

  const continueLabel = useMemo(() => {
    if (step === 1 && answers.workspace) {
      return answers.workspace === "brand" ? "Continue as Brand" : "Continue as Creator";
    }
    if (step === lastQuestionStep) return "Generate my strategy";
    return "Continue";
  }, [answers.workspace, lastQuestionStep, step]);

  useEffect(() => {
    void (async () => {
      if (workspaceSwitch && isAuthenticated) {
        await ensureOnboardingSession();
        await setPendingWorkspaceSwitch(workspaceSwitch);
        setAnswers({ ...defaultOnboardingProfile, workspace: workspaceSwitch });
        setStep(2);
        setDraftLoaded(true);
        return;
      }

      const done = await hasCompletedCinematicOnboarding();
      if (done) {
        setDraftLoaded(true);
        return;
      }
      const draft = await loadOnboardingDraft();
      if (draft && draft.step > 0) {
        const merged = { ...defaultOnboardingProfile, ...draft.answers };
        const maxStep = merged.workspace === "creator" ? 5 : 6;
        let resumeStep = Math.min(draft.step, maxStep);
        if (merged.workspace === "creator" && draft.step >= 6) resumeStep = 5;
        if (resumeStep < (merged.workspace === "creator" ? 6 : 7)) {
          setStep(resumeStep);
          setAnswers(merged);
        }
      }
      setDraftLoaded(true);
    })();
  }, [isAuthenticated, workspaceSwitch]);

  useEffect(() => {
    if (!draftLoaded || step === 0 || isSwitchSetup) return;
    void saveOnboardingDraft({ step, answers });
  }, [answers, draftLoaded, isSwitchSetup, step]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: progressPct,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct, progress]);

  const animateStepChange = (nextStep: number) => {
    setTransitioning(true);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: -28, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      contentSlide.setValue(36);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, friction: 9, tension: 68, useNativeDriver: true }),
      ]).start(() => setTransitioning(false));
    });
  };

  const back = useCallback(() => {
    if (step === 0 || building) return;
    if (isSwitchSetup && step <= 2) {
      void clearPendingWorkspaceSwitch();
      router.replace("/(tabs)/profile" as never);
      return;
    }
    void safeHaptics.selection();
    const prev = step - 1;
    setTransitioning(false);
    contentOpacity.setValue(1);
    contentSlide.setValue(0);
    setStep(Math.max(0, prev));
  }, [building, contentOpacity, contentSlide, isSwitchSetup, router, step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step > 0 && !building) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [back, building, step]);

  const next = async () => {
    if (!canContinue || transitioning || building) {
      if (!canContinue) {
        Toast.show({ type: "info", text1: "One more thing", text2: "Fill in the highlighted step to continue." });
      }
      return;
    }

    if (step >= 1 && step <= lastQuestionStep) {
      void safeHaptics.impactLight();
    }

    if (step === lastQuestionStep) {
      setBuilding(true);
      void safeHaptics.success();
      animateStepChange(buildStep);
      Animated.timing(progress, { toValue: 1, duration: 650, useNativeDriver: false }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false }),
        ])
      ).start();

      await new Promise((r) => setTimeout(r, 2200));

      const strategy = generateWorkspaceStrategy(answers);
      const inferred = inferRoleFromProfile(answers);

      await AsyncStorage.setItem(
        ONBOARDING_KEY,
        JSON.stringify({
          identity: answers.workspace,
          workspace: answers.workspace,
          platforms: [],
          goal: answers.goal,
          monthlyBudget: answers.monthlyBudget,
          inferredRole: inferred,
          profile: answers,
          strategy,
          ts: Date.now(),
          source: isSwitchSetup ? "mobile_workspace_switch" : "mobile",
        })
      );

      const workspaceKind: WorkspaceKind = answers.workspace === "creator" ? "creator" : "brand";
      await markWorkspaceSetupComplete(workspaceKind, { setPrimary: !isSwitchSetup });
      await setRole(inferred);

      if (isSwitchSetup && authUid) {
        await clearPendingWorkspaceSwitch();
        try {
          await syncUserProfileToFirestore({
            uid: authUid,
            email: authEmail ?? user?.email,
            displayName: user?.displayName,
            role: inferred,
          });
        } catch {
          // Local role + setup flags still saved
        }
        Toast.show({
          type: "success",
          text1: `${workspaceKind === "creator" ? "Creator" : "Brand"} workspace ready`,
          text2: "You can switch between workspaces anytime.",
        });
        router.replace("/(tabs)" as never);
        return;
      }

      await markCinematicOnboardingComplete();
      router.replace("/(auth)/signup");
      return;
    }

    animateStepChange(step + 1);
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
      {step === 0 ? <AnimatedWelcomeBackground active /> : null}

      <View style={{ paddingTop: Math.max(insets.top, 14), paddingHorizontal: 16, zIndex: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={back}
            disabled={step === 0 || building}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 88, minHeight: 48, justifyContent: "flex-start" }}
          >
            {step === 0 ? (
              <View style={{ width: 48 }} />
            ) : (
              <>
                <Ionicons name="chevron-back" size={20} color={building ? BrandOpsTheme.colors.subtle : BrandOpsTheme.colors.muted} />
                <Text style={{ color: building ? BrandOpsTheme.colors.subtle : BrandOpsTheme.colors.muted, fontWeight: "800" }}>Back</Text>
              </>
            )}
          </Pressable>
          {showProgress ? <Label style={{ color: BrandOpsTheme.colors.subtle }}>{progressLabel}</Label> : <View />}
          <View style={{ width: 72 }} />
        </View>
        {showProgress ? (
          <View style={{ height: 6, marginTop: 12, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" }}>
            <Animated.View style={{ height: 6, width: progressWidth, backgroundColor: BrandOpsTheme.colors.lime }} />
          </View>
        ) : null}
      </View>

      <Animated.View style={{ flex: 1, paddingHorizontal: 16, paddingTop: step === 0 ? height * 0.04 : 10, opacity: contentOpacity, transform: [{ translateX: contentSlide }] }}>
        {isSwitchSetup && step >= 2 ? (
          <View style={{ marginBottom: 12 }}>
            <Label style={{ color: BrandOpsTheme.colors.lime }}>
              {workspaceSwitch === "creator" ? "Creator workspace setup" : "Brand workspace setup"}
            </Label>
            <P style={{ marginTop: 6, fontSize: 13 }}>
              One-time AI setup for your {workspaceSwitch === "creator" ? "creator" : "brand"} workspace. You will not need to repeat this when switching back.
            </P>
          </View>
        ) : null}
        {step === 0 ? (
          <Welcome onStart={async () => { await ensureOnboardingSession(); animateStepChange(1); }} onSignIn={() => router.push("/(auth)/login")} />
        ) : step === 1 ? (
          <WorkspaceStep
            value={answers.workspace}
            onChange={(workspace) =>
              setAnswers((a) => ({
                ...a,
                workspace,
                goal: null,
                businessType: null,
                contentStyles: [],
                contentCapabilities: [],
                experienceLevel: null,
                equipment: [],
                creatorPreference: null,
                brandName: "",
              }))
            }
          />
        ) : step === 2 && isCreator ? (
          <ContentCapabilitiesStep value={answers.contentCapabilities} onChange={(contentCapabilities) => setAnswers((a) => ({ ...a, contentCapabilities }))} />
        ) : step === 2 ? (
          <BrandPromoteStep profile={answers} onChange={setAnswers} />
        ) : step === 3 && isCreator ? (
          <ExperienceStep value={answers.experienceLevel} onChange={(experienceLevel) => setAnswers((a) => ({ ...a, experienceLevel }))} />
        ) : step === 3 ? (
          <BrandGoalStep value={answers.goal} onChange={(goal) => setAnswers((a) => ({ ...a, goal }))} />
        ) : step === 4 && isCreator ? (
          <EquipmentStep value={answers.equipment} onChange={(equipment) => setAnswers((a) => ({ ...a, equipment }))} />
        ) : step === 4 ? (
          <BudgetStep workspace={answers.workspace} value={answers.monthlyBudget} onChange={(monthlyBudget) => setAnswers((a) => ({ ...a, monthlyBudget }))} />
        ) : step === 5 && isCreator ? (
          <BudgetStep workspace={answers.workspace} value={answers.monthlyBudget} onChange={(monthlyBudget) => setAnswers((a) => ({ ...a, monthlyBudget }))} />
        ) : step === 5 ? (
          <ContentStyleStep value={answers.contentStyles} onChange={(contentStyles) => setAnswers((a) => ({ ...a, contentStyles }))} />
        ) : step === 6 && isBrand ? (
          <CreatorPrefStep value={answers.creatorPreference} onChange={(creatorPreference) => setAnswers((a) => ({ ...a, creatorPreference }))} />
        ) : (
          <BuildStep glow={glow} workspace={answers.workspace} />
        )}
      </Animated.View>

      <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 18), paddingTop: 10 }}>
        {step === 0 || step >= buildStep ? null : (
          <BrandOpsButton label={continueLabel} onPress={next} disabled={!canContinue || building || transitioning} />
        )}
      </View>
    </View>
  );
}

function Welcome({ onStart, onSignIn }: { onStart: () => void | Promise<void>; onSignIn: () => void }) {
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = useState(false);

  return (
    <View style={{ flex: 1, justifyContent: "space-between", paddingTop: height * 0.06, paddingBottom: 8 }}>
      <View>
        <Image source={require("../../assets/images/brandops-logo-transparent-app.png")} resizeMode="contain" style={{ height: 52, width: 268, marginBottom: 14 }} />
        <Label style={{ color: BrandOpsTheme.colors.lime }}>BrandOps Mobile</Label>
        <H1 style={{ marginTop: 10, marginBottom: 10 }}>Launch creator campaigns with AI.</H1>
        <P style={{ maxWidth: 320 }}>Answer a few questions — we&apos;ll generate your campaign strategy before you create an account.</P>
        <View style={{ height: 22 }} />
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <BrandOpsButton label="Get started" onPress={() => { if (busy) return; setBusy(true); void safeHaptics.impactMedium(); void Promise.resolve(onStart()).finally(() => setBusy(false)); }} disabled={busy} />
        </Animated.View>
        <P style={{ fontSize: 12, color: BrandOpsTheme.colors.subtle, marginTop: 14 }}>~60 seconds. Your answers attach to your account automatically.</P>
      </View>
      <Pressable onPress={onSignIn} style={{ alignItems: "center", paddingVertical: 12 }}>
        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 15, textAlign: "center" }}>
          Already have an account? <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>Sign in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const WORKSPACE_OPTIONS = [
  { id: "brand" as Workspace, title: "Brand", subtitle: "Launch campaigns, review UGC, approve content, and pay creators.", features: ["Manage budgets", "Create briefs", "Review UGC", "Pay creators"] },
  { id: "creator" as Workspace, title: "Creator", subtitle: "Discover paid opportunities, submit content, and get paid.", features: ["Submit videos", "Build reputation", "Get paid", "Receive ratings"] },
];

function WorkspaceStep({ value, onChange }: { value: Workspace | null; onChange: (v: Workspace) => void }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
      <Label style={{ color: BrandOpsTheme.colors.lime }}>Setup</Label>
      <H2 style={{ marginTop: 6 }}>Choose your workspace</H2>
      <P style={{ marginTop: 8, marginBottom: 16 }}>Brand or Creator — switch anytime in Profile.</P>
      <View style={{ gap: 14 }}>
        {WORKSPACE_OPTIONS.map((option) => (
          <WorkspaceCard key={option.id} selected={value === option.id} title={option.title} subtitle={option.subtitle} features={option.features} onPress={() => { void safeHaptics.selection(); onChange(option.id); }} />
        ))}
      </View>
    </ScrollView>
  );
}

function BrandPromoteStep({ profile, onChange }: { profile: OnboardingProfile; onChange: (p: OnboardingProfile) => void }) {
  const types: { id: BusinessType; label: string }[] = [
    { id: "app", label: "App" },
    { id: "saas", label: "SaaS" },
    { id: "ecommerce", label: "Ecommerce" },
    { id: "local", label: "Local business" },
    { id: "creator_brand", label: "Creator brand" },
    { id: "other", label: "Other" },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
      <H2>What are you promoting?</H2>
      <P>Your brand name and business type shape campaign matching and AI strategy.</P>
      <TextInput
        value={profile.brandName}
        onChangeText={(brandName) => onChange({ ...profile, brandName })}
        placeholder="Clubspace"
        placeholderTextColor="rgba(255,255,255,0.28)"
        style={{ height: 52, borderRadius: 14, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: BrandOpsTheme.colors.border, color: BrandOpsTheme.colors.text, fontSize: 16, fontWeight: "700" }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {types.map((t) => (
          <Chip key={t.id} label={t.label} selected={profile.businessType === t.id} onPress={() => onChange({ ...profile, businessType: t.id })} />
        ))}
      </View>
    </ScrollView>
  );
}

function ContentCapabilitiesStep({ value, onChange }: { value: ContentCapability[]; onChange: (v: ContentCapability[]) => void }) {
  const items = (Object.entries(CAPABILITY_LABELS) as [ContentCapability, string][]).map(([id, label]) => ({ id, label }));
  const toggle = (id: ContentCapability) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>What type of content can you create?</H2>
      <P>Select all that apply — brands search by capability, not follower count.</P>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        {items.map((it) => (
          <Chip key={it.id} label={it.label} selected={value.includes(it.id)} onPress={() => toggle(it.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function ExperienceStep({ value, onChange }: { value: CreatorExperience | null; onChange: (v: CreatorExperience) => void }) {
  const items: { id: CreatorExperience; title: string; desc: string }[] = [
    { id: "experienced", title: "Professional UGC Creator", desc: "Regularly creates paid content for brands." },
    { id: "some_paid", title: "Intermediate Creator", desc: "Completed paid brand work before." },
    { id: "beginner", title: "Beginner", desc: "New to paid UGC opportunities." },
    { id: "agency_team", title: "Agency / Production Team", desc: "Creates content on behalf of multiple clients." },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>Which best describes your experience?</H2>
      <P>Helps brands set brief depth, payout expectations, and campaign fit.</P>
      <View style={{ gap: 10, marginTop: 8 }}>
        {items.map((it) => (
          <ChoiceCard key={it.id} selected={value === it.id} title={it.title} desc={it.desc} onPress={() => onChange(it.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function EquipmentStep({ value, onChange }: { value: CreatorEquipment[]; onChange: (v: CreatorEquipment[]) => void }) {
  const items = (Object.entries(EQUIPMENT_LABELS) as [CreatorEquipment, string][]).map(([id, label]) => ({ id, label }));
  const toggle = (id: CreatorEquipment) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>What equipment do you have access to?</H2>
      <P>Brands filter for iPhone-style UGC, talking-head setups, studio polish, and more.</P>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        {items.map((it) => (
          <Chip key={it.id} label={it.label} selected={value.includes(it.id)} onPress={() => toggle(it.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function BrandGoalStep({ value, onChange }: { value: OnboardingGoal | null; onChange: (v: OnboardingGoal) => void }) {
  const items: { id: OnboardingGoal; title: string }[] = [
    { id: "installs", title: "Drive installs" },
    { id: "sales", title: "Drive sales" },
    { id: "awareness", title: "Build awareness" },
    { id: "leads", title: "Generate leads" },
    { id: "ugc_library", title: "Build a UGC library" },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>What&apos;s your primary goal?</H2>
      <P>Drives campaign strategy, creator sourcing, and dashboard defaults.</P>
      <View style={{ gap: 10, marginTop: 8 }}>
        {items.map((it) => (
          <ChoiceCard key={it.id} selected={value === it.id} title={it.title} onPress={() => onChange(it.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

function BudgetStep({ workspace, value, onChange }: { workspace: Workspace | null; value: OnboardingProfile["monthlyBudget"]; onChange: (v: OnboardingProfile["monthlyBudget"]) => void }) {
  const creator = workspace === "creator";
  const items = [
    { id: "0-2k" as const, title: creator ? "$0–$2k / mo target" : "$0–$2k" },
    { id: "2-10k" as const, title: creator ? "$2k–$10k / mo target" : "$2k–$10k" },
    { id: "10-50k" as const, title: creator ? "$10k–$50k / mo target" : "$10k–$50k" },
    { id: "50k+" as const, title: creator ? "$50k+ / mo target" : "$50k+" },
  ];
  return (
    <View style={{ gap: 12 }}>
      <H2>{creator ? "Preferred payout range" : "Monthly campaign budget"}</H2>
      <P>{creator ? "We match you to campaigns in this earnings tier." : "Used for recommended creator count and budget allocation."}</P>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        {items.map((it) => <Chip key={it.id} label={it.title} selected={value === it.id} onPress={() => onChange(it.id)} />)}
      </View>
    </View>
  );
}

function ContentStyleStep({ value, onChange }: { value: ContentStyle[]; onChange: (v: ContentStyle[]) => void }) {
  const items: { id: ContentStyle; label: string }[] = [
    { id: "pov", label: "POV videos" },
    { id: "testimonials", label: "Testimonials" },
    { id: "discovery", label: "Discovery content" },
    { id: "demos", label: "Product demos" },
    { id: "unboxing", label: "Unboxing" },
    { id: "talking_head", label: "Talking head" },
  ];
  const toggle = (id: ContentStyle) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>Content focus for your campaigns</H2>
      <P>Select formats you want creators to deliver — used for brief templates and matching.</P>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        {items.map((it) => <Chip key={it.id} label={it.label} selected={value.includes(it.id)} onPress={() => toggle(it.id)} />)}
      </View>
    </ScrollView>
  );
}

function CreatorPrefStep({ value, onChange }: { value: CreatorPreference | null; onChange: (v: CreatorPreference) => void }) {
  const items: { id: CreatorPreference; title: string; desc: string }[] = [
    { id: "micro", title: "Micro creators", desc: "High volume, authentic, cost-efficient." },
    { id: "mid", title: "Mid-tier creators", desc: "Balance of reach and authenticity." },
    { id: "ugc_specialists", title: "UGC specialists", desc: "Creators who only film for brands." },
    { id: "mixed", title: "Mixed roster", desc: "Blend of micro, mid, and specialists." },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
      <H2>Creator preferences</H2>
      <P>Who should we optimize your sourcing for?</P>
      <View style={{ gap: 10, marginTop: 8 }}>
        {items.map((it) => <ChoiceCard key={it.id} selected={value === it.id} title={it.title} desc={it.desc} onPress={() => onChange(it.id)} />)}
      </View>
    </ScrollView>
  );
}

function BuildStep({ glow, workspace }: { glow: Animated.Value; workspace: Workspace | null }) {
  const pulse = glow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.24] });
  const lines = workspace === "creator"
    ? ["Analyzing your answers…", "Matching campaign tiers…", "Building creator workspace…"]
    : ["Analyzing your answers…", "Generating campaign strategy…", "Mapping creator recommendations…"];
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <H2 style={{ marginBottom: 10 }}>Generating your AI strategy…</H2>
      <P style={{ marginBottom: 18 }}>This takes a few seconds — hang tight.</P>
      <View style={{ gap: 10 }}>
        {lines.map((t) => (
          <View key={t} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: BrandOpsTheme.colors.border, backgroundColor: "rgba(255,255,255,0.04)" }}>
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800" }}>{t}</Text>
          </View>
        ))}
      </View>
      <Animated.View style={{ marginTop: 22, height: 8, borderRadius: 999, backgroundColor: BrandOpsTheme.colors.lime, opacity: pulse }} />
    </View>
  );
}

function WorkspaceCard({ selected, title, subtitle, features, onPress }: { selected: boolean; title: string; subtitle: string; features: string[]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ borderRadius: 20, overflow: "hidden", borderWidth: selected ? 2 : 1, borderColor: selected ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.border, shadowColor: selected ? BrandOpsTheme.colors.lime : "transparent", shadowOpacity: selected ? 0.4 : 0, shadowRadius: 16 }}>
        <LinearGradient colors={selected ? ["rgba(198,255,0,0.28)", "rgba(198,255,0,0.10)"] : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]} style={{ padding: 18 }}>
          <Text style={{ color: selected ? BrandOpsTheme.colors.lime : "#fff", fontWeight: "900", fontSize: 22 }}>{title}</Text>
          <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, lineHeight: 20 }}>{subtitle}</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            {features.map((f) => (
              <Text key={f} style={{ color: selected ? "#fff" : BrandOpsTheme.colors.muted, fontWeight: "700", fontSize: 13 }}>• {f}</Text>
            ))}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

function ChoiceCard({ selected, title, desc, onPress }: { selected: boolean; title: string; desc?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ padding: 14, borderRadius: 18, borderWidth: selected ? 2 : 1, borderColor: selected ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.border, backgroundColor: selected ? "rgba(198,255,0,0.12)" : "rgba(255,255,255,0.03)" }}>
        <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 15 }}>{title}</Text>
        {desc ? <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 6, lineHeight: 18 }}>{desc}</Text> : null}
      </View>
    </Pressable>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, borderWidth: selected ? 2 : 1, borderColor: selected ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.border, backgroundColor: selected ? "rgba(198,255,0,0.14)" : "rgba(255,255,255,0.03)" }}>
        <Text style={{ color: selected ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.muted, fontWeight: "900" }}>{label}</Text>
      </View>
    </Pressable>
  );
}
