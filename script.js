// ===== SUPABASE =====
const SUPABASE_URL = 'https://gfxohxpjocogmxlmtyth.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeG9oeHBqb2NvZ214bG10eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMzUsImV4cCI6MjA4MjU0NjAzNX0.DYNNMEij4E8Rf0y1kpPD8FPtSqpbL1szz7R2Ql44ViE"; // depois mova para env
const RIFA_ID = "d260157d-3dae-4266-bdbf-64f318ce791a";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== CONFIG =====
const VALOR_NUMERO = 0.10;
let quantidade = 150;

// ===== DOM =====
document.addEventListener("DOMContentLoaded", atualizarTela);

// ===== CONTROLES DE QUANTIDADE =====
function alterar(delta) {
  quantidade += delta;
  if (quantidade < 1) quantidade = 1;
  atualizarTela();
}

function editarQuantidade(input) {
  const valor = parseInt(input.value);
  quantidade = isNaN(valor) || valor < 1 ? 1 : valor;
  atualizarTela();
}

function atualizarTela() {
  const input = document.getElementById("qtdInput");
  if (!input) return;

  input.value = quantidade;

  const total = (quantidade * VALOR_NUMERO)
    .toFixed(2)
    .replace(".", ",");

  document.getElementById("valorTotal").innerText = `R$ ${total}`;
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
  const btn = document.querySelector(".btn-pagar");
  btn.disabled = true;
  btn.innerText = "Gerando PIX...";

  try {
    // 1️⃣ Buscar números vendidos
    const { data: vendidos, error } = await sb
      .from("numeros_vendidos")
      .select("numero")
      .eq("rifa_id", RIFA_ID);

    if (error) throw error;

    // 2️⃣ Gerar números disponíveis
    const usados = new Set(vendidos.map(v => v.numero));
    const numeros = gerarNumerosUnicos(quantidade, usados);

    if (!numeros.length) throw new Error("Sem números disponíveis");

    // 3️⃣ Criar PIX (Vercel)
    const valorTotal = quantidade * VALOR_NUMERO;

    const reqPix = await fetch("/api/createPix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contato,
        email: contato,
        valor: valorTotal
      })
    });

    const pix = await reqPix.json();
    if (!pix.qr) throw new Error("PIX não gerado");

    // 4️⃣ Salvar números como pendente
    const inserts = numeros.map(n => ({
      rifa_id: RIFA_ID,
      numero: n,
      contato,
      status: "pendente"
    }));

    const { error: insertError } = await sb
      .from("numeros_vendidos")
      .insert(inserts);

    if (insertError) throw insertError;

    // 5️⃣ Mostrar QR Code
    document.getElementById("qrPix").src =
      `data:image/png;base64,${pix.qr}`;

    mostrarNumeros(numeros);
    abrirModal(quantidade, contato);

  } catch (err) {
    console.error(err);
    alert("Erro ao gerar pagamento. Tente novamente.");
  } finally {
    btn.disabled = false;
    btn.innerText = "Quero participar";
  }
}

// ===== AUXILIARES =====
function gerarNumerosUnicos(qtd, usados) {
  const nums = new Set();
  const MAX = 100000;

  while (nums.size < qtd && usados.size + nums.size < MAX) {
    const n = Math.floor(Math.random() * MAX);
    if (!usados.has(n)) nums.add(n);
  }

  return Array.from(nums).sort((a, b) => a - b);
}

function mostrarNumeros(numeros) {
  const area = document.getElementById("areaNumeros");
  const grid = document.getElementById("numeros");
  grid.innerHTML = "";
  area.style.display = "block";

  numeros.forEach(n => {
    const div = document.createElement("div");
    div.className = "numero";
    div.innerText = n.toString().padStart(5, "0");
    grid.appendChild(div);
  });
}

// ===== MODAL =====
function abrirModal(qtd, contato) {
  document.getElementById("modalQtd").innerText = qtd;
  document.getElementById("modalTotal").innerText =
    document.getElementById("valorTotal").innerText;
  document.getElementById("modalContato").innerText = contato;
  document.getElementById("modalPagamento").style.display = "block";
}

function fecharModal() {
  document.getElementById("modalPagamento").style.display = "none";
}

// ===== VALIDACAO =====
function validarContato(contato) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nums = contato.replace(/\D/g, "");

  if (email.test(contato)) return { valido: true, valor: contato };
  if (nums.length === 10 || nums.length === 11) return { valido: true, valor: nums };

  return { valido: false };
}
