/* ── Voa Casa — Rendu IA · app.js ── */

let imgBase64  = null;
let imgDataUrl = null;
let imgFile    = null;
let sliderPct  = 50;
let dragging   = false;

function bindFile(el) {
  el.addEventListener('change', e => handleFile(e.target.files[0]));
}

bindFile(document.getElementById('fileInput'));
bindFile(document.getElementById('changeInput'));

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  imgFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    imgDataUrl = e.target.result;
    imgBase64  = imgDataUrl.split(',')[1];
    document.getElementById('previewImg').src          = imgDataUrl;
    document.getElementById('previewName').textContent = file.name;
    dropZone.style.display = 'none';
    document.getElementById('previewArea').classList.add('vis');
    document.getElementById('genBtn').disabled = false;
    hide('compareWrap'); hide('errWrap'); hide('progressWrap');
  };
  reader.readAsDataURL(file);
}

function show(id) { document.getElementById(id).classList.add('vis'); }
function hide(id) { document.getElementById(id).classList.remove('vis'); }

function setProgress(pct, label, sub) {
  document.getElementById('progBar').style.strokeDashoffset = 207.3 * (1 - pct / 100);
  document.getElementById('progPct').textContent = pct + '%';
  if (label) document.getElementById('progLabel').textContent = label;
  if (sub)   document.getElementById('progSub').textContent   = sub;
}

function showError(msg) {
  document.getElementById('errMsg').textContent = msg;
  show('errWrap');
}

async function generate() {
  if (!imgFile) return;

  const apiKey = document.getElementById('openaiKey').value.trim();
  if (!apiKey) {
    showError('Clé API OpenAI manquante. Renseignez votre clé sk-... dans le champ ci-dessus.');
    return;
  }

  const instructions = document.getElementById('instrInput').value.trim();

  hide('compareWrap'); hide('errWrap');
  show('progressWrap');
  setProgress(0, '', '');
  document.getElementById('genBtn').disabled = true;
  document.getElementById('genBtn').innerHTML = `
    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Génération en cours…`;

  try {
    setProgress(20, 'Envoi du plan…', 'Transfert de l\'image vers GPT Image 2');

    const basePrompt = `Transform this kitchen plan or sketch into a photorealistic interior design render. 
STRICT RULES — never break these:
- Keep the exact same room shape, dimensions and proportions
- Keep every wall, door, window and architectural element in the exact same position
- Keep every piece of furniture and appliance in the exact same position
- Do NOT add, remove or move anything structural

IMPROVEMENTS to apply:
- Photorealistic rendering: realistic wood grain, stone textures, matte or glossy cabinet finishes, metal hardware
- Natural daylight: soft warm sunlight coming through the windows, realistic shadows and highlights, golden-hour atmosphere
- Subtle tasteful decoration: a few plants, a fruit bowl on the countertop, a pendant light above the island if present, clean dishware visible on open shelves — all within the existing space, nothing added outside of what fits naturally
- Professional architectural photography quality: sharp details, beautiful composition, 4K resolution
- High-end French interior design studio finish`;

    const finalPrompt = instructions
      ? `${basePrompt}\n\nAdditional client requests (apply without changing the layout): ${instructions}.`
      : basePrompt;

    let fileToSend = imgFile;
    if (imgFile.type !== 'image/png') {
      fileToSend = await convertToPng(imgFile);
    }

    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('image', fileToSend, 'plan.png');
    form.append('prompt', finalPrompt);
    form.append('n', '1');
    form.append('size', '1024x1024');
    form.append('quality', 'high');

    setProgress(40, 'Rendu photoréaliste en cours…', 'Lumière naturelle, textures et déco en cours d\'application');

    const dRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body: form,
    });

    if (!dRes.ok) {
      const e = await dRes.json();
      throw new Error(e.error?.message || 'Erreur GPT Image 2');
    }

    setProgress(90, 'Finalisation…', 'Assemblage du comparateur avant / après');

    const dData = await dRes.json();
    const genUrl = 'data:image/png;base64,' + dData.data[0].b64_json;

    await new Promise(r => setTimeout(r, 300));

    const note = instructions
      ? `Rendu photoréaliste avec lumière naturelle — demandes intégrées : "${instructions}". Glissez le curseur pour comparer.`
      : 'Rendu photoréaliste avec lumière naturelle et déco subtile. Glissez le curseur pour comparer.';

    showResult(imgDataUrl, genUrl, note);

  } catch (err) {
    hide('progressWrap');
    showError(err.message);
  } finally {
    document.getElementById('genBtn').disabled = false;
    document.getElementById('genBtn').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      Améliorer le rendu`;
  }
}

function convertToPng(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (blob) resolve(new File([blob], 'plan.png', { type: 'image/png' }));
        else reject(new Error('Conversion PNG échouée'));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Lecture image échouée'));
    img.src = url;
  });
}

function showResult(beforeUrl, afterUrl, note) {
  setProgress(100, 'Rendu prêt !', '');
  setTimeout(() => {
    hide('progressWrap');
    document.getElementById('imgBefore').src       = beforeUrl;
    document.getElementById('imgAfter').src        = afterUrl;
    const dl = document.getElementById('dlBtn');
    dl.href = afterUrl;
    dl.target = '_blank';
    dl.removeAttribute('download');
    document.getElementById('cmpNote').textContent = note;
    show('compareWrap');
    sliderPct = 50;
    updateSlider();
    initSlider();
  }, 350);
}

function updateSlider() {
  document.getElementById('cmpAfter').style.width = sliderPct + '%';
  document.getElementById('cmpLine').style.left   = sliderPct + '%';
  document.getElementById('cmpHandle').style.left = sliderPct + '%';
}

function getSliderPct(clientX) {
  const rect = document.getElementById('cmpStage').getBoundingClientRect();
  return Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
}

function initSlider() {
  const stage = document.getElementById('cmpStage');
  stage.addEventListener('mousedown', e => { dragging = true; sliderPct = getSliderPct(e.clientX); updateSlider(); });
  window.addEventListener('mousemove', e => { if (dragging) { sliderPct = getSliderPct(e.clientX); updateSlider(); } });
  window.addEventListener('mouseup', () => (dragging = false));
  stage.addEventListener('touchstart', e => { dragging = true; sliderPct = getSliderPct(e.touches[0].clientX); updateSlider(); }, { passive: true });
  window.addEventListener('touchmove', e => { if (dragging) { sliderPct = getSliderPct(e.touches[0].clientX); updateSlider(); } }, { passive: true });
  window.addEventListener('touchend', () => (dragging = false));
}

document.getElementById('genBtn').addEventListener('click', generate);
document.getElementById('retryBtn').addEventListener('click', generate);
