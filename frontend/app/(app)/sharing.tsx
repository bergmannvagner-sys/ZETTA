import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import {
  createSharingConsent,
  listSharingConsents,
  revokeSharingConsent,
  SharingConsent,
  SharingCategory
} from "@/lib/emotional";

const categoryLabels: Array<{ value: SharingCategory; label: string; helper: string }> = [
  { value: "AI_SUMMARY", label: "Resumo IA", helper: "Sintese sem conversa completa." },
  { value: "TRENDS", label: "Tendencias", helper: "Padroes e medias autorizadas." },
  { value: "MOOD", label: "Humor", helper: "Estado emocional registrado." },
  { value: "CRISIS", label: "Crises", helper: "Sinais importantes autorizados." },
  { value: "JOURNAL", label: "Diario", helper: "Use com muito cuidado." }
];

function toggleCategory(current: SharingCategory[], category: SharingCategory): SharingCategory[] {
  if (current.includes(category)) {
    return current.filter((item) => item !== category);
  }
  return [...current, category];
}

export default function Sharing() {
  const queryClient = useQueryClient();
  const [targetEmail, setTargetEmail] = useState("");
  const [categories, setCategories] = useState<SharingCategory[]>(["AI_SUMMARY", "TRENDS"]);
  const [summaryOnly, setSummaryOnly] = useState(true);
  const consents = useQuery({ queryKey: ["sharing-consents"], queryFn: listSharingConsents });
  const grant = useMutation({
    mutationFn: createSharingConsent,
    onSuccess: async () => {
      setTargetEmail("");
      await queryClient.invalidateQueries({ queryKey: ["sharing-consents"] });
    }
  });
  const revoke = useMutation({
    mutationFn: revokeSharingConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sharing-consents"] });
    }
  });

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">CONTROLE</Text>
        <Text className="text-3xl font-semibold text-white">Compartilhamento</Text>
        <Text className="text-base leading-6 text-muted">
          Voce decide o que compartilhar, com quem e pode revogar quando quiser.
        </Text>
      </View>

      <Field
        label="Email do psicologo ou empresa"
        value={targetEmail}
        onChangeText={setTargetEmail}
        keyboardType="email-address"
        maxLength={320}
      />

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted">Categorias autorizadas</Text>
        {categoryLabels.map((item) => {
          const active = categories.includes(item.value);
          return (
            <Pressable
              key={item.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              onPress={() => setCategories((current) => toggleCategory(current, item.value))}
              className={`rounded-xl border p-4 ${
                active ? "border-mint/50 bg-mint/10" : "border-white/10 bg-surface/55"
              }`}
            >
              <Text className="text-base font-semibold text-white">{item.label}</Text>
              <Text className="text-sm leading-5 text-muted">{item.helper}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: summaryOnly }}
        onPress={() => setSummaryOnly((current) => !current)}
        className="rounded-xl border border-white/10 bg-surface/55 p-4"
      >
        <Text className="text-base font-semibold text-white">
          {summaryOnly ? "Compartilhar apenas resumo" : "Permitir detalhes das categorias escolhidas"}
        </Text>
        <Text className="text-sm leading-5 text-muted">
          Recomendo manter apenas resumo para reduzir exposicao de dados sensiveis.
        </Text>
      </Pressable>

      <ErrorText message={grant.error?.message} />
      <Button
        label="Autorizar compartilhamento"
        loading={grant.isPending}
        onPress={() => grant.mutate({ target_email: targetEmail, categories, summary_only: summaryOnly })}
      />

      <View className="gap-3">
        <Text className="text-base font-semibold text-white">Autorizacoes</Text>
        {consents.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
        <ErrorText message={consents.error?.message ?? revoke.error?.message} />
        {consents.data?.map((consent: SharingConsent) => (
          <Card key={consent.id}>
            <Text selectable className="text-base font-semibold text-white">{consent.target_email}</Text>
            <Text selectable className="text-sm text-muted">Perfil: {consent.target_role}</Text>
            <Text selectable className="text-sm leading-5 text-muted">
              Categorias: {consent.categories.join(", ")}
            </Text>
            <Text selectable className="text-sm text-muted">
              Status: {consent.revoked_at ? "revogado" : "ativo"}
            </Text>
            {!consent.revoked_at ? (
              <Button
                label="Revogar"
                tone="soft"
                loading={revoke.isPending}
                onPress={() => revoke.mutate(consent.id)}
              />
            ) : null}
          </Card>
        ))}
        {consents.data?.length === 0 ? <Text className="text-muted">Nenhuma autorizacao ativa.</Text> : null}
      </View>
    </Screen>
  );
}
