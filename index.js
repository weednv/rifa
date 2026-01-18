// ===== SUPABASE CONFIG =====
var SUPABASE_URL = "https://gfxohxpjocogmxlmtyth.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeG9oeHBqb2NvZ214bG10eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMzUsImV4cCI6MjA4MjU0NjAzNX0.DYNNMEij4E8Rf0y1kpPD8FPtSqpbL1szz7R2Ql44ViE"; // mantenha a sua key
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
  const btnMeusNumeros = document.getElementById("btnMeusNumeros");
  const modal = document.getElementById("modalNumeros");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnVoltar = document.getElementById("btnVoltar");
  const resultado = document.getElementById("resultado");
  const contatoInput = document.getElementById("contato");
  const fechar = document.querySelector(".fechar");

  // Segurança
  if (!btnMeusNumeros || !modal) return;

  // Abrir modal
  btnMeusNumeros.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  });

  // Fechar modal
  function fecharModal() {
    modal.style.display = "none";
    resultado.innerHTML = "";
    contatoInput.value = "";
  }

  if (btnVoltar) btnVoltar.addEventListener("click", fecharModal);
  if (fechar) fechar.addEventListener("click", fecharModal);

  // Buscar números
  btnBuscar.addEventListener("click", async () => {
  let contato = contatoInput.value.trim();

  if (!contato) {
    resultado.innerText = "Digite seu email ou telefone";
    return;
  }

  // Normaliza telefone
  const soNumeros = contato.replace(/\D/g, "");
  if (soNumeros.length >= 10) {
    contato = soNumeros;
  }

  resultado.innerText = "Buscando seus números...";

  const { data, error } = await sb
    .from("numeros_vendidos")
    .select("numero, status")
    .eq("contato", contato)
    .order("numero", { ascending: true });

  if (error || !data || !data.length) {
    resultado.innerText = "Nenhum número encontrado";
    return;
  }

  resultado.innerHTML =
    "<b>Seus números:</b><br><br>" +
    data
      .map(n =>
        `${n.numero.toString().padStart(5, "0")} <small>(${n.status})</small>`
      )
      .join(", ");
});
});
