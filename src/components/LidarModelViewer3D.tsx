import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { Reconstructed3DModel } from '../lib/lidarReconstruction';

export type ViewerRenderMode = 'rgb_pbr' | 'lidar_points' | 'depth_heatmap' | 'wireframe';

interface LidarModelViewer3DProps {
  model: Reconstructed3DModel;
}

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

function buildHeatmapColors(depthMapMm: Float32Array): Float32Array {
  let minD = Infinity;
  let maxD = -Infinity;
  for (let i = 0; i < depthMapMm.length; i++) {
    if (depthMapMm[i] < minD) minD = depthMapMm[i];
    if (depthMapMm[i] > maxD) maxD = depthMapMm[i];
  }
  const span = Math.max(6, maxD - minD);
  const out = new Float32Array(depthMapMm.length * 3);

  for (let i = 0; i < depthMapMm.length; i++) {
    const t = 1 - Math.min(1, Math.max(0, (depthMapMm[i] - minD) / span));
    let r = 0;
    let g = 0;
    let b = 0;
    if (t < 0.35) {
      const k = t / 0.35;
      r = 0.08 + k * 0.12;
      g = 0.16 + k * 0.38;
      b = 0.36 + k * 0.42;
    } else if (t < 0.72) {
      const k = (t - 0.35) / 0.37;
      r = 0.2 + k * 0.62;
      g = 0.54 + k * 0.22;
      b = 0.78 - k * 0.48;
    } else {
      const k = (t - 0.72) / 0.28;
      r = 0.82 + k * 0.16;
      g = 0.76 + k * 0.16;
      b = 0.3 + k * 0.25;
    }
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  return out;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(5, 12, 22, 0.55)');
  grad.addColorStop(0.55, 'rgba(5, 12, 22, 0.22)');
  grad.addColorStop(1, 'rgba(5, 12, 22, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LidarModelViewer3D({ model }: LidarModelViewer3DProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [renderMode, setRenderMode] = useState<ViewerRenderMode>('rgb_pbr');
  const [reliefScale, setReliefScale] = useState<number>(1.25);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);

  const apiRef = useRef<{
    updateModel: (m: Reconstructed3DModel) => void;
    updateAppearance: (mode: ViewerRenderMode, zScale: number) => void;
    flyToPreset: (preset: 'front' | 'angle45' | 'profile' | 'top_relief') => void;
  } | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = Math.max(280, container.clientWidth);
    const height = Math.max(320, container.clientHeight);

    const scene = new THREE.Scene();
    const bgHex = 0x0b1623;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.065);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 4.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio reflection environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // 3-point warm/cool clinical lighting rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.45);
    keyLight.position.set(2.6, 3.2, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-3.2, 1.6, -2.4);
    scene.add(rimLight);

    // Composite clinical scanner stage group (3+ distinct parts with varied roughness/metalness)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Part 1: Brushed metallic calibration ring frame around scan volume
    const outerRingGeo = new THREE.RingGeometry(1.92, 1.98, 72);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xc9944a,
      metalness: 0.85,
      roughness: 0.25,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.set(0, 0, -0.35);
    stageGroup.add(outerRing);

    // Part 2: Matte dark scanner reference backplate ring
    const innerBezelGeo = new THREE.RingGeometry(1.78, 1.91, 72);
    const innerBezelMat = new THREE.MeshStandardMaterial({
      color: 0x182b40,
      metalness: 0.25,
      roughness: 0.78,
      side: THREE.DoubleSide,
    });
    const innerBezel = new THREE.Mesh(innerBezelGeo, innerBezelMat);
    innerBezel.position.set(0, 0, -0.36);
    stageGroup.add(innerBezel);

    // Part 3: Instanced metric degree tick markers around scanner ring (36 ticks)
    const tickGeo = new THREE.BoxGeometry(0.018, 0.065, 0.012);
    const tickMat = new THREE.MeshStandardMaterial({
      color: 0x829ab1,
      metalness: 0.6,
      roughness: 0.4,
    });
    const tickInstanced = new THREE.InstancedMesh(tickGeo, tickMat, 36);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      dummy.position.set(Math.cos(ang) * 1.845, Math.sin(ang) * 1.845, -0.34);
      dummy.rotation.set(0, 0, ang - Math.PI / 2);
      dummy.scale.setScalar(i % 3 === 0 ? 1.35 : 0.85);
      dummy.updateMatrix();
      tickInstanced.setMatrixAt(i, dummy.matrix);
    }
    tickInstanced.instanceMatrix.needsUpdate = true;
    tickInstanced.computeBoundingSphere();
    stageGroup.add(tickInstanced);

    // Part 4: Grounding contact shadow plane beneath scan stage
    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(4.2, 2.2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -2.08, 0);
    stageGroup.add(shadowPlane);

    // Reconstructed 3D Skin Mesh + LiDAR Point Cloud Group
    const subjectGroup = new THREE.Group();
    stageGroup.add(subjectGroup);

    const geometry = new THREE.BufferGeometry();
    const surfaceMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.56,
      metalness: 0.04,
      clearcoat: 0.22,
      clearcoatRoughness: 0.42,
      side: THREE.DoubleSide,
    });
    const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
    surfaceMesh.castShadow = !isSoftwareGl;
    surfaceMesh.receiveShadow = !isSoftwareGl;
    subjectGroup.add(surfaceMesh);

    const pointsMat = new THREE.PointsMaterial({
      size: 0.036,
      sizeAttenuation: true,
      vertexColors: true,
    });
    const pointCloud = new THREE.Points(geometry, pointsMat);
    pointCloud.visible = false;
    subjectGroup.add(pointCloud);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.6;
    controls.maxDistance = 8.5;
    controls.target.set(0, 0, 0);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let cameraAnimating = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const dt = Math.min(0.05, clock.getDelta() || 0.016);

        if (cameraAnimating) {
          const alpha = 1 - Math.exp(-8 * dt);
          camera.position.lerp(_targetCamPos, alpha);
          controls.target.lerp(_targetLookAt, alpha);
          if (
            camera.position.distanceToSquared(_targetCamPos) < 0.0004 &&
            controls.target.distanceToSquared(_targetLookAt) < 0.0004
          ) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetLookAt);
            cameraAnimating = false;
          } else {
            renderDirty = true;
          }
        }

        const controlsMoving = controls.update();
        if (controlsMoving && !isSoftwareGl) {
          renderDirty = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('start', () => {
      cameraAnimating = false;
    });
    controls.addEventListener('change', requestRender);

    let cachedRgbColors: Float32Array = new Float32Array(0);
    let cachedHeatmapColors: Float32Array = new Float32Array(0);
    let currentMode: ViewerRenderMode = 'rgb_pbr';

    const applyModelGeometry = (m: Reconstructed3DModel) => {
      cachedRgbColors = new Float32Array(m.colors);
      cachedHeatmapColors = buildHeatmapColors(m.depthMapMm);

      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.normals), 3));
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(
          new Float32Array(currentMode === 'depth_heatmap' ? cachedHeatmapColors : cachedRgbColors),
          3
        )
      );
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(m.indices), 1));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      requestRender();
    };

    const applyAppearance = (mode: ViewerRenderMode, zScale: number) => {
      currentMode = mode;
      subjectGroup.scale.set(1, 1, zScale);

      const activeColors = mode === 'depth_heatmap' ? cachedHeatmapColors : cachedRgbColors;
      if (activeColors.length > 0) {
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(activeColors), 3));
      }

      if (mode === 'lidar_points') {
        surfaceMesh.visible = false;
        pointCloud.visible = true;
      } else {
        surfaceMesh.visible = true;
        pointCloud.visible = false;
        surfaceMat.wireframe = mode === 'wireframe';
        surfaceMat.roughness = mode === 'depth_heatmap' ? 0.72 : 0.56;
        surfaceMat.needsUpdate = true;
      }
      requestRender();
    };

    const flyToPreset = (preset: 'front' | 'angle45' | 'profile' | 'top_relief') => {
      _targetLookAt.set(0, 0, 0);
      if (preset === 'front') _targetCamPos.set(0, 0.1, 4.35);
      else if (preset === 'angle45') _targetCamPos.set(2.55, 0.55, 3.45);
      else if (preset === 'profile') _targetCamPos.set(3.95, 0.1, 1.35);
      else _targetCamPos.set(0, 3.2, 2.35);

      clock.getDelta();
      cameraAnimating = true;
      requestRender();
    };

    apiRef.current = {
      updateModel: applyModelGeometry,
      updateAppearance: applyAppearance,
      flyToPreset,
    };

    applyModelGeometry(model);
    applyAppearance(renderMode, reliefScale);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(260, entry.contentRect.width);
        const h = Math.max(300, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      geometry.dispose();
      surfaceMat.dispose();
      pointsMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      innerBezelGeo.dispose();
      innerBezelMat.dispose();
      tickGeo.dispose();
      tickMat.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.updateModel(model);
  }, [model]);

  useEffect(() => {
    apiRef.current?.updateAppearance(renderMode, reliefScale);
  }, [renderMode, reliefScale]);

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] rounded-2xl overflow-hidden border border-navy-800 bg-navy-950 select-none">
      {/* Isolated WebGL canvas mount container */}
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-left minimal spec label (does not occlude center model) */}
      <div className="absolute top-3.5 left-4 z-10 pointer-events-none">
        <p className="text-xs font-sans text-white/90 font-medium">
          Model 3D z fuzji Wideo + LiDAR ({model.fusedFramesCount} klatek)
        </p>
        <p className="text-[11px] font-sans text-navy-300 tabular-nums">
          {model.vertexCount.toLocaleString('pl-PL')} wierzchołków ·{' '}
          {model.triangleCount.toLocaleString('pl-PL')} trójkątów · Ra {model.metrics.microRoughnessUm} µm
        </p>
      </div>

      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy-950/90 p-6 text-center">
          <p className="text-sm font-sans text-white">
            Kontekst graficzny 3D został tymczasowo wstrzymany — trwa przywracanie widoku…
          </p>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (no backdrop-blur over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-[880px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="min-h-[32px] px-3.5 py-1 rounded-t-xl bg-navy-900 border border-b-0 border-navy-700 text-[11px] font-sans text-navy-200 hover:text-white inline-flex items-center gap-1.5 transition-colors touch-manipulation"
        >
          {dockCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span>{dockCollapsed ? 'Pokaż sterowanie 3D' : 'Ukryj panel'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full rounded-2xl bg-navy-900/95 border border-navy-700 px-3.5 py-3 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Render mode buttons */}
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'rgb_pbr', label: 'Tekstura RGB' },
                  { id: 'lidar_points', label: 'Chmura LiDAR' },
                  { id: 'depth_heatmap', label: 'Mapa głębi ToF' },
                  { id: 'wireframe', label: 'Siatka 3D' },
                ] as { id: ViewerRenderMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRenderMode(m.id)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-sans whitespace-nowrap shrink-0 transition-colors touch-manipulation ${
                    renderMode === m.id
                      ? 'bg-gold-500 text-white font-medium'
                      : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Z-Relief depth scale slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-sans text-navy-300 whitespace-nowrap">
                Skala rzeźby Z:
              </span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={reliefScale}
                onChange={(e) => setReliefScale(parseFloat(e.target.value))}
                aria-label="Wzmocnienie rzeźby 3D"
                className="w-24 sm:w-28 accent-gold-400 cursor-pointer"
              />
              <span className="text-xs font-sans text-white tabular-nums w-9">
                {reliefScale.toFixed(1)}×
              </span>
            </div>

            {/* Camera presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => apiRef.current?.flyToPreset('front')}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-sans text-navy-200 hover:bg-navy-800 hover:text-white whitespace-nowrap shrink-0"
              >
                En face
              </button>
              <button
                type="button"
                onClick={() => apiRef.current?.flyToPreset('angle45')}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-sans text-navy-200 hover:bg-navy-800 hover:text-white whitespace-nowrap shrink-0"
              >
                Profil 45°
              </button>
              <button
                type="button"
                onClick={() => apiRef.current?.flyToPreset('top_relief')}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-sans text-navy-200 hover:bg-navy-800 hover:text-white whitespace-nowrap shrink-0"
              >
                Rzeźba
              </button>
              <button
                type="button"
                onClick={() => apiRef.current?.flyToPreset('front')}
                aria-label="Resetuj kamerę"
                className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-navy-300 hover:bg-navy-800 hover:text-white"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
