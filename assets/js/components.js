async function loadComponent(selector, url, fallbackHTML) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    el.innerHTML = await res.text();
  } catch (e) {
    console.error("[components] Falha:", url, e);
    if (fallbackHTML) el.innerHTML = fallbackHTML;
  }
}

const fallbackHeader = `
<header class="header">
  <div class="container header__inner">
    <a class="brand" href="index.html">
      <span class="brand__badge"><img src="assets/img/logo.png" alt="Logo"></span>
      <span class="brand__text"><strong>ELEGÂNCIA</strong><span>E BEM ESTAR</span></span>
    </a>
    <nav class="nav">
      <a href="index.html">Início</a>
      <a href="sobre.html">Sobre Nós</a>
      <a href="servicos.html">Serviços</a>
      <a href="packs.html">Packs</a>
      <a href="marcacoes.html">Marcações</a>
      <a href="contacto.html">Contactos</a>
      <a href="tryon-unhas.html">Simulador</a>
      <a class="nav__pill" href="conta.html" id="navConta">Entrar</a>
      <a href="#" id="navSair" style="display:none">Sair</a>
    </nav>
  </div>
</header>`;

const fallbackFooter = `
<footer class="footer">
  <div class="container footer__inner">
    <p>© <span id="year"></span> Elegância &amp; Bem Estar</p>
    <p class="muted">Rua da República 8, 2070-121 Cartaxo</p>
  </div>
</footer>`;

(async () => {
  await loadComponent("#site-header", "components/header.html", fallbackHeader);
  await loadComponent("#site-footer", "components/footer.html", fallbackFooter);

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();