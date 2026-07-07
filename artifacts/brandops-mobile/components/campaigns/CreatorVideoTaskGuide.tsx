import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = {
  steps: string[];
  specs: string[];
  avoid?: string[];
  loading?: boolean;
};

function SpecChip({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: BrandOpsTheme.colors.surface,
        borderWidth: 1,
        borderColor: BrandOpsTheme.colors.border,
      }}
    >
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function StepRow({ index, text }: { index: number; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: BrandOpsTheme.colors.limeSoft,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 14 }}>{index}</Text>
      </View>
      <Text style={{ flex: 1, color: BrandOpsTheme.colors.text, fontSize: 16, lineHeight: 24, fontWeight: "600" }}>
        {text}
      </Text>
    </View>
  );
}

export function CreatorVideoTaskGuide({ steps, specs, avoid = [], loading }: Props) {
  return (
    <BrandOpsCard variant="elevated" style={{ marginBottom: 16, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>
          HOW TO MAKE THIS VIDEO
        </Text>
        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 14 }}>
          Follow these steps — then upload below.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={BrandOpsTheme.colors.lime} />
      ) : (
        <View style={{ gap: 14 }}>
          {steps.map((step, i) => (
            <StepRow key={`${i}-${step.slice(0, 24)}`} index={i + 1} text={step} />
          ))}
        </View>
      )}

      {specs.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 12 }}>VIDEO SPECS</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {specs.map((spec) => (
              <SpecChip key={spec} label={spec} />
            ))}
          </View>
        </View>
      ) : null}

      {avoid.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 12 }}>AVOID</Text>
          {avoid.map((item) => (
            <View key={item} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Ionicons name="close-circle" size={16} color={BrandOpsTheme.colors.warning} style={{ marginTop: 3 }} />
              <P style={{ flex: 1, lineHeight: 21, fontSize: 14 }}>{item}</P>
            </View>
          ))}
        </View>
      ) : null}
    </BrandOpsCard>
  );
}
