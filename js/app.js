// Estrutura fixa dos 12 jogos (índices das duplas 0..3)
const matchStructure = [
  { id: 1, t1: 0, t2: 1 }, { id: 2, t1: 2, t2: 3 }, { id: 3, t1: 1, t2: 2 }, { id: 4, t1: 3, t2: 0 },
  { id: 5, t1: 2, t2: 0 }, { id: 6, t1: 3, t2: 1 }, { id: 7, t1: 0, t2: 1 }, { id: 8, t1: 2, t2: 3 },
  { id: 9, t1: 1, t2: 2 }, { id: 10, t1: 3, t2: 0 }, { id: 11, t1: 2, t2: 0 }, { id: 12, t1: 3, t2: 1 }
];

// Jogadores predefinidos para aparecerem no ranking anual com 0 pontos
const initialPlayers = ["Rodrigo","Italo","MB","Claudino","Bené","Samuel","Vitim","Marcílio","Pedro","Wagner","Lucas","Diêgo","Rudson","Léo","Marcão"];

// "Banco" local (salvo no navegador) — mesma chave do seu projeto original
let db = JSON.parse(localStorage.getItem('vcaos_master_v5')) || {
  tournaments: {},
  annualPoints: {}
};

// Garante que os jogadores preexistentes estejam no ranking
initialPlayers.forEach(p => {
  if (db.annualPoints[p] === undefined) db.annualPoints[p] = 0;
});


