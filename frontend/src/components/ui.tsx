import { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal as NativeModal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { touchTarget, useAppTheme, useResponsiveLayout, radii } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { getSurfaceRadii } from "@/design-system/theme";
export { ScreenContainer } from "./screen";

type ButtonTone = "primary" | "soft" | "danger" | "ghost";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
};

export function Button({
  label,
  onPress,
  tone = "primary",
  loading,
  disabled,
  compact,
  icon,
  iconPosition = "left"
}: ButtonProps) {
  const { colors } = useAppTheme();
  const { width } = useResponsiveLayout();
  const { t } = useI18n();
  const isDisabled = loading || disabled;
  const radii = getSurfaceRadii(width, "control");
  const backgroundColor =
    tone === "primary"
      ? colors.gradientEnd
      : tone === "danger"
        ? colors.error
        : tone === "soft"
          ? colors.surfaceStrong
          : "transparent";
  const borderColor =
    tone === "primary"
      ? "rgba(255,255,255,0.18)"
      : tone === "danger"
        ? colors.error
        : tone === "soft"
          ? colors.primaryLight
          : colors.primaryLight;
  const textColor = tone === "ghost" ? colors.primaryLight : colors.textPrimary;
  const loadingColor = textColor;
  const minHeight = compact ? touchTarget.comfortable : Math.max(touchTarget.comfortable, Platform.OS === "ios" ? touchTarget.ios : touchTarget.android);
  const shineColor = tone === "primary" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)";
  const shadowColor = tone === "primary" ? colors.info : tone === "danger" ? colors.error : colors.shadowStrong;
  const iconSize = compact ? 16 : 17;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor,
        borderColor,
        borderCurve: "continuous",
        borderBottomLeftRadius: radii.bottomLeft,
        borderBottomRightRadius: radii.bottomRight,
        borderTopLeftRadius: radii.topLeft,
        borderTopRightRadius: radii.topRight,
        borderWidth: 1.25,
        boxShadow: tone === "ghost" ? "none" : `0 14px 34px ${shadowColor}40`,
        justifyContent: "center",
        minHeight,
        minWidth: 48,
        opacity: isDisabled ? 0.62 : pressed ? 0.86 : 1,
        paddingHorizontal: compact ? 14 : 16,
        paddingVertical: compact ? 10 : 11,
        transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        width: "100%",
        overflow: "hidden"
      })}
    >
      <View
        pointerEvents="none"
        style={{
          backgroundColor: shineColor,
          height: 18,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <View
          style={{
            alignItems: "center",
            flexDirection: iconPosition === "right" ? "row-reverse" : "row",
            gap: icon ? 10 : 0,
            justifyContent: "center",
            maxWidth: "100%",
            minWidth: 0
          }}
        >
          {icon ? <Ionicons name={icon} color={textColor} size={iconSize} /> : null}
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={{
              color: textColor,
              flexShrink: 1,
              fontSize: compact ? 14 : 14.5,
              fontWeight: "800",
              lineHeight: compact ? 18 : 19,
              minWidth: 0,
              textAlign: "center"
            }}
          >
            {t(label)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type InputProps = Pick<
  TextInputProps,
  | "autoCapitalize"
  | "keyboardType"
  | "maxLength"
  | "multiline"
  | "numberOfLines"
  | "placeholder"
  | "secureTextEntry"
  | "textAlignVertical"
  | "textContentType"
> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

export function Input(props: InputProps) {
  const { colors } = useAppTheme();
  const { width } = useResponsiveLayout();
  const { t } = useI18n();
  const radii = getSurfaceRadii(width, "control");
  const placeholder = props.placeholder ? t(props.placeholder) : undefined;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
        {t(props.label)}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={t(props.label)}
        placeholder={placeholder}
        autoCapitalize={props.autoCapitalize ?? "none"}
        autoCorrect={false}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderBottomLeftRadius: radii.bottomLeft,
          borderBottomRightRadius: radii.bottomRight,
          borderTopLeftRadius: radii.topLeft,
          borderTopRightRadius: radii.topRight,
          borderWidth: 1,
          color: colors.textPrimary,
          fontSize: 14.5,
          lineHeight: 20,
          minHeight: props.multiline ? 144 : 54,
          paddingHorizontal: 16,
          paddingVertical: props.multiline ? 16 : 12,
          textAlignVertical: props.textAlignVertical ?? (props.multiline ? "top" : "center")
        }}
      />
    </View>
  );
}

export const Field = Input;

