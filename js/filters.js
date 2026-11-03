// 실시간 필터: WebGL 프래그먼트 셰이더 하나로 모든 프리셋을 처리합니다.

const BASE = {
  brightness: 0, contrast: 1, saturation: 1, warmth: 0, tint: 0,
  fade: 0, vignette: 0, grain: 0, mono: 0,
  shadow: [0, 0, 0], highlight: [0, 0, 0],
};

// 프리셋. 숫자를 바꾸면 바로 반영됩니다.
export const FILTERS = [
  { id: 'original', name: '원본' },
  { id: 'clear',  name: '맑음',   brightness: 0.03, contrast: 1.08, saturation: 1.12, warmth: -0.1 },
  { id: 'warm',   name: '따뜻',   brightness: 0.02, saturation: 1.05, warmth: 0.6, highlight: [0.04, 0.02, -0.02] },
  { id: 'peach',  name: '피치',   brightness: 0.05, contrast: 0.95, saturation: 0.95, warmth: 0.3, tint: -0.2, highlight: [0.06, 0.0, 0.02], fade: 0.06 },
  { id: 'cream',  name: '크림',   brightness: 0.06, contrast: 0.88, saturation: 0.8, warmth: 0.25, fade: 0.14 },
  { id: 'film',   name: '필름',   contrast: 1.05, saturation: 0.85, warmth: 0.15, fade: 0.12, grain: 0.07, vignette: 0.25, shadow: [0.0, 0.03, 0.05] },
  { id: 'cinema', name: '시네마', contrast: 1.12, saturation: 0.9, shadow: [-0.03, 0.04, 0.08], highlight: [0.08, 0.03, -0.05], vignette: 0.35 },
  { id: 'cool',   name: '쿨',     brightness: 0.02, saturation: 0.95, warmth: -0.55, tint: 0.05 },
  { id: 'vintage',name: '빈티지', contrast: 0.92, saturation: 0.7, warmth: 0.35, fade: 0.2, grain: 0.06, vignette: 0.4, highlight: [0.05, 0.03, -0.04] },
  { id: 'mono',   name: '흑백',   mono: 1, contrast: 1.1 },
  { id: 'noir',   name: '느와르', mono: 1, contrast: 1.45, brightness: -0.03, vignette: 0.5, grain: 0.05 },
].map((f) => ({ ...BASE, ...f }));

const VERT = `
attribute vec2 a_pos;
uniform vec4 u_crop;      // x, y, w, h (텍스처 좌표)
uniform float u_mirror;
varying vec2 v_uv;
varying vec2 v_screen;
void main() {
  vec2 uv = a_pos * 0.5 + 0.5;
  uv.y = 1.0 - uv.y;
  v_screen = uv;
  if (u_mirror > 0.5) uv.x = 1.0 - uv.x;
  v_uv = u_crop.xy + uv * u_crop.zw;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
varying vec2 v_screen;
uniform sampler2D u_tex;
uniform float u_intensity, u_brightness, u_contrast, u_saturation, u_warmth, u_tint;
uniform float u_fade, u_vignette, u_grain, u_mono, u_time;
uniform vec3 u_shadow, u_highlight;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 src = texture2D(u_tex, v_uv).rgb;
  vec3 c = src + u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  c = mix(vec3(dot(c, LUMA)), c, u_saturation);
  c.r += u_warmth * 0.08;
  c.b -= u_warmth * 0.08;
  c.g += u_tint * 0.06;
  float l = clamp(dot(c, LUMA), 0.0, 1.0);
  c += u_shadow * (1.0 - l) * (1.0 - l) + u_highlight * l * l;
  if (u_mono > 0.5) c = vec3(dot(c, LUMA));
  c = c * (1.0 - u_fade * 0.5) + u_fade * 0.18;
  float d = length(v_screen - 0.5) * 1.25;
  c *= 1.0 - u_vignette * smoothstep(0.35, 0.95, d);
  c += (rand(v_screen * 731.0 + u_time) - 0.5) * u_grain;
  gl_FragColor = vec4(mix(src, clamp(c, 0.0, 1.0), u_intensity), 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL을 지원하지 않는 브라우저입니다.');
    this.gl = gl;

    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.u = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(prog, i).name;
      this.u[name] = gl.getUniformLocation(prog, name);
    }
  }

  /** 소스(video/image)를 업로드합니다. 여러 번 그릴 때는 한 번만 호출하면 됩니다. */
  upload(source) {
    const gl = this.gl;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  }

  /**
   * @param {object} f        FILTERS 항목
   * @param {object} opts     { crop:[x,y,w,h], mirror, intensity }
   */
  draw(f, { crop = [0, 0, 1, 1], mirror = false, intensity = 1 } = {}) {
    const { gl, u, canvas } = this;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4fv(u.u_crop, crop);
    gl.uniform1f(u.u_mirror, mirror ? 1 : 0);
    gl.uniform1f(u.u_intensity, f.id === 'original' ? 0 : intensity);
    gl.uniform1f(u.u_brightness, f.brightness);
    gl.uniform1f(u.u_contrast, f.contrast);
    gl.uniform1f(u.u_saturation, f.saturation);
    gl.uniform1f(u.u_warmth, f.warmth);
    gl.uniform1f(u.u_tint, f.tint);
    gl.uniform1f(u.u_fade, f.fade);
    gl.uniform1f(u.u_vignette, f.vignette);
    gl.uniform1f(u.u_grain, f.grain);
    gl.uniform1f(u.u_mono, f.mono);
    gl.uniform1f(u.u_time, (performance.now() % 10000) / 1000);
    gl.uniform3fv(u.u_shadow, f.shadow);
    gl.uniform3fv(u.u_highlight, f.highlight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
