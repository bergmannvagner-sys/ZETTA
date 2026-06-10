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
};

export function Button({ label, onPress, tone = "primary", loading, disabled, compact }: ButtonProps) {
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
      ? colors.primaryLight
    : tone === "danger"
        ? colors.error
        : tone === "soft"
          ? colors.primary
          : colors.primaryLight;
  const textColor =
    tone === "danger" ? colors.textPrimary : colors.textPrimary;
  const loadingColor = colors.textPrimary;
  const minHeight = compact ? touchTarget.comfortable : Math.max(touchTarget.comfortable, Platform.OS === "ios" ? touchTarget.ios : touchTarget.android);

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
        borderWidth: tone === "ghost" ? 1.5 : 1.5,
        boxShadow:
          tone === "primary"
            ? `0 14px 32px ${colors.shadowStrong}`
            : `0 10px 26px ${colors.shadow}`,
        justifyContent: "center",
        minHeight,
        minWidth: 48,
        opacity: isDisabled ? 0.62 : pressed ? 0.86 : 1,
        paddingHorizontal: 20,
        paddingVertical: compact ? 10 : 14,
        transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        width: "100%"
      })}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <Text style={{ color: textColor, fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "center" }}>
          {t(label)}
        </Text>
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
      <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600", lineHeight: 20 }}>
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
          fontSize: 16,
          lineHeight: 22,
          minHeight: props.multiline ? 136 : 56,
          paddingHorizontal: 18,
          paddingVertical: props.multiline ? 16 : 0,
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
        boxShadow: `0 16px 40px ${colors.shadow}`,
        gap: 12,
        paddingBottom: 22,
        paddingLeft: 20,
        paddingRight: 22,
        paddingTop: 18
      }}
    >
      {children}
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
            width: "100%"
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
            height: 4,
            opacity: 0.78,
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
          fontWeight: "800",
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
          height: 3,
          opacity: 0.74,
          width: isMobile ? 38 : 52
        }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: "800",
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
