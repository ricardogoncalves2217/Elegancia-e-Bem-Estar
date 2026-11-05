import { services } from "./services-data.js";
import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ====== EMAILJS IDS (os teus) ====== */
const EMAILJS_SERVICE_ID = "service_5hwtr1q";
const EMAILJS_TEMPLATE_ID = "template_nz85rxi";

// ====== HORÁRIOS ======
// Terça–Sexta: 10–13 e 15–18
// Sábado: 09–13
const WEEK_MORNING_START = "10:00";
const WEEK_MORNING_END   = "13:00";
const WEEK_AFTER_START   = "15:00";
const WEEK_AFTER_END     = "18:00";
const SAT_START = "09:00";
const SAT_END   = "13:00";

function pad(n){ return String(n).padStart(2, "0"); }
function toMin(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}
function toHHMM(min){
  const h = Math.floor(min/60), m = min%60;
  return `${pad(h)}:${pad(m)}`;
}
function uuid(){
  return (crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}

function isClosedDay(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return (day === 0 || day === 1);
}

function getWorkingIntervals(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();

  if (day >= 2 && day <= 5){
    return [
      { key: "Manhã", start: WEEK_MORNING_START, end: WEEK_MORNING_END },
      { key: "Tarde", start: WEEK_AFTER_START, end: WEEK_AFTER_END },
    ];
  }

  if (day === 6){
    return [
      { key: "Manhã", start: SAT_START, end: SAT_END },
    ];
  }

  return [];
}

function generateCandidateStarts(dateStr, durationMin){
  const intervals = getWorkingIntervals(dateStr);
  const step = 15;
  const starts = [];

  for (const it of intervals){
    const start = toMin(it.start);
    const end = toMin(it.end);
    for (let t = start; t + durationMin <= end; t += step){
      starts.push(t);
    }
  }
  return starts;
}

async function loadBookedSlotsSet(dateStr){
  const snap = await getDocs(collection(db, "days", dateStr, "slots"));
  const set = new Set();
  snap.forEach(d => set.add(Number(d.id)));
  return set;
}

function canFit(bookedSet, startMin, endMin){
  for (let t = startMin; t < endMin; t += 15){
    if (bookedSet.has(t)) return false;
  }
  return true;
}

/* ====== EMAIL SEND (opcional) ====== */
async function sendBookingEmail({ toEmail, toName, serviceName, dateStr, startMin, notes }) {
  if (!window.emailjs) return;

  await window.emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name: toName,
      service_name: serviceName,
      date: dateStr,
      time: toHHMM(startMin),
      address: "Rua da República 8, 2070-121 Cartaxo",
      notes: notes || "-",
      reply_to: toEmail
    }
  );
}

// UI
const serviceSelect = document.getElementById("service");
const dateInput = document.getElementById("date");
const timeSelect = document.getElementById("timeSelect");

const dateHint = document.getElementById("date-hint");
const slotHint = document.getElementById("slot-hint");
const msgEl = document.getElementById("msg");
const dayBookingsEl = document.getElementById("dayBookings");

const loginWarn = document.getElementById("loginWarn");
const submitBtn = document.getElementById("submitBtn");

let currentUser = null;

function renderServiceOptions(){
  serviceSelect.innerHTML = services.map(s => `
    <option value="${s.id}">${s.nome} (${s.duracaoMin} min)</option>
  `).join("");
}

function setMinDateToday(){
  const now = new Date();
  dateInput.min = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}

async function renderDayBookings(dateStr){
  if (!dateStr){
    dayBookingsEl.innerHTML = `<p class="muted">Escolhe um dia.</p>`;
    return;
  }
  if (isClosedDay(dateStr)){
    dayBookingsEl.innerHTML = `<p class="muted">Fechado (domingo e segunda).</p>`;
    return;
  }

  const q = query(collection(db, "days", dateStr, "bookings"), orderBy("startMin"));
  const snap = await getDocs(q);

  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));

  if (list.length === 0){
    dayBookingsEl.innerHTML = `<p class="muted">Sem marcações neste dia.</p>`;
    return;
  }

  dayBookingsEl.innerHTML = list.map(b => {
    const svc = services.find(s => s.id === b.serviceId);
    const mine = currentUser && b.userId === currentUser.uid;

    return `
      <div class="card" style="padding:12px">
        <div><strong>${toHHMM(b.startMin)}–${toHHMM(b.endMin)}</strong></div>
        <div class="muted">${svc ? svc.nome : b.serviceId}</div>
        ${mine ? `<div class="muted small">${b.name} • ${b.contact}</div>` : `<div class="muted small">Ocupado</div>`}
      </div>
    `;
  }).join("");
}

