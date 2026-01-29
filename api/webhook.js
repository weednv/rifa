import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongo } from "../lib/mongodb.js";
import Pagamento from "../models/Pagamento.js";
import Numero from "../models/numero.js";

export default async function handler(req, res) {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
  });

  const payment = new Payment(client);
  const paymentId = req.query.id;

  const mpPayment = await payment.get({ id: paymentId });

  if (mpPayment.status !== "approved") {
    return res.status(200).end();
  }

  await connectMongo();

  const pag = await Pagamento.findOne({ payment_id: paymentId });
  if (!pag || pag.status === "aprovado") return res.status(200).end();

  let numeros = [];

  for (let i = 0; i < pag.quantidade; i++) {
    let num, existe = true;

    while (existe) {
      num = Math.floor(Math.random() * 100000) + 1;
      existe = await Numero.exists({ numero: num });
    }

    numeros.push({
      numero: num,
      contato: pag.contato,
      rifa_id: pag.rifa_id,
      payment_id: paymentId,
    });
  }

  await Numero.insertMany(numeros);
  pag.status = "aprovado";
  await pag.save();

  res.status(200).end();
}
