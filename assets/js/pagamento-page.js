// assets/js/pagamento-page.js
import { db, auth } from './firebase.js';
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar EmailJS
(function() {
  if (typeof emailjs !== 'undefined') {
    emailjs.init("BUFzqW6euVIIWEeHp");
  }
})();

// Dicionário de Resumos Curtos de Todos os Tratamentos
const RESUMOS_SERVICOS = {
  'hifu': 'Lifting facial e corporal não invasivo com ultrassom focalizado de alta intensidade para firmeza profunda da pele.',
  'lipo-laser': 'Redução de gordura localizada através de díodos laser de baixa intensidade sem dor nem tempo de recuperação.',
  'lipo-cavitacao': 'Tratamento ultrassónico que destrói as células de gordura acumulada e esculpe a silhueta corporal.',
  'radiofrequencia': 'Ondas eletromagnéticas que estimulam a produção de colagénio, refirmando a pele e combatendo a flacidez.',
  'vacuoterapia': 'Massagem de sucção profunda que ativa a circulação, elimina a retenção de líquidos e reduz a celulite.',
  'depilacao-laser-diodo': 'Remoção permanente e indolor dos pelos com tecnologia de díodo adaptada a todos os tipos de pele.',
  'pressoterapia': 'Drenagem linfática mecânica por compressão de ar para aliviar o cansaço das pernas e o inchaço.',
  'manta-termica': 'Tratamento detox com infravermelhos e RF que acelera o metabolismo e promove a queima calórica.',
  'limpeza-pele': 'Higienização facial profunda com vacuoterapia e oxigenação para eliminar impurezas e renovar a pele.',
  'dermapen': 'Microneedling para regeneração cutânea profunda, atenuando manchas, cicatrizes de acne e rugas.',
  'microdermoabrasao': 'Esfoliação com ponta de diamante para renovação celular e suavização da textura da pele.',
  'fototerapia': 'Luz LED terapêutica para tratamento de acne, manchas, inflamação e rejuvenescimento facial.',
  'epilacao-cera': 'Remoção tradicional de pelos pela raiz com ceras hidratantes de alta qualidade.',
  'pedicure-convencional': 'Tratamento estético e higienização dos pés, remoção de durezas, corte e limagem das unhas.',
  'pedicure-medical': 'Cuidado podológico técnico e preventivo especializado para pés sensíveis e pé diabético.',
  'manicure-convencional': 'Cuidado estético das mãos, tratamento de cutículas e limagem profissional das unhas.',
  'estilismo': 'Aplicação técnica de Verniz Gel, Gel ou Polyacrygel para unhas duradouras e perfeitas.',
  'reabilitacao': 'Massagens terapêuticas e Drenagem Linfática Manual (DLM) pós-operatória para recuperar tecidos e edemas.',
  'pack': 'Pacote promocional combinado com várias sessões focadas na otimização de resultados.'
};

