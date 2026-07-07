import { type PropsWithChildren, type ReactNode } from "react";
import { RefreshControl, ScrollView, View, type RefreshControlProps, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { TAB_BAR_BASE_HEIGHT } from "@/constants/layout";

type Props = PropsWithChildren<
  ViewProps & {
    scroll?: boolean;
    glow?: boolean;
    padded?: boolean;
    header?: ReactNode;
    refreshControl?: React.ReactElement<RefreshControlProps>;
    /** Extra bottom inset for floating tab bar (default true on tab screens). */
    tabBarInset?: boolean;
  }
>;

export function BrandOpsScreen({
  children,
  scroll,
  glow,
  padded = true,
  header,
  refreshControl,
  tabBarInset = true,
  style,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;
  const padding = padded ? BrandOpsTheme.spacing.md : 0;
  const bottomInset = tabBarInset ? TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 10) + 16 : 32;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BrandOpsTheme.colors.bg }} edges={["top", "left", "right"]}>
      {glow ? (
        <LinearGradient
          colors={["rgba(198,255,0,0.12)", "rgba(198,255,0,0.02)", "transparent"]}
          locations={[0, 0.35, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
          pointerEvents="none"
        />
      ) : null}

      {header}

      <Container
        {...rest}
        refreshControl={scroll ? refreshControl : undefined}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={scroll ? Boolean(refreshControl) : undefined}
        contentContainerStyle={scroll ? { flexGrow: 1, paddingBottom: bottomInset } : undefined}
        style={[
          {
            flex: 1,
            backgroundColor: "transparent",
            paddingHorizontal: padding,
            paddingTop: padded ? BrandOpsTheme.spacing.md : 0,
          },
          style,
        ]}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
