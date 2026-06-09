import { PaymentResult } from "@/components/payment-result";

export default function PaymentPending() {
  return (
    <PaymentResult
      kicker="PAGAMENTO"
      title="Pagamento pendente"
      body="O Mercado Pago marcou o pagamento como pendente."
      detail="A conta permanece sem ativação automática até o backend receber um webhook confirmado de pagamento aprovado."
      primaryLabel="Ver plano e acesso"
    />
  );
}
