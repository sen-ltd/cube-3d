/**
 * main.js — WebGL setup, render loop, and UI wiring
 *
 * Architecture:
 *   - WebGL 1.0  (maximum browser compatibility, educational simplicity)
 *   - No external libraries: matrix math in matrix.js, geometry in cube.js
 *   - Two rendering modes: solid triangles (TRIANGLES) and wireframe (LINES)
 *   - Three color modes: solid per-face, gradient, wireframe-only
 */

import {
  identity, multiply, translate, rotate, rotateX, rotateY, scale,
  perspective, lookAt,
} from './matrix.js';
import {
  CUBE_VERTICES, CUBE_INDICES, CUBE_COLORS,
  CUBE_FACE_COLORS, CUBE_WIREFRAME_INDICES,
} from './cube.js';
import { t, toggleLocale, getLocale, TRANSLATIONS } from './i18n.js';

// ── Shader source (inline — also shown in the UI panel) ───────────────────

const VERTEX_SHADER_SRC = `
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vColor;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  vColor = aColor;
}
`.trim();

const FRAGMENT_SHADER_SRC = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`.trim();

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  rotX: 0.3,
  rotY: 0.5,
  autoRotate: true,
  wireframe: false,
  colorMode: 'solid', // 'solid' | 'gradient' | 'wireframe-only'
  fov: Math.PI / 4,
  cameraDistance: 3.0,
  drag: { active: false, lastX: 0, lastY: 0 },
  frameCount: 0,
  lastFpsTime: performance.now(),
  fps: 0,
};

// ── WebGL helpers ──────────────────────────────────────────────────────────

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function createBuffer(gl, data, usage = gl.STATIC_DRAW) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buf;
}

function createIndexBuffer(gl, data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

// ── Gradient color generation ─────────────────────────────────────────────

function buildGradientColors() {
  const data = new Float32Array(24 * 3);
  for (let i = 0; i < 24; i++) {
    const x = CUBE_VERTICES[i * 3]     + 0.5; // 0..1
    const y = CUBE_VERTICES[i * 3 + 1] + 0.5;
    const z = CUBE_VERTICES[i * 3 + 2] + 0.5;
    data[i * 3]     = x;
    data[i * 3 + 1] = y;
    data[i * 3 + 2] = z;
  }
  return data;
}

function buildWireframeOnlyColors() {
  const data = new Float32Array(24 * 3);
  for (let i = 0; i < 24 * 3; i++) data[i] = 0.9;
  return data;
}

// ── Matrix display helpers ─────────────────────────────────────────────────

function matrixToTable(m) {
  // column-major → display as 4×4 row-major table
  let html = '<table class="mat-table">';
  for (let row = 0; row < 4; row++) {
    html += '<tr>';
    for (let col = 0; col < 4; col++) {
      const val = m[col * 4 + row].toFixed(3);
      html += `<td>${val}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

// ── UI update ─────────────────────────────────────────────────────────────

function updateMatrixDisplay(modelMat, viewMat, projMat) {
  const modelEl = document.getElementById('matrix-model');
  const viewEl  = document.getElementById('matrix-view');
  const projEl  = document.getElementById('matrix-proj');
  if (modelEl) modelEl.innerHTML = matrixToTable(modelMat);
  if (viewEl)  viewEl.innerHTML  = matrixToTable(viewMat);
  if (projEl)  projEl.innerHTML  = matrixToTable(projMat);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.title = t('title');
  const langBtn = document.getElementById('btn-lang');
  if (langBtn) langBtn.textContent = t('langToggle');
}

function updateFpsDisplay() {
  const el = document.getElementById('fps-value');
  if (el) el.textContent = state.fps;
}

// ── Main init ─────────────────────────────────────────────────────────────

