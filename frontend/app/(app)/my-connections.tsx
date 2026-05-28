import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import {
  createSharingConsent,
  listSharingConsents,
  revokeSharingConsent,
  SharingCategory,
  SharingConsent
} from "@/lib/emotional";

const categoryLabels: Array<{ value: SharingCategory; label: string }> = [
  { value: "AI_SUMMARY", label: "Resumo IA" },
  { value: "TRENDS", label: "Tendencias" },
  { value: "MOOD", label: "Humor" },
  { value: "CRISIS", label: "Crises" },
  { value: "JOURNAL", label: "Diario" }
];

function toggleCategory(current: SharingCategory[], category: SharingCategory): SharingCategory[] {
  if (current.includes(category)) {
    return current.filter((item) => item !== category);
  }
  return [...current, category];
}

function ConnectionCard({ consent }: { consent: SharingConsent }) {
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<SharingCategory[]>(consent.categories);
  const [summaryOnly, setSummaryOnly] = useState(consent.summary_only);
  const active = !consent.revoked_at;
  const update = useMutation({
    mutationFn: createSharingConsent,
    onSuccess: async () => {
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
    <Card>
      <View className="gap-1">
        <Text selectable className="text-base font-semibold text-white">{consent.target_email}</Text>
        <Text selectable className="text-sm text-muted">Perfil: {consent.target_role}</Text>
        <Text selectable className="text-sm text-muted">Status: {active ? "ativo" : "revogado"}</Text>
      </View>

      {active ? (
        <View className="gap-3">
          <Text className="text-sm font-medium text-muted">Categorias compartilhadas</Text>
          <View className="flex-row flex-wrap gap-2">
            {categoryLabels.map((item) => {
              const selected = categories.includes(item.value);
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setCategories((current) => toggleCategory(current, item.value))}
                  className={`rounded-full border px-4 py-3 ${
                    selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
                  }`}
                >
                  <Text className={selected ? "font-semibold text-ink" : "text-white"}>{item.label}</Text>
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
              {summaryOnly ? "Apenas resumo" : "Detalhes autorizados"}
            </Text>
            <Text className="text-sm leading-5 text-muted">
              Use detalhes somente quando fizer sentido para acompanhamento real.
            </Text>
          </Pressable>

          <ErrorText message={update.error?.message || revoke.error?.message} />
          <Button
            label="Salvar alteracoes"
            loading={update.isPending}
            disabled={categories.length === 0}
            onPress={() =>
              update.mutate({
                target_email: consent.target_email,
                categories,
                summary_only: summaryOnly
              })
            }
          />
          <Button
            label="Revogar vinculo"
            tone="soft"
            loading={revoke.isPending}
            onPress={() => revoke.mutate(consent.id)}
          />
        </View>
      ) : (
        <Text className="text-sm leading-5 text-muted">
          Este vinculo foi revogado. Nenhum novo dado deve ser compartilhado por esta autorizacao.
        </Text>
      )}
    </Card>
  );
}

export default function MyConnections() {
  const consents = useQuery({ queryKey: ["sharing-consents"], queryFn: listSharingConsents });
  const activeConsents = consents.data?.filter((item: SharingConsent) => !item.revoked_at) ?? [];
  const revokedConsents = consents.data?.filter((item: SharingConsent) => item.revoked_at) ?? [];

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">VINCULOS</Text>
        <Text className="text-3xl font-semibold text-white">Meus vinculos</Text>
        <Text className="text-base leading-6 text-muted">
          Veja quem pode receber seus dados emocionais, ajuste categorias ou revogue acesso quando quiser.
        </Text>
      </View>

      {consents.isLoading ? <Text className="text-muted">Carregando vinculos...</Text> : null}
      <ErrorText message={consents.error?.message} />

      <View className="gap-3">
        <Text className="text-base font-semibold text-white">Ativos</Text>
        {activeConsents.map((consent: SharingConsent) => (
          <ConnectionCard key={consent.id} consent={consent} />
        ))}
        {activeConsents.length === 0 ? (
          <Card>
            <Text className="text-base leading-6 text-muted">
              Nenhum vinculo ativo. Conecte um psicologo ou empresa pela tela de compartilhamento.
            </Text>
          </Card>
        ) : null}
      </View>

      {revokedConsents.length ? (
        <View className="gap-3">
          <Text className="text-base font-semibold text-white">Revogados</Text>
          {revokedConsents.map((consent: SharingConsent) => (
            <ConnectionCard key={consent.id} consent={consent} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
