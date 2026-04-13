/**
 * matrix.test.js — Unit tests for matrix.js
 * Run with: node --test tests/matrix.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  identity, multiply, translate, rotate, rotateX, rotateY, rotateZ,
  scale, perspective, lookAt, invert, normalize, cross, dot,
} from '../src/matrix.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const EPS = 1e-5;

function approxEq(a, b, eps = EPS) {
  return Math.abs(a - b) < eps;
}

function matApproxEq(m, n, eps = EPS) {
  for (let i = 0; i < 16; i++) {
    if (!approxEq(m[i], n[i], eps)) return false;
  }
  return true;
}

/** Transform the 3-vector [x,y,z] by a 4×4 column-major matrix (w=1). */
function transformPoint(m, x, y, z) {
  const w = m[3]*x + m[7]*y + m[11]*z + m[15];
  return [
    (m[0]*x + m[4]*y + m[8]*z  + m[12]) / w,
    (m[1]*x + m[5]*y + m[9]*z  + m[13]) / w,
    (m[2]*x + m[6]*y + m[10]*z + m[14]) / w,
  ];
}

// ── identity() ────────────────────────────────────────────────────────────

describe('identity()', () => {
  it('returns a Float32Array of length 16', () => {
    const m = identity();
    assert.ok(m instanceof Float32Array);
    assert.strictEqual(m.length, 16);
  });

  it('has 1s on diagonal and 0s elsewhere', () => {
    const m = identity();
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        const expected = col === row ? 1 : 0;
        assert.ok(approxEq(m[col * 4 + row], expected),
          `m[${col},${row}] expected ${expected} got ${m[col * 4 + row]}`);
      }
    }
  });
});

// ── multiply() ────────────────────────────────────────────────────────────

describe('multiply()', () => {
  it('identity * identity = identity', () => {
    const i = identity();
    const r = multiply(i, i);
    assert.ok(matApproxEq(r, i));
  });

  it('identity * M = M', () => {
    const i = identity();
    const m = translate(identity(), 1, 2, 3);
    assert.ok(matApproxEq(multiply(i, m), m));
  });

  it('M * identity = M', () => {
    const i = identity();
    const m = translate(identity(), 4, -1, 2);
    assert.ok(matApproxEq(multiply(m, i), m));
  });

  it('is not commutative in general', () => {
    const a = translate(identity(), 1, 0, 0);
    const b = rotateY(identity(), 0.5);
    const ab = multiply(a, b);
    const ba = multiply(b, a);
    assert.ok(!matApproxEq(ab, ba), 'translate * rotateY should differ from rotateY * translate');
  });
});

// ── translate() ───────────────────────────────────────────────────────────

describe('translate()', () => {
  it('translates the origin to the translation vector', () => {
    const m = translate(identity(), 3, -2, 5);
    const p = transformPoint(m, 0, 0, 0);
    assert.ok(approxEq(p[0], 3));
    assert.ok(approxEq(p[1], -2));
    assert.ok(approxEq(p[2], 5));
  });

  it('translates a non-origin point correctly', () => {
    const m = translate(identity(), 1, 2, 3);
    const p = transformPoint(m, 1, 1, 1);
    assert.ok(approxEq(p[0], 2));
    assert.ok(approxEq(p[1], 3));
    assert.ok(approxEq(p[2], 4));
  });
});

// ── rotateX() ─────────────────────────────────────────────────────────────

describe('rotateX()', () => {
  it('leaves the X axis fixed', () => {
    const m = rotateX(identity(), Math.PI / 2);
    const p = transformPoint(m, 1, 0, 0);
    assert.ok(approxEq(p[0], 1));
    assert.ok(approxEq(p[1], 0));
    assert.ok(approxEq(p[2], 0));
  });

  it('rotates (0,1,0) → (0,0,1) by 90°', () => {
    const m = rotateX(identity(), Math.PI / 2);
    const p = transformPoint(m, 0, 1, 0);
    assert.ok(approxEq(p[0], 0), `x: ${p[0]}`);
    assert.ok(approxEq(p[1], 0), `y: ${p[1]}`);
    assert.ok(approxEq(p[2], 1), `z: ${p[2]}`);
  });

  it('rotates by 180° correctly: (0,1,0) → (0,-1,0)', () => {
    const m = rotateX(identity(), Math.PI);
    const p = transformPoint(m, 0, 1, 0);
    assert.ok(approxEq(p[0], 0));
    assert.ok(approxEq(p[1], -1));
    assert.ok(approxEq(p[2], 0));
  });
});

// ── rotateY() ─────────────────────────────────────────────────────────────

describe('rotateY()', () => {
  it('rotates (1,0,0) → (0,0,-1) by 90°', () => {
    const m = rotateY(identity(), Math.PI / 2);
    const p = transformPoint(m, 1, 0, 0);
    assert.ok(approxEq(p[0], 0), `x: ${p[0]}`);
    assert.ok(approxEq(p[1], 0), `y: ${p[1]}`);
    assert.ok(approxEq(p[2], -1), `z: ${p[2]}`);
  });
});

// ── rotateZ() ─────────────────────────────────────────────────────────────

describe('rotateZ()', () => {
  it('rotates (1,0,0) → (0,1,0) by 90°', () => {
    const m = rotateZ(identity(), Math.PI / 2);
    const p = transformPoint(m, 1, 0, 0);
    assert.ok(approxEq(p[0], 0), `x: ${p[0]}`);
    assert.ok(approxEq(p[1], 1), `y: ${p[1]}`);
    assert.ok(approxEq(p[2], 0), `z: ${p[2]}`);
  });
});

