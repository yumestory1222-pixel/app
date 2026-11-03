// 구도 가이드: 미리보기 위 오버레이 캔버스에 그립니다.
// flip(0~3): 같은 가이드를 다시 누르면 좌우/상하로 뒤집어 방향을 바꿉니다.

const PHI = 1.618033988749895;

export const CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'food', name: '음식' },
  { id: 'travel', name: '여행' },
  { id: 'land', name: '풍경' },
  { id: 'portrait', name: '인물' },
  { id: 'basic', name: '기본' },
];

// 템플릿 요소 (좌표는 0~1 비율, r은 화면 짧은 변 기준)
//  grid | circle{x,y,r,label} | rect{x,y,w,h,label} | poly{pts,closed} | curve{pts}
//  person{kind:'body'|'bust', x, bottom, h} | label{x,y,text} | hline{y,solid} | vline{x}
const T = { grid: { t: 'grid' } };

export const GUIDES = [
  { id: 'none', cat: 'basic', name: '없음' },

  // ---- 음식 ----
  { id: 'food-center', cat: 'food', name: '중앙', title: '중앙 구도',
    tip: '주인공 하나를 가운데 칸에 두세요. 주변 그림자와 여백이 많을수록 시선이 가운데로 모여요.',
    spec: [T.grid, { t: 'rect', x: 0.35, y: 0.34, w: 0.3, h: 0.32, label: '주인공' }] },
  { id: 'food-triangle', cat: 'food', name: '삼각', title: '삼각 구도', flippable: 'h',
    tip: '음료 두 잔과 디저트처럼 세 가지를 삼각형 꼭짓점에 두세요. 높이가 다른 물건을 섞으면 입체감이 살아요.',
    spec: [T.grid,
      { t: 'poly', pts: [[0.36, 0.32], [0.64, 0.3], [0.5, 0.66]], closed: true },
      { t: 'circle', x: 0.36, y: 0.32, r: 0.07, label: '음료' },
      { t: 'circle', x: 0.64, y: 0.3, r: 0.07 },
      { t: 'circle', x: 0.5, y: 0.66, r: 0.08, label: '디저트', below: true }] },
  { id: 'food-top', cat: 'food', name: '탑뷰', title: '탑뷰 (위에서 수직)', flippable: 'h',
    tip: '휴대폰을 테이블과 평행하게 들고 위에서 찍어요. 메인 접시는 가운데, 소품은 대각선 모서리에 살짝 걸치게.',
    spec: [T.grid,
      { t: 'circle', x: 0.5, y: 0.5, r: 0.22, label: '메인 접시' },
      { t: 'circle', x: 0.2, y: 0.18, r: 0.08, label: '소품' },
      { t: 'circle', x: 0.8, y: 0.82, r: 0.08, label: '소품', below: true }] },
  { id: 'food-diagonal', cat: 'food', name: '대각선', title: '대각선 배치', flippable: 'h',
    tip: '트레이, 포크, 접시를 대각선 방향으로 놓으면 화면에 흐름이 생겨요. 주인공은 교차점 위에.',
    spec: [T.grid,
      { t: 'poly', pts: [[0.05, 0.95], [0.95, 0.05]] },
      { t: 'circle', x: 1 / 3, y: 2 / 3, r: 0.09, label: '주인공', below: true },
      { t: 'circle', x: 2 / 3, y: 1 / 3, r: 0.065, label: '보조' }] },
  { id: 'food-space', cat: 'food', name: '여백', title: '여백 구도', flippable: 'h',
    tip: '음식은 한쪽 교차점에 작게, 나머지는 벽이나 테이블 여백으로 남겨요. 감성 카페 사진에 잘 어울려요.',
    spec: [T.grid,
      { t: 'rect', x: 0.06, y: 0.06, w: 0.5, h: 0.45, label: '여백' },
      { t: 'circle', x: 2 / 3, y: 2 / 3, r: 0.11, label: '주인공', below: true }] },

  // ---- 여행 ----
  { id: 'travel-landmark', cat: 'travel', name: '랜드마크', title: '인물 + 랜드마크', flippable: 'h',
    tip: '사람은 1/3 세로선에, 랜드마크는 반대쪽에 두세요. 사람 키는 화면의 1/3 정도가 적당해요.',
    spec: [T.grid,
      { t: 'rect', x: 0.5, y: 0.1, w: 0.4, h: 0.52, label: '랜드마크' },
      { t: 'person', kind: 'body', x: 1 / 3, bottom: 0.93, h: 0.34 }] },
  { id: 'travel-road', cat: 'travel', name: '소실점', title: '길 · 소실점',
    tip: '길, 골목, 철길이 아래 모서리에서 시작해 화면 위쪽 한 점으로 모이게 찍어요. 시선이 자연스럽게 안쪽으로 끌려가요.',
    spec: [
      { t: 'poly', pts: [[0, 1], [0.5, 0.38], [1, 1]] },
      { t: 'poly', pts: [[0, 0.62], [0.5, 0.38], [1, 0.62]] },
      { t: 'hline', y: 0.38 },
      { t: 'circle', x: 0.5, y: 0.38, r: 0.04, label: '소실점' }] },
  { id: 'travel-frame', cat: 'travel', name: '액자', title: '프레임 속 프레임',
    tip: '문, 창문, 아치, 나뭇가지로 피사체를 한 번 더 감싸 보세요. 사진에 깊이가 생겨요.',
    spec: [
      { t: 'rect', x: 0.12, y: 0.12, w: 0.76, h: 0.8, label: '문 · 창문 · 아치', inside: true },
      { t: 'circle', x: 0.5, y: 0.58, r: 0.12, label: '피사체' }] },
  { id: 'travel-back', cat: 'travel', name: '뒷모습', title: '뒷모습 + 풍경',
    tip: '사람을 작게, 가운데 아래쪽에 두면 풍경이 주인공이 돼요. 지평선은 위 1/3 선에 맞춰요.',
    spec: [
      { t: 'hline', y: 1 / 3, solid: true },
      { t: 'label', x: 0.5, y: 0.18, text: '하늘 · 풍경' },
      { t: 'person', kind: 'body', x: 0.5, bottom: 0.9, h: 0.24 }] },

  // ---- 풍경 ----
  { id: 'land-sky', cat: 'land', name: '하늘2/3', title: '하늘 2/3',
    tip: '하늘이 예쁜 날엔 수평선을 아래 1/3 선에 두고 하늘을 넓게 담아요.',
    spec: [{ t: 'hline', y: 2 / 3, solid: true }, { t: 'vline', x: 1 / 3 }, { t: 'vline', x: 2 / 3 },
      { t: 'label', x: 0.5, y: 0.34, text: '하늘 2/3' }, { t: 'label', x: 0.5, y: 0.84, text: '땅 1/3' }] },
  { id: 'land-ground', cat: 'land', name: '땅2/3', title: '전경 2/3',
    tip: '꽃밭, 물결, 바위처럼 앞쪽이 멋질 땐 수평선을 위 1/3 선에 둬요.',
    spec: [{ t: 'hline', y: 1 / 3, solid: true }, { t: 'vline', x: 1 / 3 }, { t: 'vline', x: 2 / 3 },
      { t: 'label', x: 0.5, y: 0.17, text: '하늘 1/3' }, { t: 'label', x: 0.5, y: 0.66, text: '전경 2/3' }] },
  { id: 'land-mirror', cat: 'land', name: '반영', title: '반영 대칭',
    tip: '호수나 물웅덩이에 비친 모습은 수평선을 정확히 가운데에 둬요. 수평계를 켜면 좋아요.',
    spec: [{ t: 'hline', y: 0.5, solid: true }, { t: 'vline', x: 0.5 },
      { t: 'circle', x: 0.5, y: 0.32, r: 0.08, label: '실물' },
      { t: 'circle', x: 0.5, y: 0.68, r: 0.08, label: '반영', below: true }] },
  { id: 'land-scurve', cat: 'land', name: 'S곡선', title: 'S자 곡선', flippable: 'h',
    tip: '강, 길, 해안선이 S자로 휘어 들어가게 찍으면 시선이 화면 끝까지 흘러가요.',
    spec: [T.grid,
      { t: 'curve', pts: [[0.3, 1], [0.78, 0.78], [0.3, 0.52], [0.68, 0.3], [0.5, 0.12]] },
      { t: 'label', x: 0.78, y: 0.6, text: 'S자 흐름' }] },
  { id: 'land-layers', cat: 'land', name: '원근', title: '전경 · 중경 · 원경', flippable: 'h',
    tip: '앞에 꽃이나 돌을 걸치고, 뒤로 건물·산·하늘을 겹쳐 담으면 깊이감이 생겨요.',
    spec: [{ t: 'hline', y: 0.38 }, { t: 'hline', y: 0.66 },
      { t: 'label', x: 0.5, y: 0.2, text: '원경' }, { t: 'label', x: 0.5, y: 0.53, text: '중경' },
      { t: 'circle', x: 0.26, y: 0.83, r: 0.08 }, { t: 'label', x: 0.62, y: 0.84, text: '전경' }] },

  // ---- 인물 ----
  { id: 'face', cat: 'portrait', name: '얼굴', title: '얼굴 클로즈업',
    tip: '얼굴을 타원에 맞추고 눈을 점선 높이(위 1/3 근처)에 두세요. 턱을 살짝 당기면 좋아요.' },
  { id: 'bust', cat: 'portrait', name: '반신', title: '반신',
    tip: '눈높이를 위 1/3 선에 맞추세요. 머리 위 여백은 너무 많지 않게.' },
  { id: 'body', cat: 'portrait', name: '전신', title: '전신',
    tip: '발끝이 잘리지 않게 아래에 살짝 여유를 두세요. 카메라를 허리 높이로 낮추면 다리가 길어 보여요.' },
  { id: 'duo', cat: 'portrait', name: '2인', title: '2인',
    tip: '두 사람의 눈높이를 비슷하게 맞추고 어깨가 살짝 겹치게 서면 자연스러워요.' },

  // ---- 기본 ----
  { id: 'thirds', cat: 'basic', name: '3분할', title: '3분할',
    tip: '피사체를 선이 만나는 노란 점 중 하나에 두세요. 가장 쉽고 안정적인 구도예요.' },
  { id: 'phi', cat: 'basic', name: '황금분할', title: '황금분할',
    tip: '3분할보다 가운데에 가까운 선이에요. 조금 더 차분한 느낌을 줘요.' },
  { id: 'spiral', cat: 'basic', name: '황금나선', title: '황금나선', flippable: true,
    tip: '나선이 감기는 노란 점에 주인공을 두세요. 한 번 더 누르면 방향이 바뀌어요.' },
  { id: 'diagonal', cat: 'basic', name: '대각선', title: '대각선',
    tip: '길, 난간, 그림자 같은 선을 대각선에 맞추면 역동적인 사진이 돼요.' },
  { id: 'triangle', cat: 'basic', name: '삼각', title: '삼각 분할', flippable: true,
    tip: '대각선과 수직선이 만나는 두 점에 피사체를 두세요.' },
  { id: 'center', cat: 'basic', name: '중앙', title: '중앙',
    tip: '좌우 대칭인 건물이나 정면 사진은 정가운데에 두세요.' },
  { id: 'horizon', cat: 'basic', name: '수평선', title: '수평선', flippable: true,
    tip: '수평선이나 바닥 선을 실선에 맞추세요. 한 번 더 누르면 위아래가 바뀌어요.' },
];

