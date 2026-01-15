export default async function handler(req, res) {
  console.log("Webhook recebido:", req.body);

  // Aqui você marca como pago no Supabase se quiser

  res.status(200).send("ok");
}