// ── scale() ───────────────────────────────────────────────────────────────

describe('scale()', () => {
  it('scales a point correctly', () => {
    const m = scale(identity(), 2, 3, 4);
    const p = transformPoint(m, 1, 1, 1);
    assert.ok(approxEq(p[0], 2));
    assert.ok(approxEq(p[1], 3));
    assert.ok(approxEq(p[2], 4));
  });

  it('uniform scale 1 is identity', () => {
    const m = scale(identity(), 1, 1, 1);
    assert.ok(matApproxEq(m, identity()));
  });
});

// ── perspective() ─────────────────────────────────────────────────────────

describe('perspective()', () => {
  it('returns Float32Array(16)', () => {
    const m = perspective(Math.PI / 4, 1, 0.1, 100);
    assert.ok(m instanceof Float32Array);
    assert.strictEqual(m.length, 16);
  });

  it('m[15] is 0 (perspective divide marker)', () => {
    const m = perspective(Math.PI / 4, 1, 0.1, 100);
    assert.ok(approxEq(m[15], 0));
  });

  it('m[11] is -1 (sets w = -z convention)', () => {
    const m = perspective(Math.PI / 4, 1, 0.1, 100);
    assert.ok(approxEq(m[11], -1));
  });

  it('wider aspect → smaller x-scale', () => {
    const m1 = perspective(Math.PI / 4, 1.0, 0.1, 100);
    const m2 = perspective(Math.PI / 4, 2.0, 0.1, 100);
    assert.ok(m2[0] < m1[0], 'wider aspect should produce smaller x-scale');
  });
});

// ── lookAt() ──────────────────────────────────────────────────────────────

describe('lookAt()', () => {
  it('returns Float32Array(16)', () => {
    const m = lookAt([0, 0, 3], [0, 0, 0], [0, 1, 0]);
    assert.ok(m instanceof Float32Array);
    assert.strictEqual(m.length, 16);
  });

  it('bottom-right element is 1', () => {
    const m = lookAt([0, 0, 3], [0, 0, 0], [0, 1, 0]);
    assert.ok(approxEq(m[15], 1));
  });

  it('origin is mapped to roughly (0,0,-cameraDistance) in view space', () => {
    const m = lookAt([0, 0, 3], [0, 0, 0], [0, 1, 0]);
    const p = transformPoint(m, 0, 0, 0);
    assert.ok(approxEq(p[0], 0), `x: ${p[0]}`);
    assert.ok(approxEq(p[1], 0), `y: ${p[1]}`);
    assert.ok(approxEq(p[2], -3), `z: ${p[2]}`);
  });
});

// ── invert() ──────────────────────────────────────────────────────────────

describe('invert()', () => {
  it('M * inv(M) ≈ identity for a translation matrix', () => {
    const m = translate(identity(), 3, -1, 2);
    const inv = invert(m);
    const prod = multiply(m, inv);
    assert.ok(matApproxEq(prod, identity(), 1e-4));
  });

  it('M * inv(M) ≈ identity for a rotation matrix', () => {
    let m = rotateX(identity(), 0.7);
    m = rotateY(m, 1.2);
    const inv = invert(m);
    const prod = multiply(m, inv);
    assert.ok(matApproxEq(prod, identity(), 1e-4));
  });

  it('throws on singular matrix', () => {
    const singular = new Float32Array(16); // all zeros → singular
    assert.throws(() => invert(singular), /singular/i);
  });
});

// ── normalize() ───────────────────────────────────────────────────────────

describe('normalize()', () => {
  it('unit vector remains unit vector', () => {
    const v = normalize([1, 0, 0]);
    assert.ok(approxEq(v[0], 1));
    assert.ok(approxEq(v[1], 0));
    assert.ok(approxEq(v[2], 0));
  });

  it('normalises arbitrary vector to length 1', () => {
    const v = normalize([3, 4, 0]);
    const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
    assert.ok(approxEq(len, 1), `len=${len}`);
  });

  it('zero vector returns [0,0,0]', () => {
    const v = normalize([0, 0, 0]);
    assert.deepStrictEqual(v, [0, 0, 0]);
  });
});

// ── cross() ───────────────────────────────────────────────────────────────

describe('cross()', () => {
  it('X × Y = Z', () => {
    const c = cross([1, 0, 0], [0, 1, 0]);
    assert.ok(approxEq(c[0], 0));
    assert.ok(approxEq(c[1], 0));
    assert.ok(approxEq(c[2], 1));
  });

  it('Y × X = -Z', () => {
    const c = cross([0, 1, 0], [1, 0, 0]);
    assert.ok(approxEq(c[0], 0));
    assert.ok(approxEq(c[1], 0));
    assert.ok(approxEq(c[2], -1));
  });

  it('parallel vectors give zero vector', () => {
    const c = cross([1, 0, 0], [2, 0, 0]);
    assert.ok(approxEq(c[0], 0));
    assert.ok(approxEq(c[1], 0));
    assert.ok(approxEq(c[2], 0));
  });
});

// ── dot() ─────────────────────────────────────────────────────────────────

describe('dot()', () => {
  it('dot([1,0,0], [1,0,0]) = 1', () => {
    assert.ok(approxEq(dot([1, 0, 0], [1, 0, 0]), 1));
  });

  it('perpendicular vectors give 0', () => {
    assert.ok(approxEq(dot([1, 0, 0], [0, 1, 0]), 0));
  });

  it('computes correctly for arbitrary vectors', () => {
    assert.ok(approxEq(dot([1, 2, 3], [4, 5, 6]), 32));
  });
});
