import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { P } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import type { CreatorBriefDocument } from "@/lib/creatorBriefContent";

type Props = {
  doc: CreatorBriefDocument;
  /** Hide payment/deadline on main task view if already in hero chips. */
  showMeta?: boolean;
};

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 17 }}>
      {emoji} {title}
    </Text>
  );
}

function RequirementRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Ionicons name="checkmark-circle" size={18} color={BrandOpsTheme.colors.lime} />
      <Text style={{ flex: 1, color: BrandOpsTheme.colors.text, fontSize: 15, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

function ScriptOption({ index, text }: { index: number; text: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 13 }}>Option {index}</Text>
      <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 15, lineHeight: 23, fontStyle: "italic" }}>{text}</Text>
    </View>
  );
}

export function CreatorBriefDocument({ doc, showMeta = true }: Props) {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <View style={{ gap: 16 }}>
      <BrandOpsCard variant="elevated" style={{ gap: 10, borderWidth: 1, borderColor: "rgba(198,255,0,0.25)" }}>
        <SectionHeader emoji="🎥" title="What to film" />
        <P style={{ fontSize: 16, lineHeight: 25, color: BrandOpsTheme.colors.text }}>{doc.whatToFilm}</P>
      </BrandOpsCard>

      <BrandOpsCard variant="soft" style={{ gap: 14 }}>
        <SectionHeader emoji="💬" title="Example scripts" />
        <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 13 }}>Pick one angle or write your own in the same style.</Text>
        {doc.exampleScripts.map((script, i) => (
          <ScriptOption key={`${i}-${script.slice(0, 20)}`} index={i + 1} text={script} />
        ))}
      </BrandOpsCard>

      <BrandOpsCard variant="soft" style={{ gap: 8 }}>
        <SectionHeader emoji="🎯" title="Goal" />
        <P style={{ lineHeight: 24, fontSize: 15 }}>{doc.goal}</P>
      </BrandOpsCard>

      <BrandOpsCard variant="soft" style={{ gap: 10 }}>
        <SectionHeader emoji="✅" title="Requirements" />
        <View style={{ gap: 10 }}>
          {doc.requirements.map((item) => (
            <RequirementRow key={item} text={item} />
          ))}
        </View>
      </BrandOpsCard>

      {showMeta ? (
        <>
          <BrandOpsCard variant="soft" style={{ gap: 6 }}>
            <SectionHeader emoji="💰" title="Payment" />
            <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 20 }}>{doc.paymentLine}</Text>
            <P style={{ color: BrandOpsTheme.colors.muted, fontSize: 14 }}>{doc.paymentNote}</P>
          </BrandOpsCard>

          {doc.deadlineLine ? (
            <BrandOpsCard variant="soft" style={{ gap: 6 }}>
              <SectionHeader emoji="📅" title="Deadline" />
              <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 18 }}>{doc.deadlineLine}</Text>
            </BrandOpsCard>
          ) : null}
        </>
      ) : null}

      {(doc.usageRights || doc.legalDetails.length > 0) ? (
        <BrandOpsCard variant="soft" style={{ gap: 0, padding: 0, overflow: "hidden" }}>
          <Pressable
            onPress={() => setLegalOpen((v) => !v)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <Text style={{ color: BrandOpsTheme.colors.subtle, fontWeight: "800", fontSize: 14 }}>
              Usage rights & additional details
            </Text>
            <Ionicons name={legalOpen ? "chevron-up" : "chevron-down"} size={18} color={BrandOpsTheme.colors.subtle} />
          </Pressable>

          {legalOpen ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
              {doc.usageRights ? (
                <P style={{ lineHeight: 22, fontSize: 13, color: BrandOpsTheme.colors.muted }}>{doc.usageRights}</P>
              ) : null}
              {doc.legalDetails.map((item) => (
                <P key={item.slice(0, 40)} style={{ lineHeight: 21, fontSize: 13, color: BrandOpsTheme.colors.muted }}>
                  {item}
                </P>
              ))}
            </View>
          ) : null}
        </BrandOpsCard>
      ) : null}
    </View>
  );
}
