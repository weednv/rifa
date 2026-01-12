// ===== SUPABASE =====
const SUPABASE_URL = 'https://gfxohxpjocogmxlmtyth.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeG9oeHBqb2NvZ214bG10eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzAwMzUsImV4cCI6MjA4MjU0NjAzNX0.DYNNMEij4E8Rf0y1kpPD8FPtSqpbL1szz7R2Ql44ViE";
const RIFA_ID = "d260157d-3dae-4266-bdbf-64f318ce791a";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== CONFIG =====
const VALOR_NUMERO = 0.10;
let quantidade = 150; 

// ===== DOM =====
document.addEventListener("DOMContentLoaded", () => {
    atualizarTela();
});

// Botões de atalho (125, 250, 500, 1000)
function setQtd(valor, elemento) {
    quantidade = valor;
    
    // Feedback visual nos botões
    document.querySelectorAll('.titulo-card').forEach(card => card.classList.remove('ativo'));
    if(elemento) elemento.classList.add('ativo');

    atualizarTela();
}

// Botões + e -
function alterar(delta) {
    quantidade += delta;
    if (quantidade < 1) quantidade = 1;
    atualizarTela();
}

// Atualiza a Interface
function atualizarTela() {
    const elementoQtd = document.getElementById("qtd");
    
    // Suporta tanto <span> quanto <input>
    if (elementoQtd.tagName === "INPUT") {
        elementoQtd.value = quantidade;
    } else {
        elementoQtd.innerText = quantidade;
    }

    const totalCalculado = (quantidade * VALOR_NUMERO).toFixed(2).replace(".", ",");
    document.getElementById("valorTotal").innerText = `R$ ${totalCalculado}`;
}


// ===== PAGAR / SALVAR =====
async function pagar() {
    const inputContato = document.getElementById("contatoCliente");
    const contatoDigitado = inputContato.value.trim();
   

    // Validação WhatsApp / Email
    const validacao = validarContato(contatoDigitado);

    if (!validacao.valido) {
        alert("Digite um WhatsApp válido (com DDD) ou um email válido");
        inputContato.focus();
        return;
    }


    // Valor normalizado para salvar no banco
    const contato = validacao.valor;

    const btnPagar = document.querySelector(".btn-pagar");
    btnPagar.disabled = true;
    btnPagar.innerText = "Processando...";


    try {
        // 1. Buscar números já vendidos
        const { data: vendidos, error } = await sb
            .from("numeros_vendidos")
            .select("numero")
            .eq("rifa_id", RIFA_ID);

        if (error) throw error;

        // 2. Gerar novos números
        const usados = new Set(vendidos.map(v => v.numero));
        const numerosGerados = gerarNumerosUnicos(quantidade, usados);

        if (numerosGerados.length === 0) {
            alert("Desculpe, não há números disponíveis suficientes.");
            return;
        }

        // 3. Salvar no Supabase
       // 3️⃣ Criar cobrança PIX no Netlify
const valorTotal = quantidade * VALOR_NUMERO;

const reqPix = await fetch("/.netlify/functions/createPix", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    valor: valorTotal,
    email: contato
  })
});

const pix = await reqPix.json();


// 4️⃣ Salvar no Supabase com pagamento_id
const inserts = numerosGerados.map(n => ({
  rifa_id: RIFA_ID,
  numero: n,
  contato: contato,
  status: "pendente",
  pagamento_id: pix.pagamento_id
}));

const { error: insertError } = await sb
  .from("numeros_vendidos")
  .insert(inserts);

if (insertError) throw insertError;


// 5️⃣ Mostrar PIX ao comprador
document.getElementById("pixKey").value = pix.copia_cola;



        const { error: insertError1 } = await sb
            .from("numeros_vendidos")
            .insert(inserts);

        if (insertError) throw insertError;

        // 4. Sucesso: Mostrar números na página e abrir Modal
        mostrarNumeros(numerosGerados);
        abrirModal(quantidade, contato);

    } catch (err) {
        console.error(err);
        alert("Erro ao processar pedido. Tente novamente.");
    } finally {
        btnPagar.disabled = false;
        btnPagar.innerText = "Quero participar";
    }
}

// ===== AUXILIARES =====

function gerarNumerosUnicos(qtd, usados) {
    const nums = new Set();
    const MAX_RIFA = 100000; // Define o limite de números da sua rifa

    while (nums.size < qtd) {
        const n = Math.floor(Math.random() * MAX_RIFA);
        if (!usados.has(n)) {
            nums.add(n);
        }
        // Proteção contra loop infinito se a rifa lotar
        if (usados.size + nums.size >= MAX_RIFA) break;
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
        div.className = "numero"; // Certifique-se de ter esse estilo no CSS
        div.innerText = n.toString().padStart(5, "0");
        grid.appendChild(div);
    });
}

// ===== MODAL CONTROLS =====

function abrirModal(qtd, contato) {
    document.getElementById("modalQtd").innerText = qtd;
    document.getElementById("modalTotal").innerText = document.getElementById("valorTotal").innerText;
    document.getElementById("modalContato").innerText = contato;
    document.getElementById("modalPagamento").style.display = "block";
}

function fecharModal() {
    document.getElementById("modalPagamento").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("modalPagamento");
    if (event.target == modal) fecharModal();
}
function validarEdicaoManual(input) {
    // Transforma o valor digitado em número inteiro
    let valor = parseInt(input.value);
    
    // Se estiver vazio ou não for número, não faz nada ainda para permitir apagar e digitar
    if (isNaN(valor)) {
        quantidade = 1;
    } else {
        if (valor < 1) valor = 1; // Impede menos de 1
        quantidade = valor;
    }
    
    // Chama a função que você já tem para atualizar o R$ Total
    atualizarTela();

}

function atualizarTela() {
    const elementoQtd = document.getElementById("qtd");
    
    // Atualiza o valor do input (o número central)
    elementoQtd.value = quantidade;

    // Atualiza o Total em Dinheiro
    const totalCalculado = (quantidade * VALOR_NUMERO).toFixed(2).replace(".", ",");
    document.getElementById("valorTotal").innerText = `R$ ${totalCalculado}`;
}
// ===== CONTROLE DE ETAPAS =====
let etapa = 1;

function acaoParticipar() {
    const areaPagamento = document.getElementById("etapaPagamento");

    if (etapa === 1) {
        areaPagamento.style.display = "block";
        etapa = 2;
        return;
    }

    pagar();
}
 // chama sua função original


// ===== COPIAR PIX =====
function copiarPix() {
    const pix = document.getElementById("pixKey");
    pix.select();
    pix.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("Chave PIX copiada!");
}
function validarContato(contato) {
    contato = contato.trim();

    // Regex simples de email
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Remove tudo que não for número (para WhatsApp)
    const somenteNumeros = contato.replace(/\D/g, "");

    // Validação WhatsApp (10 ou 11 dígitos com DDD)
    const whatsappValido = somenteNumeros.length === 10 || somenteNumeros.length === 11;

    if (regexEmail.test(contato)) {
        return { valido: true, tipo: "email", valor: contato };
    }

    if (whatsappValido) {
        return { valido: true, tipo: "whatsapp", valor: somenteNumeros };
    }

    return { valido: false };
}
