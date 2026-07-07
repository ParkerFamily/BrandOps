import { TextInput, View, type TextInputProps } from "react-native";
import { Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

type Props = TextInputProps & {
  label: string;
};

export function AuthTextField({ label, style, ...rest }: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Label
        style={{
          color: BrandOpsTheme.colors.subtle,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Label>
      <TextInput
        placeholderTextColor="rgba(255,255,255,0.28)"
        style={[
          {
            height: 52,
            borderRadius: 14,
            paddingHorizontal: 16,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
            color: BrandOpsTheme.colors.text,
            fontSize: 15,
            fontWeight: "500",
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
