document.addEventListener("DOMContentLoaded", () => {
  const btnMeusNumeros = document.getElementById("btnMeusNumeros");
  const modal = document.getElementById("modalNumeros");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnVoltar = document.getElementById("btnVoltar");
  const resultado = document.getElementById("resultado");
  const contatoInput = document.getElementById("contato");
  const fechar = document.querySelector(".fechar");

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

  // 🔎 BUSCAR NÚMEROS (AQUI ESTAVA O ERRO)
  btnBuscar.addEventListener("click", async () => {
    let contato = contatoInput.value.trim();

    if (!contato) {
      resultado.innerText = "Digite seu email ou telefone";
      return;
    }

    // normaliza telefone
    const soNumeros = contato.replace(/\D/g, "");
    if (soNumeros.length >= 10) {
      contato = soNumeros;
    }

    resultado.innerText = "Buscando seus números...";

    try {
      const res = await fetch("/api/buscarNumeros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contato })
      });

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
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

    } catch (err) {
      console.error(err);
      resultado.innerText = "Erro ao buscar números";
    }
  });
});
