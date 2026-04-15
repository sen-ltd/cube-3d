# cube-3d — Educational WebGL 3D Cube

A minimal WebGL 3D cube demo built with **zero dependencies** and no build step.
All matrix math is hand-written in pure JavaScript (ES modules), making this an
ideal reference for learning how 3D rendering pipelines actually work.

**Live demo**: https://sen.ltd/portfolio/cube-3d/

## Features

- Rotating 3D cube with 6 colored faces
- Vertex + fragment shaders written in GLSL (visible in the UI panel)
- Manual 4×4 matrix math — no gl-matrix library
  - Model / View / Projection matrices shown live as the cube rotates
- Interactive controls
  - Mouse drag to rotate, scroll to zoom, touch support
  - Auto-rotate toggle
  - Wireframe overlay toggle
- Color modes: solid per-face colors, gradient (XYZ → RGB), wireframe-only
- FOV and camera-distance sliders
- Collapsible shader-source panel
- Japanese / English UI toggle

## Getting started

No build step needed — just serve the directory over HTTP (required for ES modules):

```bash
npm run serve
# then open http://localhost:8080
```

## Project structure

```
cube-3d/
├── index.html        # Single-page app shell
├── style.css         # Dark-theme layout
├── src/
│   ├── main.js       # WebGL setup, render loop, event handlers
│   ├── matrix.js     # 4×4 column-major matrix math
│   ├── cube.js       # Cube geometry (vertices, indices, colors)
│   └── i18n.js       # ja/en translation strings
├── tests/
│   └── matrix.test.js  # 15+ unit tests for matrix.js
└── assets/           # Screenshots / demo assets
```

## Matrix math

All matrices are `Float32Array(16)` in **column-major** order, matching
WebGL's `gl.uniformMatrix4fv()` convention.

```
Column-major layout:
  [ m0  m4  m8  m12 ]
  [ m1  m5  m9  m13 ]
  [ m2  m6  m10 m14 ]
  [ m3  m7  m11 m15 ]
```

Exported functions: `identity`, `multiply`, `translate`, `rotate`,
`rotateX/Y/Z`, `scale`, `perspective`, `lookAt`, `invert`,
`normalize`, `cross`, `dot`.

## Shaders

**Vertex shader** — transforms each vertex through M × V × P:

```glsl
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
```

**Fragment shader** — passes interpolated color straight through:

```glsl
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
```

## Running tests

```bash
npm test
```

Uses Node.js built-in test runner (`node --test`) — no extra packages required.

## License

MIT — Copyright (c) 2026 SEN LLC (SEN 合同会社)

<!-- sen-publish:links -->
## Links

- 🌐 Demo: https://sen.ltd/portfolio/cube-3d/
- 📝 dev.to: https://dev.to/sendotltd/a-webgl-3d-cube-from-first-principles-handwritten-4x4-matrices-and-visible-shaders-3cml
<!-- /sen-publish:links -->
