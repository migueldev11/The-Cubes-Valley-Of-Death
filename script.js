l/* The Cubes: In Valley of Death - Mobile Complete
   Código comentado e pronto pra rodar em browser mobile.
*/

// ----- Dados do jogo (mapas, configs) -----
const mapas = [
  // Nível 1
  [
    "####################",
    "#..!...M.....!.....#",
    "#.......###........#",
    "#..M....#.#....M...#",
    "#.......#.#........#",
    "#....@..#..>.......#",
    "####################"
  ],
  // Nível 2
  [
    "####################",
    "#..M.....!.......M.#",
    "#..###.......###...#",
    "#..#.#..M..!.#.#...#",
    "#..#.#........#...>#",
    "#.......@.........#",
    "####################"
  ]
];

// Estado do jogo (será salvo no localStorage)
let estado = {
  nivel: 0,
  jogador: {
    x: 1, y: 1,
    classe: null,
    hp: 10, hpMax: 10,
    mana: 5, manaMax: 5,
    forca: 2,
    inventario: { pocao: 1 },
    habilidadeCooldown: 0
  },
  inimigos: [] // preenchidos ao carregar cada nível
};

// DOM
const telaClasse = document.getElementById("telaClasse");
const telaJogo = document.getElementById("telaJogo");
const mapaEl = document.getElementById("mapa");
const logEl = document.getElementById("log");
const nomeClasseEl = document.getElementById("nomeClasse");
const vidasEl = document.getElementById("vidas");
const manaEl = document.getElementById("mana");
const btnAtacar = document.getElementById("btnAtacar");
const btnHabilidade = document.getElementById("btnHabilidade");
const btnItem = document.getElementById("btnItem");
const btnPassar = document.getElementById("btnPassar");
const btnSalvar = document.getElementById("btnSalvar");
const btnReiniciar = document.getElementById("btnReiniciar");

// Turno
let turnoJogador = true;
let logBuffer = [];

// ----- Utilitários -----
function salvarEstado(){
  localStorage.setItem("thecubes_state", JSON.stringify(estado));
  writeLog("Jogo salvo.");
}
function carregarEstado(){
  const s = localStorage.getItem("thecubes_state");
  if(s){ try{ estado = JSON.parse(s); return true }catch(e){ return false } }
  return false;
}
function reiniciarJogo(){
  localStorage.removeItem("thecubes_state");
  location.reload();
}
function writeLog(msg){
  const hora = new Date().toLocaleTimeString();
  logBuffer.push(`[${hora}] ${msg}`);
  if(logBuffer.length>50) logBuffer.shift();
  logEl.textContent = logBuffer.slice(-6).join("\n");
}

// ----- Inicialização de nível -----
function posicaoInicialDoMapa(n){
  // procura @ no mapa (posição de spawn definida nos mapas)
  const mapa = mapas[n];
  for(let y=0; y<mapa.length; y++){
    const linha = mapa[y];
    const idx = linha.indexOf("@");
    if(idx>=0){
      return { x: idx, y };
    }
  }
  return { x:1, y:1 };
}
function carregarNivel(n){
  estado.nivel = n;
  estado.inimigos = [];
  const mapa = mapas[n];
  // localizar inimigos 'M' no mapa inicial e criar objetos
  for(let y=0; y<mapa.length; y++){
    for(let x=0; x<mapa[y].length; x++){
      if(mapa[y][x] === "M"){
        estado.inimigos.push({ x, y, hp: 8 });
      }
      if(mapa[y][x] === "@"){
        // posiciona o jogador ali
        estado.jogador.x = x;
        estado.jogador.y = y;
      }
    }
  }
  turnoJogador = true;
  writeLog(`Entrou no nível ${n+1}.`);
  renderTudo();
  salvarEstado();
}

// ----- Renderização -----
function renderMapa(){
  const mapaArr = mapas[estado.nivel].map(row => row.split(""));
  // substituir símbolos interativos por '.' ao desenhar (itens permanecem)
  // colocar inimigos vivos
  estado.inimigos.forEach(e => {
    if(e.hp>0) mapaArr[e.y][e.x] = "M";
  });
  // colocar jogador
  mapaArr[estado.jogador.y][estado.jogador.x] = "@";
  mapaEl.textContent = mapaArr.map(r => r.join("")).join("\n");
}
function renderHUD(){
  const p = estado.jogador;
  nomeClasseEl.textContent = p.classe || "—";
  vidasEl.textContent = `HP: ${p.hp}/${p.hpMax}`;
  manaEl.textContent = `Mana: ${p.mana}/${p.manaMax}`;
}
function renderTudo(){
  renderMapa();
  renderHUD();
  logEl.textContent = logBuffer.slice(-6).join("\n");
}

