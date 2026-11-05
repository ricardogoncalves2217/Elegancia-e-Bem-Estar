import { services } from "./services-data.js";

const p = new URLSearchParams(location.search);
const id = p.get("id");
const svc = services.find(s => s.id === id);

const titleEl = document.getElementById("svcTitle");
const introEl = document.getElementById("svcIntro");
const metaEl = document.getElementById("svcMeta");
const descEl = document.getElementById("svcDesc");
const bookEl = document.getElementById("svcBook");
const tryon = document.getElementById("svcTryonWrap");

function priceText(s){
  return (typeof s.precoDesde === "number")
    ? `Desde: €${s.precoDesde}`
    : "Sob consulta";
}

if (!svc) {
  titleEl.textContent = "Serviço não encontrado";
  introEl.textContent = "";
  metaEl.textContent = "";
  descEl.textContent = "";
  bookEl.href = "servicos.html";
} else {
  document.title = `${svc.nome} — Elegância & Bem Estar`;

  titleEl.textContent = svc.nome;
  introEl.textContent = svc.intro || "";
  metaEl.textContent = `Duração: ${svc.duracaoMin} min • ${priceText(svc)}`;
  descEl.textContent = svc.descricao || svc.intro || "";
  bookEl.href = `marcacoes.html?servico=${encodeURIComponent(svc.id)}`;

  if (svc.id.includes("manicure") || svc.id.includes("pedicure") || svc.grupo === "Estilismo de Unhas") {
    tryon.style.display = "block";
  }
}