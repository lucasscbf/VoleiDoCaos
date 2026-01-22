// ==============================
// VÔLEI DO CAOS — APP (Front-end)
// ==============================

// Estrutura fixa dos 12 jogos (índices das duplas 0..3)
const matchStructure = [
  { id: 1, t1: 0, t2: 1 }, { id: 2, t1: 2, t2: 3 }, { id: 3, t1: 1, t2: 2 }, { id: 4, t1: 3, t2: 0 },
  { id: 5, t1: 2, t2: 0 }, { id: 6, t1: 3, t2: 1 }, { id: 7, t1: 0, t2: 1 }, { id: 8, t1: 2, t2: 3 },
  { id: 9, t1: 1, t2: 2 }, { id: 10, t1: 3, t2: 0 }, { id: 11, t1: 2, t2: 0 }, { id: 12, t1: 3, t2: 1 }
];

// Jogadores predefinidos (aparecem no ranking anual com 0 pontos)
const initialPlayers = ["Rodrigo","Italo","MB","Claudino","Bené","Samuel","Vitim","Marcílio","Pedro","Wagner","Lucas","Diêgo","Rudson","Léo","Marcão"];

// Chaves do localStorage
const DB_KEY = "vcaos_master_v5";
const DATE_KEY = "vcaos_selected_date";

// "Banco" local
let db = JSON.parse(localStorage.getItem(DB_KEY)) || { tournaments: {}, annualPoints: {} };

// Garante jogadores iniciais no ranking anual
initialPlayers.forEach(p => { if (db.annualPoints[p] === undefined) db.annualPoints[p] = 0; });

// ===== Normalização de nomes (Lucas == lucas, Diêgo == Diego etc.) =====
function normalizeNameKey(name) {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolvePlayerName(inputName) {
  const raw = (inputName || "").trim();
  if (!raw) return "";

  const key = normalizeNameKey(raw);

  // Preferir nomes já existentes no ranking anual
  for (const existing of Object.keys(db.annualPoints || {})) {
    if (normalizeNameKey(existing) === key) return existing;
  }
  // Preferir a grafia dos initialPlayers
  for (const p of initialPlayers) {
    if (normalizeNameKey(p) === key) return p;
  }
  return raw;
}

// ===== Estado (data selecionada) =====
let selectedDate = localStorage.getItem(DATE_KEY) || new Date().toISOString().split("T")[0];

// ===== Helpers =====
function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  localStorage.setItem(DATE_KEY, selectedDate);
}

function defaultTournament() {
  return {
    teams: ["", "", "", ""],
    presentPlayers: [], // lista de presentes (nomes canônicos)
    scores: Array(12).fill(null).map(() => ({ s1: "", s2: "", dur: "" })),
    finished: false,
    annualAward: null // recibo para estornar do anual
  };
}

function getTournament(date = selectedDate) {
  if (!db.tournaments[date]) db.tournaments[date] = defaultTournament();
  const t = db.tournaments[date];
  if (!t.presentPlayers) t.presentPlayers = [];
  if (!t.teams) t.teams = ["", "", "", ""];
  if (!t.scores) t.scores = Array(12).fill(null).map(() => ({ s1: "", s2: "", dur: "" }));
  return t;
}

function setDate(date) {
  selectedDate = date;
  saveDB();

  const dateInput = document.getElementById("tournamentDate");
  if (dateInput) dateInput.value = selectedDate;

  // garante torneio
  getTournament(selectedDate);

  renderAll();
}

// ===== Regras p/ “folga” / dupla vazia =====
function isInactiveTeamName(name) {
  const n = (name || "").trim();
  return n === "" || normalizeNameKey(n) === normalizeNameKey("folga");
}

function matchIsActive(t, matchIdx) {
  const m = matchStructure[matchIdx];
  const n1 = t.teams[m.t1];
  const n2 = t.teams[m.t2];
  return !isInactiveTeamName(n1) && !isInactiveTeamName(n2);
}


function requireAdminSafe() {
  return (window.requireAdmin && window.requireAdmin()) || false;
}


function applyAdminUI() {
  const isAdm = (window.isAdmin && window.isAdmin()) || false;
  document.querySelectorAll("[data-admin-only='1']").forEach(el => {
    el.style.display = isAdm ? "" : "none";
  });
}