// ----- Movimento e interação -----
function podeAndar(x,y){
  const mapa = mapas[estado.nivel];
  if(!mapa[y]) return false;
  const tile = mapa[y][x];
  if(!tile) return false;
  return tile !== "#";
}
function acharInimigoEm(x,y){
  return estado.inimigos.find(e => e.x===x && e.y===y && e.hp>0);
}
function eventosNoTile(x,y){
  const mapa = mapas[estado.nivel];
  const tile = mapa[y][x];
  if(tile === "!"){
    estado.jogador.inventario.pocao = (estado.jogador.inventario.pocao||0) + 1;
    // remove o item do mapa (substitui por '.')
    mapas[estado.nivel][y] = replaceAt(mapas[estado.nivel][y], x, ".");
    writeLog("Você pegou uma poção!");
  }
  if(tile === ">"){
    // subir de nível
    const prox = estado.nivel + 1;
    if(prox >= mapas.length){
      writeLog("Você alcançou o fim da masmorra! Vitória!");
      alert("Parabéns! Você venceu The Cubes: In Valley of Death!");
      reiniciarJogo();
      return;
    } else {
      carregarNivel(prox);
      return;
    }
  }
}
function replaceAt(str, idx, chr){
  return str.substr(0, idx) + chr + str.substr(idx+1);
}
function mover(dx,dy){
  if(!turnoJogador) return;
  const nx = estado.jogador.x + dx;
  const ny = estado.jogador.y + dy;
  if(!podeAndar(nx,ny)) { writeLog("Parede bloqueia o caminho."); return; }
  const inim = acharInimigoEm(nx,ny);
  if(inim){
    atacarInimigo(inim);
    return;
  }
  estado.jogador.x = nx; estado.jogador.y = ny;
  eventosNoTile(nx,ny);
  writeLog(`Você andou para (${nx},${ny}).`);
  turnoJogador = false;
  renderTudo();
  setTimeout(turnoInimigos, 400);
}

// ----- Combate & ações -----
function atacarInimigo(inimigo){
  const atk = estado.jogador.forca;
  inimigo.hp -= atk;
  writeLog(`Você atacou o inimigo e causou ${atk} de dano.`);
  if(inimigo.hp<=0){ writeLog("Inimigo derrotado!"); }
  turnoJogador = false;
  renderTudo();
  setTimeout(turnoInimigos, 500);
}
function usarHabilidade(){
  const p = estado.jogador;
  if(p.mana <= 0){ writeLog("Mana insuficiente."); return; }
  if(p.habilidadeCooldown > 0){ writeLog("Habilidade em cooldown."); return; }
  // habilidade única por classe (simples)
  if(p.classe === "Guerreiro"){
    // dano em volta
    const adj = estado.inimigos.filter(e => e.hp>0 && Math.abs(e.x-p.x)+Math.abs(e.y-p.y)===1);
    adj.forEach(e => { e.hp -= (p.forca+2); });
    writeLog("Guerreiro: golpe em área!");
    p.mana -= 1;
  } else if(p.classe === "Mago"){
    // projétil: dano a todos os inimigos a distância 2
    estado.inimigos.forEach(e => { if(e.hp>0) e.hp -= (p.forca+3); });
    writeLog("Mago: lança um raio mágico!");
    p.mana -= 2;
  } else if(p.classe === "Arqueiro"){
    // dano em alvo mais próximo
    const vivo = estado.inimigos.filter(e => e.hp>0);
    if(vivo.length>0){
      vivo.sort((a,b)=> (Math.abs(a.x-p.x)+Math.abs(a.y-p.y)) - (Math.abs(b.x-p.x)+Math.abs(b.y-p.y)));
      vivo[0].hp -= (p.forca+3);
      writeLog("Arqueiro: tiro certeiro!");
      p.mana -= 1;
    } else writeLog("Nenhum inimigo para mirar.");
  }
  p.habilidadeCooldown = 3; // exemplo de cooldown (turnos)
  turnoJogador = false;
  renderTudo();
  setTimeout(turnoInimigos, 600);
}
function usarItem(){
  const inv = estado.jogador.inventario;
  if(!inv.pocao || inv.pocao<=0){ writeLog("Sem poções."); return; }
  estado.jogador.hp += 6;
  if(estado.jogador.hp > estado.jogador.hpMax) estado.jogador.hp = estado.jogador.hpMax;
  inv.pocao--;
  writeLog("Você usou uma poção e recuperou 6 HP.");
  turnoJogador = false;
  renderTudo();
  setTimeout(turnoInimigos, 500);
}
function passarTurno(){
  if(!turnoJogador) return;
  writeLog("Você passou o turno.");
  turnoJogador = false;
  setTimeout(turnoInimigos, 450);
}

