/**
 * cube.js — Cube geometry for WebGL
 *
 * The unit cube spans [-0.5, 0.5] on each axis.
 * Each face has 4 unique vertices (so per-face normals are clean),
 * giving 24 vertices and 36 indices (6 faces × 2 triangles × 3 indices).
 *
 * Layout: column-major arrays ready to pass to gl.bufferData().
 */

// prettier-ignore
/** 24 vertices × 3 floats (x, y, z).  One quad per face. */
export const CUBE_VERTICES = new Float32Array([
  // +Z face (front)
  -0.5, -0.5,  0.5,
   0.5, -0.5,  0.5,
   0.5,  0.5,  0.5,
  -0.5,  0.5,  0.5,
  // -Z face (back)
   0.5, -0.5, -0.5,
  -0.5, -0.5, -0.5,
  -0.5,  0.5, -0.5,
   0.5,  0.5, -0.5,
  // +Y face (top)
  -0.5,  0.5,  0.5,
   0.5,  0.5,  0.5,
   0.5,  0.5, -0.5,
  -0.5,  0.5, -0.5,
  // -Y face (bottom)
  -0.5, -0.5, -0.5,
   0.5, -0.5, -0.5,
   0.5, -0.5,  0.5,
  -0.5, -0.5,  0.5,
  // +X face (right)
   0.5, -0.5,  0.5,
   0.5, -0.5, -0.5,
   0.5,  0.5, -0.5,
   0.5,  0.5,  0.5,
  // -X face (left)
  -0.5, -0.5, -0.5,
  -0.5, -0.5,  0.5,
  -0.5,  0.5,  0.5,
  -0.5,  0.5, -0.5,
]);

// prettier-ignore
/** 36 indices for 12 triangles (2 per face). */
export const CUBE_INDICES = new Uint16Array([
   0,  1,  2,   0,  2,  3,  // front
   4,  5,  6,   4,  6,  7,  // back
   8,  9, 10,   8, 10, 11,  // top
  12, 13, 14,  12, 14, 15,  // bottom
  16, 17, 18,  16, 18, 19,  // right
  20, 21, 22,  20, 22, 23,  // left
]);

/**
 * 6 distinct face colors (RGBA, 0-1).
 * Order matches the face order in CUBE_VERTICES / CUBE_INDICES.
 */
export const CUBE_FACE_COLORS = [
  [1.00, 0.27, 0.27, 1.0], // front  — red
  [0.27, 0.63, 1.00, 1.0], // back   — blue
  [0.35, 0.86, 0.45, 1.0], // top    — green
  [1.00, 0.85, 0.20, 1.0], // bottom — yellow
  [1.00, 0.55, 0.10, 1.0], // right  — orange
  [0.72, 0.35, 1.00, 1.0], // left   — purple
];

/**
 * Per-vertex color array — each of the 4 vertices per face shares the face color.
 * Float32Array of 24 × 3 (RGB only; alpha handled in shader).
 */
export const CUBE_COLORS = (() => {
  const data = new Float32Array(24 * 3);
  for (let face = 0; face < 6; face++) {
    const [r, g, b] = CUBE_FACE_COLORS[face];
    for (let v = 0; v < 4; v++) {
      const i = (face * 4 + v) * 3;
      data[i]   = r;
      data[i+1] = g;
      data[i+2] = b;
    }
  }
  return data;
})();

// ── Wireframe indices ──────────────────────────────────────────────────────
// 12 edges of a cube — each edge shared between two faces is listed once.
// We reference the same 24 vertex array as above (front/back/top/bottom faces
// provide the 8 unique corners, just with per-face vertex offsets):
//   front: 0,1,2,3    back: 4,5,6,7
//   top: 8,9,10,11    bottom: 12,13,14,15
//   right: 16,17,18,19  left: 20,21,22,23
//
// For wireframe we draw GL_LINES; each pair is one edge.

// prettier-ignore
export const CUBE_WIREFRAME_INDICES = new Uint16Array([
  // front face loop
  0, 1,  1, 2,  2, 3,  3, 0,
  // back face loop
  4, 5,  5, 6,  6, 7,  7, 4,
  // connecting edges (top/bottom cross-face)
  0, 5,  // front-bottom-left  ↔ back-bottom-right
  1, 4,  // front-bottom-right ↔ back-bottom-left
  2, 7,  // front-top-right    ↔ back-top-left
  3, 6,  // front-top-left     ↔ back-top-right
]);
