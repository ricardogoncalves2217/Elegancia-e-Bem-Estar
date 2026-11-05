// assets/js/tryon-unhas.js

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('image-upload');
  const canvas = document.getElementById('tryon-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const aiScanner = document.getElementById('ai-scanner');
  
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Controlos
  const shapeSelect = document.getElementById('nail-shape');
  const colorPicker = document.getElementById('color-picker');
  const opacitySlider = document.getElementById('opacity-slider');
  const cuticleSlider = document.getElementById('cuticle-offset');
  const widthSlider = document.getElementById('nail-width');
  const lengthSlider = document.getElementById('nail-length');
  const recalculateBtn = document.getElementById('recalculate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');

  let currentImage = null;
  let detectedLandmarks = null;
  let handsEngine = null;

  const FINGER_JOINTS = [
    { tip: 4,  dip: 3,  name: 'Polegar' },
    { tip: 8,  dip: 7,  name: 'Indicador' },
    { tip: 12, dip: 11, name: 'Médio' },
    { tip: 16, dip: 15, name: 'Anelar' },
    { tip: 20, dip: 19, name: 'Mínimo' }
  ];

  function initMediaPipe() {
    if (typeof Hands === 'undefined') {
      if (statusMsg) statusMsg.innerHTML = '<span class="text-danger">A carregar IA...</span>';
      setTimeout(initMediaPipe, 500);
      return;
    }

    handsEngine = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsEngine.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    handsEngine.onResults(onHandResults);
    if (statusMsg) statusMsg.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>IA Pronta. Carregue a foto.</span>';
  }

  initMediaPipe();

  // 1. Carregar Imagem e Iniciar Scanner
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (statusMsg) statusMsg.innerHTML = '<span class="text-primary"><i class="fas fa-spinner fa-spin me-1"></i>A analisar geometria...</span>';

      // Ativar Animação do Scanner e remover Glow antigo
      if (aiScanner) aiScanner.classList.add('active');
      if (canvasContainer) canvasContainer.classList.remove('glow-effect');

      const img = new Image();
      img.onload = async () => {
        currentImage = img;
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

        // Enviar para MediaPipe
        if (handsEngine) {
          await handsEngine.send({ image: currentImage });
        }
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // 2. Receber Resultados e Mostrar Sucesso (Pop Glow Effect)
  function onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detectedLandmarks = results.multiHandLandmarks;
      
      // Delay de 800ms para criar a ilusão estética do scanner a trabalhar
      setTimeout(() => {
        if (aiScanner) aiScanner.classList.remove('active');
        
        renderAll();

        // Aplicar o efeito Pop Glow no container
        if (canvasContainer) {
          canvasContainer.classList.remove('glow-effect');
          void canvasContainer.offsetWidth; // Force Reflow para reiniciar animação
          canvasContainer.classList.add('glow-effect');
        }

        if (statusMsg) statusMsg.innerHTML = '<span class="text-success fw-bold"><i class="fas fa-magic me-1"></i>Sucesso! Ajuste o formato e cor.</span>';
      }, 800);
      
    } else {
      detectedLandmarks = null;
      if (aiScanner) aiScanner.classList.remove('active');
      if (statusMsg) statusMsg.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>Mão não detetada. Tente outra foto.</span>';
      redrawOriginalImage();
    }
  }

  function renderAll() {
    if (!currentImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    if (!detectedLandmarks) return;

    const shape = shapeSelect ? shapeSelect.value : 'almond';
    const colorHex = colorPicker ? colorPicker.value : '#c5a059';
    const opacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.85;
    const cuticleOffsetUser = cuticleSlider ? parseFloat(cuticleSlider.value) : 0;
    const widthFactor = widthSlider ? parseFloat(widthSlider.value) : 1.0;
    const lengthFactor = lengthSlider ? parseFloat(lengthSlider.value) : 1.0;

    detectedLandmarks.forEach(hand => {
      FINGER_JOINTS.forEach(joint => {
        drawNailOnFinger(hand, joint, { shape, colorHex, opacity, cuticleOffsetUser, widthFactor, lengthFactor });
      });
    });
  }

  function drawNailOnFinger(hand, jointInfo, opts) {
    const ptTip = hand[jointInfo.tip];
    const ptDip = hand[jointInfo.dip];

    if (!ptTip || !ptDip) return;

    const tipX = ptTip.x * canvas.width;
    const tipY = ptTip.y * canvas.height;
    const dipX = ptDip.x * canvas.width;
    const dipY = ptDip.y * canvas.height;

    const dx = tipX - dipX;
    const dy = tipY - dipY;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength < 5) return; 

    const angle = Math.atan2(dy, dx) + Math.PI / 2;

    const isThumb = (jointInfo.name === 'Polegar');
    const baseWidth = segmentLength * (isThumb ? 0.48 : 0.40) * opts.widthFactor;
    const baseLength = segmentLength * (isThumb ? 0.70 : 0.65) * opts.lengthFactor;

    const shiftBack = segmentLength * (0.35 + (opts.cuticleOffsetUser * 0.005));
    const unitX = dx / segmentLength;
    const unitY = dy / segmentLength;

    const baseX = tipX - (unitX * shiftBack);
    const baseY = tipY - (unitY * shiftBack);

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(angle);

    const rgb = hexToRgb(opts.colorHex);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opts.opacity})`;
    ctx.strokeStyle = `rgba(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}, ${opts.opacity})`;
    ctx.lineWidth = 1.5;

    const W = baseWidth;
    const L = baseLength;

    ctx.beginPath();
    ctx.moveTo(-W / 2, 0);
    ctx.bezierCurveTo(-W / 2, W * 0.25, W / 2, W * 0.25, W / 2, 0);

    switch (opts.shape) {
      case 'quadrada':
        ctx.lineTo(W * 0.48, -L);
        ctx.lineTo(-W * 0.48, -L);
        break;
      case 'arredondada':
        ctx.lineTo(W * 0.45, -L * 0.75);
        ctx.bezierCurveTo(W * 0.4, -L * 1.05, -W * 0.4, -L * 1.05, -W * 0.45, -L * 0.75);
        break;
      case 'oval':
      case 'almond':
      case 'amendoada':
        ctx.lineTo(W * 0.4, -L * 0.6);
        ctx.bezierCurveTo(W * 0.3, -L * 1.1, -W * 0.3, -L * 1.1, -W * 0.4, -L * 0.6);
        break;
      case 'stiletto':
        ctx.lineTo(W * 0.38, -L * 0.5);
        ctx.lineTo(0, -L * 1.15); 
        ctx.lineTo(-W * 0.38, -L * 0.5);
        break;
      case 'bailarina':
      case 'ballerina':
        ctx.lineTo(W * 0.38, -L * 0.6);
        ctx.lineTo(W * 0.22, -L * 1.05);
        ctx.lineTo(-W * 0.22, -L * 1.05);
        ctx.lineTo(-W * 0.38, -L * 0.6);
        break;
      case 'edge':
        ctx.lineTo(W * 0.4, -L * 0.5);
        ctx.lineTo(0, -L * 1.1); 
        ctx.lineTo(-W * 0.4, -L * 0.5);
        break;
      default:
        ctx.bezierCurveTo(W * 0.4, -L, -W * 0.4, -L, -W / 2, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brilho Gel 3D
    const shine = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    shine.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shine;
    ctx.fill();

    ctx.restore();
  }

  [shapeSelect, colorPicker, opacitySlider, cuticleSlider, widthSlider, lengthSlider].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        if (detectedLandmarks) renderAll();
      });
    }
  });

  if (recalculateBtn) {
    recalculateBtn.addEventListener('click', () => {
      if (currentImage && handsEngine) {
        if (aiScanner) aiScanner.classList.add('active');
        if (statusMsg) statusMsg.innerHTML = '<span class="text-primary"><i class="fas fa-sync fa-spin me-1"></i>A recalcular...</span>';
        handsEngine.send({ image: currentImage });
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      detectedLandmarks = null;
      redrawOriginalImage();
      if (statusMsg) statusMsg.innerHTML = '<span class="text-muted">Simulação limpa.</span>';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'Simulacao_Unhas_Elegancia.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  function redrawOriginalImage() {
    if (!currentImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
  }

  function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
});