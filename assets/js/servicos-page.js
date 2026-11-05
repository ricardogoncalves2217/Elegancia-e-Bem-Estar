import { services } from "./services-data.js";

const grid = document.getElementById("services-grid");

function iconSVG(key) {
  const icons = {
    body: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3c2.2 0 4 1.8 4 4 0 1.2-.5 2.3-1.4 3.1M12 3c-2.2 0-4 1.8-4 4 0 1.2.5 2.3 1.4 3.1"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M8.5 10.5c-1.3 1-2.5 2.6-2.5 5 0 4 2.7 6.5 6 6.5s6-2.5 6-6.5c0-2.4-1.2-4-2.5-5"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `,
    massage: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 15c3-2 6-2 9 0s6 2 7 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M6 10c2-1.5 4-1.5 6 0s4 1.5 6 .8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M8 6c1.3-1 2.7-1 4 0s2.7 1 4 .7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `,
    face: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 21c4.4 0 8-3.6 8-8V11a8 8 0 1 0-16 0v2c0 4.4 3.6 8 8 8Z"
          stroke="currentColor" stroke-width="1.6"/>
        <path d="M9 10h.01M15 10h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M9.5 14c1.6 1.6 3.4 1.6 5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `,
    nails: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 12V6a1 1 0 0 1 2 0v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M11 12V4a1 1 0 0 1 2 0v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M15 12V5a1 1 0 0 1 2 0v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M6 12c0 5 2.5 9 6 9s6-4 6-9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `,
    laser: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" stroke="currentColor" stroke-width="1.6"/>
      </svg>
    `,
    wax: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 3h8l-1 6H9L8 3Z" stroke="currentColor" stroke-width="1.6"/>
        <path d="M7 10h10l-1 11H8L7 10Z" stroke="currentColor" stroke-width="1.6"/>
      </svg>
    `,
    rehab: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 20V10a3 3 0 0 1 6 0v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M7 20h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M12 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
  };
  return icons[key] || icons.body;
}

function priceText(s){
  return (typeof s.precoDesde === "number")
    ? `Desde: €${s.precoDesde}`
    : "Sob consulta";
}

// agrupar por grupo e ordenar
const groups = new Map();
for (const s of services) {
  const g = s.grupo || "Serviços";
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(s);
}
for (const [g, arr] of groups) {
  arr.sort((a,b)=>a.nome.localeCompare(b.nome));
}

grid.innerHTML = [...groups.entries()].map(([groupName, items]) => `
  <section class="serviceGroup">
    <h2 class="serviceGroup__title">${groupName}</h2>
    <div class="serviceGroup__grid">
      ${items.map(s => `
        <article class="card serviceRow">
          <div class="serviceRow__icon" aria-hidden="true">${iconSVG(s.iconKey)}</div>

          <div class="serviceRow__body">
            <div class="serviceRow__title">${s.nome}</div>
            <div class="serviceRow__meta muted">
              Duração: ${s.duracaoMin} min • ${priceText(s)}
            </div>
            <div class="serviceRow__desc muted">${s.intro || ""}</div>

            <div class="serviceRow__actions">
              <a class="btn outline" href="servico.html?id=${encodeURIComponent(s.id)}">Saber mais</a>
              <a class="btn" href="marcacoes.html?servico=${encodeURIComponent(s.id)}">Marcar</a>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`).join("");