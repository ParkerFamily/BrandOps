import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { H2, P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { LEGAL_LAST_UPDATED, type LegalSection } from "@/lib/legal/brandopsLegal";

type Props = {
  title: string;
  sections: LegalSection[];
  sibling: { label: string; href: "/settings/privacy" | "/settings/terms" };
};

export function LegalDocumentView({ title, sections, sibling }: Props) {
  const router = useRouter();

  return (
    <BrandOpsScreen scroll tabBarInset={false}>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginBottom: 16 }}>
        Last updated {LEGAL_LAST_UPDATED}
      </Text>

      <CrossLink label={sibling.label} onPress={() => router.push(sibling.href as never)} />

      <View style={{ gap: 22, marginTop: 18 }}>
        {sections.map((section) => (
          <View key={section.title}>
            <H2 style={{ fontSize: 17, marginBottom: 8 }}>{section.title}</H2>
            {section.paragraphs.map((paragraph) => (
              <P key={paragraph.slice(0, 48)} style={{ marginBottom: 10, lineHeight: 22, fontSize: 14 }}>
                {paragraph}
              </P>
            ))}
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
      <CrossLink label={sibling.label} onPress={() => router.push(sibling.href as never)} />
    </BrandOpsScreen>
  );
}

function CrossLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: BrandOpsTheme.colors.surface,
        borderWidth: 1,
        borderColor: BrandOpsTheme.colors.border,
      }}
    >
      <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 14 }}>{label} →</Text>
    </Pressable>
  );
}
