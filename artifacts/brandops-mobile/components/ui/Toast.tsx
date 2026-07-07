import Toast, { BaseToast, type ToastConfig } from "react-native-toast-message";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: BrandOpsTheme.colors.lime, backgroundColor: BrandOpsTheme.colors.card, borderColor: BrandOpsTheme.colors.border, borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: BrandOpsTheme.colors.text, fontSize: 13, fontWeight: "800" }}
      text2Style={{ color: BrandOpsTheme.colors.muted, fontSize: 12 }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: BrandOpsTheme.colors.danger, backgroundColor: BrandOpsTheme.colors.card, borderColor: BrandOpsTheme.colors.border, borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: BrandOpsTheme.colors.text, fontSize: 13, fontWeight: "800" }}
      text2Style={{ color: BrandOpsTheme.colors.muted, fontSize: 12 }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "rgba(198,255,0,0.55)", backgroundColor: BrandOpsTheme.colors.card, borderColor: BrandOpsTheme.colors.border, borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ color: BrandOpsTheme.colors.text, fontSize: 13, fontWeight: "800" }}
      text2Style={{ color: BrandOpsTheme.colors.muted, fontSize: 12 }}
    />
  ),
};

export function BrandOpsToastHost() {
  return <Toast config={toastConfig} />;
}

