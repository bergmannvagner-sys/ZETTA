import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { formatDocumentInput, getDocumentProgress, getDocumentRequirement, register } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types/auth";

const roleLabels: Record<UserRole, string> = {
  USER: "Pessoa fisica",
  PSYCHOLOGIST: "Psicologo",
  COMPANY: "Empresa",
  NGO: "ONG",
  HOSPITAL: "Hospital",
  CLINIC: "Clinica",
  SPONSOR: "Patrocinador",
  PUBLIC_INSTITUTION: "Instituicao publica",
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
      router.replace(data.user.status === "ACTIVE" ? "/(app)/consent" : "/(app)/verification");
    }
  });

  return (
    <Screen>
      <View className="gap-2 pt-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">CRIAR CONTA</Text>
        <Text className="text-3xl font-semibold text-white">Cadastro</Text>
        <Text className="text-base text-muted">Tipo de conta: {roleLabels[role]}</Text>
      </View>
      <Field label="Nome completo" value={fullName} onChangeText={setFullName} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
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
          <Text className="text-xs leading-5 text-muted">{documentRequirement.helper}</Text>
          <Text className="text-xs leading-5 text-muted">
            Formato: {documentRequirement.example} - {getDocumentProgress(role, document)}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: lgpdConsent }}
        onPress={() => setLgpdConsent((current) => !current)}
        className="flex-row items-start gap-3 rounded-xl border border-white/10 bg-surface/55 p-4"
      >
        <View
          className={`mt-1 h-5 w-5 items-center justify-center rounded-md border ${
            lgpdConsent ? "border-mint bg-mint" : "border-white/20"
          }`}
        >
          {lgpdConsent ? <View className="h-2 w-2 rounded-full bg-ink" /> : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-muted">
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
    </Screen>
  );
}