export function Card({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const { width } = useResponsiveLayout();
  const radii = getSurfaceRadii(width, "card");
  return (
    <View
      style={{
        backgroundColor: colors.glass,
        borderColor: colors.border,
        borderCurve: "continuous",
        borderBottomLeftRadius: radii.bottomLeft,
        borderBottomRightRadius: radii.bottomRight,
        borderTopLeftRadius: radii.topLeft,
        borderTopRightRadius: radii.topRight,
        borderWidth: 1,
        boxShadow: `0 12px 28px ${colors.shadowStrong}`,
        overflow: "hidden"
      }}
    >
      <View style={{ gap: 12, paddingBottom: 18, paddingLeft: 18, paddingRight: 18, paddingTop: 16 }}>{children}</View>
    </View>
  );
}

type AppModalProps = {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ visible, title, children, onClose }: AppModalProps) {
  const { colors } = useAppTheme();
  const { width } = useResponsiveLayout();
  const radii = getSurfaceRadii(width, "card");

  return (
    <NativeModal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.overlay,
          flex: 1,
          justifyContent: "center",
          padding: 24
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderCurve: "continuous",
            borderBottomLeftRadius: radii.bottomLeft,
            borderBottomRightRadius: radii.bottomRight,
            borderTopLeftRadius: radii.topLeft,
            borderTopRightRadius: radii.topRight,
            borderWidth: 1,
            gap: 16,
            maxWidth: 520,
            padding: 24,
            width: "100%",
            boxShadow: `0 20px 42px ${colors.shadowStrong}`
          }}
        >
          {title ? (
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>
              {title}
            </Text>
          ) : null}
          {children}
          <Button label="Fechar" tone="soft" onPress={onClose} />
        </View>
      </View>
    </NativeModal>
  );
}

export function Badge({ label, tone = "soft" }: { label: string; tone?: "soft" | "success" | "warning" | "error" | "info" }) {
  const { colors } = useAppTheme();
  const palette = {
    soft: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info
  };
  const color = palette[tone];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: `${color}18`,
        borderColor: `${color}55`,
        borderRadius: radii.pill,
        borderWidth: 1,
        boxShadow: `0 8px 20px ${colors.shadow}`,
        paddingHorizontal: 12,
        paddingVertical: 7
      }}
    >
      <Text style={{ color, fontSize: 14, fontWeight: "700", letterSpacing: 0.4, lineHeight: 18 }}>{label}</Text>
    </View>
  );
}

export function Loading({ label = "Carregando..." }: { label?: string }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  return (
    <View style={{ alignItems: "center", gap: 12, justifyContent: "center", minHeight: 128 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{t(label)}</Text>
    </View>
  );
}

export function EmptyState({
  title = "Nada por aqui ainda",
  body
}: {
  title?: string;
  body?: string;
}) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  return (
    <Card>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", lineHeight: 24 }}>
        {t(title)}
      </Text>
      {body ? (
        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23 }}>{t(body)}</Text>
      ) : null}
    </Card>
  );
}

export function Header({
  align = "left",
  kicker,
  title,
  subtitle
}: {
  align?: "left" | "center";
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useAppTheme();
  const { isMobile, width } = useResponsiveLayout();
  const centered = align === "center";
  const titleSize = isMobile ? (width <= 360 ? 30 : 34) : 42;
  return (
    <View style={{ gap: 10, alignItems: centered ? "center" : "flex-start" }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 10, justifyContent: centered ? "center" : "flex-start" }}>
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 999,
            boxShadow: `0 0 18px ${colors.primary}55`,
            height: 4,
            opacity: 0.92,
            width: isMobile ? 42 : 60
          }}
        />
        {kicker ? (
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              fontWeight: "800",
              letterSpacing: 4,
              textAlign: centered ? "center" : "left"
            }}
          >
            {kicker}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: titleSize,
          fontWeight: "900",
          lineHeight: Math.round(titleSize * 1.16),
          textAlign: centered ? "center" : "left"
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
        style={{
          color: colors.textSecondary,
          fontSize: 17,
          lineHeight: 27,
          textAlign: centered ? "center" : "left"
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionTitle({
  align = "left",
  title,
  subtitle
}: {
  align?: "left" | "center";
  title: string;
  subtitle?: string;
}) {
  const { colors } = useAppTheme();
  const { isMobile } = useResponsiveLayout();
  const centered = align === "center";
  return (
    <View style={{ gap: 6, alignItems: centered ? "center" : "flex-start" }}>
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: 999,
          boxShadow: `0 0 14px ${colors.primary}44`,
          height: 3,
          opacity: 0.9,
          width: isMobile ? 38 : 52
        }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: "900",
          lineHeight: 24,
          textAlign: centered ? "center" : "left"
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 21,
            textAlign: centered ? "center" : "left"
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorText({ message }: { message?: string }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  if (!message) return null;
  const isNetworkError = message === "Network request failed" || /failed to fetch/i.test(message);
  const friendlyMessage = isNetworkError ? t("error.network") : t(message);
  return (
      <View
        style={{
          backgroundColor: `${colors.error}12`,
          borderColor: `${colors.error}35`,
          borderRadius: radii.md,
          borderWidth: 1,
          boxShadow: `0 10px 24px ${colors.shadow}`,
          paddingHorizontal: 16,
          paddingVertical: 14
        }}
    >
      <Text selectable style={{ color: colors.error, fontSize: 14, lineHeight: 21 }}>
        {friendlyMessage}
      </Text>
    </View>
  );
}
