// 구도 가이드: 미리보기 위 오버레이 캔버스에 그립니다.
// flip(0~3): 같은 가이드를 다시 누르면 좌우/상하로 뒤집어 방향을 바꿉니다.

const PHI = 1.618033988749895;

export const GUIDES = [
  { id: 'none',     name: '없음' },
  { id: 'thirds',   name: '3분할' },
  { id: 'phi',      name: '황금분할' },
  { id: 'spiral',   name: '황금나선', flippable: true },
  { id: 'diagonal', name: '대각선' },
  { id: 'triangle', name: '삼각', flippable: true },
  { id: 'center',   name: '중앙' },
  { id: 'horizon',  name: '수평선', flippable: true },
  { id: 'face',     name: '얼굴' },
  { id: 'bust',     name: '반신' },
  { id: 'body',     name: '전신' },
  { id: 'duo',      name: '2인' },
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
  ctx.beginPath();

  switch (id) {
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