// ===== UI: limitar seleção a 8 checkboxes (mas permitir 6 ou 8 para sortear) =====
function enforceMax8Checkboxes() {
  const host = document.getElementById("present-list");
  const counter = document.getElementById("present-counter");
  if (!host) return;

  const checkboxes = host.querySelectorAll("input[type='checkbox']");
  let checkedCount = 0;
  checkboxes.forEach(cb => { if (cb.checked) checkedCount++; });

  if (counter) counter.textContent = `Presentes: ${checkedCount} (válido: 6 ou 8)`;

  const limitReached = checkedCount >= 8;

  checkboxes.forEach(cb => {
    if (!cb.checked) cb.disabled = limitReached;
    else cb.disabled = false;
  });
}

// ===== Presentes (checkboxes) =====
function renderPresentList() {
  const host = document.getElementById("present-list");
  if (!host) return;

  const t = getTournament();
  const selectedKeys = new Set((t.presentPlayers || []).map(normalizeNameKey));

  host.innerHTML = initialPlayers.map((name) => {
    const key = normalizeNameKey(name);
    const checked = selectedKeys.has(key) ? "checked" : "";
    const id = "p_" + key.replace(/[^a-z0-9]/g, "_");
    const safeName = name.replace(/'/g, "\\'");
    return `
      <label class="present-item" for="${id}">
        <input class="present-checkbox" id="${id}" type="checkbox" ${checked}
               onchange="togglePresent('${safeName}', this.checked)">
        <span>${name}</span>
      </label>
    `;
  }).join("");

  enforceMax8Checkboxes();
}

function togglePresent(name, checked) {
  const t = getTournament();
  const canonical = resolvePlayerName(name);
  const key = normalizeNameKey(canonical);

  // remove variações
  t.presentPlayers = (t.presentPlayers || []).filter(n => normalizeNameKey(n) !== key);

  if (checked) t.presentPlayers.push(canonical);

  saveDB();
  enforceMax8Checkboxes();
}

/**
 * Marcar/desmarcar presentes.
 * - selectAllPresent(true)  => marca 8 (padrão)
 * - selectAllPresent(true,6)=> marca 6
 * - selectAllPresent(true,8)=> marca 8
 * - selectAllPresent(false) => desmarca todos
 */
function selectAllPresent(flag, count = 8) {
  const t = getTournament();
  if (flag) {
    const n = (count === 6) ? 6 : 8;
    t.presentPlayers = initialPlayers.slice(0, n).map(nm => resolvePlayerName(nm));
  } else {
    t.presentPlayers = [];
  }
  saveDB();
  renderPresentList();
  enforceMax8Checkboxes();
}

// ===== Duplas =====
function updateTeamNames() {
  const t = getTournament();
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`team${i}`);
    if (el) t.teams[i] = el.value;
  }
  saveDB();
  renderTeamsInputs();
  renderClassification();
  renderMatches();
}

function renderTeamsInputs() {
  const t = getTournament();
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`team${i}`);
    if (el) el.value = t.teams[i] || "";
  }
}

function limparDuplas() {
  const t = getTournament();
  t.teams = ["", "", "", ""];
  t.finished = false;
  saveDB();
  renderAll();
}

// Sorteia duplas com 6 ou 8 presentes
function sortearDuplas() {
  const t = getTournament();

  // Se já existe algo preenchido, avisa que vai substituir
  const hasAnyTeam = (t.teams || []).some(x => (x || "").trim() !== "");
  if (hasAnyTeam) {
    if (!confirm("Isso vai SUBSTITUIR as duplas atuais. Deseja continuar?")) return;
  }

  // Lista de presentes (únicos por normalização)
  const selected = [];
  const seen = new Set();

  (t.presentPlayers || []).forEach(n => {
    const canonical = resolvePlayerName(n);
    const key = normalizeNameKey(canonical);
    if (!seen.has(key)) {
      seen.add(key);
      selected.push(canonical);
    }
  });

  if (![6, 8].includes(selected.length)) {
    alert(
      `❌ Você precisa marcar EXATAMENTE 6 ou 8 jogadores presentes.\n` +
      `Você marcou ${selected.length}.`
    );
    return;
  }

  // Embaralha (Fisher-Yates)
  const pool = selected.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (pool.length === 8) {
    t.teams = [
      `${pool[0]}/${pool[1]}`,
      `${pool[2]}/${pool[3]}`,
      `${pool[4]}/${pool[5]}`,
      `${pool[6]}/${pool[7]}`
    ];
  } else {
    // 6 jogadores => 3 duplas + FOLGA
    t.teams = [
      `${pool[0]}/${pool[1]}`,
      `${pool[2]}/${pool[3]}`,
      `${pool[4]}/${pool[5]}`,
      `FOLGA`
    ];

    // limpa placares/tempos dos jogos que envolvem a dupla 4 (índice 3)
    matchStructure.forEach((m, idx) => {
      if (m.t1 === 3 || m.t2 === 3) {
        t.scores[idx].s1 = "";
        t.scores[idx].s2 = "";
        t.scores[idx].dur = "";
      }
    });
  }

  t.finished = false;
  saveDB();
  renderAll();
}

