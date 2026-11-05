import { services } from "./services-data.js";

const procedure = document.getElementById("procedure");
const form = document.getElementById("homeSearchForm");
const statServices = document.getElementById("statServices");

// Dropdown de serviços
if (procedure) {
  const sorted = [...services].sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
  procedure.innerHTML = `
    <option value="">Escolha um serviço...</option>
    ${sorted.map(s => `<option value="${s.id}">${s.nome}</option>`).join("")}
  `;
}

// Contador automático de serviços
if (statServices) {
  statServices.textContent = `${services.length}+`;
}

// Pesquisar -> Marcações com o serviço escolhido
form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const serviceId = procedure?.value || "";

  if (!serviceId) {
    location.href = "servicos.html";
  } else {
    location.href = `marcacoes.html?servico=${encodeURIComponent(serviceId)}`;
  }
});