import { useState } from "react";
import { TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, H2, P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { getWebAppUrl } from "@/lib/env";

export default function AIScreen() {
  const [prompt, setPrompt] = useState("");
  const webUrl = getWebAppUrl();

  return (
    <BrandOpsScreen scroll>
      <H1 style={{ marginBottom: 8 }}>BrandOps AI</H1>
      <P style={{ marginBottom: 18 }}>
        Hooks, captions, and revision suggestions — full AI chat runs on BrandOps web.
      </P>

      <BrandOpsCard variant="elevated" style={{ marginBottom: 12 }}>
        <Label style={{ color: BrandOpsTheme.colors.lime }}>Mobile</Label>
        <P style={{ marginTop: 8 }}>
          Dashboard insights on Home are generated from your live workspace stats. For campaign builder and chat, use the web app.
        </P>
      </BrandOpsCard>

      <BrandOpsCard variant="elevated">
        <H2>Draft a prompt</H2>
        <View style={{ height: 10 }} />
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask BrandOps AI…"
          placeholderTextColor={BrandOpsTheme.colors.subtle}
          style={inputStyle}
          multiline
        />
        <View style={{ height: 12 }} />
        <BrandOpsButton
          label="Continue on web"
          disabled={!webUrl}
          onPress={() => {
            if (!webUrl) return;
            const q = prompt.trim() ? `?q=${encodeURIComponent(prompt.trim())}` : "";
            void WebBrowser.openBrowserAsync(`${webUrl}/ai${q}`);
          }}
        />
      </BrandOpsCard>
    </BrandOpsScreen>
  );
}

const inputStyle = {
  minHeight: 110,
  borderRadius: BrandOpsTheme.radius.lg,
  paddingHorizontal: BrandOpsTheme.spacing.md,
  paddingVertical: BrandOpsTheme.spacing.md,
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: BrandOpsTheme.colors.border,
  color: BrandOpsTheme.colors.text,
} as const;
