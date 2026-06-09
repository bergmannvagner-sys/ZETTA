import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { hasPaidAccess } from "@/lib/billing";
import { AuthorizedUserSummary, listAuthorizedUsers } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

export default function ProfessionalUsers() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const users = useQuery({
    queryKey: ["professional-authorized-users"],
    queryFn: listAuthorizedUsers,
    enabled: user?.role === "PSYCHOLOGIST" && paidAccess
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Acompanhamento"
          title="Usuários autorizados"
          subtitle="Aqui aparecem apenas pessoas que autorizaram compartilhamento. Use como apoio de consulta, não como diagnóstico."
          orbState="silent_presence"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 14 }}>
          {user?.role !== "PSYCHOLOGIST" || !paidAccess ? (
            <PaidAccessGate user={user} resourceLabel="Acompanhamento de usuários autorizados" />
          ) : (
            <>
              {users.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando autorizações...</Text> : null}
              <ErrorText message={users.error?.message} />

              <View className="gap-3">
                {users.data?.map((item: AuthorizedUserSummary) => (
                  <Card key={item.user_id}>
                    <Text selectable className="text-base font-semibold text-ink dark:text-white">{item.full_name}</Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{item.email}</Text>
                    <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                      Categorias: {item.categories.join(", ")}
                    </Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Compartilhamento: {item.summary_only ? "apenas resumo" : "detalhes autorizados"}
                    </Text>
                    {item.latest_mood ? (
                      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Humor recente: {item.latest_mood}</Text>
                    ) : null}
                    {item.average_intensity !== null ? (
                      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                        Intensidade media: {item.average_intensity}
                      </Text>
                    ) : null}
                    {item.journal_entries_visible > 0 ? (
                      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                        Entradas de diário autorizadas: {item.journal_entries_visible}
                      </Text>
                    ) : null}
                    <Button
                      label="Ver acompanhamento"
                      tone="soft"
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/professional-user-detail" as never,
                          params: { userId: item.user_id }
                        })
                      }
                    />
                  </Card>
                ))}
                {users.data?.length === 0 ? (
                  <Card>
                    <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">
                      Nenhum usuário autorizou compartilhamento ainda. O controle deve partir sempre da pessoa atendida.
                    </Text>
                  </Card>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
