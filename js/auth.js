/* ==============================
   VÔLEI DO CAOS — AUTH (Front-end)
   ============================== */

const SESSION_KEY = "vcaos_session_v2";

// ====== USUÁRIOS (CONFIG) ======
// Troque aqui para os seus usuários/senhas.
// Dica: mantenha o admin com role "admin" e os demais com role "player".
const USERS = [
  { username: "admin",  password: "1234", role: "admin",  name: "Administrador" },
  { username: "jogador", password: "1234", role: "player", name: "Jogador" }
];

const SESSION_TTL_HOURS = 12;

function nowMs(){ return Date.now(); }

function setSession(payload){
  const data = { v: 1, ...payload, exp: nowMs() + SESSION_TTL_HOURS*60*60*1000 };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

function getSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data || data.v !== 1) return null;
    if(typeof data.exp !== "number") return null;
    if(nowMs() > data.exp){ clearSession(); return null; }
    return data;
  }catch(e){
    clearSession();
    return null;
  }
}

function isLoggedIn(){ return !!getSession(); }
function getUserRole(){ return (getSession()?.role) || ""; }
function getUserName(){ return (getSession()?.name) || ""; }
function isAdmin(){ return getUserRole() === "admin"; }

function requireAdmin(){
  if(isAdmin()) return true;
  alert("🔒 Apenas o ADMIN pode apagar/zerar.");
  return false;
}

// ===== Login =====
function doLogin(){
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPass");
  const msgEl  = document.getElementById("msg");

  const username = (userEl?.value || "").trim();
  const password = (passEl?.value || "").trim();

  if(!username || !password){
    if(msgEl) msgEl.textContent = "❌ Informe usuário e senha.";
    return;
  }

  const found = USERS.find(u => u.username === username && u.password === password);
  if(!found){
    if(msgEl) msgEl.textContent = "❌ Usuário ou senha inválidos.";
    return;
  }

  setSession({ role: found.role, name: found.name, username: found.username });
  if(msgEl) msgEl.textContent = `✅ Logado: ${found.name} (${found.role})`;

  setTimeout(() => window.location.href = "index.html", 400);
}

function logout(){
  clearSession();
  alert("Você saiu.");
  window.location.href = "login.html";
}

// ===== UI =====
function applyRoleUI(){
  const sess = getSession();

  const badge = document.getElementById("user-badge");
  const badgeRole = document.getElementById("user-role");
  const badgeName = document.getElementById("user-name");
  const iconEl = document.querySelector("#user-badge .user-icon");

  const loginLink = document.getElementById("login-link");
  const logoutBtn = document.getElementById("logout-btn");

  if(badge){
    if(sess){
      badge.style.display = "inline-flex";
      const roleLabel = sess.role === "admin" ? "ADMIN" : "JOGADOR";
      if(badgeRole) badgeRole.textContent = roleLabel;
      if(badgeName) badgeName.textContent = sess.name || sess.username || "";
      if(iconEl) iconEl.textContent = sess.role === "admin" ? "🛡️" : "🧑";
      badge.classList.toggle("admin", sess.role === "admin");
    }else{
      badge.style.display = "none";
    }
  }

  if(loginLink) loginLink.style.display = sess ? "none" : "inline-flex";
  if(logoutBtn) logoutBtn.style.display = sess ? "inline-flex" : "none";

  document.querySelectorAll("[data-admin-only='1']").forEach(el => {
    el.style.display = isAdmin() ? "" : "none";
  });
}

// Força iniciar sempre no login
function enforceLoginFlow(){
  const page = (document.body.getAttribute("data-page") || "").toLowerCase();
  const sess = getSession();

  if(page === "login"){
    // se já logado, manda pra home
    if(sess) window.location.href = "index.html";
    return;
  }
  // qualquer outra página exige login
  if(!sess){
    window.location.href = "login.html";
  }
}

function fillDemo(kind){
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPass");
  if(!userEl || !passEl) return;

  if(kind === "admin"){
    userEl.value = "admin";
    passEl.value = "1234";
  }else{
    userEl.value = "jogador";
    passEl.value = "1234";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  enforceLoginFlow();
  applyRoleUI();
});

window.addEventListener("storage", (e) => {
  if(e.key === SESSION_KEY){
    applyRoleUI();
  }
});

// Expor globais
window.isAdmin = isAdmin;
window.requireAdmin = requireAdmin;
window.doLogin = doLogin;
window.logout = logout;
window.applyRoleUI = applyRoleUI;
window.fillDemo = fillDemo;
