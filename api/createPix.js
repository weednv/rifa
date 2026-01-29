import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongo } from "../lib/mongodb";
import Pagamento from "../models/Pagamento";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, valor, rifa_id, quantidade } = req.body;

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
        notification_url: `${process.env.BASE_URL}/api/webhook`,
      },
    });

    // 🔥 salva no Mongo
    await connectMongo();
    await Pagamento.create({
      rifa_id,
      contato: email,
      quantidade,
      valor_total: valor,
      payment_id: result.id,
      status: "pendente",
    });

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
