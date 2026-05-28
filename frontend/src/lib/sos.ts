import { apiRequest } from "@/lib/api";

export type SOSResponse = {
  id: string | null;
  safety_message: string;
};

export const SOS_SAFETY_MESSAGE =
  "Evento SOS registrado. Se voce estiver em risco imediato, ligue para a emergencia local agora. No Brasil, o CVV atende pelo 188. Tente ficar perto de alguem de confianca e afastar objetos perigosos.";

export const SOS_OFFLINE_MESSAGE =
  "Se voce estiver em risco imediato, ligue para a emergencia local agora. No Brasil, o CVV atende pelo 188. Tente ficar perto de alguem de confianca e afastar objetos perigosos.";

export async function registerSOSEvent(): Promise<SOSResponse> {
  const data = await apiRequest<SOSResponse>("/sos/event", {
    method: "POST",
    body: JSON.stringify({ intensity: "HIGH", message: "SOS acionado no app" })
  });
  return data.safety_message ? data : { ...data, safety_message: SOS_SAFETY_MESSAGE };
}
