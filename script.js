/* ========= THE CUBES — script.js =========
   - Login / criar conta (localStorage)
   - Seleção de classe
   - Mapa ASCII e movimentação
   - Hotbar: Status, Inventário, Equipamentos
   - Salvamento local por usuário
   - Jogo single player local
*/

// Constantes e Storage
const LS_USERS = "thecubes_users_v1";
const LS_CURRENT = "thecubes_current_user_v1";

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || "{}");
  } catch {
    return {};
  }
}
function writeUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function setCurrentUser(email) {
  localStorage.setItem(LS_CURRENT, email);
}
function getCurrentUser() {
  return localStorage.getItem(LS_CURRENT);
}

function saveGameForCurrent() {
  const email = getCurrentUser();
  if (!email) return;
  const users = readUsers();
  users[email].save = gameState;
  writeUsers(users);
  logMsg("Jogo salvo (automático).");
}

function loadGameForCurrent() {
  const email = getCurrentUser();
  if (!email) return null;
  const users = readUsers();
  return users[email].save || null;
}

// Mapas
const MAPS = [
  [
    "####################",
    "#..!...M.....!.....#",
    "#.......###........#",
    "#..M....#.#....M...#",
    "#.......#.#........#",
    "#....@..#..>.......#",
    "####################",
  ],
  [
    "####################",
    "#..M.....!.......M.#",
    "#..###.......###...#",
    "#..#.#..M..!.#.#...#",
    "#..#.#........#...>#",
    "#.......@.........#",
    "####################",
  ],
];

// Estado default
let defaultState = {
  levelIndex: 0,
  player: {
    name: null,
    email: null,
    classe: null,
    x: 1,
    y: 1,
    hp: 10,
    hpMax: 10,
    mana: 5,
    manaMax: 5,
    forca: 2,
    level: 1,
    xp: 0,
    inventario: { pocao: 1, moedas: 0 },
    equip: { arma: null, armadura: null, acessorio: null },
    tempoSeg: 0,
  },
  enemies: [],
  turnoJogador: true,
  startedAt: Date.now(),
};

let gameState = null;

// Referências DOM
const telaLogin = document.getElementById("telaLogin");
const telaClasse = document.getElementById("telaClasse");
const telaJogo = document.getElementById("telaJogo");
const mapaEl = document.getElementById("mapa");
const logEl = document.getElementById("log");
const nomeJogadorEl = document.getElementById("nomeJogador");
const statusLinhaEl = document.getElementById("statusLinha");
const msgLoginEl = document.getElementById("msgLogin");

const modalStatus = document.getElementById("modalStatus");
const modalInv = document.getElementById("modalInv");
const modalEquip = document.getElementById("modalEquip");
const invListEl = document.getElementById("invList");
const equipSlotsEl = document.getElementById("equipSlots");
const statusDetalhesEl = document.getElementById("statusDetalhes");

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

// Event listeners para login / criação
document.getElementById("btnLogin").addEventListener("click", loginHandler);
document.getElementById("btnCriar").addEventListener("click", criarContaHandler);
document.getElementById("btnLogout").addEventListener("click", logoutHandler);
document.getElementById("btnContinuarSave").addEventListener("click", continuarSaveHandler);

// Ações do jogo
document.getElementById("btnAtacar").addEventListener("click", () =>
  acao("atacar")
);
document.getElementById("btnHabilidade").addEventListener("click", () =>
  acao("habilidade")
);
document.getElementById("btnItem").addEventListener("click", () =>
  acao("item")
);
document.getElementById("btnPassar").addEventListener("click", () =>
  acao("passar")
);

document
  .getElementById("btnHotStatus")
  .addEventListener("click", () => openModal("modalStatus"));
document
  .getElementById("btnHotInv")
  .addEventListener("click", () => openModal("modalInv"));
document
  .getElementById("btnHotEquip")
  .addEventListener("click", () => openModal("modalEquip"));

document.querySelectorAll(".mov").forEach((b) => {
  b.addEventListener("click", () => {
    if (gameState) mover(parseInt(b.dataset.dx), parseInt(b.dataset.dy));
  });
});

