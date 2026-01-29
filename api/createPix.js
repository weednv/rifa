import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongo } from "../lib/mongodb.js";
import Pagamento from "../models/Pagamento.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, contato, valor, rifa_id, quantidade } = req.body;

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado" });
    }

    await connectMongo();

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
          email,        // pode ser pix@rifa.com
          first_name: name,
        },
        notification_url: `${process.env.BASE_URL}/api/webhook`,
      },
    });

    await Pagamento.create({
      rifa_id,
      contato: contato || email,  // vínculo real
      email_mp: email,
      quantidade,
      valor_total: valor,
      payment_id: String(result.id),
      status: "pendente",
    });

    return res.status(200).json({
      qr: result.point_of_interaction.transaction_data.qr_code_base64,
      pix_copia_e_cola: result.point_of_interaction.transaction_data.qr_code,
      payment_id: String(result.id),
    });
  } catch (error) {
    console.error("ERRO MP:", error);
    return res.status(500).json({
      error: "Erro ao gerar PIX",
      detalhe: error.message,
    });
  }
}