// 실루엣 경로 (정규화 좌표)
// 반신: 100 x 100 박스
const BUST = new Path2D(
  'M50 14 C38 14 31 24 31 36 C31 50 39 60 50 60 C61 60 69 50 69 36 C69 24 62 14 50 14 Z' +
  'M41 59 L41 66 C30 69 14 72 9 82 L5 100 M59 59 L59 66 C70 69 86 72 91 82 L95 100'
);
// 전신: 40 x 100 박스
const BODY = new Path2D(
  'M20 1 C16.5 1 14.5 4 14.5 8 C14.5 12 16.8 15 20 15 C23.2 15 25.5 12 25.5 8 C25.5 4 23.5 1 20 1 Z' +
  'M17.5 15 L17.5 17.5 C12 18.5 9 19.5 8 23 L5 47 L8 48 L12 27 L12.8 52 L14 97 L19 97 L20 58 L21 97 L26 97 L27.2 52 L28 27 L32 48 L35 47 L32 23 C31 19.5 28 18.5 22.5 17.5 L22.5 15'
);

function line(ctx, x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function foot(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  return [ax + t * dx, ay + t * dy];
}

function spiralPath(ctx) {
  // 1 x PHI 세로 황금사각형 안에서 정사각형을 잘라내며 1/4 원호를 이어 그림
  let rx = 0, ry = 0, rw = 1, rh = PHI;
  let a = -Math.PI / 2;
  const squares = [];
  for (let i = 0; i < 10; i++) {
    const dir = i % 4;
    let s, sx, sy, cx, cy;
    if (dir === 0) { s = rw; sx = rx; sy = ry; cx = sx; cy = sy + s; ry += s; rh -= s; }
    else if (dir === 1) { s = rh; sx = rx + rw - s; sy = ry; cx = sx; cy = sy; rw -= s; }
    else if (dir === 2) { s = rw; sx = rx; sy = ry + rh - s; cx = sx + s; cy = sy; rh -= s; }
    else { s = rh; sx = rx; sy = ry; cx = sx + s; cy = sy + s; rx += s; rw -= s; }
    squares.push([sx, sy, s]);
    ctx.moveTo(cx + s * Math.cos(a), cy + s * Math.sin(a));
    ctx.arc(cx, cy, s, a, a + Math.PI / 2);
    a += Math.PI / 2;
  }
  return squares;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id
 * @param {number} w  캔버스 픽셀 폭
 * @param {number} h  캔버스 픽셀 높이
 * @param {object} o  { flip, scale(선 굵기 배율), thumb(썸네일 여부) }
 */
export function drawGuide(ctx, id, w, h, { flip = 0, scale = 1, thumb = false } = {}) {
  ctx.clearRect(0, 0, w, h);
  if (id === 'none') return;

  ctx.save();
  // 뒤집기
  const fx = flip & 1, fy = flip & 2;
  ctx.translate(fx ? w : 0, fy ? h : 0);
  ctx.scale(fx ? -1 : 1, fy ? -1 : 1);

  const lw = 1.4 * scale;
  ctx.lineWidth = lw;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.fillStyle = 'rgba(255,216,77,0.9)';
  if (!thumb) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 3 * scale; }

  const dots = []; // 강조할 교차점(피사체 위치 추천)
  const labels = [];
  ctx.beginPath();

  const g = GUIDES.find((x) => x.id === id);
  if (g?.spec) drawSpec(ctx, g.spec, w, h, scale, labels);

  switch (g?.spec ? '' : id) {
    case 'thirds': {
      for (const t of [1 / 3, 2 / 3]) { line(ctx, w * t, 0, w * t, h); line(ctx, 0, h * t, w, h * t); }
      for (const x of [1 / 3, 2 / 3]) for (const y of [1 / 3, 2 / 3]) dots.push([w * x, h * y]);
      break;
    }
    case 'phi': {
      const a = 1 / (1 + PHI), b = 1 - a; // 0.382 / 0.618
      for (const t of [a, b]) { line(ctx, w * t, 0, w * t, h); line(ctx, 0, h * t, w, h * t); }
      for (const x of [a, b]) for (const y of [a, b]) dots.push([w * x, h * y]);
      break;
    }
    case 'spiral': {
      // 경로는 변환된 좌표로 추가하고, 선 굵기는 원래대로 유지
      ctx.save();
      ctx.scale(w, h / PHI);
      const squares = spiralPath(ctx);
      for (const [sx, sy, s] of squares.slice(0, 6)) ctx.rect(sx, sy, s, s);
      ctx.restore();
      // 수렴점
      const lastSq = squares[squares.length - 1];
      dots.push([(lastSq[0] + lastSq[2] / 2) * w, (lastSq[1] + lastSq[2] / 2) * (h / PHI)]);
      break;
    }
    case 'diagonal': {
      line(ctx, 0, 0, w, h); line(ctx, w, 0, 0, h);
      dots.push([w / 2, h / 2]);
      break;
    }
    case 'triangle': {
      line(ctx, 0, h, w, 0);
      const p1 = foot(0, 0, 0, h, w, 0);
      const p2 = foot(w, h, 0, h, w, 0);
      line(ctx, 0, 0, p1[0], p1[1]);
      line(ctx, w, h, p2[0], p2[1]);
      dots.push(p1, p2);
      break;
    }
    case 'center': {
      const r = Math.min(w, h) * 0.18;
      line(ctx, w / 2, 0, w / 2, h); line(ctx, 0, h / 2, w, h / 2);
      ctx.moveTo(w / 2 + r, h / 2);
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      break;
    }
    case 'horizon': {
      // 하늘 2/3 : 땅 1/3 (뒤집으면 반대)
      line(ctx, 0, h * 2 / 3, w, h * 2 / 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([6 * scale, 6 * scale]);
      line(ctx, w / 2, 0, w / 2, h);
      break;
    }
    case 'face': {
      const rx = w * 0.24, ry = rx * 1.32, cy = h * 0.42;
      ctx.ellipse(w / 2, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.setLineDash([5 * scale, 5 * scale]);
      line(ctx, w / 2 - rx * 0.8, cy - ry * 0.12, w / 2 + rx * 0.8, cy - ry * 0.12); // 눈 높이
      line(ctx, w / 2, cy - ry, w / 2, cy + ry);
      break;
    }
    case 'bust': {
      addScaled(ctx, BUST, 100, 100, w / 2, h, Math.min(h * 0.62, w * 1.0) / 100);
      line(ctx, 0, h / 3, w, h / 3);
      break;
    }
    case 'body': {
      addScaled(ctx, BODY, 40, 100, w / 2, h * 0.95, (h * 0.8) / 100);
      break;
    }
    case 'duo': {
      const s = Math.min(h * 0.5, w * 0.62) / 100;
      addScaled(ctx, BUST, 100, 100, w * 0.32, h, s);
      addScaled(ctx, BUST, 100, 100, w * 0.68, h, s * 0.96);
      break;
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);

  if (dots.length) {
    ctx.shadowBlur = 0;
    const r = (thumb ? 1.6 : 3.2) * scale;
    for (const [x, y] of dots) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 글자는 뒤집지 않고 위치만 옮김
  if (!thumb && labels.length) {
    ctx.save();
    ctx.font = `600 ${13 * scale}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4 * scale;
    for (const [x, y, text] of labels) ctx.fillText(text, fx ? w - x : x, fy ? h - y : y);
    ctx.restore();
  }
}

function drawSpec(ctx, spec, w, h, scale, labels) {
  const m = Math.min(w, h);
  const dash = [6 * scale, 5 * scale];
  const gap = 12 * scale;
  for (const e of spec) {
    ctx.beginPath();
    ctx.setLineDash(e.solid || e.t === 'grid' ? [] : dash);
    ctx.globalAlpha = e.t === 'grid' ? 0.6 : 1;
    switch (e.t) {
      case 'grid':
        for (const t of [1 / 3, 2 / 3]) { line(ctx, w * t, 0, w * t, h); line(ctx, 0, h * t, w, h * t); }
        break;
      case 'hline': line(ctx, 0, e.y * h, w, e.y * h); break;
      case 'vline': ctx.setLineDash(dash); line(ctx, e.x * w, 0, e.x * w, h); break;
      case 'circle': {
        const r = e.r * m;
        ctx.arc(e.x * w, e.y * h, r, 0, Math.PI * 2);
        if (e.label) labels.push([e.x * w, e.y * h + (e.below ? r + gap : -r - gap), e.label]);
        break;
      }
      case 'rect':
        ctx.rect(e.x * w, e.y * h, e.w * w, e.h * h);
        if (e.label) labels.push([(e.x + e.w / 2) * w, e.y * h + (e.inside ? gap * 1.6 : -gap), e.label]);
        break;
      case 'poly':
        e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
        if (e.closed) ctx.closePath();
        break;
      case 'curve': {
        const p = e.pts.map(([x, y]) => [x * w, y * h]);
        ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length - 1; i++) {
          const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
          ctx.quadraticCurveTo(p[i][0], p[i][1], i === p.length - 2 ? p[i + 1][0] : mx, i === p.length - 2 ? p[i + 1][1] : my);
        }
        break;
      }
      case 'person': {
        const [path, bw, bh] = e.kind === 'bust' ? [BUST, 100, 100] : [BODY, 40, 100];
        ctx.setLineDash([]);
        addScaled(ctx, path, bw, bh, e.x * w, e.bottom * h, (e.h * h) / bh);
        continue;
      }
      case 'label': labels.push([e.x * w, e.y * h, e.text]); continue;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// 실루엣 Path2D를 (중앙 x, 아래 y) 기준으로 배치해 현재 경로에 추가
function addScaled(ctx, path, boxW, boxH, cx, bottom, s) {
  const m = new DOMMatrix().translate(cx - (boxW * s) / 2, bottom - boxH * s).scale(s, s);
  // 현재 변환(뒤집기)과 합성
  const cur = ctx.getTransform();
  const p = new Path2D();
  p.addPath(path, m);
  ctx.save();
  ctx.setTransform(cur);
  ctx.stroke(p);
  ctx.restore();
}
