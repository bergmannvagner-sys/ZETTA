import { PaymentResult } from "@/components/payment-result";

export default function PaymentSuccess() {
  return (
    <PaymentResult
      kicker="PAGAMENTO"
      title="Pagamento aprovado"
      body="Recebemos o retorno de aprovação do Mercado Pago."
      detail="A ativação do acesso comercial acontece depois que o webhook confirmado pelo Mercado Pago for processado pelo backend."
      primaryLabel="Ver plano e acesso"
    />
  );
}