// ===== Jogos / placares =====
function renderMatches() {
  const list = document.getElementById("matches-list");
  if (!list) return;

  const t = getTournament();

  list.innerHTML = matchStructure.map((m, idx) => {
    const inactive = isInactiveTeamName(t.teams[m.t1]) || isInactiveTeamName(t.teams[m.t2]);

    const team1Name = t.teams[m.t1] || `Dupla ${m.t1 + 1}`;
    const team2Name = t.teams[m.t2] || `Dupla ${m.t2 + 1}`;

    const s1 = inactive ? "" : (t.scores[idx].s1 ?? "");
    const s2 = inactive ? "" : (t.scores[idx].s2 ?? "");
    const dur = inactive ? "--:--:--" : (t.scores[idx].dur || "--:--:--");

    return `
      <div class="match-card">
        <div class="team-info">
          <b>${team1Name}</b>
          <input type="number" class="score-input" value="${s1}"
                 ${inactive ? "disabled" : ""}
                 oninput="saveScore(${idx}, 1, this.value)">
        </div>

        <div class="match-mid">
          <span class="match-id"><b>JOGO ${m.id}</b>${inactive ? " — <span class='duration-text'>SEM JOGO</span>" : ""}</span>
          <button class="save-time-btn" ${inactive ? "disabled" : ""} onclick="saveMatchTime(${idx})">SALVAR TEMPO</button>
          <span class="duration-text">${dur}</span>
        </div>

        <div class="team-info">
          <b>${team2Name}</b>
          <input type="number" class="score-input" value="${s2}"
                 ${inactive ? "disabled" : ""}
                 oninput="saveScore(${idx}, 2, this.value)">
        </div>
      </div>
    `;
  }).join("");
}

function saveScore(idx, team, val) {
  const t = getTournament();
  if (!matchIsActive(t, idx)) return; // ignora jogos com FOLGA/dupla vazia

  if (team === 1) t.scores[idx].s1 = val;
  else t.scores[idx].s2 = val;

  saveDB();
  renderClassification();
}

function saveMatchTime(idx) {
  const t = getTournament();
  if (!matchIsActive(t, idx)) return;

  const clock = document.getElementById("clock");
  t.scores[idx].dur = clock ? clock.innerText : "00:00:00";
  saveDB();
  renderMatches();
}

// ===== Classificação do dia =====
function computeRankFromTournament(tournament) {
  const stats = (tournament.teams || []).map(name => ({ name, v: 0, p: 0, c: 0 }));

  matchStructure.forEach((m, idx) => {
    const n1 = tournament.teams?.[m.t1];
    const n2 = tournament.teams?.[m.t2];
    if (isInactiveTeamName(n1) || isInactiveTeamName(n2)) return; // ignora

    const s = (tournament.scores || [])[idx];
    if (!s) return;
    if (s.s1 === "" || s.s2 === "" || s.s1 == null || s.s2 == null) return;

    const p1 = parseInt(s.s1, 10);
    const p2 = parseInt(s.s2, 10);
    if (Number.isNaN(p1) || Number.isNaN(p2)) return;

    stats[m.t1].p += p1; stats[m.t1].c += p2;
    stats[m.t2].p += p2; stats[m.t2].c += p1;

    if (p1 > p2) stats[m.t1].v++;
    else if (p2 > p1) stats[m.t2].v++;
  });

  return stats
    .map(s => ({ ...s, sal: s.p - s.c }))
    .sort((a, b) => (b.v - a.v) || (b.sal - a.sal));
}

