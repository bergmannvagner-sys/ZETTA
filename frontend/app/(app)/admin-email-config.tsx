import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { EmailConfig } from "@/types/auth";

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink/35 px-4 py-3">
      <Text className="flex-1 text-sm text-white">{label}</Text>
      <Text className={`text-sm font-semibold ${ok ? "text-mint" : "text-rose"}`}>
        {ok ? "Configurado" : "Pendente"}
      </Text>
    </View>
  );
}

export default function AdminEmailConfig() {
  const user = useAuthStore((state) => state.user);
  const config = useQuery({
    queryKey: ["admin-email-config"],
    queryFn: () => apiRequest<EmailConfig>("/admin/email-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  const data = config.data;

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">SEGURANCA</Text>
        <Text className="text-3xl font-semibold text-white">Configuração de email</Text>
        <Text className="text-base leading-6 text-muted">
          Verifique o SMTP usado pela recuperação de senha. Segredos nunca aparecem nesta tela.
        </Text>
      </View>

      <ErrorText message={config.error?.message} />
      {config.isLoading ? <Text className="text-muted">Carregando...</Text> : null}

      {data ? (
        <>
          <Card>
            <Text className="text-lg font-semibold text-white">
              {data.smtp_configured ? "SMTP pronto para produção" : "SMTP ainda incompleto"}
            </Text>
            <Text className="text-sm leading-5 text-muted">
              Porta configurada: {data.smtp_port}. TLS: {data.smtp_use_tls ? "ativo" : "desativado"}.
            </Text>
            <StatusLine label="SMTP_HOST" ok={data.smtp_host_configured} />
            <StatusLine label="SMTP_USERNAME" ok={data.smtp_username_configured} />
            <StatusLine label="SMTP_PASSWORD" ok={data.smtp_password_configured} />
            <StatusLine label="SMTP_FROM_EMAIL" ok={data.smtp_from_email_configured} />
            <StatusLine label="PASSWORD_RESET_URL" ok={data.password_reset_url_configured} />
          </Card>

          <Card>
            <Text className="text-lg font-semibold text-white">Checklist Render</Text>
            {data.required_env_names.map((name: string) => (
              <Text key={name} selectable className="text-sm leading-6 text-muted">
                - {name}
              </Text>
            ))}
            <Text className="text-xs leading-5 text-muted">
              Após configurar, rode o smoke de recuperação localmente e confirme o recebimento do email.
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
