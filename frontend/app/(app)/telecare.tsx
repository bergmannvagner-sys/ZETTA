import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Loading } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { hasPaidAccess } from "@/lib/billing";
import {
  TelecareProvider,
  TelecareSession,
  listTelecareProviders,
  listTelecareSessions,
  requestTelecareSession,
  updateTelecareSessionStatus
} from "@/lib/telecare";
import { useAuthStore } from "@/store/auth-store";

const CLINICAL_ROLES = new Set(["PSYCHOLOGIST", "CLINIC", "HOSPITAL"]);

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function statusTone(status: TelecareSession["status"]): "soft" | "success" | "warning" | "error" | "info" {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELED") return "error";
  if (status === "IN_SESSION") return "info";
  if (status === "ACCEPTED") return "warning";
  return "soft";
}

export default function Telecare() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const isClinicalProvider = Boolean(user?.role && CLINICAL_ROLES.has(user.role));
  const wideTelecare = width >= 840;
  const orbSize = wideTelecare ? Math.min(248, Math.max(190, width * 0.24)) : Math.min(226, Math.max(176, width * 0.58));
  const orbState = !hydrated ? "breathing" : !accessToken ? "calm" : isClinicalProvider ? "thinking" : "listening";
  const canLoadProtectedData = hydrated && Boolean(accessToken);
  const [notesByProvider, setNotesByProvider] = useState<Record<string, string>>({});

  const providers = useQuery({
    queryKey: ["telecare-providers"],
    queryFn: listTelecareProviders,
    enabled: !isClinicalProvider && canLoadProtectedData
  });

  const sessions = useQuery({
    queryKey: ["telecare-sessions"],
    queryFn: listTelecareSessions,
    enabled: canLoadProtectedData
  });

  const requestSession = useMutation({
    mutationFn: requestTelecareSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["telecare-sessions"] });
    }
  });

  const updateStatus = useMutation({
    mutationFn: updateTelecareSessionStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["telecare-sessions"] });
    }
  });

  const latestSessions = sessions.data ?? [];
  const openTelecareRoom = (sessionId: string) => {
    router.push({ pathname: "/(app)/telecare-room", params: { sessionId } } as never);
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero
          kicker={t("telecare.kicker")}
          title={t("telecare.title")}
          subtitle={t("telecare.subtitle")}
          orbState={orbState}
          orbSize={orbSize}
        />

        <Card>
          <View className="flex-row flex-wrap gap-2">
            <Badge label="Depende de backend" tone="info" />
            <Badge label="Vídeo via Daily" tone="warning" />
            <Badge label="Sessão rastreável" tone="success" />
          </View>
          <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">
            A consulta nasce no backend, usa Daily para o vídeo e mantém o repasse e o status da sessão visíveis.
            Não é um fluxo final isolado do restante do produto.
          </Text>
        </Card>

        {isClinicalProvider && !paidAccess ? (
          <View style={{ maxWidth: 760, width: "100%" }}>
            <PaidAccessGate user={user} resourceLabel={t("telecare.paidGate")} />
          </View>
        ) : (
          <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
            <View style={{ gap: 12 }}>
              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">
                  {isClinicalProvider ? t("telecare.professionalTitle") : t("telecare.userTitle")}
                </Text>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">
                  {isClinicalProvider ? t("telecare.professionalBody") : t("telecare.userBody")}
                </Text>
              </Card>

              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">{t("telecare.platformTitle")}</Text>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("telecare.platformBody")}</Text>
              </Card>

              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">{t("telecare.roomTitle")}</Text>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("telecare.roomBody")}</Text>
              </Card>
            </View>

            {hydrated && canLoadProtectedData ? (
              <ErrorText
                message={providers.error?.message ?? sessions.error?.message ?? requestSession.error?.message ?? updateStatus.error?.message}
              />
            ) : null}

            {!hydrated ? (
              <Loading label="common.loading" />
            ) : !accessToken ? (
              <Card>
                <AuthGate
                  title={t("telecare.authTitle")}
                  body={t("telecare.authBody")}
                  resourceLabel={t("telecare.title")}
                />
              </Card>
            ) : isClinicalProvider ? (
              <ProfessionalTelecarePanel
                sessions={latestSessions}
                loading={sessions.isLoading}
                openSession={openTelecareRoom}
                updateStatus={(sessionId, status) => updateStatus.mutate({ sessionId, status })}
                updating={updateStatus.isPending}
              />
            ) : (
              <UserTelecarePanel
                providers={providers.data ?? []}
                sessions={latestSessions}
                loading={providers.isLoading || sessions.isLoading}
                notesByProvider={notesByProvider}
                onNoteChange={(providerId, value) => setNotesByProvider((current) => ({ ...current, [providerId]: value }))}
                requestProvider={(provider) =>
                  requestSession.mutate({
                    provider_user_id: provider.id,
                    notes: notesByProvider[provider.id]
                  })
                }
                requesting={requestSession.isPending}
                cancelSession={(sessionId) => updateStatus.mutate({ sessionId, status: "CANCELED" })}
                canceling={updateStatus.isPending}
                openSession={openTelecareRoom}
                wideLayout={wideTelecare}
              />
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

function UserTelecarePanel({
  providers,
  sessions,
  loading,
  notesByProvider,
  onNoteChange,
  requestProvider,
  requesting,
  cancelSession,
  canceling,
  openSession,
  wideLayout
}: {
  providers: TelecareProvider[];
  sessions: TelecareSession[];
  loading: boolean;
  notesByProvider: Record<string, string>;
  onNoteChange: (providerId: string, value: string) => void;
  requestProvider: (provider: TelecareProvider) => void;
  requesting: boolean;
  cancelSession: (sessionId: string) => void;
  canceling: boolean;
  openSession: (sessionId: string) => void;
  wideLayout: boolean;
}) {
  const { t } = useI18n();

  if (loading) return <Loading label="telecare.loading" />;

  return (
    <View style={{ flexDirection: wideLayout ? "row" : "column", gap: wideLayout ? 20 : 18, alignItems: "flex-start" }}>
      <View style={{ flex: wideLayout ? 1.08 : undefined, gap: 12, minWidth: 0, width: "100%" }}>
        <Text className="text-xl font-semibold text-ink dark:text-white">{t("telecare.providersTitle")}</Text>
        {providers.map((provider) => (
          <Card key={provider.id}>
            <View className="gap-2">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text selectable className="text-lg font-semibold text-ink dark:text-white">{provider.full_name}</Text>
                <Badge label={provider.role} tone="info" />
              </View>
              <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">
                {t("telecare.priceLine", {
                  price: formatMoney(provider.session_price_brl),
                  fee: formatMoney(provider.platform_fee_brl)
                })}
              </Text>
              <Input
                label="telecare.notesLabel"
                multiline
                numberOfLines={3}
                onChangeText={(value) => onNoteChange(provider.id, value)}
                placeholder="telecare.notesPlaceholder"
                value={notesByProvider[provider.id] ?? ""}
              />
              <Button
                label="telecare.request"
                icon="send-outline"
                loading={requesting}
                onPress={() => requestProvider(provider)}
              />
            </View>
          </Card>
        ))}
        {providers.length === 0 ? (
          <EmptyState title="telecare.noProvidersTitle" body="telecare.noProvidersBody" />
        ) : null}
      </View>

      <View style={{ flex: wideLayout ? 0.92 : undefined, gap: 12, minWidth: 0, width: "100%" }}>
        <SessionList
          title="telecare.mySessions"
          sessions={sessions}
          emptyBody="telecare.noSessions"
          onCancel={cancelSession}
          canceling={canceling}
          onOpen={openSession}
        />
      </View>
    </View>
  );
}

function ProfessionalTelecarePanel({
  sessions,
  loading,
  updateStatus,
  updating,
  openSession
}: {
  sessions: TelecareSession[];
  loading: boolean;
  updateStatus: (sessionId: string, status: TelecareSession["status"]) => void;
  updating: boolean;
  openSession: (sessionId: string) => void;
}) {
  const { t } = useI18n();
  if (loading) return <Loading label="telecare.loading" />;

  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-ink dark:text-white">{t("telecare.requestsTitle")}</Text>
      {sessions.map((session) => (
        <Card key={session.id}>
          <SessionSummary session={session} />
          <View className="gap-2">
            {session.status === "ACCEPTED" || session.status === "IN_SESSION" ? (
              <Button label="telecare.joinRoom" icon="videocam-outline" onPress={() => openSession(session.id)} />
              ) : null}
              {session.status === "REQUESTED" ? (
              <Button
                label="telecare.accept"
                icon="checkmark-circle-outline"
                loading={updating}
                onPress={() => updateStatus(session.id, "ACCEPTED")}
              />
              ) : null}
              {session.status === "ACCEPTED" ? (
              <Button
                label="telecare.start"
                icon="play-circle-outline"
                loading={updating}
                onPress={() => updateStatus(session.id, "IN_SESSION")}
              />
              ) : null}
              {session.status === "IN_SESSION" ? (
              <Button
                label="telecare.finish"
                icon="checkmark-done-outline"
                loading={updating}
                onPress={() => updateStatus(session.id, "COMPLETED")}
              />
              ) : null}
              {session.status !== "COMPLETED" && session.status !== "CANCELED" ? (
              <Button
                label="telecare.cancel"
                icon="close-outline"
                tone="soft"
                loading={updating}
                onPress={() => updateStatus(session.id, "CANCELED")}
              />
              ) : null}
            </View>
        </Card>
      ))}
      {sessions.length === 0 ? (
        <EmptyState title="telecare.noRequestsTitle" body="telecare.noRequestsBody" />
      ) : null}
    </View>
  );
}

function SessionList({
  title,
  sessions,
  emptyBody,
  onCancel,
  canceling,
  onOpen
}: {
  title: string;
  sessions: TelecareSession[];
  emptyBody: string;
  onCancel: (sessionId: string) => void;
  canceling: boolean;
  onOpen: (sessionId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-ink dark:text-white">{t(title)}</Text>
      {sessions.map((session) => (
        <Card key={session.id}>
          <SessionSummary session={session} />
          {session.status === "ACCEPTED" || session.status === "IN_SESSION" ? (
            <Button label="telecare.joinRoom" icon="videocam-outline" onPress={() => onOpen(session.id)} />
            ) : null}
            {session.status !== "COMPLETED" && session.status !== "CANCELED" ? (
            <Button
              label="telecare.cancel"
              icon="close-outline"
              tone="soft"
              loading={canceling}
              onPress={() => onCancel(session.id)}
            />
            ) : null}
          </Card>
      ))}
      {sessions.length === 0 ? <EmptyState title="telecare.noSessionsTitle" body={emptyBody} /> : null}
    </View>
  );
}

function SessionSummary({ session }: { session: TelecareSession }) {
  const { t } = useI18n();
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text selectable className="text-lg font-semibold text-ink dark:text-white">
          {session.provider_name}
        </Text>
        <Badge label={session.status} tone={statusTone(session.status)} />
      </View>
      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
        {t("telecare.roomCode", { code: session.room_code })}
      </Text>
      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
        {t("telecare.sessionFinancial", {
          price: formatMoney(session.session_price_brl),
          fee: formatMoney(session.platform_fee_brl),
          payout: formatMoney(session.provider_payout_brl)
        })}
      </Text>
      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
        {t("telecare.paymentStatus", { status: session.payment_status })}
      </Text>
      {session.notes ? (
        <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          {session.notes}
        </Text>
      ) : null}
    </View>
  );
}
