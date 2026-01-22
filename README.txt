VÔLEI DO CAOS — Estrutura de Pastas

Abra sempre pelo arquivo:
- login.html

Estrutura:
- /css/styles.css
- /js/auth.js
- /js/app.js
- /images/bg.jpg
- /images/logo.png

Importante:
- auth.js deve ser carregado antes de app.js nas páginas.
- Para mudar a senha do admin, edite /js/auth.js:
  const ADMIN_PASSWORD = "1234";


LOGIN (usuário/senha)
- Configure os usuários em /js/auth.js na constante USERS.
- Admin role='admin' pode zerar/excluir; player role='player' não.
