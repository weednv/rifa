// ===== SUPABASE =====
const SUPABASE_URL = 'https://gfxohxpjocogmxlmtyth.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeG9oeHBqb2NvZ214bG10eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMzUsImV4cCI6MjA4MjU0NjAzNX0.DYNNMEij4E8Rf0y1kpPD8FPtSqpbL1szz7R2Ql44ViE"; // depois mova para env
const RIFA_ID = "d260157d-3dae-4266-bdbf-64f318ce791a";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== CONFIG =====
const VALOR_NUMERO = 0.10;
let quantidade = 150;

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
  atualizarTela();
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

// ===== MODAIS =====
function initModais() {
  // Modal Meus Números
  const btnMeusNumeros = document.getElementById("btnMeusNumeros");
  const modalNumeros = document.getElementById("modalNumeros");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnVoltar = document.getElementById("btnVoltar");
  const resultado = document.getElementById("resultado");
  const contatoInput = document.getElementById("contato");
  const fecharNumeros = modalNumeros.querySelector(".fechar");

  if (btnMeusNumeros) btnMeusNumeros.addEventListener("click", e => {
    e.preventDefault();
    modalNumeros.style.display = "flex";
  });

  const fecharModalNumeros = () => {
    modalNumeros.style.display = "none";
    resultado.innerHTML = "";
    contatoInput.value = "";
  };

  if (btnVoltar) btnVoltar.addEventListener("click", fecharModalNumeros);
  if (fecharNumeros) fecharNumeros.addEventListener("click", fecharModalNumeros);

  // Buscar números
  if (btnBuscar) btnBuscar.addEventListener("click", async () => {
    let contato = contatoInput.value.trim();
    if (!contato) {
      resultado.innerText = "Digite seu email ou telefone";
      return;
    }
    const soNumeros = contato.replace(/\D/g, "");
    if (soNumeros.length >= 10) contato = soNumeros;

    resultado.innerText = "Buscando seus números...";

    try {
      const res = await fetch("/api/buscarNumeros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato })
      });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        resultado.innerText = "Nenhum número encontrado";
        return;
      }

      resultado.innerHTML =
        "<b>Seus números:</b><br><br>" +
        data.map(n => `${n.numero.toString().padStart(5,"0")} <small>(${n.status})</small>`).join(", ");

    } catch (err) {
      console.error(err);
      resultado.innerText = "Erro ao buscar números";
    }
  });

  // Modal Pagamento
  const modalPagamento = document.getElementById("modalPagamento");
  const fecharPagamento = modalPagamento.querySelector(".close");
  if (fecharPagamento) fecharPagamento.addEventListener("click", () => {
    modalPagamento.style.display = "none";
  });

  // Copiar PIX
  const btnCopiarPix = document.getElementById("btnCopiarPix");
  if (btnCopiarPix) btnCopiarPix.addEventListener("click", () => {
    const pix = document.getElementById("chavePix");
    navigator.clipboard.writeText(pix.innerText);
    alert("Chave PIX copiada!");
  });
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

    // 3️⃣ Criar PIX via backend
    const valorTotal = quantidade * VALOR_NUMERO;

    const reqPix = await fetch("/api/createPix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: contato, email: contato, valor: valorTotal })
    });
    const pix = await reqPix.json();
    if (!pix.qr) throw new Error("PIX não gerado");

    // 4️⃣ Salvar números como pendente
    const inserts = numeros.map(n => ({
      rifa_id: RIFA_ID,
      numero: n,
      contato,
      status: "pendente",
      pagamento_id: pix.payment_id,
      valor_pago: valorTotal
    }));

    const { error: insertError } = await sb
      .from("numeros_vendidos")
      .insert(inserts);
    if (insertError) throw insertError;

    // 5️⃣ Mostrar QR Code
    document.getElementById("qrPix").src = `data:image/png;base64,${pix.qr}`;

    // Atualizar modal
    document.getElementById("modalQtd").innerText = quantidade;
    document.getElementById("modalTotal").innerText =
      document.getElementById("valorTotal").innerText;
    document.getElementById("modalContato").innerText = contato;
    document.getElementById("statusPagamento").innerText = "⏳ Aguardando pagamento";

    document.getElementById("modalPagamento").style.display = "block";

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

function validarContato(contato) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nums = contato.replace(/\D/g, "");

  if (email.test(contato)) return { valido: true, valor: contato };
  if (nums.length === 10 || nums.length === 11) return { valido: true, valor: nums };

  return { valido: false };
}