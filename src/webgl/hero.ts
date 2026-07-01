/**
 * Sluice hero — a WebGL "sluice gate".
 *
 * Streams of data particles flow left → right. Sensitive tokens (amber → red)
 * are caught and dissolved at a glowing filter gate — redacted before egress —
 * while clean data (teal → emerald) funnels through and flows on.
 *
 * All per-particle motion is computed on the GPU in the vertex shader, so the
 * scene holds 60fps with thousands of points. Interactive mouse parallax,
 * DPR-capped, pauses off-screen, and respects prefers-reduced-motion.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Clock,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";

interface HeroOptions {
  reducedMotion: boolean;
}

const PARTICLE_COUNT = 4200;
const RANGE = 7.0; // half-width of the flow domain in world units
const GATE_X = -0.2; // where the filter gate sits

const particleVert = /* glsl */ `
  uniform float uTime;
  uniform float uGateX;
  uniform float uRange;
  uniform vec2  uMouse;
  uniform float uPixelRatio;

  attribute float aSeed;
  attribute float aLane;
  attribute float aSpeed;
  attribute float aSensitive;
  attribute float aPhase;
  attribute float aSize;

  varying float vSensitive;
  varying float vProgress;
  varying float vCaught;
  varying float vAlpha;

  void main() {
    float p = fract(aPhase + uTime * aSpeed * 0.05);
    float x = mix(-uRange, uRange, p);

    // gentle vertical flow wave
    float wave = sin(uTime * 0.6 + aSeed * 6.2831 + x * 0.45) * 0.22;
    float y = aLane + wave;

    // funnel: squeeze the streams toward the gate line as they approach it
    float approach = smoothstep(-uRange, uGateX, x);
    if (x < uGateX) y *= mix(1.0, 0.6, approach);

    float z = (aSeed - 0.5) * 4.0;

    float caught = 0.0;
    if (aSensitive > 0.5 && x > uGateX) {
      // caught at the gate: clamp forward motion, shimmer, then dissolve
      caught = 1.0;
      float jx = sin(uTime * 3.0 + aSeed * 20.0) * 0.13;
      float jy = cos(uTime * 2.4 + aSeed * 33.0) * 0.55;
      x = uGateX + jx;
      y = aLane * 0.55 + jy;
    }

    vProgress = p;
    vSensitive = aSensitive;
    vCaught = caught;

    float fadeIn = smoothstep(-uRange, -uRange + 1.5, x);
    float fadeOut = 1.0 - smoothstep(uRange - 1.8, uRange, x);
    float a = fadeIn * fadeOut;

    if (caught > 0.5) {
      float pg = (uGateX + uRange) / (2.0 * uRange);
      float dwell = clamp(p - pg, 0.0, 1.0);
      a = fadeIn * (1.0 - smoothstep(0.0, 0.22, dwell));
      a *= 0.55 + 0.45 * sin(uTime * 5.0 + aSeed * 10.0);
    }
    vAlpha = a;

    vec3 pos = vec3(x, y, z);
    pos.x += uMouse.x * (0.6 + z * 0.12);
    pos.y += uMouse.y * (0.4 + z * 0.10);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z) * (0.55 + 0.6 * a);
  }
`;

const particleFrag = /* glsl */ `
  precision mediump float;

  varying float vSensitive;
  varying float vProgress;
  varying float vCaught;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.6);

    vec3 teal    = vec3(0.176, 0.831, 0.749);
    vec3 emerald = vec3(0.063, 0.725, 0.506);
    vec3 amber   = vec3(0.961, 0.620, 0.043);
    vec3 red     = vec3(0.937, 0.267, 0.267);

    vec3 col;
    if (vSensitive > 0.5) {
      col = mix(amber, red, smoothstep(0.34, 0.5, vProgress));
      if (vCaught > 0.5) col = red;
    } else {
      col = mix(teal, emerald, vProgress);
    }

    gl_FragColor = vec4(col * (0.72 + glow * 0.7), glow * vAlpha * 0.78);
  }
`;

const gateVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gateFrag = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // vUv.x across width, vUv.y along height
    float width = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float ends  = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    float scan  = 0.5 + 0.5 * sin(vUv.y * 34.0 - uTime * 3.0);
    vec3 teal = vec3(0.176, 0.831, 0.749);
    float a = width * ends * (0.22 + 0.55 * scan);
    gl_FragColor = vec4(teal * (0.8 + scan * 0.7), a * 0.85);
  }
`;

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function initHero(
  canvas: HTMLCanvasElement,
  { reducedMotion }: HeroOptions
): boolean {
  if (!supportsWebGL()) return false;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return false;
  }

  const parent = canvas.parentElement ?? document.body;
  const getSize = () => ({
    w: parent.clientWidth || window.innerWidth,
    h: parent.clientHeight || window.innerHeight,
  });

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // ---- Particles ----
  const geo = new BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3); // placeholder; real pos is computed in shader
  const aSeed = new Float32Array(PARTICLE_COUNT);
  const aLane = new Float32Array(PARTICLE_COUNT);
  const aSpeed = new Float32Array(PARTICLE_COUNT);
  const aSensitive = new Float32Array(PARTICLE_COUNT);
  const aPhase = new Float32Array(PARTICLE_COUNT);
  const aSize = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    aSeed[i] = Math.random();
    aLane[i] = (Math.random() - 0.5) * 6.4;
    aSpeed[i] = 0.6 + Math.random() * 0.9;
    aSensitive[i] = Math.random() < 0.22 ? 1 : 0;
    aPhase[i] = Math.random();
    aSize[i] = 0.55 + Math.random() * 1.1;
  }

  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new Float32BufferAttribute(aSeed, 1));
  geo.setAttribute("aLane", new Float32BufferAttribute(aLane, 1));
  geo.setAttribute("aSpeed", new Float32BufferAttribute(aSpeed, 1));
  geo.setAttribute("aSensitive", new Float32BufferAttribute(aSensitive, 1));
  geo.setAttribute("aPhase", new Float32BufferAttribute(aPhase, 1));
  geo.setAttribute("aSize", new Float32BufferAttribute(aSize, 1));

  const particleMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGateX: { value: GATE_X },
      uRange: { value: RANGE },
      uMouse: { value: new Vector2(0, 0) },
      uPixelRatio: { value: dpr },
    },
    vertexShader: particleVert,
    fragmentShader: particleFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, particleMat);
  points.frustumCulled = false;
  scene.add(points);

  // ---- Gate ----
  const gateMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: gateVert,
    fragmentShader: gateFrag,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
  const gate = new Mesh(new PlaneGeometry(0.6, 8.2), gateMat);
  gate.position.set(GATE_X, 0, 0);
  scene.add(gate);

  // ---- Sizing ----
  function resize(): void {
    const { w, h } = getSize();
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(parent);

  // ---- Mouse parallax (damped) ----
  const target = new Vector2(0, 0);
  const current = new Vector2(0, 0);
  window.addEventListener(
    "pointermove",
    (e) => {
      target.set(
        (e.clientX / window.innerWidth - 0.5) * 2,
        -(e.clientY / window.innerHeight - 0.5) * 2
      );
    },
    { passive: true }
  );

  const clock = new Clock();

  function renderFrame(): void {
    current.lerp(target, 0.05);
    particleMat.uniforms.uMouse.value.copy(current);
    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    // Static, on-message frame — no animation loop.
    particleMat.uniforms.uTime.value = 6.0;
    gateMat.uniforms.uTime.value = 6.0;
    renderFrame();
    return true;
  }

  let raf = 0;
  function loop(): void {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    particleMat.uniforms.uTime.value = t;
    gateMat.uniforms.uTime.value = t;
    renderFrame();
  }
  loop();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) clock.start();
  });

  // Clean up if the canvas is ever removed.
  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
  });

  return true;
}
