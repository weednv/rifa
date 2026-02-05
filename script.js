// ===== CONFIG =====
const VALOR_NUMERO = 0.10;
const RIFA_ID = "35885492-a1d4-41c5-8aee-ff7984b2dfec";
let quantidade = 150;

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
  atualizarTela();
  initParticipar();
});

// ===== CONTROLES DE QUANTIDADE =====
function setQtd(valor, elemento) {
  quantidade = valor;
  document.querySelectorAll(".titulo-card")
    .forEach(card => card.classList.remove("ativo"));
  if (elemento) elemento.classList.add("ativo");
  atualizarTela();
}

function alterar(delta) {
  quantidade += delta;
  if (quantidade < 1) quantidade = 1;
  atualizarTela();
}

function validarEdicaoManual(input) {
  const valor = parseInt(input.value);
  quantidade = isNaN(valor) || valor < 1 ? 1 : valor;
  atualizarTela();
}

function atualizarTela() {
  const input = document.getElementById("qtd");
  if (!input) return;

  input.value = quantidade;
  const total = (quantidade * VALOR_NUMERO)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("valorTotal").innerText = total;
}

// ===== PARTICIPAR =====
function initParticipar() {
  const btnParticipar = document.getElementById("btnParticipar");
  const etapa = document.getElementById("etapaPagamento");
  const btnConfirmar = document.getElementById("btnConfirmarPagamento");

  btnParticipar.addEventListener("click", () => {
    etapa.style.display = "block";
    etapa.scrollIntoView({ behavior: "smooth" });
  });

  btnConfirmar.addEventListener("click", pagar);
}

// ===== PAGAMENTO =====
async function pagar() {
  const contatoInput = document.getElementById("contatoCliente");
  const contatoDigitado = contatoInput.value.trim();
  const validacao = validarContato(contatoDigitado);

  if (!validacao.valido) {
    alert("Digite um WhatsApp com DDD ou email válido");
    contatoInput.focus();
    return;
  }

  const contato = validacao.valor;
  const btn = document.getElementById("btnConfirmarPagamento");
  btn.disabled = true;
  btn.innerText = "Gerando PIX...";

  try {
    const valorTotal = Number((quantidade * VALOR_NUMERO).toFixed(2));


    const res = await fetch("/api/createPix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cliente Rifa",
        email: contato.includes("@") ? contato : "pix@rifa.com",
        contato,
        valor: valorTotal,
        rifa_id: RIFA_ID,
        quantidade
      })
    });

    const text = await res.text();

    let pix;
    try {
      pix = JSON.parse(text);
    } catch (e) {
      console.error("Resposta não é JSON:", text);
      throw new Error("Erro no servidor (resposta inválida)");
    }

    // ✅ MOSTRA O ERRO REAL DO BACKEND
    if (!res.ok) {
      console.error("Erro createPix:", pix);
      throw new Error(pix?.detalhe || pix?.error || "Erro ao gerar PIX");
    }

    if (!pix.qr || !pix.pix_copia_e_cola) {
      throw new Error("Servidor não retornou QR do PIX");
    }

    document.getElementById("pixResultado").style.display = "block";
    document.getElementById("qrPix").src = `data:image/png;base64,${pix.qr}`;
    document.getElementById("pixCode").value = pix.pix_copia_e_cola;

    iniciarVerificacaoPagamento(pix.payment_id);
    btn.innerText = "PIX Gerado ✔";

  } catch (err) {
    console.error("Erro no pagamento:", err);
    alert(err.message || "Erro ao gerar pagamento.");
    btn.innerText = "Confirmar e Gerar PIX";
    btn.disabled = false;
  }
}



// ===== AUXILIARES =====
function validarContato(contato) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nums = contato.replace(/\D/g, "");
  if (email.test(contato)) return { valido: true, valor: contato };
  if (nums.length === 10 || nums.length === 11)
    return { valido: true, valor: nums };
  return { valido: false };
}

function copiarPix() {
  const pix = document.getElementById("pixCode");
  pix.select();
  navigator.clipboard.writeText(pix.value)
    .then(() => alert("PIX copiado!"));
}

// ===== VERIFICAR PAGAMENTO =====
function iniciarVerificacaoPagamento(paymentId) {
  const statusEl = document.getElementById("statusPagamento");
  const numerosEl = document.getElementById("numerosComprados");
  const btn = document.getElementById("btnConfirmarPagamento");
    const compraEl = document.getElementById("compraConcluida"); 
  if (statusEl) statusEl.innerText = "⏳ Aguardando pagamento...";
  if (numerosEl) {
    numerosEl.style.display = "none";
    numerosEl.innerHTML = "";
  }

 const intervalo = setInterval(async () => {
  try {
    const res = await fetch(
      `/api/consultarPagamento?payment_id=${paymentId}`
    );
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();


      // Atualiza status na tela
      if (data.status === "pendente") {
        if (statusEl) statusEl.innerText = "⏳ Aguardando pagamento...";
        return;
      }

      if (data.status === "processando") {
        if (statusEl) statusEl.innerText = "⚙️ Pagamento confirmado. Gerando números...";
        return;
      }

      if (data.status === "expirado") {
        clearInterval(intervalo);
        if (statusEl) statusEl.innerText = "❌ Esse PIX expirou. Gere um novo.";

        // libera o botão pra gerar outro pix
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Confirmar e Gerar PIX";
        }
        return;
      }

      if (data.status === "pago") {
        clearInterval(intervalo);
        // 1) Some QR/PIX da tela (atualiza a tela)
        const pixBox = document.getElementById("pixResultado");
        if (pixBox) pixBox.style.display = "none";

        // 2) Mostra mensagem de compra concluída
        if (compraEl) compraEl.style.display = "block";

        // 3) Trava o botão
        if (btn) {
          btn.disabled = true;
          btn.innerText = "Compra Concluída ✅";
        }

        // 4) Mantém o que você já faz (mostra números)
        if (statusEl) statusEl.innerText = "✅ Pagamento aprovado! Seus números:";
        mostrarNumeros(data.numeros || []);
        return;
      }
    } catch (e) {
      console.error("Erro ao consultar pagamento", e);
    }
  }, 4000);
}



// ===== MOSTRAR NÚMEROS =====
function mostrarNumeros(numeros) {
  const numerosEl = document.getElementById("numerosComprados");

  // Se não existir o elemento na página, mantém fallback antigo
  if (!numerosEl) {
    alert(
      "✅ Pagamento confirmado!\n\nSeus números:\n" +
      numeros.join(", ")
    );
    return;
  }

  numerosEl.innerHTML = "";
  numerosEl.style.display = "flex";

  numeros.forEach((num) => {
    const span = document.createElement("span");
    span.innerText = num;
    span.style.padding = "8px 10px";
    span.style.background = "#eee";
    span.style.borderRadius = "8px";
    span.style.fontWeight = "bold";
    numerosEl.appendChild(span);
  });
}
