import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

function formatNameAbbreviation(fullName) {
  if (!fullName) return 'Minha Conta';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0].charAt(0).toUpperCase()}.${parts[parts.length - 1]}`;
}

function setActiveNavLink() {
  const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    a.classList.toggle('active', href === current);
  });
}

export function initAuthUI() {
  const authContainer = document.getElementById('auth-header-area');
  const logoutRow = document.getElementById('logout-row');

  setActiveNavLink();

  onAuthStateChanged(auth, async (user) => {
    if (!authContainer) return;

    if (user) {
      let displayName = user.displayName;

      if (!displayName) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().nome) displayName = userDoc.data().nome;
        } catch (e) {
          console.warn('Erro ao carregar nome do utilizador:', e);
        }
      }

      const formattedName = formatNameAbbreviation(displayName || user.email);

      // Botão dourado (direita)
      authContainer.innerHTML = `
        <a href="conta.html" class="user-badge-btn" title="Ir para a Minha Conta">${formattedName}</a>
      `;

      // "Sair" (em baixo, como na imagem)
      if (logoutRow) {
        logoutRow.hidden = false;
        logoutRow.innerHTML = `<button id="btn-logout" class="btn-logout-link">Sair</button>`;
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
          await signOut(auth);
          window.location.href = 'index.html';
        });
      }
    } else {
      authContainer.innerHTML = `<a href="conta.html" class="user-badge-btn">Entrar</a>`;
      if (logoutRow) {
        logoutRow.hidden = true;
        logoutRow.innerHTML = '';
      }
    }
  });
}

// quando o header é carregado pelo components.js
document.addEventListener('headerLoaded', initAuthUI);

// fallback (se alguma página já tiver header no DOM)
if (document.getElementById('auth-header-area')) initAuthUI();