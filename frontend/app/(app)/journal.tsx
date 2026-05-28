import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { createJournalEntry, JournalEntry, listJournalEntries } from "@/lib/emotional";

function tagList(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export default function Journal() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });
  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: async () => {
      setContent("");
      setTags("");
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    }
  });

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">DIARIO</Text>
        <Text className="text-3xl font-semibold text-white">Diario emocional</Text>
        <Text className="text-base leading-6 text-muted">
          Escreva sem pressa. Este espaco e seu e so sera compartilhado se voce autorizar.
        </Text>
      </View>

      <Field
        label="Como voce se sente ou o que aconteceu?"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={6000}
      />
      <Field
        label="Marcadores opcionais"
        value={tags}
        onChangeText={setTags}
        placeholder="ansiedade, sono, vitoria"
        maxLength={180}
      />
      <ErrorText message={mutation.error?.message} />
      <Button
        label="Salvar no diario"
        loading={mutation.isPending}
        onPress={() => mutation.mutate({ content, tags: tagList(tags) })}
      />

      <View className="gap-3">
        <Text className="text-base font-semibold text-white">Registros recentes</Text>
        {entries.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
        <ErrorText message={entries.error?.message} />
        {entries.data?.slice(0, 3).map((entry: JournalEntry) => (
          <Card key={entry.id}>
            <Text selectable className="text-base leading-6 text-white">{entry.content}</Text>
            {entry.tags.length ? (
              <Text selectable className="text-xs text-muted">{entry.tags.join(" · ")}</Text>
            ) : null}
          </Card>
        ))}
        {entries.data?.length === 0 ? <Text className="text-muted">Nenhum registro ainda.</Text> : null}
      </View>
    </Screen>
  );
}
