import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { AuthorizedUserSummary, listAuthorizedUsers } from "@/lib/emotional";

export default function ProfessionalUsers() {
  const users = useQuery({ queryKey: ["professional-authorized-users"], queryFn: listAuthorizedUsers });

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">ACOMPANHAMENTO</Text>
        <Text className="text-3xl font-semibold text-white">Usuarios autorizados</Text>
        <Text className="text-base leading-6 text-muted">
          Aqui aparecem apenas pessoas que autorizaram compartilhamento. Use como apoio de consulta, nao como diagnostico.
        </Text>
      </View>

      {users.isLoading ? <Text className="text-muted">Carregando autorizacoes...</Text> : null}
      <ErrorText message={users.error?.message} />

      <View className="gap-3">
        {users.data?.map((item: AuthorizedUserSummary) => (
          <Card key={item.user_id}>
            <Text selectable className="text-base font-semibold text-white">{item.full_name}</Text>
            <Text selectable className="text-sm text-muted">{item.email}</Text>
            <Text selectable className="text-sm leading-5 text-muted">
              Categorias: {item.categories.join(", ")}
            </Text>
            <Text selectable className="text-sm text-muted">
              Compartilhamento: {item.summary_only ? "apenas resumo" : "detalhes autorizados"}
            </Text>
            {item.latest_mood ? (
              <Text selectable className="text-sm text-muted">Humor recente: {item.latest_mood}</Text>
            ) : null}
            {item.average_intensity !== null ? (
              <Text selectable className="text-sm text-muted">Intensidade media: {item.average_intensity}</Text>
            ) : null}
            {item.journal_entries_visible > 0 ? (
              <Text selectable className="text-sm text-muted">
                Entradas de diario autorizadas: {item.journal_entries_visible}
              </Text>
            ) : null}
          </Card>
        ))}
        {users.data?.length === 0 ? (
          <Card>
            <Text className="text-base leading-6 text-muted">
              Nenhum usuario autorizou compartilhamento ainda. O controle deve partir sempre da pessoa atendida.
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
