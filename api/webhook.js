import { createClient } from "@supabase/supabase-js";
import mercadopago from "mercadopago";

// ===== SUPABASE =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ SOMENTE NO BACKEND
);

// ===== MERCADO PAGO =====
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

export default async function handler(req, res) {
  try {
    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      return res.status(200).send("Evento ignorado");
    }

    // 🔎 Busca pagamento no Mercado Pago
    const payment = await mercadopago.payment.findById(paymentId);

    if (payment.body.status !== "approved") {
      return res.status(200).send("Pagamento não aprovado");
    }

    // ✅ Atualiza números no Supabase
    const { error } = await supabase
      .from("numeros_vendidos")
      .update({ status: "pago" })
      .eq("payment_id", paymentId);

    if (error) {
      console.error("Erro Supabase:", error);
      return res.status(500).send("Erro ao atualizar números");
    }

    console.log("Pagamento confirmado:", paymentId);
    return res.status(200).send("Pagamento confirmado");

  } catch (err) {
    console.error("Erro webhook:", err);
    return res.status(500).send("Erro interno");
  }
}