document.querySelectorAll(".classeBtn").forEach((b) => {
  b.addEventListener("click", () => {
    escolherClasse(b.dataset.classe);
  });
});

// Exibir tela conforme estado
function mostrarTela(nome) {
  telaLogin.classList.add("hidden");
  telaClasse.classList.add("hidden");
  telaJogo.classList.add("hidden");
  modalStatus.classList.add("hidden");
  modalInv.classList.add("hidden");
  modalEquip.classList.add("hidden");

  if (nome === "login") telaLogin.classList.remove("hidden");
  if (nome === "classe") telaClasse.classList.remove("hidden");
  if (nome === "jogo") telaJogo.classList.remove("hidden");
}

// Login e criação de conta
function criarContaHandler() {
  const em = emailInput.value.trim().toLowerCase();
  const pw = senhaInput.value;
  if (!em || !pw) {
    msgLoginEl.textContent = "Preencha e-mail e senha.";
    return;
  }
  const users = readUsers();
  if (users[em]) {
    msgLoginEl.textContent = "Conta já existe. Faça login.";
    return;
  }
  users[em] = { senha: pw, save: null, perfil: { email: em, createdAt: Date.now() } };
  writeUsers(users);
  setCurrentUser(em);
  msgLoginEl.textContent = "Conta criada. Agora escolha uma classe.";
  mostrarTela("classe");
}

function loginHandler() {
  const em = emailInput.value.trim().toLowerCase();
  const pw = senhaInput.value;
  const users = readUsers();
  if (!users[em] || users[em].senha !== pw) {
    msgLoginEl.textContent = "E-mail ou senha inválidos.";
    return;
  }
  setCurrentUser(em);
  msgLoginEl.textContent = "Logado. Escolha uma classe ou continue o jogo salvo.";
  mostrarTela("classe");
}

function logoutHandler() {
  localStorage.removeItem(LS_CURRENT);
  location.reload();
}

// Escolha de classe e início do jogo
function escolherClasse(classe) {
  if (!getCurrentUser()) {
    alert("Faça login primeiro.");
    mostrarTela("login");
    return;
  }
  iniciarNovoJogo(classe);
}

function iniciarNovoJogo(classe) {
  gameState = JSON.parse(JSON.stringify(defaultState));
  gameState.player.email = getCurrentUser();
  gameState.player.name = gameState.player.email.split("@")[0];
  gameState.player.classe = classe;

  // Ajusta stats por classe
  if (classe === "Guerreiro") {
    gameState.player.hpMax = 24;
    gameState.player.hp = 24;
    gameState.player.manaMax = 3;
    gameState.player.mana = 3;
    gameState.player.forca = 5;
  } else if (classe === "Mago") {
    gameState.player.hpMax = 14;
    gameState.player.hp = 14;
    gameState.player.manaMax = 12;
    gameState.player.mana = 12;
    gameState.player.forca = 2;
  } else if (classe === "Arqueiro") {
    gameState.player.hpMax = 18;
    gameState.player.hp = 18;
    gameState.player.manaMax = 5;
    gameState.player.mana = 5;
    gameState.player.forca = 3;
  }

  gameState.levelIndex = 0;
  gameState.player.x = 5;
  gameState.player.y = 5;
  gameState.player.tempoSeg = 0;
  gameState.turnoJogador = true;
  gameState.startedAt = Date.now();

  mostrarTela("jogo");
  atualizarHUD();
  desenharMapa();
  salvarJogo();
  logMsg(`Jogo iniciado como ${classe}. Boa sorte!`);
}

// Salvar jogo
function salvarJogo() {
  saveGameForCurrent();
}

// Continuar save
function continuarSaveHandler() {
  const save = loadGameForCurrent();
  if (save) {
    gameState = save;
    mostrarTela("jogo");
    atualizarHUD();
    desenharMapa();
    logMsg("Jogo salvo carregado.");
  } else {
    logMsg("Nenhum jogo salvo encontrado. Escolha uma classe para começar.");
  }
}

// Atualizar HUD e status linha
function atualizarHUD() {
  const p = gameState.player;
  nomeJogadorEl.textContent = p.name + " (" + p.classe + ")";
  statusLinhaEl.textContent = `HP: ${p.hp}/${p.hpMax} | Mana: ${p.mana}/${p.manaMax} | Lv: ${p.level} | Tempo: ${formatTempo(p.tempoSeg)}`;
}

