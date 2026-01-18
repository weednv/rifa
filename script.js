// ===== SUPABASE =====
const SUPABASE_URL = 'https://gfxohxpjocogmxlmtyth.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeG9oeHBqb2NvZ214bG10eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMzUsImV4cCI6MjA4MjU0NjAzNX0.DYNNMEij4E8Rf0y1kpPD8FPtSqpbL1szz7R2Ql44ViE"; // ⚠️ só leitura no frontend
const RIFA_ID = "35885492-a1d4-41c5-8aee-ff7984b2dfec";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== CONFIG =====
const VALOR_NUMERO = 0.10;
let quantidade = 150;

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
  atualizarTela();
  initParticipar();
});

// ===== CONTROLES DE QUANTIDADE =====
function setQtd(valor, elemento) {
  quantidade = valor;
  document.querySelectorAll(".titulo-card").forEach(card => card.classList.remove("ativo"));
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
  const total = (quantidade * VALOR_NUMERO).toFixed(2).replace(".", ",");
  const totalEl = document.getElementById("valorTotal");
  if (totalEl) totalEl.innerText = `R$ ${total}`;
}

// ===== PARTICIPAR =====
function initParticipar() {
  const btnParticipar = document.getElementById("btnParticipar");
  const etapa = document.getElementById("etapaPagamento");
  const btnConfirmar = document.getElementById("btnConfirmarPagamento");

  // Mostrar input de contato
  btnParticipar.addEventListener("click", () => {
    etapa.style.display = "block";
    etapa.scrollIntoView({ behavior: "smooth" });
  });

  // Confirmar e gerar PIX
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
    // Calcular valor total
    const valorTotal = quantidade * VALOR_NUMERO;

    // Chamar backend para gerar PIX e salvar pagamento pendente
    const res = await fetch("/api/createPix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contato,
        email: contato,
        valor: valorTotal,
        rifa_id: RIFA_ID,
        quantidade
      })
    });

    const pix = await res.json();

    if (!pix.qr) throw new Error("PIX não gerado");

    // Mostrar QR code e detalhes
    document.getElementById("qrPix").src = `data:image/png;base64,${pix.qr}`;
    document.getElementById("modalQtd").innerText = quantidade;
    document.getElementById("modalTotal").innerText = `R$ ${valorTotal.toFixed(2).replace(".", ",")}`;
    document.getElementById("modalContato").innerText = contato;
    document.getElementById("statusPagamento").innerText = "⏳ Aguardando pagamento";
    document.getElementById("modalPagamento").style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Erro ao gerar pagamento. Tente novamente.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Confirmar e Gerar PIX";
  }
}

// ===== AUXILIARES =====
function validarContato(contato) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nums = contato.replace(/\D/g, "");
  if (email.test(contato)) return { valido: true, valor: contato };
  if (nums.length === 10 || nums.length === 11) return { valido: true, valor: nums };
  return { valido: false };
}
