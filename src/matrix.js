/**
 * matrix.js — 4×4 column-major matrix math for WebGL (no dependencies)
 *
 * Matrices are stored as Float32Array(16) in column-major order,
 * matching WebGL's gl.uniformMatrix4fv() expectations.
 *
 * Column-major layout:
 *   [ m0  m4  m8  m12 ]
 *   [ m1  m5  m9  m13 ]
 *   [ m2  m6  m10 m14 ]
 *   [ m3  m7  m11 m15 ]
 */

/** Return a new 4×4 identity matrix. */
export function identity() {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

/**
 * Multiply two 4×4 column-major matrices: result = a * b
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {Float32Array}
 */
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/**
 * Return a copy of m translated by (x, y, z).
 * @param {Float32Array} m
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Float32Array}
 */
export function translate(m, x, y, z) {
  const t = identity();
  t[12] = x; t[13] = y; t[14] = z;
  return multiply(m, t);
}

/**
 * Return a copy of m scaled by (x, y, z).
 */
export function scale(m, x, y, z) {
  const s = identity();
  s[0] = x; s[5] = y; s[10] = z;
  return multiply(m, s);
}

/**
 * Rotate m by angleRadians around the axis (ax, ay, az).
 * The axis need not be normalised — it will be normalised internally.
 */
export function rotate(m, angleRadians, ax, ay, az) {
  const len = Math.sqrt(ax * ax + ay * ay + az * az);
  if (len < 1e-10) return m.slice();
  const x = ax / len, y = ay / len, z = az / len;
  const c = Math.cos(angleRadians);
  const s = Math.sin(angleRadians);
  const t = 1 - c;

  const r = new Float32Array(16);
  r[0]  = t*x*x + c;     r[4]  = t*x*y - s*z;  r[8]  = t*x*z + s*y;  r[12] = 0;
  r[1]  = t*x*y + s*z;   r[5]  = t*y*y + c;     r[9]  = t*y*z - s*x;  r[13] = 0;
  r[2]  = t*x*z - s*y;   r[6]  = t*y*z + s*x;   r[10] = t*z*z + c;    r[14] = 0;
  r[3]  = 0;              r[7]  = 0;              r[11] = 0;            r[15] = 1;
  return multiply(m, r);
}

/** Rotate m by rad around the X axis. */
export function rotateX(m, rad) { return rotate(m, rad, 1, 0, 0); }
/** Rotate m by rad around the Y axis. */
export function rotateY(m, rad) { return rotate(m, rad, 0, 1, 0); }
/** Rotate m by rad around the Z axis. */
export function rotateZ(m, rad) { return rotate(m, rad, 0, 0, 1); }

/**
 * Build a perspective projection matrix.
 * @param {number} fovY  vertical field of view in radians
 * @param {number} aspect  width / height
 * @param {number} near  near clip plane (positive)
 * @param {number} far   far clip plane (positive)
 */
export function perspective(fovY, aspect, near, far) {
  const f = 1.0 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0]  = f / aspect;
  m[5]  = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

/**
 * Build a lookAt view matrix.
 * @param {number[]} eye    camera position [x, y, z]
 * @param {number[]} center look-at target  [x, y, z]
 * @param {number[]} up     world up vector [x, y, z]
 */
export function lookAt(eye, center, up) {
  const zx = eye[0] - center[0];
  const zy = eye[1] - center[1];
  const zz = eye[2] - center[2];
  const zl = Math.sqrt(zx*zx + zy*zy + zz*zz);
  const fx = zx/zl, fy = zy/zl, fz = zz/zl; // forward (z-axis of camera)

  // right = up × forward
  const rx = up[1]*fz - up[2]*fy;
  const ry = up[2]*fx - up[0]*fz;
  const rz = up[0]*fy - up[1]*fx;
  const rl = Math.sqrt(rx*rx + ry*ry + rz*rz);
  const sx = rx/rl, sy = ry/rl, sz = rz/rl;

  // recomputed up = forward × right
  const ux = fy*sz - fz*sy;
  const uy = fz*sx - fx*sz;
  const uz = fx*sy - fy*sx;

  const m = new Float32Array(16);
  m[0] =  sx; m[4] =  sy; m[8]  =  sz; m[12] = -(sx*eye[0] + sy*eye[1] + sz*eye[2]);
  m[1] =  ux; m[5] =  uy; m[9]  =  uz; m[13] = -(ux*eye[0] + uy*eye[1] + uz*eye[2]);
  m[2] =  fx; m[6] =  fy; m[10] =  fz; m[14] = -(fx*eye[0] + fy*eye[1] + fz*eye[2]);
  m[3] =  0;  m[7] =  0;  m[11] =  0;  m[15] = 1;
  return m;
}

/**
 * Invert a 4×4 matrix (general case via cofactors).
 * Returns a new matrix, or throws if the matrix is singular.
 */
export function invert(m) {
  const [
    a00, a01, a02, a03,
    a10, a11, a12, a13,
    a20, a21, a22, a23,
    a30, a31, a32, a33
  ] = [
    m[0], m[1], m[2], m[3],
    m[4], m[5], m[6], m[7],
    m[8], m[9], m[10], m[11],
    m[12], m[13], m[14], m[15]
  ];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-15) throw new Error('Matrix is singular and cannot be inverted');
  const invDet = 1 / det;

  const out = new Float32Array(16);
  out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
  out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * invDet;
  out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
  out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * invDet;
  out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * invDet;
  out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
  out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * invDet;
  out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
  out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
  out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * invDet;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * invDet;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * invDet;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * invDet;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
  return out;
}

// ── Vector helpers ──────────────────────────────────────────────────────────

/**
 * Normalise a 3-element vector [x,y,z] (returns Array, not Float32Array).
 */
export function normalize(v) {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0]/len, v[1]/len, v[2]/len];
}

/**
 * Cross product of two 3-element vectors.
 */
export function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}

/**
 * Dot product of two 3-element vectors.
 */
export function dot(a, b) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}
