const mercadopago = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

exports.handler = async (event) => {
  const { contato, numeros, valor } = JSON.parse(event.body);

  try {
    const pay = await mercadopago.payment.create({
      transaction_amount: Number(valor),
      description: "Rifa",
      payment_method_id: "pix",
      payer: { email: "comprador@email.com" },
      notification_url: `${process.env.URL}/.netlify/functions/webhook`
    });

    const paymentId = pay.body.id;

    await supabase.from("numeros_vendidos").insert(
      numeros.map(n => ({
        numero: n,
        contato,
        status: "pendente",
        transaction_id: paymentId,
        valor
      }))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        qr: pay.body.point_of_interaction.transaction_data.qr_code_base64,
        code: pay.body.point_of_interaction.transaction_data.qr_code,
        id: paymentId
      })
    };

  } catch (e) {
    console.log(e);
    return { statusCode: 500, body: "Erro ao criar pix" };
  }
};
