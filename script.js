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
    const valorTotal = quantidade * VALOR_NUMERO;

    const res = await fetch("/api/createPix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cliente Rifa",
        email: contato.includes("@") ? contato : "pix@rifa.com",
        contato, // vínculo real
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
      throw new Error("Erro no servidor");
    }

    if (!pix.qr || !pix.pix_copia_e_cola) {
      throw new Error("PIX inválido");
    }

    document.getElementById("pixResultado").style.display = "block";
    document.getElementById("qrPix").src =
      `data:image/png;base64,${pix.qr}`;
    document.getElementById("pixCode").value =
      pix.pix_copia_e_cola;

    iniciarVerificacaoPagamento(pix.payment_id);
    btn.innerText = "PIX Gerado ✔";

  } catch (err) {
    console.error("Erro no pagamento:", err);
    alert("Erro ao gerar pagamento.");
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
  const intervalo = setInterval(async () => {
    try {
      const res = await fetch(
        `/api/consultarPagamento?payment_id=${paymentId}`
      );
      const data = await res.json();

      if (data.status === "pago") {
        clearInterval(intervalo);
        mostrarNumeros(data.numeros);
      }
    } catch (e) {
      console.error("Erro ao consultar pagamento", e);
    }
  }, 4000);
}

// ===== MOSTRAR NÚMEROS =====
function mostrarNumeros(numeros) {
  alert(
    "✅ Pagamento confirmado!\n\nSeus números:\n" +
    numeros.join(", ")
  );
}