// Formatar tempo (segundos para mm:ss)
function formatTempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// Desenhar mapa no <pre>
function desenharMapa() {
  const mapa = MAPS[gameState.levelIndex].map((linha, y) => {
    return linha.split("").map((c, x) => {
      if (x === gameState.player.x && y === gameState.player.y) return "@";
      return c;
    }).join("");
  }).join("\n");
  mapaEl.textContent = mapa;
}

// Movimentar jogador no mapa
function mover(dx, dy) {
  if (!gameState.turnoJogador) {
    logMsg("Espere seu turno.");
    return;
  }
  const nx = gameState.player.x + dx;
  const ny = gameState.player.y + dy;
  const linha = MAPS[gameState.levelIndex][ny];
  if (!linha) {
    logMsg("Não pode mover para fora do mapa.");
    return;
  }
  const tile = linha.charAt(nx);
  if (tile === "#" || tile === undefined) {
    logMsg("Parede no caminho.");
    return;
  }
  gameState.player.x = nx;
  gameState.player.y = ny;
  gameState.player.tempoSeg++;
  atualizarHUD();
  desenharMapa();
  logMsg(`Você se moveu para (${nx},${ny}).`);
  salvarJogo();
}

// Ações (atacar, habilidade, item, passar)
function acao(tipo) {
  if (!gameState.turnoJogador) {
    logMsg("Espere seu turno.");
    return;
  }
  switch (tipo) {
    case "atacar":
      logMsg("Você atacou! (implementação simples)");
      break;
    case "habilidade":
      logMsg("Você usou uma habilidade! (não implementada)");
      break;
    case "item":
      logMsg("Você abriu o inventário para usar itens.");
      openModal("modalInv");
      break;
    case "passar":
      logMsg("Você passou o turno.");
      break;
  }
  gameState.turnoJogador = false;
  salvarJogo();
  setTimeout(() => {
    gameState.turnoJogador = true;
    logMsg("Seu turno voltou.");
  }, 1000);
}

// Modal open / close
function openModal(id) {
  if (id === "modalStatus") {
    showStatusDetalhes();
  } else if (id === "modalInv") {
    mostrarInventario();
  } else if (id === "modalEquip") {
    mostrarEquipamentos();
  }
  document.getElementById(id).classList.remove("hidden");
}
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// Mostrar status detalhado
function showStatusDetalhes() {
  const p = gameState.player;
  statusDetalhesEl.innerHTML = `
    Nome: ${p.name}<br>
    Classe: ${p.classe}<br>
    HP: ${p.hp} / ${p.hpMax}<br>
    Mana: ${p.mana} / ${p.manaMax}<br>
    Força: ${p.forca}<br>
    Level: ${p.level}<br>
    XP: ${p.xp}<br>
    Tempo de jogo: ${formatTempo(p.tempoSeg)}
  `;
}

// Mostrar inventário
function mostrarInventario() {
  const p = gameState.player;
  invListEl.innerHTML = "";
  for (const item in p.inventario) {
    const li = document.createElement("div");
    li.textContent = `${item}: ${p.inventario[item]}`;
    invListEl.appendChild(li);
  }
}

// Mostrar equipamentos
function mostrarEquipamentos() {
  const p = gameState.player;
  equipSlotsEl.innerHTML = "";
  const slots = ["arma", "armadura", "acessorio"];
  slots.forEach((slot) => {
    const div = document.createElement("div");
    div.className = "equip-slot";
    div.textContent = `${slot}: ${p.equip[slot] || "Nenhum"}`;
    equipSlotsEl.appendChild(div);
  });
  const actions = document.getElementById("equipActions");
  actions.innerHTML = "";
  // aqui você pode adicionar botões para equipar / desequipar itens
}

// Log mensagens do jogo
function logMsg(txt) {
  logEl.textContent = txt;
}

// Ao carregar a página
window.onload = () => {
  if (getCurrentUser()) {
    mostrarTela("classe");
  } else {
    mostrarTela("login");
  }
};