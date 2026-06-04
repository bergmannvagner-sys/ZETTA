import { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View } from "react-native";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  tone?: "primary" | "soft" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, tone = "primary", loading, disabled }: ButtonProps) {
  const isDisabled = loading || disabled;
  const color =
    tone === "danger"
      ? "border border-violet/45 bg-violet/30"
      : tone === "soft"
        ? "border border-lilac/15 bg-surface/70"
        : "border border-mint/40 bg-mint";
  const text = tone === "primary" ? "text-ink" : "text-white";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      className={`${color} min-h-14 items-center justify-center rounded-2xl px-5 ${isDisabled ? "opacity-70" : ""}`}
    >
      {loading ? <ActivityIndicator /> : <Text className={`${text} text-base font-semibold`}>{label}</Text>}
    </Pressable>
  );
}

type FieldProps = Pick<
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

export function Field(props: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">{props.label}</Text>
      <TextInput
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#7D86A8"
        className={`rounded-2xl border border-white/10 bg-surface/85 px-4 text-base text-white ${
          props.multiline ? "min-h-32 py-4" : "min-h-14"
        }`}
      />
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-xl border border-lilac/10 bg-surface/60 p-4">{children}</View>;
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  const friendlyMessage =
    message === "Network request failed"
      ? "Nao foi possivel conectar ao servidor. Verifique sua internet ou a configuracao da API."
      : message;
  return (
    <View className="rounded-xl border border-rose/20 bg-rose/10 px-4 py-3">
      <Text selectable className="text-sm leading-5 text-rose">
        {friendlyMessage}
      </Text>
    </View>
  );
}