async function refreshTimes(){
  timeSelect.innerHTML = `<option value="">A carregar horários...</option>`;
  slotHint.textContent = "";

  const dateStr = dateInput.value;
  if (!dateStr){
    timeSelect.innerHTML = `<option value="">Escolhe primeiro um dia</option>`;
    return;
  }

  if (isClosedDay(dateStr)){
    dateHint.textContent = "Fechado ao domingo e à segunda. Escolhe terça a sábado.";
    timeSelect.innerHTML = `<option value="">Dia fechado</option>`;
    return;
  } else {
    dateHint.textContent = "";
  }

  const svc = services.find(s => s.id === serviceSelect.value);
  if (!svc){
    timeSelect.innerHTML = `<option value="">Escolhe um serviço</option>`;
    return;
  }

  const intervals = getWorkingIntervals(dateStr);
  const bookedSet = await loadBookedSlotsSet(dateStr);

  const starts = generateCandidateStarts(dateStr, svc.duracaoMin);
  const freeStarts = starts.filter(st => canFit(bookedSet, st, st + svc.duracaoMin));

  if (freeStarts.length === 0){
    timeSelect.innerHTML = `<option value="">Sem horários disponíveis</option>`;
    return;
  }

  const renderGroup = (label, arr) => {
    if (!arr.length) return "";
    return `
      <optgroup label="${label}">
        ${arr.map(st => `
          <option value="${st}">
            ${toHHMM(st)}–${toHHMM(st + svc.duracaoMin)}
          </option>
        `).join("")}
      </optgroup>
    `;
  };

  let html = `<option value="">Seleciona um horário...</option>`;

  for (const it of intervals){
    const startMin = toMin(it.start);
    const endMin = toMin(it.end);
    const inThisInterval = freeStarts.filter(st => st >= startMin && st < endMin);
    html += renderGroup(`${it.key} (${it.start}–${it.end})`, inThisInterval);
  }

  timeSelect.innerHTML = html;
}

timeSelect.addEventListener("change", () => {
  const st = Number(timeSelect.value);
  slotHint.textContent = Number.isFinite(st) ? `Selecionado: ${toHHMM(st)}` : "";
});

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.textContent = "";

  if (!currentUser){
    msgEl.textContent = "Tens de iniciar sessão para confirmar a marcação.";
    return;
  }

  const dateStr = dateInput.value;
  if (!dateStr) return;

  if (isClosedDay(dateStr)){
    msgEl.textContent = "Esse dia está fechado.";
    return;
  }

  const svc = services.find(s => s.id === serviceSelect.value);
  if (!svc) return;

  const startMin = Number(timeSelect.value);
  if (!Number.isFinite(startMin)){
    msgEl.textContent = "Seleciona um horário.";
    return;
  }

  const endMin = startMin + svc.duracaoMin;

  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const bookingId = uuid();

  try {
    await runTransaction(db, async (tx) => {
      for (let t = startMin; t < endMin; t += 15) {
        const slotRef = doc(db, "days", dateStr, "slots", String(t));
        const slotSnap = await tx.get(slotRef);
        if (slotSnap.exists()) throw new Error("Horário já ocupado.");
      }

      for (let t = startMin; t < endMin; t += 15) {
        tx.set(doc(db, "days", dateStr, "slots", String(t)), {
          bookingId,
          userId: currentUser.uid,
          serviceId: svc.id,
          startMin: t,
          endMin,
          createdAt: serverTimestamp(),
        });
      }

      const paymentFields = {
        paymentStatus: "pending_deposit",
        depositPercent: 50,
      };

      tx.set(doc(db, "days", dateStr, "bookings", bookingId), {
        userId: currentUser.uid,
        serviceId: svc.id,
        startMin,
        endMin,
        name,
        contact,
        notes,
        createdAt: serverTimestamp(),
        ...paymentFields,
      });

      tx.set(doc(db, "users", currentUser.uid, "bookings", bookingId), {
        date: dateStr,
        serviceId: svc.id,
        startMin,
        endMin,
        name,
        contact,
        notes,
        createdAt: serverTimestamp(),
        ...paymentFields,
      });
    });

    msgEl.textContent = `Marcação criada. A redirecionar para pagamento...`;

    // email (não bloqueia)
    try {
      const looksLikeEmail = contact.includes("@");
      const toEmail = looksLikeEmail ? contact : (currentUser?.email || "");
      if (toEmail) {
        await sendBookingEmail({
          toEmail,
          toName: name || currentUser?.displayName || "Cliente",
          serviceName: svc.nome || svc.id,
          dateStr,
          startMin,
          notes
        });
      }
    } catch (e2) {
      console.warn("Falhou envio do email (não impede):", e2);
    }

    // redireciona para pagamento do sinal
    location.href = `pagamento.html?b=${encodeURIComponent(bookingId)}`;
    return;

  } catch (err) {
    msgEl.textContent = err?.message || "Erro a marcar. Tenta outro horário.";
    await refreshTimes();
    await renderDayBookings(dateStr);
  }
});

// init
renderServiceOptions();
setMinDateToday();

const params = new URLSearchParams(location.search);
const preSvc = params.get("servico");
if (preSvc && services.some(s => s.id === preSvc)) serviceSelect.value = preSvc;

serviceSelect.addEventListener("change", async () => { await refreshTimes(); });
dateInput.addEventListener("change", async () => {
  await refreshTimes();
  await renderDayBookings(dateInput.value);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginWarn.style.display = "none";
    submitBtn.disabled = false;
  } else {
    loginWarn.style.display = "block";
    submitBtn.disabled = true;
  }

  const today = dateInput.value || dateInput.min;
  if (!dateInput.value && !isClosedDay(today)) dateInput.value = today;

  if (dateInput.value) {
    await refreshTimes();
    await renderDayBookings(dateInput.value);
  }
});