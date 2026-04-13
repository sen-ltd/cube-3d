/**
 * i18n.js — Japanese / English UI strings
 */

export const TRANSLATIONS = {
  ja: {
    title: '3D キューブ — WebGL 教育デモ',
    controls: 'コントロール',
    autoRotate: '自動回転',
    wireframe: 'ワイヤーフレーム',
    colorMode: '色モード',
    colorModeSolid: 'ソリッド',
    colorModeGradient: 'グラデーション',
    colorModeWireframeOnly: 'ワイヤーのみ',
    matrices: '行列 (リアルタイム)',
    matrixModel: 'モデル行列 (M)',
    matrixView: 'ビュー行列 (V)',
    matrixProjection: '投影行列 (P)',
    shaderSource: 'シェーダーソース',
    vertexShader: '頂点シェーダー (GLSL)',
    fragmentShader: 'フラグメントシェーダー (GLSL)',
    resetRotation: '回転リセット',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
    dragHint: 'マウスドラッグで回転 / スクロールでズーム',
    langToggle: 'EN',
    fov: '視野角 (FOV)',
    cameraDistance: 'カメラ距離',
    fps: 'FPS',
  },
  en: {
    title: '3D Cube — WebGL Educational Demo',
    controls: 'Controls',
    autoRotate: 'Auto Rotate',
    wireframe: 'Wireframe',
    colorMode: 'Color Mode',
    colorModeSolid: 'Solid',
    colorModeGradient: 'Gradient',
    colorModeWireframeOnly: 'Wireframe only',
    matrices: 'Matrices (live)',
    matrixModel: 'Model Matrix (M)',
    matrixView: 'View Matrix (V)',
    matrixProjection: 'Projection Matrix (P)',
    shaderSource: 'Shader Source',
    vertexShader: 'Vertex Shader (GLSL)',
    fragmentShader: 'Fragment Shader (GLSL)',
    resetRotation: 'Reset Rotation',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    dragHint: 'Drag to rotate · Scroll to zoom',
    langToggle: 'JA',
    fov: 'Field of View (FOV)',
    cameraDistance: 'Camera Distance',
    fps: 'FPS',
  },
};

/** Current locale — 'ja' | 'en' */
let currentLocale = 'en';

/** Get a translated string by key. */
export function t(key) {
  return TRANSLATIONS[currentLocale][key] ?? key;
}

/** Toggle between ja and en, return new locale. */
export function toggleLocale() {
  currentLocale = currentLocale === 'ja' ? 'en' : 'ja';
  return currentLocale;
}

/** Get current locale. */
export function getLocale() {
  return currentLocale;
}