function renderClassification() {
  const body = document.getElementById("rank-body");
  if (!body) return;

  const t = getTournament();
  const sorted = computeRankFromTournament(t);

  const activeSorted = sorted.filter(s => !isInactiveTeamName(s.name));

  body.innerHTML = activeSorted
    .map((s, i) => `<tr><td><b>${i + 1}º</b></td><td>${s.name || "-"}</td><td>${s.v}</td><td>${s.p}</td><td>${s.sal}</td></tr>`)
    .join("");

  // botão finalizar (se existir)
  const finalizarBtn = document.getElementById("finalizarBtn");
  if (finalizarBtn) finalizarBtn.style.display = t.finished ? "none" : "block";

  return activeSorted;
}

// ===== Finalizar torneio (pontua anual) =====
function computeAnnualAwardFromTournament(tournament) {
  const sorted = computeRankFromTournament(tournament).filter(s => !isInactiveTeamName(s.name));

  // 4 duplas => 5,3,2,2 | 3 duplas => 5,3,2
  const pts = (sorted.length === 4) ? [5, 3, 2, 2]
           : (sorted.length === 3) ? [5, 3, 2]
           : [];

  if (pts.length === 0) return {};

  const award = {};
  sorted.forEach((dupla, rank) => {
    (dupla.name || "").split("/").forEach(jogador => {
      const nome = resolvePlayerName(jogador);
      const add = pts[rank] ?? 0;
      if (nome && add) award[nome] = (award[nome] || 0) + add;
    });
  });
  return award;
}

function finalizarTorneio() {
  const t = getTournament();
  if (t.finished) return;

  if (!confirm("Encerrar o dia e computar pontos para o Ranking Anual?")) return;

  const award = computeAnnualAwardFromTournament(t);

  // aplica no anual
  Object.entries(award).forEach(([player, pts]) => {
    const nome = resolvePlayerName(player);
    if (!nome) return;
    db.annualPoints[nome] = (db.annualPoints[nome] || 0) + pts;
  });

  t.annualAward = award;
  t.finished = true;

  saveDB();
  renderAll();
  alert("Ranking Atualizado!");

  // se estiver na página de ranking, atualiza
  if (document.getElementById("annual-rank-body")) renderAnnualRanking();
}

// ===== Ranking anual =====
function renderAnnualRanking() {
  const body = document.getElementById("annual-rank-body");
  if (!body) return;

  const sorted = Object.entries(db.annualPoints).sort((a, b) => b[1] - a[1]);

  body.innerHTML = sorted.map(([name, pts], i) => {
    let medal = "";
    if (i === 0 && pts > 0) medal = "🥇 ";
    else if (i === 1 && pts > 0) medal = "🥈 ";
    else if (i === 2 && pts > 0) medal = "🥉 ";
    return `<tr><td><b>${i + 1}º</b></td><td>${medal}${name}</td><td><b>${pts} pts</b></td></tr>`;
  }).join("");
}

// Compartilhamentos
function shareWhatsApp() {
  const txtParts = [];
  txtParts.push(`🏐 *VÔLEI DO CAOS - ${selectedDate}*`);
  txtParts.push("");
  txtParts.push("*CLASSIFICAÇÃO:*");

  const rows = document.querySelectorAll("#rank-body tr");
  rows.forEach(r => txtParts.push(r.innerText));

  window.open(`https://wa.me/?text=${encodeURIComponent(txtParts.join("\n"))}`);
}