// Normalização de nomes (para tratar "Lucas" e "lucas" como a mesma pessoa)
// - remove espaços extras
// - ignora maiúsculas/minúsculas
// - remove acentos (ex: "Diêgo" == "Diego")
function normalizeNameKey(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Retorna um nome "canônico" já existente no ranking (se houver), evitando duplicidade por caixa/acentos
function resolvePlayerName(inputName) {
  const raw = (inputName || "").trim();
  if (!raw) return "";

  const key = normalizeNameKey(raw);

  // Preferir nomes já existentes no ranking anual
  for (const existing of Object.keys(db.annualPoints || {})) {
    if (normalizeNameKey(existing) === key) return existing;
  }

  // Preferir a grafia de initialPlayers (se bater)
  for (const p of initialPlayers) {
    if (normalizeNameKey(p) === key) return p;
  }

  return raw;
}

// ===== Permissões (login fica em auth.js) =====
function isAdminUser(){
  return (window.isAdmin && window.isAdmin()) || false;
}

// ===== Data local (evita problemas de fuso/UTC) =====
function localISODate(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
const TODAY = localISODate();



let selectedDate = TODAY;
document.getElementById('tournamentDate').value = selectedDate;
// Se não for admin, força hoje
if (!isAdminUser()) { selectedDate = TODAY; document.getElementById('tournamentDate').value = TODAY; }

// Cria estrutura padrão de um torneio (para reaproveitar em criação e reset)
function defaultTournament() {
  return {
    teams: ["", "", "", ""],
    scores: Array(12).fill(null).map(() => ({ s1: "", s2: "", dur: "" })),
    finished: false,
    annualAward: null
  };
}

function loadTournamentDate() {
  selectedDate = document.getElementById('tournamentDate').value;

  // Jogador não pode lançar/editar datas anteriores (somente ADMIN)
  if (!isAdminUser() && selectedDate !== TODAY) {
    alert(`🔒 Apenas o ADMIN pode inserir/editar torneios de datas anteriores.\nVoltando para a data de hoje (${TODAY}).`);
    selectedDate = TODAY;
    document.getElementById('tournamentDate').value = TODAY;
  }

  if (!db.tournaments[selectedDate]) {
    db.tournaments[selectedDate] = defaultTournament();
    saveDB();
  }

  render();
}

function switchTab(tab) {
  document.getElementById('tab-torneio').style.display = tab === 'torneio' ? 'block' : 'none';
  document.getElementById('tab-ranking').style.display = tab === 'ranking' ? 'block' : 'none';
  document.getElementById('tabTorneioBtn').classList.toggle('active', tab === 'torneio');
  document.getElementById('tabRankingBtn').classList.toggle('active', tab === 'ranking');
  if (tab === 'ranking') renderAnnualRanking();
}

function updateTeamNames() {
  let t = db.tournaments[selectedDate];
  for (let i = 0; i < 4; i++) t.teams[i] = document.getElementById(`team${i}`).value;
  saveDB();
  render();
}

/**
 * Sorteia 4 duplas (8 jogadores) a partir de uma lista.
 * - Por padrão usa a lista initialPlayers.
 * - Você pode personalizar a lista (separada por vírgula) no prompt.
 * Preenche os campos team0..team3 e salva no torneio da data selecionada.
 */
function limparDuplas() {
  const t = db.tournaments[selectedDate] || (db.tournaments[selectedDate] = defaultTournament());
  t.teams = ["", "", "", ""];
  t.finished = false;
  saveDB();
  render();
}

function sortearDuplas() {
  const t = db.tournaments[selectedDate] || (db.tournaments[selectedDate] = defaultTournament());

  // Se já existe algo preenchido, avisa que vai substituir
  const hasAnyTeam = (t.teams || []).some(x => (x || "").trim() !== "");
  if (hasAnyTeam) {
    if (!confirm("Isso vai SUBSTITUIR as duplas atuais. Deseja continuar?")) return;
  }

  const raw = prompt(
    "Informe os jogadores de hoje separados por vírgula (mínimo 8 jogadores ÚNICOS).\n" +
      "Ex: Rodrigo, Italo, MB, Claudino, Bené, Samuel, Vitim, Marcílio",
    initialPlayers.join(", ")
  );

  if (raw === null) return; // cancelou

  // 1) Quebra, limpa e remove vazios
  const parsed = raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // 2) Remove nomes repetidos (tratando Lucas == lucas, e removendo acentos)
  const unique = [];
  const seen = new Set();
  parsed.forEach(name => {
    const key = normalizeNameKey(name);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  });

  if (unique.length < 8) {
    alert(
      `❌ Você precisa de pelo menos 8 jogadores únicos para sortear 4 duplas.\n` +
        `Você informou ${parsed.length} nomes (${unique.length} únicos).`
    );
    return;
  }

  // Embaralha (Fisher-Yates)
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  // Pega os 8 primeiros e forma 4 duplas
  const picked = unique.slice(0, 8);

  // Garante consistência do nome (caso o jogador já exista no ranking anual)
  const p = picked.map(n => resolvePlayerName(n));

  t.teams = [
    `${p[0]}/${p[1]}`,
    `${p[2]}/${p[3]}`,
    `${p[4]}/${p[5]}`,
    `${p[6]}/${p[7]}`
  ];

  t.finished = false;
  saveDB();
  render();
}


function render() {
  let t = db.tournaments[selectedDate];
  // trava data para jogador (somente hoje)
  const dateInput = document.getElementById('tournamentDate');
  if (dateInput) {
    if (isAdminUser()) {
      dateInput.disabled = false;
    } else {
      dateInput.value = TODAY;
      dateInput.max = TODAY;
      dateInput.disabled = true;
    }
  }


  for (let i = 0; i < 4; i++) document.getElementById(`team${i}`).value = t.teams[i];

  const list = document.getElementById('matches-list');
  list.innerHTML = matchStructure.map((m, idx) => `
    <div class="match-card">
      <div class="team-info"><b>${t.teams[m.t1]}</b>
        <input type="number" class="score-input" value="${t.scores[idx].s1}" oninput="saveScore(${idx}, 1, this.value)">
      </div>

      <div class="match-mid">
        <span class="match-id">JOGO ${m.id}</span>
        <button class="save-time-btn" onclick="saveMatchTime(${idx})">SALVAR TEMPO</button>
        <span class="duration-text">${t.scores[idx].dur || '--:--:--'}</span>
      </div>

      <div class="team-info"><b>${t.teams[m.t2]}</b>
        <input type="number" class="score-input" value="${t.scores[idx].s2}" oninput="saveScore(${idx}, 2, this.value)">
      </div>
    </div>
  `).join('');

  document.getElementById('finalizarBtn').style.display = t.finished ? 'none' : 'block';
  updateRank();
}

function saveScore(idx, team, val) {
  let t = db.tournaments[selectedDate];
  if (team === 1) t.scores[idx].s1 = val;
  else t.scores[idx].s2 = val;
  saveDB();
  updateRank();
}

function saveMatchTime(idx) {
  let t = db.tournaments[selectedDate];
  t.scores[idx].dur = document.getElementById('clock').innerText;
  saveDB();
  render();
}

function updateRank() {
  let t = db.tournaments[selectedDate];
  let stats = t.teams.map(name => ({ name, v: 0, p: 0, c: 0 }));

  matchStructure.forEach((m, idx) => {
    let s = t.scores[idx];
    if (s.s1 !== "" && s.s2 !== "") {
      let p1 = parseInt(s.s1, 10), p2 = parseInt(s.s2, 10);

      stats[m.t1].p += p1; stats[m.t1].c += p2;
      stats[m.t2].p += p2; stats[m.t2].c += p1;

      if (p1 > p2) stats[m.t1].v++;
      else if (p2 > p1) stats[m.t2].v++;
    }
  });

  let sorted = stats
    .map(s => ({ ...s, sal: s.p - s.c }))
    .sort((a, b) => b.v - a.v || b.sal - a.sal);

  document.getElementById('rank-body').innerHTML = sorted
    .map((s, i) => `<tr><td><b>${i + 1}º</b></td><td>${s.name}</td><td>${s.v}</td><td>${s.p}</td><td>${s.sal}</td></tr>`)
    .join('');

  return sorted;
}

function finalizarTorneio() {
  let t = db.tournaments[selectedDate];
  if (t.finished) return;

  if (!confirm("Encerrar o dia e computar pontos para o Ranking Anual?")) return;

  let sorted = updateRank();
  const pts = [5, 3, 2, 2]; // 1º: 5, 2º: 3, 3º/4º: 2

  // Guarda quanto foi somado no ranking anual para permitir estorno (ex: se zerar este torneio)
  const award = {};

  sorted.forEach((dupla, rank) => {
    dupla.name.split('/').forEach(jogador => {
      let nome = resolvePlayerName(jogador);
      const add = pts[rank];
      if(nome){ db.annualPoints[nome] = (db.annualPoints[nome] || 0) + add; }
      if(nome){ award[nome] = (award[nome] || 0) + add; }
    });
  });

  t.annualAward = award;
  t.finished = true;
  saveDB();
  render();
  alert("Ranking Atualizado!");
  switchTab('ranking');
}

function renderAnnualRanking() {
  let sorted = Object.entries(db.annualPoints).sort((a, b) => b[1] - a[1]);

  document.getElementById('annual-rank-body').innerHTML = sorted.map(([name, pts], i) => {
    let medal = "";
    if (i === 0 && pts > 0) medal = "🥇 ";
    else if (i === 1 && pts > 0) medal = "🥈 ";
    else if (i === 2 && pts > 0) medal = "🥉 ";

    return `<tr><td><b>${i + 1}º</b></td><td>${medal}${name}</td><td><b>${pts} pts</b></td></tr>`;
  }).join('');
}

function saveDB() {
  localStorage.setItem('vcaos_master_v5', JSON.stringify(db));
}

// ===== Cronômetro =====
let timer, elapsed = 0;

function startClock() {
  clearInterval(timer);
  let sT = Date.now() - elapsed;

  timer = setInterval(() => {
    elapsed = Date.now() - sT;

    let s = Math.floor(elapsed / 1000) % 60;
    let m = Math.floor(elapsed / 60000) % 60;
    let h = Math.floor(elapsed / 3600000);

    document.getElementById('clock').innerText =
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function pauseClock() { clearInterval(timer); }

function resetClock() {
  pauseClock();
  elapsed = 0;
  document.getElementById('clock').innerText = "00:00:00";
}

// ===== WhatsApp =====
function shareWhatsApp() {
  let t = db.tournaments[selectedDate];
  let txt = `🏐 *VÔLEI DO CAOS - ${selectedDate}*\n\n*CLASSIFICAÇÃO:*\n`;
  const rows = document.querySelectorAll("#rank-body tr");
  rows.forEach(r => txt += r.innerText + "\n");
  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
}

function shareAnnualRanking() {
  let txt = "🏆 *RANKING ANUAL VÔLEI DO CAOS*\n";
  Object.entries(db.annualPoints)
    .sort((a, b) => b[1] - a[1])
    .forEach(([n, p], i) => txt += `${i + 1}º ${n}: ${p} pts\n`);

  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
}

// ===== NOVO: ZERAR RANKING ANUAL =====
function resetRanking() {
  if (!confirm("⚠️ ATENÇÃO!\nIsso irá zerar TODO o ranking anual.\nDeseja continuar?")) return;

  db.annualPoints = {};
  initialPlayers.forEach(p => db.annualPoints[p] = 0);

  saveDB();
  renderAnnualRanking();
  alert("✅ Ranking anual zerado com sucesso!");
}


// Calcula (ou re-calcula) quais pontos este torneio adicionaria ao ranking anual.
// Usado para estornar pontos quando o torneio é zerado/removido.
function computeAnnualAwardFromTournament(tournament) {
  const sorted = computeRankFromTournament(tournament);
  const pts = [5, 3, 2, 2];
  const award = {};
  sorted.forEach((dupla, rank) => {
    dupla.name.split('/').forEach(jogador => {
      const nome = resolvePlayerName(jogador);
      const add = pts[rank];
      if(nome){ award[nome] = (award[nome] || 0) + add; }
    });
  });
  return award;
}

// Calcula a classificação a partir do objeto do torneio (sem depender do DOM)
function computeRankFromTournament(tournament) {
  let stats = tournament.teams.map(name => ({ name, v: 0, p: 0, c: 0 }));
  matchStructure.forEach((m, idx) => {
    let s = tournament.scores[idx];
    if (s && s.s1 !== "" && s.s2 !== "" && s.s1 != null && s.s2 != null) {
      let p1 = parseInt(s.s1), p2 = parseInt(s.s2);
      if (Number.isNaN(p1) || Number.isNaN(p2)) return;
      stats[m.t1].p += p1; stats[m.t1].c += p2;
      stats[m.t2].p += p2; stats[m.t2].c += p1;
      if (p1 > p2) stats[m.t1].v++; else if (p2 > p1) stats[m.t2].v++;
    }
  });
  return stats
    .map(s => ({ ...s, sal: s.p - s.c }))
    .sort((a, b) => (b.v - a.v) || (b.sal - a.sal));
}

// ===== NOVO: ZERAR TORNEIO DO DIA (DATA SELECIONADA) =====
function resetTournament() {
  const date = document.getElementById('tournamentDate').value || selectedDate;

  if (!confirm(`⚠️ ATENÇÃO!\nIsso irá apagar/zerar todos os jogos e duplas do torneio de ${date}.\nDeseja continuar?`)) return;

  const existing = db.tournaments[date];
  // Se este torneio já tinha sido finalizado, estorna do ranking anual os pontos que ele adicionou
  if (existing && existing.finished) {
    const award = existing.annualAward || computeAnnualAwardFromTournament(existing);
    Object.entries(award).forEach(([player, pts]) => {
      const nome = resolvePlayerName(player);
      db.annualPoints[nome] = Math.max(0, (db.annualPoints[nome] || 0) - pts);
    });
    // Garante que jogadores iniciais continuem aparecendo (com 0 se necessário)
    initialPlayers.forEach(p => { if (db.annualPoints[p] === undefined) db.annualPoints[p] = 0; });
  }

  // Remove o torneio daquela data e recria do zero
  delete db.tournaments[date];
  db.tournaments[date] = defaultTournament();

  selectedDate = date;
  saveDB();

  // Opcional: zera o cronômetro também
  resetClock();

  render();
  alert(`✅ Torneio do dia (${date}) zerado com sucesso!`);
}

// Inicializa carregando a data atual
loadTournamentDate();
