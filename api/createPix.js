import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, valor, rifa_id, quantidade } = req.body;

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Token MP não configurado" });
    }

    // ✅ NOVO SDK
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: Number(valor),
        description: "Pagamento Rifa",
        payment_method_id: "pix",
        payer: {
          email,
          first_name: name,
        },
      },
    });

    // ✅ Salvar pagamento pendente no Supabase (SEM ALTERAR LÓGICA)
    await sb.from("pagamentos_pendentes").insert([
      {
        rifa_id,
        contato: email,
        quantidade,
        valor_total: valor,
        payment_id: result.id,
        status: "pendente",
      },
    ]);

    // ✅ Retorno igual ao esperado no front
    return res.status(200).json({
      qr: result.point_of_interaction.transaction_data.qr_code_base64,
      pix_copia_e_cola:
        result.point_of_interaction.transaction_data.qr_code,
      payment_id: result.id,
    });

  } catch (error) {
    console.error("ERRO MP:", error);
    return res.status(500).json({
      error: "Erro ao gerar PIX",
      detalhe: error.message,
    });
  }
}
