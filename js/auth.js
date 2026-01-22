// ==============================
// VÔLEI DO CAOS — AUTH (Front-end)
// ==============================
//
// ⚠️ IMPORTANTE:
// Isso é apenas um bloqueio de interface (não é segurança real).
// Qualquer pessoa com conhecimento pode burlar via DevTools.
// Para segurança de verdade, use Spring Boot + PostgreSQL (backend com login/roles).

const ADMIN_SESSION_KEY = "vcaos_admin_session";

// Troque aqui sua senha do admin (não use senhas importantes)
const ADMIN_PASSWORD = "1234";

function isAdmin() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function requireAdmin() {
  if (isAdmin()) return true;
  alert("🔒 Ação permitida apenas para ADMIN.\nFaça login em login.html");
  return false;
}

function adminLogin() {
  const passEl = document.getElementById("adminPass");
  const msgEl = document.getElementById("msg");

  const pass = (passEl && passEl.value) ? passEl.value : "";
  if (pass === ADMIN_PASSWORD) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    if (msgEl) msgEl.textContent = "✅ Logado como ADMIN. Redirecionando...";
    setTimeout(() => window.location.href = "index.html", 600);
  } else {
    if (msgEl) msgEl.textContent = "❌ Senha incorreta.";
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  alert("Você saiu do modo ADMIN.");
  window.location.href = "index.html";
}

// expor global
window.isAdmin = isAdmin;
window.requireAdmin = requireAdmin;
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
