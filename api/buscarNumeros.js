import { connectMongo } from "../lib/mongodb";
import Numero from "../models/numero";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { contato } = req.body;
    if (!contato) {
      return res.status(400).json({ error: "Contato obrigatório" });
    }

    await connectMongo();

    const numeros = await Numero
      .find({ contato })
      .sort({ numero: 1 });

    return res.status(200).json(numeros);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar números" });
  }
}
