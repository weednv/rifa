import supabase from "./supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { contato } = req.body;

  if (!contato) {
    return res.status(400).json({ error: "Contato obrigatório" });
  }

  const { data, error } = await supabase
    .from("numeros_vendidos")
    .select("numero, status")
    .eq("contato", contato)
    .order("numero", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
