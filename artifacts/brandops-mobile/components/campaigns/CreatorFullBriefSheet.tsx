import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { CreatorBriefDocument } from "@/components/campaigns/CreatorBriefDocument";
import type { CreatorBriefDocument as CreatorBriefDoc } from "@/lib/creatorBriefContent";

type Props = {
  visible: boolean;
  onClose: () => void;
  doc: CreatorBriefDoc;
  title?: string;
};

export function CreatorFullBriefSheet({ visible, onClose, doc, title = "Full brief" }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: BrandOpsTheme.colors.border,
          }}
        >
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18 }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={BrandOpsTheme.colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <CreatorBriefDocument doc={doc} showMeta />
        </ScrollView>
      </View>
    </Modal>
  );
}