function init() {
  const canvas = document.getElementById('glcanvas');
  if (!canvas) { console.error('Canvas not found'); return; }

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.getElementById('webgl-error')?.classList.remove('hidden');
    canvas.classList.add('hidden');
    return;
  }

  // Resize canvas to its CSS display size
  function resizeCanvas() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ── Compile shaders ──────────────────────────────────────────────────
  const prog = createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
  const locs = {
    aPosition:   gl.getAttribLocation(prog,  'aPosition'),
    aColor:      gl.getAttribLocation(prog,  'aColor'),
    uProjection: gl.getUniformLocation(prog, 'uProjection'),
    uView:       gl.getUniformLocation(prog, 'uView'),
    uModel:      gl.getUniformLocation(prog, 'uModel'),
  };

  // ── Vertex / index buffers ───────────────────────────────────────────
  const posBuffer   = createBuffer(gl, CUBE_VERTICES);
  const solidIdx    = createIndexBuffer(gl, CUBE_INDICES);
  const wireIdx     = createIndexBuffer(gl, CUBE_WIREFRAME_INDICES);

  // Mutable color buffer — rebuilt on color-mode change
  const colorBuffer = gl.createBuffer();
  let currentColorData = CUBE_COLORS;

  function uploadColorBuffer(data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    currentColorData = data;
  }
  uploadColorBuffer(CUBE_COLORS);

  // ── Populate shader source panel ────────────────────────────────────
  const vsEl = document.getElementById('shader-vertex');
  const fsEl = document.getElementById('shader-fragment');
  if (vsEl) vsEl.textContent = VERTEX_SHADER_SRC;
  if (fsEl) fsEl.textContent = FRAGMENT_SHADER_SRC;

  // ── Render loop ──────────────────────────────────────────────────────
  let lastTime = performance.now();

  function render(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // FPS counter
    state.frameCount++;
    if (now - state.lastFpsTime >= 500) {
      state.fps = Math.round(state.frameCount / ((now - state.lastFpsTime) / 1000));
      state.frameCount = 0;
      state.lastFpsTime = now;
      updateFpsDisplay();
    }

    if (state.autoRotate) {
      state.rotY += dt * 0.6;
      state.rotX += dt * 0.3;
    }

    const aspect = canvas.width / canvas.height;
    const projMat  = perspective(state.fov, aspect, 0.1, 100);
    const viewMat  = lookAt([0, 0, state.cameraDistance], [0, 0, 0], [0, 1, 0]);
    let   modelMat = identity();
    modelMat = rotateX(modelMat, state.rotX);
    modelMat = rotateY(modelMat, state.rotY);

    gl.clearColor(0.07, 0.08, 0.10, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(prog);
    gl.uniformMatrix4fv(locs.uProjection, false, projMat);
    gl.uniformMatrix4fv(locs.uView,       false, viewMat);
    gl.uniformMatrix4fv(locs.uModel,      false, modelMat);

    // Bind position
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.enableVertexAttribArray(locs.aPosition);
    gl.vertexAttribPointer(locs.aPosition, 3, gl.FLOAT, false, 0, 0);

    // Bind color
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(locs.aColor);
    gl.vertexAttribPointer(locs.aColor, 3, gl.FLOAT, false, 0, 0);

    if (state.colorMode === 'wireframe-only') {
      // Only draw wireframe edges
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdx);
      gl.drawElements(gl.LINES, CUBE_WIREFRAME_INDICES.length, gl.UNSIGNED_SHORT, 0);
    } else {
      // Draw solid faces
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, solidIdx);
      gl.drawElements(gl.TRIANGLES, CUBE_INDICES.length, gl.UNSIGNED_SHORT, 0);

      // Optionally overlay wireframe
      if (state.wireframe) {
        // Slightly shift wireframe to avoid z-fighting
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1, -1);
        const wModelMat = scale(modelMat, 1.002, 1.002, 1.002);
        gl.uniformMatrix4fv(locs.uModel, false, wModelMat);

        // White wireframe
        const wColors = new Float32Array(24 * 3).fill(1.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, wColors, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(locs.aColor, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdx);
        gl.drawElements(gl.LINES, CUBE_WIREFRAME_INDICES.length, gl.UNSIGNED_SHORT, 0);

        // Restore color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, currentColorData, gl.DYNAMIC_DRAW);
        gl.uniformMatrix4fv(locs.uModel, false, modelMat);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
    }

    updateMatrixDisplay(modelMat, viewMat, projMat);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // ── Mouse drag ───────────────────────────────────────────────────────
  canvas.addEventListener('mousedown', e => {
    state.drag.active = true;
    state.drag.lastX  = e.clientX;
    state.drag.lastY  = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!state.drag.active) return;
    const dx = e.clientX - state.drag.lastX;
    const dy = e.clientY - state.drag.lastY;
    state.rotY += dx * 0.01;
    state.rotX += dy * 0.01;
    state.drag.lastX = e.clientX;
    state.drag.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { state.drag.active = false; });

  // Touch drag
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t0 = e.touches[0];
    state.drag.active = true;
    state.drag.lastX  = t0.clientX;
    state.drag.lastY  = t0.clientY;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!state.drag.active) return;
    const t0 = e.touches[0];
    const dx = t0.clientX - state.drag.lastX;
    const dy = t0.clientY - state.drag.lastY;
    state.rotY += dx * 0.01;
    state.rotX += dy * 0.01;
    state.drag.lastX = t0.clientX;
    state.drag.lastY = t0.clientY;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { state.drag.active = false; });

  // Scroll to zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    state.cameraDistance = Math.max(1.2, Math.min(8, state.cameraDistance + e.deltaY * 0.005));
    updateSliders();
  }, { passive: false });

  // ── Control panel wiring ─────────────────────────────────────────────

  function updateSliders() {
    const fovSlider  = document.getElementById('fov-slider');
    const camSlider  = document.getElementById('cam-slider');
    const fovVal     = document.getElementById('fov-value');
    const camVal     = document.getElementById('cam-value');
    if (fovSlider) fovSlider.value = (state.fov * 180 / Math.PI).toFixed(0);
    if (camSlider) camSlider.value = state.cameraDistance.toFixed(1);
    if (fovVal)    fovVal.textContent = (state.fov * 180 / Math.PI).toFixed(0) + '°';
    if (camVal)    camVal.textContent = state.cameraDistance.toFixed(1);
  }
  updateSliders();

  document.getElementById('btn-auto-rotate')?.addEventListener('click', () => {
    state.autoRotate = !state.autoRotate;
    const btn = document.getElementById('btn-auto-rotate');
    btn.classList.toggle('active', state.autoRotate);
  });
  // initialise active class
  document.getElementById('btn-auto-rotate')?.classList.toggle('active', state.autoRotate);

  document.getElementById('btn-wireframe')?.addEventListener('click', () => {
    state.wireframe = !state.wireframe;
    document.getElementById('btn-wireframe')?.classList.toggle('active', state.wireframe);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    state.rotX = 0.3;
    state.rotY = 0.5;
  });

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    state.cameraDistance = Math.max(1.2, state.cameraDistance - 0.3);
    updateSliders();
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    state.cameraDistance = Math.min(8, state.cameraDistance + 0.3);
    updateSliders();
  });

  document.getElementById('color-mode')?.addEventListener('change', e => {
    state.colorMode = e.target.value;
    if (state.colorMode === 'gradient') {
      uploadColorBuffer(buildGradientColors());
    } else if (state.colorMode === 'wireframe-only') {
      uploadColorBuffer(buildWireframeOnlyColors());
    } else {
      uploadColorBuffer(CUBE_COLORS);
    }
  });

  document.getElementById('fov-slider')?.addEventListener('input', e => {
    state.fov = Number(e.target.value) * Math.PI / 180;
    document.getElementById('fov-value').textContent = e.target.value + '°';
  });

  document.getElementById('cam-slider')?.addEventListener('input', e => {
    state.cameraDistance = Number(e.target.value);
    document.getElementById('cam-value').textContent = Number(e.target.value).toFixed(1);
  });

  // Shader panel toggle
  document.getElementById('btn-shader-toggle')?.addEventListener('click', () => {
    const panel = document.getElementById('shader-panel');
    panel?.classList.toggle('hidden');
    document.getElementById('btn-shader-toggle').textContent =
      panel?.classList.contains('hidden') ? t('shaderSource') + ' ▶' : t('shaderSource') + ' ▼';
  });

  // Matrix panel toggle
  document.getElementById('btn-matrix-toggle')?.addEventListener('click', () => {
    const panel = document.getElementById('matrix-panel');
    panel?.classList.toggle('hidden');
    document.getElementById('btn-matrix-toggle').textContent =
      panel?.classList.contains('hidden') ? t('matrices') + ' ▶' : t('matrices') + ' ▼';
  });

  // Language toggle
  document.getElementById('btn-lang')?.addEventListener('click', () => {
    toggleLocale();
    applyTranslations();
  });

  applyTranslations();
}

document.addEventListener('DOMContentLoaded', init);
