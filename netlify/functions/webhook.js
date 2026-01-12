const mercadopago = require("mercadopago");
const { createClient } = require("@supabase/supabase-js");

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // MP manda isso: { type: "payment", data: { id: XXXXX } }
    if (body.type !== "payment") {
      return { statusCode: 200, body: "ignored" };
    }

    const payId = body.data.id;

    const resultado = await mercadopago.payment.get(payId);
    const pagamento = resultado.body;

    if (pagamento.status === "approved") {
      await supabase
        .from("numeros_vendidos")
        .update({ status: "pago" })
        .eq("transaction_id", payId);

      console.log("Pagamento confirmado ✔");
    }

    return { statusCode: 200, body: "ok" };
  } 
  catch (e) {
    console.log("Erro Webhook:", e);
    return { statusCode: 500, body: "erro" };
  }
};
