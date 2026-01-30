import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongo } from "../lib/mongodb.js";
import Pagamento from "../models/Pagamento.js";
import Numero from "../models/numero.js";

export default async function handler(req, res) {
  try {
    // MP chama por POST ou GET
    const methodOk = req.method === "POST" || req.method === "GET";
    if (!methodOk) {
      return res.status(405).json({ error: "Método não permitido" });
    }

    // 🔎 pegar paymentId de vários formatos possíveis
    const paymentId =
      req.query?.id ||
      req.query?.payment_id ||
      req.body?.data?.id ||
      req.body?.id;

    if (!paymentId) {
      // responde 200 pro MP não insistir
      return res.status(200).json({ ok: true, info: "Sem paymentId" });
    }

    // 🔌 Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const payment = new Payment(client);

    // 🔎 fonte da verdade
    const mpPayment = await payment.get({ id: String(paymentId) });

    if (mpPayment.status !== "approved") {
      return res.status(200).json({ ok: true, status: mpPayment.status });
    }

    // 🧠 Mongo
    await connectMongo();

    const pag = await Pagamento.findOne({ payment_id: String(paymentId) });
    if (!pag) {
      return res.status(200).json({ ok: true, info: "Pagamento não encontrado no Mongo" });
    }

    // ❌ se já expirou, não aprova
    if (
      pag.expiresAt &&
      new Date(pag.expiresAt).getTime() < Date.now() &&
      pag.status !== "aprovado"
    ) {
      return res.status(200).json({ ok: true, info: "Pagamento expirado" });
    }

    // 🔁 idempotência
    if (pag.status === "aprovado") {
      return res.status(200).json({ ok: true, info: "Já processado" });
    }

    // 🎟 gerar números sem duplicar
    const numeros = [];

    for (let i = 0; i < pag.quantidade; i++) {
      let num;
      while (true) {
        num = Math.floor(Math.random() * 100000) + 1;
        const existe = await Numero.exists({ numero: num });
        if (!existe) break;
      }

      numeros.push({
        numero: num,
        contato: pag.contato,
        rifa_id: pag.rifa_id,
        payment_id: String(paymentId),
      });
    }

    await Numero.insertMany(numeros);

    // ✅ marcar aprovado e remover TTL
    await Pagamento.updateOne(
      { _id: pag._id },
      {
        $set: { status: "aprovado" },
        $unset: { expiresAt: "" },
      }
    );

    return res.status(200).json({ ok: true, gerados: numeros.length });
  } catch (err) {
    console.error("ERRO WEBHOOK:", err);
    // responde 200 pro MP não reenviar em loop
    return res.status(200).json({ ok: false, erro: err.message });
  }
}
