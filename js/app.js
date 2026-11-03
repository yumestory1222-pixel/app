import { FILTERS, Renderer } from './filters.js';
import { GUIDES, CATEGORIES, drawGuide } from './guides.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
const video = $('video');
const view = $('view');
const overlay = $('overlay');
const viewport = $('viewport');
const stage = $('stage');

const RATIOS = { '3:4': 3 / 4, '1:1': 1, '9:16': 9 / 16 };
const RATIO_KEYS = Object.keys(RATIOS);
const TIMERS = [0, 3, 10];

// ---- 상태 (설정은 기기에 기억) ----
const saved = (() => { try { return JSON.parse(localStorage.getItem('gudo-settings')) || {}; } catch { return {}; } })();
const state = {
  facing: saved.facing || 'environment',
  ratio: RATIOS[saved.ratio] ? saved.ratio : '3:4',
  filter: saved.filter || 'original',
  intensity: saved.intensity ?? 1,
  guide: GUIDES.some((g) => g.id === saved.guide) ? saved.guide : 'food-triangle',
  guideCat: saved.guideCat || 'all',
  showTip: saved.showTip ?? true,
  guideFlip: saved.guideFlip || 0,
  timer: saved.timer || 0,
  flash: false,
  level: false,
  zoom: 1,
  busy: false,
  stream: null,
};
function persist() {
  const { facing, ratio, filter, intensity, guide, guideFlip, guideCat, showTip, timer } = state;
  try { localStorage.setItem('gudo-settings', JSON.stringify({ facing, ratio, filter, intensity, guide, guideFlip, guideCat, showTip, timer })); } catch { /* 무시 */ }
}

let renderer;
try { renderer = new Renderer(view); } catch (e) { showPermission(e.message, false); }

// ---- 카메라 ----
async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    showPermission('이 브라우저는 카메라를 지원하지 않아요. HTTPS 주소로 접속했는지 확인해 주세요.', false);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: state.facing }, width: { ideal: 1920 }, height: { ideal: 1920 } },
    });
    state.stream = stream;
    video.srcObject = stream;
    await video.play();
    $('permission').hidden = true;
    state.zoom = 1;
  } catch (e) {
    const msg = e.name === 'NotAllowedError'
      ? '카메라 권한이 거부됐어요. 브라우저 설정에서 카메라를 허용한 뒤 다시 눌러 주세요.'
      : `카메라를 열 수 없어요. (${e.name || e.message})`;
    showPermission(msg, true);
  }
}
function stopCamera() {
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
}
function showPermission(msg, canRetry = true) {
  $('permMsg').textContent = msg;
  $('btnStart').hidden = !canRetry;
  $('permission').hidden = false;
}
const track = () => state.stream?.getVideoTracks()[0];