function getServiceSummaryText(serviceName = '', serviceId = '') {
  const textLower = (serviceName + ' ' + serviceId).toLowerCase();

  for (const [key, text] of Object.entries(RESUMOS_SERVICOS)) {
    if (textLower.includes(key)) return text;
  }

  if (textLower.includes('lipo')) return 'Tratamento corporal avançado focado na redução de gordura localizada e remodelação.';
  if (textLower.includes('laser')) return 'Depilação a laser de diodo de alta eficiência e rápida aplicação.';
  if (textLower.includes('gel') || textLower.includes('unha')) return 'Estilismo de unhas profissional com acabamento duradouro.';
  if (textLower.includes('pedicure')) return 'Tratamento especializado para a saúde e estética dos pés.';
  if (textLower.includes('manicure')) return 'Cuidado estético dedicado ao embelezamento das mãos.';

  return 'Tratamento estético personalizado realizado com equipamento de alta tecnologia.';
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('b');

  const summaryDiv = document.getElementById('payment-summary');
  const payForm = document.getElementById('payment-form');
  const statusMsg = document.getElementById('payment-status-msg');
  const submitBtn = document.getElementById('btn-submit-pay');
  const cancelBtn = document.getElementById('btn-cancel-booking');

  // Alternar Formulários de Pagamento
  const radios = document.querySelectorAll('input[name="payMethod"]');
  const mbwayBox = document.getElementById('mbway-box');
  const cardBox = document.getElementById('card-box');
  const mbBox = document.getElementById('mb-box');

  radios.forEach(r => {
    r.addEventListener('change', (e) => {
      const val = e.target.value;
      mbwayBox.classList.add('d-none');
      cardBox.classList.add('d-none');
      mbBox.classList.add('d-none');

      if (val === 'MBWay') {
        mbwayBox.classList.remove('d-none');
        submitBtn.innerText = 'Pagar sinal (Simulação MB WAY)';
      } else if (val === 'Cartão de Crédito/Débito') {
        cardBox.classList.remove('d-none');
        submitBtn.innerText = 'Pagar sinal (Simulação Cartão)';
      } else {
        mbBox.classList.remove('d-none');
        submitBtn.innerText = 'Gerar Referência MB';
      }
    });
  });

  let currentBooking = null;

  // Carregar Marcação (ou Dados Simulados de Teste se não houver parâmetro 'b')
  if (bookingId) {
    loadBookingData(bookingId);
  } else {
    // Dados de demonstração para quando a página é aberta diretamente
    currentBooking = {
      id: "demo-123",
      serviceName: "HIFU - Lifting Facial",
      date: new Date().toLocaleDateString('pt-PT'),
      time: "15:45",
      clientName: "Cliente Exemplo",
      clientPhone: "938025513",
      preco: 80.00,
      ref: null
    };
    renderSummary(currentBooking);
  }

  async function loadBookingData(id) {
    try {
      let bookingData = null;
      let bookingRef = doc(db, "bookings", id);
      let snap = await getDoc(bookingRef);

      if (snap.exists()) {
        bookingData = snap.data();
      } else {
        const user = auth.currentUser;
        if (user) {
          bookingRef = doc(db, "users", user.uid, "bookings", id);
          snap = await getDoc(bookingRef);
          if (snap.exists()) bookingData = snap.data();
        }
      }

      if (bookingData) {
        currentBooking = { id: id, ...bookingData, ref: bookingRef };
        renderSummary(currentBooking);
      } else {
        // Fallback de demonstração
        currentBooking = {
          id: id,
          serviceName: "HIFU (60 min)",
          date: new Date().toLocaleDateString('pt-PT'),
          time: "15:45",
          clientName: "Cliente",
          preco: 70.00,
          ref: null
        };
        renderSummary(currentBooking);
      }
    } catch (err) {
      console.warn("Sem ligação direta ao Firestore, a usar modo demonstração:", err);
      currentBooking = {
        id: id,
        serviceName: "Tratamento Elegância",
        date: new Date().toLocaleDateString('pt-PT'),
        time: "10:30",
        clientName: "Cliente",
        preco: 60.00,
        ref: null
      };
      renderSummary(currentBooking);
    }
  }

  // Renderizar o Cartão Esquerdo (Resumo + Explicação Resumida do Tratamento)
  function renderSummary(b) {
    const total = parseFloat(b.preco || b.price || b.precoDesde || 60);
    const deposit = (total * 0.5).toFixed(2);
    const remaining = (total - parseFloat(deposit)).toFixed(2);
    const serviceTitle = b.serviceName || b.service || 'Tratamento de Estética';
    const summaryText = getServiceSummaryText(serviceTitle, b.serviceId || '');

    summaryDiv.innerHTML = `
      <div class="mb-3">
        <h4 class="h5 font-serif text-primary fw-bold mb-2">${serviceTitle}</h4>
        
        <!-- RESUMO DO TRATAMENTO -->
        <div class="p-3 bg-light rounded-3 border-start border-4 border-gold mb-3">
          <span class="text-uppercase text-gold fw-bold d-block mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">Sobre o tratamento:</span>
          <p class="small text-dark mb-0 leading-relaxed">${summaryText}</p>
        </div>
      </div>

      <div class="p-3 rounded-3 bg-white border mb-3">
        <div class="row g-2 small">
          <div class="col-6">
            <span class="text-muted d-block"><i class="far fa-calendar-alt text-gold me-1"></i>Data:</span>
            <strong class="text-dark">${b.date || 'A agendar'}</strong>
          </div>
          <div class="col-6">
            <span class="text-muted d-block"><i class="far fa-clock text-gold me-1"></i>Hora:</span>
            <strong class="text-dark">${b.time ? b.time + 'h' : 'A agendar'}</strong>
          </div>
          ${b.clientName ? `
          <div class="col-12 mt-2 pt-2 border-top">
            <span class="text-muted d-block"><i class="far fa-user text-gold me-1"></i>Cliente:</span>
            <strong class="text-dark">${b.clientName} ${b.clientPhone ? '(' + b.clientPhone + ')' : ''}</strong>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Detalhes de Valores -->
      <div class="border-top pt-3">
        <div class="d-flex justify-content-between mb-1 small">
          <span class="text-muted">Valor Total:</span>
          <span class="fw-bold">${total.toFixed(2)} €</span>
        </div>
        <div class="d-flex justify-content-between text-success fw-bold fs-5 mb-1">
          <span>Sinal a Pagar Agora (50%):</span>
          <span>${deposit} €</span>
        </div>
        <div class="d-flex justify-content-between text-muted small">
          <span>Restante no dia na clínica:</span>
          <span>${remaining} €</span>
        </div>
      </div>
    `;
  }

  // Ação de Cancelar / Desmarcar
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (!currentBooking) return;
      if (confirm("Deseja cancelar esta marcação?")) {
        try {
          if (currentBooking.ref) {
            await deleteDoc(currentBooking.ref);
          }
          alert("Reserva cancelada.");
          window.location.href = "marcacoes.html";
        } catch (e) {
          console.error("Erro ao desmarcar:", e);
          window.location.href = "marcacoes.html";
        }
      }
    });
  }

  // Simulação do Pagamento MBWAY / Cartão + Geração do PDF
  if (payForm) {
    payForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentBooking) return;

      const selectedMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'MBWay';

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A processar no MB WAY...';

      const total = parseFloat(currentBooking.preco || currentBooking.price || 60);
      const deposit = (total * 0.5).toFixed(2);
      const remaining = (total - parseFloat(deposit)).toFixed(2);
      const transactionId = 'EB-' + Math.floor(100000 + Math.random() * 900000);
      const paymentDate = new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});

      const paymentData = {
        transactionId: transactionId,
        method: selectedMethod,
        amountPaid: deposit,
        remainingAmount: remaining,
        totalAmount: total.toFixed(2),
        paidAt: paymentDate
      };

      // Simular delay de 2 segundos para dar o efeito real de notificação MBWay
      setTimeout(async () => {
        try {
          if (currentBooking.ref) {
            await updateDoc(currentBooking.ref, {
              paymentStatus: 'deposit_paid',
              depositPaid: deposit,
              paymentMethod: selectedMethod,
              transactionId: transactionId,
              updatedAt: new Date().toISOString()
            });
          }

          // Gerar PDF e enviar Email
          generateAndDownloadPDF(currentBooking, paymentData);
          sendPaymentEmail(currentBooking, paymentData);

          // Ecrã de Sucesso
          payForm.style.display = 'none';
          statusMsg.innerHTML = `
            <div class="alert alert-success p-4 rounded-4 shadow-sm text-center">
              <i class="fas fa-check-circle text-success display-4 mb-3"></i>
              <h4 class="font-serif fw-bold text-success mb-2">Pagamento Confirmado!</h4>
              <p class="mb-2">O sinal de <strong>${deposit} €</strong> foi recebido com sucesso via ${selectedMethod}.</p>
              <p class="small text-muted mb-3">Transação Nº: <code>${transactionId}</code></p>

              <div class="p-3 bg-white rounded-3 border text-start mb-3">
                <small class="text-dark d-block mb-1">📄 <strong>Comprovativo PDF:</strong></small>
                <small class="text-muted">O descarregamento do seu recibo em PDF iniciou automaticamente.</small>
              </div>

              <div class="d-grid gap-2">
                <button id="btn-re-download" class="btn btn-outline-primary rounded-pill"><i class="fas fa-download me-2"></i>Descarregar Comprovativo PDF Novamente</button>
                <a href="index.html" class="btn btn-gold text-dark fw-bold rounded-pill"><i class="fas fa-home me-2"></i>Voltar ao Início</a>
              </div>
            </div>
          `;

          document.getElementById('btn-re-download')?.addEventListener('click', () => {
            generateAndDownloadPDF(currentBooking, paymentData);
          });

        } catch (err) {
          console.error("Erro ao registar pagamento:", err);
          submitBtn.disabled = false;
          submitBtn.innerText = 'Tentar Novamente';
        }
      }, 2000);
    });
  }

  // Gerador do PDF Oficial com as Cores da Marca
  function generateAndDownloadPDF(booking, payment) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Banner Azul Escuro
      doc.setFillColor(11, 28, 45);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Elegância & Bem Estar", 15, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(197, 160, 89);
      doc.text("RECIBO DE PAGAMENTO DO SINAL (50%)", 15, 30);

      // Contactos
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Rua da República 8, Cartaxo", 195, 18, { align: "right" });
      doc.text("Tel: +351 910 000 000", 195, 25, { align: "right" });
      doc.text("NIF: 999 999 999", 195, 32, { align: "right" });

      // Dados da Transação
      let y = 55;
      doc.setTextColor(11, 28, 45);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("COMPROVATIVO DE RESERVA", 15, y);
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(197, 160, 89);
      doc.line(15, y + 2, 195, y + 2);

      y += 12;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nº Transação: ${payment.transactionId}`, 15, y);
      doc.text(`Data/Hora: ${payment.paidAt}`, 120, y);

      y += 8;
      doc.text(`Cliente: ${booking.clientName || 'Cliente'}`, 15, y);
      doc.text(`Método: ${payment.method}`, 120, y);

      // Tabela de Serviços
      y += 18;
      doc.setFillColor(245, 247, 250);
      doc.rect(15, y, 180, 10, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.text("Serviço", 20, y + 7);
      doc.text("Data Marcação", 120, y + 7);
      doc.text("Total", 175, y + 7);

      y += 16;
      doc.setFont("helvetica", "normal");
      doc.text(`${booking.serviceName || booking.service || 'Tratamento de Estética'}`, 20, y);
      doc.text(`${booking.date || ''} às ${booking.time || ''}h`, 120, y);
      doc.text(`${payment.totalAmount} €`, 175, y);

      y += 10;
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, 195, y);

      // Resumo Financeiro
      y += 12;
      doc.text("Valor Total do Tratamento:", 120, y);
      doc.text(`${payment.totalAmount} €`, 175, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 167, 69);
      doc.text("Sinal Pago Agora (50%):", 120, y);
      doc.text(`${payment.amountPaid} €`, 175, y);

      y += 8;
      doc.setTextColor(11, 28, 45);
      doc.setFont("helvetica", "normal");
      doc.text("A Pagar na Clínica:", 120, y);
      doc.text(`${payment.remainingAmount} €`, 175, y);

      // Caixa Informativa
      y += 25;
      doc.setFillColor(252, 250, 245);
      doc.setDrawColor(197, 160, 89);
      doc.roundedRect(15, y, 180, 20, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(11, 28, 45);
      doc.text("Nota:", 20, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text("Este comprovativo confirma o agendamento da vaga na Elegância & Bem Estar.", 20, y + 13);

      doc.save(`Comprovativo_${payment.transactionId}.pdf`);
    } catch (e) {
      console.error("Erro PDF:", e);
    }
  }

  function sendPaymentEmail(booking, payment) {
    if (typeof emailjs === 'undefined') return;

    const emailParams = {
      to_email: booking.clientEmail || '',
      to_name: booking.clientName || 'Cliente',
      service_name: booking.serviceName || booking.service || 'Tratamento',
      date: booking.date || '',
      time: booking.time || '',
      payment_id: payment.transactionId,
      amount_paid: payment.amountPaid,
      remaining_amount: payment.remainingAmount,
      total_amount: payment.totalAmount,
      payment_method: payment.method,
      address: 'Rua da República 8, 2070-121 Cartaxo'
    };

    emailjs.send('service_5hwtr1q', 'template_nz85rxi', emailParams)
      .catch(err => console.error("Erro EmailJS:", err));
  }
});