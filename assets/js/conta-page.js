import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { services } from "./services-data.js";

const regMsg = document.getElementById("reg-msg");
const logMsg = document.getElementById("log-msg");
const loggedArea = document.getElementById("logged-area");
const who = document.getElementById("who");
const myBookingsEl = document.getElementById("myBookings");
const logoutBtn = document.getElementById("logoutBtn");

function pad(n){ return String(n).padStart(2,"0"); }
function toHHMM(min){
  const h = Math.floor(min/60), m = min%60;
  return `${pad(h)}:${pad(m)}`;
}

async function cancelBooking(uid, booking) {
  const ok = confirm(`Confirmas desmarcar?\n${booking.date} • ${toHHMM(booking.startMin)}–${toHHMM(booking.endMin)}`);
  if (!ok) return;

  const batch = writeBatch(db);

  // Apaga do "dia"
  batch.delete(doc(db, "days", booking.date, "bookings", booking.id));
  // Apaga do utilizador
  batch.delete(doc(db, "users", uid, "bookings", booking.id));
  // Liberta slots (15 em 15 minutos)
  for (let t = booking.startMin; t < booking.endMin; t += 15) {
    batch.delete(doc(db, "days", booking.date, "slots", String(t)));
  }

  await batch.commit();
}

async function loadMyBookings(uid){
  myBookingsEl.innerHTML = `<p class="muted">A carregar...</p>`;

  const snap = await getDocs(collection(db, "users", uid, "bookings"));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));

  list.sort((a,b) => (a.date.localeCompare(b.date) || a.startMin - b.startMin));

  if (list.length === 0){
    myBookingsEl.innerHTML = `<p class="muted">Ainda não tens marcações.</p>`;
    return;
  }

  myBookingsEl.innerHTML = list.map(b => {
    const svc = services.find(s => s.id === b.serviceId);
    return `
      <div class="card" style="padding:12px">
        <div><strong>${b.date}</strong> • ${toHHMM(b.startMin)}–${toHHMM(b.endMin)}</div>
        <div class="muted">${svc ? svc.nome : b.serviceId}</div>
        <div class="muted small">${b.notes ? "Obs: " + b.notes : ""}</div>
        <button class="btn outline" data-cancel="${b.id}" style="margin-top:10px">
          Desmarcar
        </button>
      </div>
    `;
  }).join("");

  myBookingsEl.querySelectorAll("button[data-cancel]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-cancel");
      const booking = list.find(x => x.id === id);
      if (!booking) return;

      await cancelBooking(uid, booking);
      await loadMyBookings(uid);
    });
  });
}

// Registo
document.getElementById("form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  regMsg.textContent = "";

  try {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass = document.getElementById("reg-pass").value;

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });

    regMsg.textContent = "Conta criada com sucesso.";
  } catch (err) {
    regMsg.textContent = "Erro: " + (err?.message || err);
  }
});

// Login
document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  logMsg.textContent = "";

  try {
    const email = document.getElementById("log-email").value.trim();
    const pass = document.getElementById("log-pass").value;
    await signInWithEmailAndPassword(auth, email, pass);
    logMsg.textContent = "Sessão iniciada.";
  } catch (err) {
    logMsg.textContent = "Erro: " + (err?.message || err);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loggedArea.style.display = "block";
    who.textContent = user.displayName || user.email;
    await loadMyBookings(user.uid);
  } else {
    loggedArea.style.display = "none";
    myBookingsEl.innerHTML = `<p class="muted">Inicia sessão para veres e desmarcares as tuas marcações.</p>`;
  }
});