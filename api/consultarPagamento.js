import { MercadoPagoConfig, Payment } from "mercadopago";
import { connectMongo } from "../lib/mongodb.js";
import Pagamento from "../models/Pagamento.js";
import Numero from "../models/numero.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { payment_id } = req.query;

  if (!payment_id) {
    return res.status(400).json({ error: "payment_id obrigatório" });
  }

  try {
    // 🧠 Conectar no Mongo primeiro
    await connectMongo();

    const pag = await Pagamento.findOne({ payment_id });
    if (!pag) {
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    // ⏱ Expirado (se ainda não aprovou)
    if (
      pag.expiresAt &&
      new Date(pag.expiresAt).getTime() < Date.now() &&
      pag.status !== "aprovado"
    ) {
      return res.status(200).json({ status: "expirado", numeros: [] });
    }

    // 🔌 Mercado Pago (só consulta se ainda não aprovou no banco)
    if (pag.status !== "aprovado") {
      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
      });

      const payment = new Payment(client);
      const mp = await payment.get({ id: String(payment_id) });

      // ⏳ Ainda não pago
      if (mp.status !== "approved") {
        return res.status(200).json({ status: "pendente" });
      }

      // ✅ MP aprovou, mas webhook ainda não terminou
      return res.status(200).json({ status: "processando" });
    }

    // 🎟 Já aprovado: buscar números
    const numeros = await Numero.find({
      payment_id,
      contato: pag.contato,
    }).sort({ numero: 1 });

    return res.status(200).json({
      status: "pago",
      numeros: numeros.map((n) => String(n.numero).padStart(5, "0")),
    });
  } catch (err) {
    console.error("ERRO consultarPagamento:", err);
    return res.status(500).json({ error: "Erro ao consultar pagamento" });
  }
}