function shareAnnualRanking() {
  let txt = "🏆 *RANKING ANUAL VÔLEI DO CAOS*\n";
  Object.entries(db.annualPoints)
    .sort((a, b) => b[1] - a[1])
    .forEach(([n, p], i) => txt += `${i + 1}º ${n}: ${p} pts\n`);

  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`);
}

// ===== Zerar ranking anual =====
function resetRanking() {
  if (!requireAdminSafe()) return;

  if (!confirm("⚠️ ATENÇÃO!\nIsso irá zerar TODO o ranking anual.\nDeseja continuar?")) return;

  db.annualPoints = {};
  initialPlayers.forEach(p => db.annualPoints[p] = 0);

  saveDB();
  renderAnnualRanking();
  alert("✅ Ranking anual zerado com sucesso!");
}

// ===== Zerar torneio do dia (com estorno do anual) =====
function resetTournament() {
  if (!requireAdminSafe()) return;

  const dateInput = document.getElementById("tournamentDate");
  const date = (dateInput && dateInput.value) ? dateInput.value : selectedDate;

  if (!confirm(`⚠️ ATENÇÃO!\nIsso irá apagar/zerar todos os jogos e duplas do torneio de ${date}.\nSe ele já foi finalizado, os pontos serão REMOVIDOS do Ranking Anual.\nDeseja continuar?`)) return;

  const existing = db.tournaments[date];

  // estorna pontos se finalizado
  if (existing && existing.finished) {
    const award = existing.annualAward || computeAnnualAwardFromTournament(existing);
    Object.entries(award).forEach(([player, pts]) => {
      const nome = resolvePlayerName(player);
      if (!nome) return;
      db.annualPoints[nome] = Math.max(0, (db.annualPoints[nome] || 0) - pts);
    });

    // garante os iniciais
    initialPlayers.forEach(p => { if (db.annualPoints[p] === undefined) db.annualPoints[p] = 0; });
  }

  // recria torneio
  delete db.tournaments[date];
  db.tournaments[date] = defaultTournament();

  selectedDate = date;
  saveDB();

  resetClock();
  renderAll();
  alert(`✅ Torneio do dia (${date}) zerado com sucesso!`);
}

// ===== Cronômetro =====
let timer, elapsed = 0;

function startClock() {
  clearInterval(timer);
  const startT = Date.now() - elapsed;

  timer = setInterval(() => {
    elapsed = Date.now() - startT;
    const s = Math.floor(elapsed / 1000) % 60;
    const m = Math.floor(elapsed / 60000) % 60;
    const h = Math.floor(elapsed / 3600000);
    const clock = document.getElementById("clock");
    if (clock) {
      clock.innerText = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
  }, 1000);
}

function pauseClock() { clearInterval(timer); }

function resetClock() {
  pauseClock();
  elapsed = 0;
  const clock = document.getElementById("clock");
  if (clock) clock.innerText = "00:00:00";
}

// ===== Data / init =====
function loadTournamentDate() {
  const dateInput = document.getElementById("tournamentDate");
  const date = (dateInput && dateInput.value) ? dateInput.value : selectedDate;
  setDate(date);
}

function highlightActiveNav() {
  const page = (document.body.getAttribute("data-page") || "").toLowerCase();
  document.querySelectorAll(".nav-link").forEach(a => {
    const p = (a.getAttribute("data-page") || "").toLowerCase();
    a.classList.toggle("active", p && p === page);
  });
}

function renderAll() {
  renderTeamsInputs();
  renderPresentList();
  renderMatches();
  renderClassification();
  renderAnnualRanking();
  highlightActiveNav();
  applyAdminUI();
  if(window.applyRoleUI) window.applyRoleUI();
}

// Expor funções para onclick (importante quando usando múltiplas páginas)
window.loadTournamentDate = loadTournamentDate;
window.updateTeamNames = updateTeamNames;
window.sortearDuplas = sortearDuplas;
window.limparDuplas = limparDuplas;
window.togglePresent = togglePresent;

// manter compatível:
window.selectAllPresent = selectAllPresent;

// novos atalhos (pra botões separados):
window.selectPresent6 = () => selectAllPresent(true, 6);
window.selectPresent8 = () => selectAllPresent(true, 8);

window.saveScore = saveScore;
window.saveMatchTime = saveMatchTime;
window.finalizarTorneio = finalizarTorneio;
window.shareWhatsApp = shareWhatsApp;
window.shareAnnualRanking = shareAnnualRanking;
window.resetRanking = resetRanking;
window.resetTournament = resetTournament;
window.startClock = startClock;
window.pauseClock = pauseClock;
window.resetClock = resetClock;

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("tournamentDate");
  if (dateInput) dateInput.value = selectedDate;

  // garante torneio
  getTournament(selectedDate);
  saveDB();

  renderAll();
});