// ----- IA simples dos inimigos -----
function turnoInimigos(){
  const p = estado.jogador;
  estado.inimigos.forEach(e => {
    if(e.hp<=0) return;
    const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
    if(dist === 1){
      // ataca
      p.hp -= 2;
      writeLog("Um inimigo te acertou! -2 HP");
    } else {
      // movimenta 1 passo em direção ao jogador, se possível
      let dx = 0, dy = 0;
      if(e.x < p.x) dx = 1;
      else if(e.x > p.x) dx = -1;
      else if(e.y < p.y) dy = 1;
      else if(e.y > p.y) dy = -1;
      const nx = e.x + dx, ny = e.y + dy;
      if(podeAndar(nx,ny) && !acharInimigoEm(nx,ny) && !(p.x===nx && p.y===ny)){
        e.x = nx; e.y = ny;
      }
    }
  });

  // reduzir cooldowns
  if(estado.jogador.habilidadeCooldown>0) estado.jogador.habilidadeCooldown--;

  // checar morte do jogador
  if(estado.jogador.hp <= 0){
    writeLog("Você morreu!");
    alert("Você morreu! O jogo será reiniciado.");
    reiniciarJogo();
    return;
  }

  turnoJogador = true;
  renderTudo();
  salvarEstado();
}

// ----- Escolha de classe inicial -----
function escolherClasse(classe){
  const p = estado.jogador;
  p.classe = classe;
  if(classe === "Guerreiro"){
    p.hpMax = 24; p.hp = p.hpMax; p.manaMax = 3; p.mana = 3; p.forca = 5;
  } else if(classe === "Mago"){
    p.hpMax = 14; p.hp = p.hpMax; p.manaMax = 12; p.mana = 12; p.forca = 2;
  } else if(classe === "Arqueiro"){
    p.hpMax = 18; p.hp = p.hpMax; p.manaMax = 6; p.mana = 6; p.forca = 4;
  }
  p.inventario = { pocao: 1 };
  p.habilidadeCooldown = 0;
  telaClasse.classList.add("hidden");
  telaJogo.classList.remove("hidden");
  carregarNivel(0);
  salvarEstado();
}

// ----- Eventos UI -----
document.querySelectorAll(".classeBtns button").forEach(btn=>{
  btn.addEventListener("click", ()=> escolherClasse(btn.dataset.classe));
});
document.querySelectorAll(".mov").forEach(b=>{
  b.addEventListener("click", ()=>{
    const dx = parseInt(b.dataset.dx), dy = parseInt(b.dataset.dy);
    mover(dx,dy);
  });
});
btnAtacar.addEventListener("click", ()=>{
  // ataca o inimigo adjacente mais próximo
  if(!turnoJogador) return;
  const p = estado.jogador;
  const adj = estado.inimigos.filter(e=>e.hp>0 && Math.abs(e.x-p.x)+Math.abs(e.y-p.y)===1);
  if(adj.length===0){ writeLog("Nenhum inimigo próximo para atacar."); return; }
  atacarInimigo(adj[0]);
});
btnHabilidade.addEventListener("click", ()=> usarHabilidade());
btnItem.addEventListener("click", ()=> usarItem());
btnPassar.addEventListener("click", ()=> passarTurno());
btnSalvar.addEventListener("click", ()=> salvarEstado());
btnReiniciar.addEventListener("click", ()=> {
  if(confirm("Reiniciar o jogo?")) reiniciarJogo();
});

// ----- Atalhos de teclado (se o usuário tiver teclado) -----
window.addEventListener("keydown", e=>{
  if(telaJogo.classList.contains("hidden")) return;
  if(!turnoJogador) return;
  const k = e.key.toLowerCase();
  if(k === "arrowup" || k === "w") mover(0,-1);
  else if(k === "arrowdown" || k === "s") mover(0,1);
  else if(k === "arrowleft" || k === "a") mover(-1,0);
  else if(k === "arrowright" || k === "d") mover(1,0);
  else if(k === " ") passarTurno();
});

// ----- Ao carregar a página -----
(function init(){
  if(!carregarEstado()){
    writeLog("Novo jogo. Escolha uma classe para começar.");
    telaClasse.classList.remove("hidden");
    telaJogo.classList.add("hidden");
  } else {
    // estado carregado: se já escolheu classe, mostrar jogo; senão, mostrar tela de classe
    if(estado.jogador.classe){
      telaClasse.classList.add("hidden");
      telaJogo.classList.remove("hidden");
      // caso salvou dentro de um mapa: recarrega inimigos e render
      carregarNivel(estado.nivel || 0);
      // sincroniza posição do jogador (se estava salva)
      renderTudo();
      writeLog("Jogo carregado do armazenamento local.");
    } else {
      telaClasse.classList.remove("hidden");
    }
  }
})();