import { PaymentResult } from "@/components/payment-result";

export default function PaymentError() {
  return (
    <PaymentResult
      kicker="PAGAMENTO"
      title="Pagamento não concluído"
      body="O Mercado Pago informou que o pagamento não foi aprovado."
      detail="Nenhum acesso comercial deve ser ativado por esta tela. Tente novamente pelo checkout enviado pela administração ou fale com o suporte."
      primaryLabel="Ver plano e acesso"
    />
  );
}
