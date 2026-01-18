import mercadopago from "mercadopago";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, valor } = req.body;

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Token Mercado Pago não configurado" });
    }

    mercadopago.configure({
      access_token: process.env.MP_ACCESS_TOKEN
    });

    const payment = await mercadopago.payment.create({
      transaction_amount: Number(valor),
      description: "Pagamento Rifa",
      payment_method_id: "pix",
      payer: {
        email,
        first_name: name
      }
    });

    // ✅ RETORNO CORRETO
    res.status(200).json({
      qr: payment.body.point_of_interaction.transaction_data.qr_code_base64,
      payment_id: payment.body.id // 👈 ESSENCIAL
    });

  } catch (error) {
    console.error("ERRO MP:", error);
    res.status(500).json({
      error: "Erro ao gerar PIX",
      detalhe: error.message
    });
  }
}
