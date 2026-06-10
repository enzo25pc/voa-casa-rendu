/* ── Voa Casa — Rendu IA · app.js ── */

let imgBase64  = null;
let imgDataUrl = null;
let sliderPct  = 50;
let dragging   = false;

// ── File handling ──────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────
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

// ── Generate ───────────────────────────────────────────────────
async function generate() {
  if (!imgBase64) return;

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
    // — Étape 1 : GPT-4o Vision lit et décrit le plan
    setProgress(15, 'Lecture du plan…', 'GPT-4o analyse l\'agencement, les volumes et les proportions');

    const instrLine = instructions
      ? `\n\nThe client has specific requests: "${instructions}". Incorporate these while respecting the overall layout.`
      : '';

    const vRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 700,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imgBase64 } },
          { type: 'text', text: `You are an expert kitchen designer. Analyze this kitchen plan or sketch and describe it precisely in English so that an image generator can create a photorealistic 3D render faithful to this layout. Include: room shape and approximate dimensions, position of windows and doors, cabinet layout (L-shape, U-shape, galley, island, etc.), visible appliances and positions, worktop areas, and any distinctive architectural features. Write 4-5 descriptive sentences only.${instrLine}` },
        ]}],
      }),
    });

    if (!vRes.ok) { const e = await vRes.json(); throw new Error(e.error?.message || 'Erreur GPT-4o Vision'); }
    const planDesc = (await vRes.json()).choices[0].message.content;

    setProgress(45, 'Génération du rendu…', instructions ? 'Intégration de vos demandes spécifiques' : 'DALL·E 3 crée votre visualisation photoréaliste');
    await new Promise(r => setTimeout(r, 300));

    // — Étape 2 : DALL-E 3
    const instrPrompt = instructions ? ` Specific improvements requested: ${instructions}.` : '';
    const prompt = `Photorealistic interior design visualization of a kitchen. Layout to respect: ${planDesc}.${instrPrompt} High-end French interior design studio quality. Soft natural daylight. Realistic materials: stone or quartz countertops, quality cabinetry, professional appliances. Beautiful composition from a slightly elevated angle showing the full kitchen. No text, no labels, no people. Ultra detailed, architectural photography quality, 4K.`;

    const dRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'dall-e-3-preview', prompt, n: 1, size: '1792x1024', quality: 'standard' }),
    });

    if (!dRes.ok) { const e = await dRes.json(); throw new Error(e.error?.message || 'Erreur DALL·E 3'); }
    const genUrl = (await dRes.json()).data[0].url;

    setProgress(95, 'Finalisation…', 'Assemblage du comparateur avant / après');
    await new Promise(r => setTimeout(r, 300));

    const note = instructions
      ? `Rendu généré en tenant compte de vos demandes : "${instructions}". Glissez le curseur pour comparer.`
      : 'Glissez le curseur pour comparer le plan original et le rendu généré.';

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

// ── Compare slider ─────────────────────────────────────────────
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

// ── Event listeners ────────────────────────────────────────────
document.getElementById('genBtn').addEventListener('click', generate);
document.getElementById('retryBtn').addEventListener('click', generate);
