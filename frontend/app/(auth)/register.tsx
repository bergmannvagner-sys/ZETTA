import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { formatDocumentInput, getDocumentProgress, getDocumentRequirement, register } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";

const roleLabels: Record<UserRole, string> = {
  USER: "Pessoa física",
  PSYCHOLOGIST: "Psicólogo",
  COMPANY: "Empresa",
  NGO: "ONG",
  HOSPITAL: "Hospital",
  CLINIC: "Clínica",
  SPONSOR: "Patrocinador",
  PUBLIC_INSTITUTION: "Instituição pública",
  SUPER_ADMIN: "Administrador"
};

export default function Register() {
  const params = useLocalSearchParams<{ role?: UserRole }>();
  const role = params.role && params.role !== "SUPER_ADMIN" ? params.role : "USER";
  const setSession = useAuthStore((state) => state.setSession);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState("");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const documentRequirement = getDocumentRequirement(role);
  const updateDocument = (value: string) => {
    setDocument(formatDocumentInput(role, value));
  };

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (data) => {
      await setSession(data.access_token, data.refresh_token, data.user);
      router.replace(data.user.status === "ACTIVE" ? "/(app)/home" : "/(app)/verification");
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker="Criar conta"
          orbSize={200}
          subtitle={`Tipo de conta: ${roleLabels[role]}`}
          title="Cadastro"
        />

        <View style={{ maxWidth: 560, minWidth: 0, width: "100%" }}>
          <View className="gap-3">
            <Field label="Nome completo" value={fullName} onChangeText={setFullName} />
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            <View className="gap-2">
              <Field
                label={documentRequirement.label}
                value={document}
                onChangeText={updateDocument}
                keyboardType={documentRequirement.type === "CRP" ? "default" : "number-pad"}
                maxLength={documentRequirement.maxLength}
              />
              <View className="gap-1">
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">{documentRequirement.helper}</Text>
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Formato: {documentRequirement.example} - {getDocumentProgress(role, document)}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: lgpdConsent }}
              onPress={() => setLgpdConsent((current) => !current)}
              className="flex-row items-start gap-3 rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55 p-4"
            >
              <View
                className={`mt-1 h-5 w-5 items-center justify-center rounded-md border ${
                  lgpdConsent ? "border-primary bg-primaryLight" : "border-primaryLight dark:border-[#4C1D95]/50"
                }`}
              >
                {lgpdConsent ? <View className="h-2 w-2 rounded-full bg-background dark:bg-[#120F1F]" /> : null}
              </View>
              <Text className="flex-1 text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Li e aceito o tratamento dos meus dados para criar a conta e usar o suporte emocional do Bergmann.
              </Text>
            </Pressable>
            <ErrorText message={mutation.error?.message} />
            <Button
              label="Criar conta"
              loading={mutation.isPending}
              onPress={() =>
                mutation.mutate({ email, full_name: fullName, password, role, document, lgpdConsent })
              }
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
