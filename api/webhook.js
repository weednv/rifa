import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIFA_ID = "35885492-a1d4-41c5-8aee-ff7984b2dfec";
const VALOR_NUMERO = 0.10;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function gerarNumerosUnicos(qtd, usados) {
  const nums = new Set();
  const MAX = 100000;
  while (nums.size < qtd && usados.size + nums.size < MAX) {
    const n = Math.floor(Math.random() * MAX);
    if (!usados.has(n)) nums.add(n);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export default async function handler(req, res) {
  const { type, data } = req.body;

  if (type === "payment") {
    const payment_id = data.id;

    // Buscar o pagamento pendente
    const { data: pendente } = await sb
      .from("pagamentos_pendentes")
      .select("*")
      .eq("payment_id", payment_id)
      .single();

    if (pendente && pendente.status === "pendente") {
      // Buscar números já vendidos
      const { data: usadosQuery } = await sb
        .from("numeros_vendidos")
        .select("numero")
        .eq("rifa_id", pendente.rifa_id);

      const usados = new Set(usadosQuery.map(n => n.numero));
      const numeros = gerarNumerosUnicos(pendente.quantidade, usados);

      // Salvar números pagos
      await sb.from("numeros_vendidos").insert(
        numeros.map(n => ({
          rifa_id: pendente.rifa_id,
          numero: n,
          contato: pendente.contato,
          status: "pago",
          pagamento_id,
          valor_pago: pendente.valor_total
        }))
      );

      // Atualizar pagamento pendente
      await sb.from("pagamentos_pendentes").update({ status: "pago" }).eq("payment_id", payment_id);
    }
  }

  res.status(200).send("OK");
}