// ---- 레이아웃: 비율에 맞춰 미리보기 크기 계산 ----
function layout() {
  const ar = RATIOS[state.ratio];
  const W = stage.clientWidth, H = stage.clientHeight;
  let w = W, h = W / ar;
  if (h > H) { h = H; w = H * ar; }
  viewport.style.width = `${Math.round(w)}px`;
  viewport.style.height = `${Math.round(h)}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  overlay.width = Math.round(w * dpr);
  overlay.height = Math.round(h * dpr);
  renderGuide();
}
function renderGuide() {
  drawGuide(overlay.getContext('2d'), state.guide, overlay.width, overlay.height,
    { flip: state.guideFlip, scale: Math.min(window.devicePixelRatio || 1, 3) });
}

// 원본 영상에서 잘라낼 영역(텍스처 좌표)과 출력 해상도
function cropFor(vw, vh, ar, zoom) {
  const va = vw / vh;
  let cw = 1, ch = 1, outW, outH;
  if (va > ar) { cw = ar / va; outH = vh; outW = Math.round(vh * ar); }
  else { ch = va / ar; outW = vw; outH = Math.round(vw / ar); }
  cw /= zoom; ch /= zoom;
  return { crop: [(1 - cw) / 2, (1 - ch) / 2, cw, ch], outW, outH };
}

const currentFilter = () => FILTERS.find((f) => f.id === state.filter) || FILTERS[0];

function renderFrame() {
  if (!renderer || video.readyState < 2 || !video.videoWidth) return false;
  const { crop, outW, outH } = cropFor(video.videoWidth, video.videoHeight, RATIOS[state.ratio], state.zoom);
  if (view.width !== outW || view.height !== outH) { view.width = outW; view.height = outH; }
  renderer.upload(video);
  renderer.draw(currentFilter(), { crop, mirror: state.facing === 'user', intensity: state.intensity });
  return true;
}

function loop() {
  renderFrame();
  requestAnimationFrame(loop);
}

// ---- 필터 썸네일 (현재 카메라 화면으로 미리보기) ----
let thumbRenderer = null;
const thumbCanvas = document.createElement('canvas');
thumbCanvas.width = 108; thumbCanvas.height = 144;
try { thumbRenderer = new Renderer(thumbCanvas); } catch { /* 무시 */ }

function updateFilterThumbs() {
  if (!thumbRenderer || video.readyState < 2 || !video.videoWidth || $('filterChips').hidden) return;
  const { crop } = cropFor(video.videoWidth, video.videoHeight, 3 / 4, 1);
  thumbRenderer.upload(video);
  for (const f of FILTERS) {
    const c = filterChipCanvases[f.id];
    thumbRenderer.draw(f, { crop, mirror: state.facing === 'user', intensity: 1 });
    c.getContext('2d').drawImage(thumbCanvas, 0, 0, c.width, c.height);
  }
}

// ---- 칩 UI ----
const filterChipCanvases = {};
function makeChip(label, onClick) {
  const b = document.createElement('button');
  b.className = 'chip';
  const c = document.createElement('canvas');
  c.width = 108; c.height = 144;
  const s = document.createElement('span');
  s.textContent = label;
  b.append(c, s);
  b.addEventListener('click', onClick);
  return { b, c };
}

function buildChips() {
  const gWrap = $('guideChips');
  for (const g of GUIDES) {
    const { b, c } = makeChip(g.name, () => {
      if (state.guide === g.id && g.flippable) {
        state.guideFlip = g.flippable === 'h' ? state.guideFlip ^ 1 : (state.guideFlip + 1) % 4;
        toast('방향을 바꿨어요');
      } else {
        state.guide = g.id;
        state.guideFlip = 0;
        if (g.flippable && !state.showTip) toast('한 번 더 누르면 방향이 바뀌어요');
      }
      persist(); renderGuide(); syncChips(); syncTip();
    });
    b.dataset.id = g.id;
    b.dataset.cat = g.cat;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(0, 0, c.width, c.height);
    const tmp = document.createElement('canvas');
    tmp.width = c.width; tmp.height = c.height;
    drawGuide(tmp.getContext('2d'), g.id, c.width, c.height, { scale: 1.6, thumb: true });
    if (g.id === 'none') {
      ctx.strokeStyle = '#777'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(34, 52); ctx.lineTo(74, 92); ctx.moveTo(74, 52); ctx.lineTo(34, 92); ctx.stroke();
    }
    ctx.drawImage(tmp, 0, 0);
    gWrap.append(b);
  }

  const cWrap = $('guideCats');
  for (const cat of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'cat';
    b.textContent = cat.name;
    b.dataset.id = cat.id;
    b.addEventListener('click', () => {
      state.guideCat = cat.id;
      persist(); syncChips();
      $('guideChips').scrollLeft = 0;
    });
    cWrap.append(b);
  }

  const fWrap = $('filterChips');
  for (const f of FILTERS) {
    const { b, c } = makeChip(f.name, () => {
      state.filter = f.id;
      persist(); syncChips();
    });
    b.dataset.id = f.id;
    filterChipCanvases[f.id] = c;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(0, 0, c.width, c.height);
    fWrap.append(b);
  }
}

function syncChips() {
  for (const b of $('guideCats').children) b.classList.toggle('active', b.dataset.id === state.guideCat);
  for (const b of $('guideChips').children) {
    b.classList.toggle('active', b.dataset.id === state.guide);
    b.hidden = state.guideCat !== 'all' && b.dataset.cat !== state.guideCat && b.dataset.id !== 'none';
  }
  for (const b of $('filterChips').children) b.classList.toggle('active', b.dataset.id === state.filter);
  const filterTab = !$('filterChips').hidden;
  $('intensityRow').hidden = !filterTab || state.filter === 'original';
  $('intensity').value = Math.round(state.intensity * 100);
  $('intensityVal').textContent = Math.round(state.intensity * 100);
}

function syncTip() {
  const g = GUIDES.find((x) => x.id === state.guide);
  const show = state.showTip && g && g.tip;
  $('tip').hidden = !show;
  if (show) {
    $('tipTitle').textContent = g.title || g.name;
    $('tipText').textContent = g.tip + (g.flippable ? ' (한 번 더 누르면 방향 전환)' : '');
  }
}

function syncTopbar() {
  const set = (id, on, val) => { const b = $(id); b.classList.toggle('on', on); b.querySelector('.val').textContent = val; };
  set('btnFlash', state.flash, state.flash ? '켬' : '끔');
  set('btnTimer', state.timer > 0, state.timer ? `${state.timer}초` : '끔');
  set('btnRatio', false, state.ratio);
  set('btnLevel', state.level, '수평');
  set('btnTip', state.showTip, '설명');
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1400);
}

// ---- 촬영 ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setTorch(on) {
  const t = track();
  try {
    if (t?.getCapabilities?.().torch) { await t.applyConstraints({ advanced: [{ torch: on }] }); return true; }
  } catch { /* 지원 안 함 */ }
  return false;
}

async function capture() {
  if (state.busy || !state.stream) return;
  state.busy = true;
  $('btnShutter').disabled = true;
  try {
    if (state.timer) {
      const cd = $('countdown');
      cd.hidden = false;
      for (let i = state.timer; i > 0; i--) { cd.textContent = i; await sleep(1000); }
      cd.hidden = true;
    }

    let torchOn = false;
    if (state.flash) {
      if (state.facing === 'environment') torchOn = await setTorch(true);
      if (!torchOn) $('flashScreen').hidden = false; // 전면: 화면을 하얗게 밝혀 조명으로 사용
      await sleep(torchOn ? 600 : 350);
    }

    renderFrame();
    const blob = await new Promise((r) => view.toBlob(r, 'image/jpeg', 0.92));

    if (torchOn) setTorch(false);
    $('flashScreen').hidden = true;

    viewport.classList.remove('shot'); void viewport.offsetWidth; viewport.classList.add('shot');
    if (navigator.vibrate) navigator.vibrate(30);

    if (blob) {
      await store.add(blob);
      refreshThumb();
    }
  } catch (e) {
    toast('촬영에 실패했어요');
    console.error(e);
  } finally {
    $('flashScreen').hidden = true;
    state.busy = false;
    $('btnShutter').disabled = false;
  }
}

// ---- 갤러리 ----
let urls = [];
let photos = [];
let viewing = null;

async function refreshThumb() {
  photos = await store.all();
  const img = $('thumbImg');
  if (img.src) URL.revokeObjectURL(img.src);
  if (photos[0]) { img.src = URL.createObjectURL(photos[0].blob); img.hidden = false; }
  else { img.removeAttribute('src'); img.hidden = true; }
}

async function openGallery() {
  photos = await store.all();
  urls.forEach(URL.revokeObjectURL); urls = [];
  const grid = $('galleryGrid');
  grid.replaceChildren();
  for (const p of photos) {
    const b = document.createElement('button');
    const img = document.createElement('img');
    const u = URL.createObjectURL(p.blob); urls.push(u);
    img.src = u; img.loading = 'lazy'; img.alt = '';
    b.append(img);
    b.addEventListener('click', () => openViewer(p, u));
    grid.append(b);
  }
  $('galleryEmpty').hidden = photos.length > 0;
  $('galleryCount').textContent = photos.length ? `${photos.length}장` : '';
  $('gallery').hidden = false;
}

function openViewer(p, url) {
  viewing = p;
  $('viewerImg').src = url;
  $('viewer').hidden = false;
}

function fileName(p) {
  const d = new Date(p.time);
  const z = (n) => String(n).padStart(2, '0');
  return `GUDO_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.jpg`;
}

function download(p) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(p.blob);
  a.download = fileName(p);
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function share(p) {
  const file = new File([p.blob], fileName(p), { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { /* 취소 */ }
  } else {
    download(p);
  }
}

// ---- 핀치 줌 ----
const pointers = new Map();
let pinchStart = 0, zoomStart = 1, zoomBadgeTimer;
viewport.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, e); viewport.setPointerCapture(e.pointerId); });
viewport.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinchStart) { pinchStart = d; zoomStart = state.zoom; }
    state.zoom = Math.min(5, Math.max(1, zoomStart * (d / pinchStart)));
    const badge = $('zoomBadge');
    badge.textContent = `${state.zoom.toFixed(1)}x`;
    badge.hidden = false;
    clearTimeout(zoomBadgeTimer);
    zoomBadgeTimer = setTimeout(() => { badge.hidden = state.zoom <= 1.01; }, 1200);
  }
});
const endPointer = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = 0; };
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);
viewport.addEventListener('dblclick', () => { state.zoom = 1; $('zoomBadge').hidden = true; });

// ---- 수평계 ----
function onMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x == null) return;
  const deg = Math.atan2(g.x, g.y) * 180 / Math.PI;
  const lvl = $('level');
  lvl.querySelector('.level-line').style.transform = `rotate(${deg}deg)`;
  lvl.classList.toggle('ok', Math.abs(deg) < 1.5);
}
async function toggleLevel() {
  if (!state.level && typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) {
    try {
      if (await DeviceMotionEvent.requestPermission() !== 'granted') { toast('동작 센서 권한이 필요해요'); return; }
    } catch { toast('동작 센서를 쓸 수 없어요'); return; }
  }
  state.level = !state.level;
  $('level').hidden = !state.level;
  if (state.level) window.addEventListener('devicemotion', onMotion);
  else window.removeEventListener('devicemotion', onMotion);
  syncTopbar();
}

// ---- 이벤트 연결 ----
$('btnShutter').addEventListener('click', capture);
$('btnStart').addEventListener('click', startCamera);
$('btnFlip').addEventListener('click', () => {
  state.facing = state.facing === 'user' ? 'environment' : 'user';
  persist(); startCamera();
});
$('btnFlash').addEventListener('click', () => { state.flash = !state.flash; syncTopbar(); });
$('btnTimer').addEventListener('click', () => {
  state.timer = TIMERS[(TIMERS.indexOf(state.timer) + 1) % TIMERS.length];
  persist(); syncTopbar();
});
$('btnRatio').addEventListener('click', () => {
  state.ratio = RATIO_KEYS[(RATIO_KEYS.indexOf(state.ratio) + 1) % RATIO_KEYS.length];
  persist(); syncTopbar(); layout();
});
$('btnLevel').addEventListener('click', toggleLevel);
$('btnTip').addEventListener('click', () => { state.showTip = !state.showTip; persist(); syncTopbar(); syncTip(); });
$('tipClose').addEventListener('click', () => { state.showTip = false; persist(); syncTopbar(); syncTip(); });
for (const t of document.querySelectorAll('.tab')) {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $('guideChips').hidden = t.dataset.tab !== 'guide';
    $('guideCats').hidden = t.dataset.tab !== 'guide';
    $('filterChips').hidden = t.dataset.tab !== 'filter';
    syncChips();
    updateFilterThumbs();
  });
}
$('intensity').addEventListener('input', (e) => {
  state.intensity = e.target.value / 100;
  $('intensityVal').textContent = e.target.value;
  persist();
});
$('btnGallery').addEventListener('click', openGallery);
$('btnGalleryClose').addEventListener('click', () => { $('gallery').hidden = true; });
$('btnViewerClose').addEventListener('click', () => { $('viewer').hidden = true; });
$('btnShare').addEventListener('click', () => viewing && share(viewing));
$('btnSave').addEventListener('click', () => viewing && download(viewing));
$('btnDelete').addEventListener('click', async () => {
  if (!viewing || !confirm('이 사진을 삭제할까요?')) return;
  await store.remove(viewing.id);
  $('viewer').hidden = true;
  await openGallery();
  refreshThumb();
});
// 볼륨키/스페이스로 촬영 (일부 기기)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'AudioVolumeUp' || e.key === 'AudioVolumeDown') { e.preventDefault(); capture(); }
});
window.addEventListener('resize', layout);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
  else if ($('permission').hidden) startCamera();
});

// ---- 시작 ----
buildChips();
syncChips();
syncTopbar();
syncTip();
layout();
refreshThumb();
startCamera();
requestAnimationFrame(loop);
setInterval(updateFilterThumbs, 1000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
