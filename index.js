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
  if (!btnMeusNumeros || !modal || typeof sb === "undefined") {
    console.error("Supabase (sb) não encontrado");
    return;
  }

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
