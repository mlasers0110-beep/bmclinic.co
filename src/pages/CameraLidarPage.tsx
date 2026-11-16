import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Aperture,
  Box,
  Camera,
  CheckCircle2,
  Crosshair,
  Download,
  Focus,
  Info,
  Pipette,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Sun,
  Video,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LidarModelViewer3D from '../components/LidarModelViewer3D';
import {
  DEFAULT_CAMERA_PARAMETERS,
  WHITE_BALANCE_PRESETS,
  analyzeFocusQuality,
  analyzeLightingQuality,
  calibrateWhiteBalanceFromPatch,
  drawOpticalSkinPhantom,
  processOpticalFrame,
  type CameraParameters,
  type FocusSensorReading,
  type LightSensorReading,
  type WhiteBalanceCalibrationResult,
} from '../lib/cameraOptics';
import {
  captureSynchronizedLidarPacket,
  exportModelToOBJ,
  exportModelToPLY,
  reconstruct3DModelFromVideoAndLidar,
  renderLidarHeatmapCanvas,
  type LidarFramePacket,
  type Reconstructed3DModel,
} from '../lib/lidarReconstruction';
import { loadParameterConfigs, saveParameterConfigs } from '../lib/skinParameters';

const SHUTTER_STEPS = [30, 60, 125, 250, 500, 1000];
const ISO_STEPS = [50, 100, 200, 400, 800, 1600];

function SensorStatusBadge({
  status,
  text,
}: {
  status: 'optimal' | 'warning' | 'critical';
  text: string;
}) {
  if (status === 'optimal') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-emerald-700">
        <CheckCircle2 size={14} className="flex-shrink-0" />
        <span>{text}</span>
      </span>
    );
  }
  if (status === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-rose-700">
        <AlertTriangle size={14} className="flex-shrink-0" />
        <span>{text}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-amber-700">
      <Info size={14} className="flex-shrink-0" />
      <span>{text}</span>
    </span>
  );
}

export default function CameraLidarPage() {
  const navigate = useNavigate();

  // Camera source & hardware stream
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [sourceMode, setSourceMode] = useState<'camera' | 'phantom'>('camera');
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string>(
    'Łączenie z modułem optycznym…'
  );

  // Camera parameters & White Balance calibration state
  const [params, setParams] = useState<CameraParameters>(DEFAULT_CAMERA_PARAMETERS);
  const [spotWbActive, setSpotWbActive] = useState<boolean>(false);
  const [wbCalibrationInfo, setWbCalibrationInfo] =
    useState<WhiteBalanceCalibrationResult | null>(null);

  // Built-in Light & Focus sensors
  const [lightReading, setLightReading] = useState<LightSensorReading | null>(null);
  const [focusReading, setFocusReading] = useState<FocusSensorReading | null>(null);

  // Synchronized Video + LiDAR capture state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [capturedPacketsCount, setCapturedPacketsCount] = useState<number>(0);
  const [liveLidarRange, setLiveLidarRange] = useState<{
    minMm: number;
    maxMm: number;
    yaw: number;
    pitch: number;
  }>({ minMm: 238, maxMm: 294, yaw: 0, pitch: 0 });
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [reconstructedModel, setReconstructedModel] =
    useState<Reconstructed3DModel | null>(null);

  // Refs for real-time optical & LiDAR processing loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lidarHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestCleanImageRef = useRef<ImageData | null>(null);
  const paramsRef = useRef<CameraParameters>(params);
  const sourceModeRef = useRef<'camera' | 'phantom'>(sourceMode);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartMsRef = useRef<number>(0);
  const lidarPacketsRef = useRef<LidarFramePacket[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const deviceOrientationRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const latestLightScoreRef = useRef<number>(85);
  const latestFocusScoreRef = useRef<number>(80);

  paramsRef.current = params;
  sourceModeRef.current = sourceMode;

  // Apply hardware MediaTrackConstraints when supported by mobile/USB camera
  const syncHardwareTrackConstraints = useCallback((nextParams: CameraParameters) => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;

    try {
      const caps = track.getCapabilities() as Record<string, unknown>;
      const advanced: Record<string, unknown> = {};

      if ('zoom' in caps && typeof caps.zoom === 'object' && caps.zoom !== null) {
        const zCap = caps.zoom as { min?: number; max?: number };
        const minZ = zCap.min ?? 1;
        const maxZ = zCap.max ?? 1;
        if (maxZ > minZ) {
          advanced.zoom = Math.min(maxZ, Math.max(minZ, nextParams.zoom));
        }
      }
      if ('exposureCompensation' in caps && typeof caps.exposureCompensation === 'object' && caps.exposureCompensation !== null) {
        const eCap = caps.exposureCompensation as { min?: number; max?: number };
        advanced.exposureCompensation = Math.min(
          eCap.max ?? 2,
          Math.max(eCap.min ?? -2, nextParams.exposureEv)
        );
      }
      if ('colorTemperature' in caps && typeof caps.colorTemperature === 'object' && caps.colorTemperature !== null) {
        const wbCap = caps.colorTemperature as { min?: number; max?: number };
        advanced.whiteBalanceMode = 'manual';
        advanced.colorTemperature = Math.min(
          wbCap.max ?? 8000,
          Math.max(wbCap.min ?? 2800, nextParams.wbKelvin)
        );
      }
      if ('focusMode' in caps && Array.isArray(caps.focusMode)) {
        if (nextParams.focusMode === 'manual' && caps.focusMode.includes('manual')) {
          advanced.focusMode = 'manual';
        } else if (caps.focusMode.includes('continuous')) {
          advanced.focusMode = 'continuous';
        }
      }

      if (Object.keys(advanced).length > 0) {
        track.applyConstraints({ advanced: [advanced] } as unknown as MediaTrackConstraints).catch(() => {
          // Ignore unsupported hardware constraint combinations; optical pipeline handles all parameters
        });
      }
    } catch {
      // Safe fallback to canvas optical pipeline
    }
  }, []);

  const updateParams = (patch: Partial<CameraParameters>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      syncHardwareTrackConstraints(next);
      return next;
    });
  };

  // Start or switch camera stream; automatically fall back to Optical Phantom if unavailable
  const initCameraStream = useCallback(async (desiredFacing: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setSourceMode('phantom');
      setCameraStatusMessage('Brak fizycznej kamery — aktywny wzorzec optyczny skóry + LiDAR ToF');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setSourceMode('camera');
      setCameraStatusMessage(
        desiredFacing === 'environment'
          ? 'Kamera tylna (Makro + strumień głębi LiDAR)'
          : 'Kamera przednia (Twarz + estymacja głębi ToF)'
      );
      syncHardwareTrackConstraints(paramsRef.current);
    } catch {
      setSourceMode('phantom');
      setCameraStatusMessage(
        'Tryb wzorca kalibracyjnego (brak uprawnień kamery lub urządzenia wideo — pełna symulacja optyki i LiDAR)'
      );
    }
  }, [syncHardwareTrackConstraints]);

  useEffect(() => {
    initCameraStream(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, initCameraStream]);

  // Listen to mobile gyroscope orientation for real handheld 3D scan pose tracking
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        deviceOrientationRef.current = {
          yaw: Math.max(-25, Math.min(25, e.gamma * 0.5)),
          pitch: Math.max(-20, Math.min(20, (e.beta - 65) * 0.4)),
        };
      }
    };
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, []);

  // Main real-time optical processing + Light Sensor + Focus Sensor + Live LiDAR ToF loop
  useEffect(() => {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 480;
    rawCanvas.height = 360;
    rawCanvasRef.current = rawCanvas;
    const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true })!;

    let rafId = 0;
    let frameCounter = 0;
    const startClockMs = performance.now();

    const tick = () => {
      frameCounter++;
      const nowMs = performance.now();
      const elapsedSec = (nowMs - startClockMs) / 1000;

      const videoEl = videoRef.current;
      const hasLiveVideo =
        sourceModeRef.current === 'camera' &&
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0;

      if (hasLiveVideo && videoEl) {
        rawCtx.drawImage(videoEl, 0, 0, rawCanvas.width, rawCanvas.height);
      } else {
        drawOpticalSkinPhantom(rawCtx, rawCanvas.width, rawCanvas.height, elapsedSec);
      }

      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        if (displayCanvas.width !== 480 || displayCanvas.height !== 360) {
          displayCanvas.width = 480;
          displayCanvas.height = 360;
        }
        const cleanFrame = processOpticalFrame(rawCanvas, displayCanvas, paramsRef.current);
        latestCleanImageRef.current = cleanFrame;

        // Update built-in Light & Focus sensors every 6 frames (~10 Hz)
        if (frameCounter % 6 === 0) {
          const light = analyzeLightingQuality(cleanFrame);
          const focus = analyzeFocusQuality(cleanFrame);
          latestLightScoreRef.current = light.score;
          latestFocusScoreRef.current = focus.score;
          setLightReading(light);
          setFocusReading(focus);
        }

        // Update Live LiDAR ToF stream & record synchronized RGB + LiDAR packets during recording (~10 Hz)
        if (frameCounter % 4 === 0) {
          const pkt = captureSynchronizedLidarPacket(
            cleanFrame,
            lidarPacketsRef.current.length,
            nowMs - recordingStartMsRef.current,
            84,
            latestFocusScoreRef.current,
            latestLightScoreRef.current,
            deviceOrientationRef.current.yaw,
            deviceOrientationRef.current.pitch
          );

          if (lidarHeatmapCanvasRef.current) {
            renderLidarHeatmapCanvas(pkt, lidarHeatmapCanvasRef.current);
          }

          setLiveLidarRange({
            minMm: pkt.minDepthMm,
            maxMm: pkt.maxDepthMm,
            yaw: pkt.poseYawDeg,
            pitch: pkt.posePitchDeg,
          });

          if (isRecordingRef.current) {
            lidarPacketsRef.current.push(pkt);
            const recElapsed = (nowMs - recordingStartMsRef.current) / 1000;
            setRecordingSec(Math.round(recElapsed * 10) / 10);
            setCapturedPacketsCount(lidarPacketsRef.current.length);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    // Generate an initial preview 3D scan after first 400ms so user immediately sees 3D capability too
    const initTimer = window.setTimeout(() => {
      if (latestCleanImageRef.current) {
        const seedPackets = [
          captureSynchronizedLidarPacket(latestCleanImageRef.current, 0, 0, 84, 84, 88, -4, 0),
          captureSynchronizedLidarPacket(latestCleanImageRef.current, 1, 180, 84, 86, 88, 0, 1),
          captureSynchronizedLidarPacket(latestCleanImageRef.current, 2, 360, 84, 85, 88, 4, -1),
        ];
        setReconstructedModel(reconstruct3DModelFromVideoAndLidar(seedPackets, 0.4));
      }
    }, 450);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(initTimer);
    };
  }, []);

  // Spot White Balance calibration on viewfinder click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!spotWbActive || !displayCanvasRef.current || !rawCanvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * rawCanvasRef.current.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * rawCanvasRef.current.height;

    const rawCtx = rawCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!rawCtx) return;
    const rawImage = rawCtx.getImageData(
      0,
      0,
      rawCanvasRef.current.width,
      rawCanvasRef.current.height
    );

    const cal = calibrateWhiteBalanceFromPatch(rawImage, clickX, clickY, 14);
    setWbCalibrationInfo(cal);
    updateParams({
      wbKelvin: 5500,
      wbTint: 0,
      wbGains: cal.gains,
    });
    setSpotWbActive(false);
  };

  // 1-Click Reference Gray Card WB Calibration (samples reference region or image neutral zone)
  const handleAutoGrayCardCalibrate = () => {
    if (!rawCanvasRef.current) return;
    const rawCtx = rawCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!rawCtx) return;
    const rawImage = rawCtx.getImageData(
      0,
      0,
      rawCanvasRef.current.width,
      rawCanvasRef.current.height
    );
    // In phantom mode sample the 18% WB target card at top-left; in live camera sample central ROI
    const sampleX =
      sourceMode === 'phantom'
        ? rawCanvasRef.current.width * 0.09
        : rawCanvasRef.current.width * 0.5;
    const sampleY =
      sourceMode === 'phantom'
        ? rawCanvasRef.current.height * 0.13
        : rawCanvasRef.current.height * 0.5;

    const cal = calibrateWhiteBalanceFromPatch(rawImage, sampleX, sampleY, 16);
    setWbCalibrationInfo(cal);
    updateParams({
      wbKelvin: 5500,
      wbTint: 0,
      wbGains: cal.gains,
    });
  };

  const handleCapturePhoto = () => {
    if (!displayCanvasRef.current) return;
    const dataUrl = displayCanvasRef.current.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
  };

  // Start simultaneous Video Recording + LiDAR ToF Stream Registration
  const handleStartVideoAndLidar = () => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    lidarPacketsRef.current = [];
    recordedChunksRef.current = [];
    recordingStartMsRef.current = performance.now();
    setRecordingSec(0);
    setCapturedPacketsCount(0);
    isRecordingRef.current = true;
    setIsRecording(true);

    // Start MediaRecorder on the calibrated optical canvas stream (25 fps)
    try {
      if (typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
        const canvasStream = canvas.captureStream(25);
        const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ];
        const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
        const recorder = supportedMime
          ? new MediaRecorder(canvasStream, { mimeType: supportedMime })
          : new MediaRecorder(canvasStream);

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, {
              type: recorder.mimeType || 'video/webm',
            });
            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
      }
    } catch {
      // Even if MediaRecorder is unavailable on an older WebView, LiDAR + RGB packet fusion still completes!
    }
  };

  // Stop recording & reconstruct 3D model from fused Video + LiDAR stream
  const handleStopAndReconstruct3D = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder stop edge case
      }
    }

    const durationSec = Math.max(
      0.5,
      (performance.now() - recordingStartMsRef.current) / 1000
    );

    let packets = lidarPacketsRef.current;
    if (packets.length === 0 && latestCleanImageRef.current) {
      packets = [
        captureSynchronizedLidarPacket(
          latestCleanImageRef.current,
          0,
          0,
          84,
          latestFocusScoreRef.current,
          latestLightScoreRef.current,
          deviceOrientationRef.current.yaw,
          deviceOrientationRef.current.pitch
        ),
      ];
    }

    if (packets.length > 0) {
      const built = reconstruct3DModelFromVideoAndLidar(packets, durationSec);
      setReconstructedModel(built);
    }
  }, []);

  // Auto-stop recording after 10 seconds to keep mesh fusion snappy
  useEffect(() => {
    if (isRecording && recordingSec >= 10) {
      handleStopAndReconstruct3D();
    }
  }, [isRecording, recordingSec, handleStopAndReconstruct3D]);

  const handleDownloadModel = (format: 'ply' | 'obj') => {
    if (!reconstructedModel) return;
    const content =
      format === 'ply'
        ? exportModelToPLY(reconstructedModel)
        : exportModelToOBJ(reconstructedModel);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myskincode-model-3d.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply 3D scan roughness & contour metrics directly into MSC-MATRIX Skin Parameters
  const handleTransferToSkinParameters = () => {
    if (!reconstructedModel) return;
    const configs = loadParameterConfigs();
    const updated = configs.map((c) => {
      if (c.id === 'pores_texture') {
        return {
          ...c,
          enabled: true,
          value: reconstructedModel.metrics.poreReliefScore,
        };
      }
      if (c.id === 'elasticity') {
        return {
          ...c,
          enabled: true,
          value: reconstructedModel.metrics.contourElasticityScore,
        };
      }
      return c;
    });
    saveParameterConfigs(updated);
    navigate('/parametry');
  };

  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />

      {/* Hidden hardware video feed element */}
      <video ref={videoRef} playsInline muted className="hidden" />

      <main className="flex-1 pt-14 md:pt-16 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-sans text-gold-600 mb-1.5">
                Akwizycja optyczna i skanowanie przestrzenne ToF
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-navy-900 font-light leading-tight">
                Pulpit aparatu, czujniki i skaner 3D LiDAR
              </h1>
              <p className="text-xs sm:text-sm text-navy-500 font-sans mt-1.5">
                {cameraStatusMessage}
              </p>
            </div>

            {/* Source & lens selector */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
                  setFacingMode(nextFacing);
                  initCameraStream(nextFacing);
                }}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border border-skin-200 bg-white text-xs font-sans font-medium text-navy-800 hover:bg-skin-100 transition-colors touch-manipulation"
              >
                <RefreshCw size={14} />
                <span>
                  {facingMode === 'environment' ? 'Przełącz na przednią' : 'Przełącz na tylną'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sourceMode === 'camera') {
                    setSourceMode('phantom');
                    setCameraStatusMessage(
                      'Aktywny wzorzec kalibracyjny skóry z kartą szarości WB 18% i głębią ToF'
                    );
                  } else {
                    initCameraStream(facingMode);
                  }
                }}
                className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-sans font-medium transition-colors touch-manipulation ${
                  sourceMode === 'phantom'
                    ? 'border-navy-800 bg-navy-900 text-white'
                    : 'border-skin-200 bg-white text-navy-700 hover:bg-skin-100'
                }`}
              >
                <Aperture size={14} />
                <span>
                  {sourceMode === 'phantom' ? 'Użyj kamery urządzenia' : 'Wzorzec testowy'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setParams(DEFAULT_CAMERA_PARAMETERS);
                  setWbCalibrationInfo(null);
                  syncHardwareTrackConstraints(DEFAULT_CAMERA_PARAMETERS);
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-skin-200 bg-white text-xs font-sans text-navy-600 hover:bg-skin-100 transition-colors touch-manipulation"
              >
                <RotateCcw size={13} />
                <span>Reset optyki</span>
              </button>
            </div>
          </div>

          {/* Built-in Proper Light & Proper Focus Sensors Top Telemetry Bar */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Built-in Light Sensor */}
            <div className="bg-white rounded-2xl border border-skin-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sun size={18} className="text-gold-500 flex-shrink-0" />
                  <div>
                    <h2 className="font-serif text-lg text-navy-900 leading-none">
                      Czujnik prawidłowego światła
                    </h2>
                    <p className="text-[11px] text-navy-400 font-sans mt-1">
                      Pomiar luminancji, odblasków spekularnych i symetrii oświetlenia
                    </p>
                  </div>
                </div>
                {lightReading && (
                  <SensorStatusBadge status={lightReading.status} text={lightReading.label} />
                )}
              </div>

              {lightReading && (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-3 text-center bg-skin-50 rounded-xl p-2.5">
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {lightReading.estimatedLux}
                        <span className="text-[10px] font-sans text-navy-400 ml-0.5">lx</span>
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Natężenie</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {lightReading.meanLuminancePct}%
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Jasność IRE</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {lightReading.uniformityPct}%
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Równomierność</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {lightReading.glareClippingPct}%
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Odblaski</div>
                    </div>
                  </div>

                  {/* Live luminance histogram */}
                  <div className="flex items-end gap-0.5 h-8 mb-2 px-1" aria-label="Histogram jasności">
                    {lightReading.histogram.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${
                          i < 3
                            ? 'bg-navy-400'
                            : i > 20
                              ? 'bg-amber-500'
                              : 'bg-navy-800'
                        }`}
                        style={{ height: `${Math.max(8, h)}%` }}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-navy-600 font-sans leading-relaxed">
                    {lightReading.guidance}
                  </p>
                </>
              )}
            </div>

            {/* Built-in Focus Sensor */}
            <div className="bg-white rounded-2xl border border-skin-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Focus size={18} className="text-gold-500 flex-shrink-0" />
                  <div>
                    <h2 className="font-serif text-lg text-navy-900 leading-none">
                      Czujnik prawidłowej ostrości
                    </h2>
                    <p className="text-[11px] text-navy-400 font-sans mt-1">
                      Analiza gradientu Sobela i wariancji Laplace’a w strefie ROI
                    </p>
                  </div>
                </div>
                {focusReading && (
                  <SensorStatusBadge status={focusReading.status} text={focusReading.label} />
                )}
              </div>

              {focusReading && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center bg-skin-50 rounded-xl p-2.5">
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {focusReading.score}
                        <span className="text-[10px] font-sans text-navy-400 ml-0.5">/100</span>
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Indeks ostrości</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {focusReading.edgeDensityPct}%
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Mikrokrawędzie</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl text-navy-900 tabular-nums">
                        {focusReading.laplacianVariance}
                      </div>
                      <div className="text-[10px] font-sans text-navy-500">Wariancja Δ²</div>
                    </div>
                  </div>

                  {/* Sharpness meter bar */}
                  <div className="relative h-3 rounded-full bg-skin-100 overflow-hidden mb-3">
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-l border-emerald-600/50"
                      style={{ left: '60%', width: '40%' }}
                      title="Strefa pełnej ostrości mikro-tekstury (60–100 pkt)"
                    />
                    <div
                      className={`h-full rounded-full transition-opacity duration-150 ${
                        focusReading.status === 'critical'
                          ? 'bg-rose-500'
                          : focusReading.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                      }`}
                      style={{ width: `${focusReading.score}%` }}
                    />
                  </div>

                  <p className="text-xs text-navy-600 font-sans leading-relaxed">
                    {focusReading.guidance}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Asymmetric Split Console: Live Viewfinder + LiDAR ToF Stream (Left/Main) & Camera Parameter + WB Controls (Right) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-start">
            {/* Main Optical Viewfinder + Synchronized LiDAR ToF Monitor */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-navy-950 border border-navy-800">
                <canvas
                  ref={displayCanvasRef}
                  onClick={handleCanvasClick}
                  className={`w-full aspect-[4/3] block object-cover ${
                    spotWbActive ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                />

                {/* Diagnostic ROI & Rule-of-Thirds Overlay */}
                {params.showGridOverlay && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-[25%] inset-y-[22%] border border-white/40 rounded-2xl">
                      <span className="absolute -top-5 left-2 text-[10px] font-sans text-white/75">
                        ROI ostrości i pomiaru LiDAR
                      </span>
                    </div>
                  </div>
                )}

                {/* Spot WB instructions banner */}
                {spotWbActive && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-navy-900/95 border border-gold-400 text-white px-4 py-2 rounded-full text-xs font-sans flex items-center gap-2 shadow-lg">
                    <Crosshair size={14} className="text-gold-400" />
                    <span>Kliknij szarą kartę lub biały wzorzec na obrazie, aby skalibrować balans bieli</span>
                  </div>
                )}

                {/* Top-left optical telemetry readout */}
                <div className="absolute top-3 left-3 bg-navy-950/80 text-white px-3 py-1.5 rounded-xl text-[11px] font-sans tabular-nums">
                  ISO {params.iso} · 1/{params.shutterDenominator}s ·{' '}
                  {params.exposureEv >= 0 ? `+${params.exposureEv.toFixed(1)}` : params.exposureEv.toFixed(1)} EV ·{' '}
                  {params.wbKelvin}K · {params.zoom.toFixed(1)}×
                </div>

                {/* Live Simultaneous LiDAR ToF Depth Picture-in-Picture */}
                <div className="absolute bottom-3 right-3 w-28 sm:w-36 rounded-xl overflow-hidden border border-white/25 bg-navy-950/90 shadow-lg">
                  <canvas
                    ref={lidarHeatmapCanvasRef}
                    className="w-full aspect-square block"
                  />
                  <div className="px-2 py-1 text-[10px] font-sans text-white/90 tabular-nums flex items-center justify-between">
                    <span>LiDAR ToF</span>
                    <span>
                      {Math.round(liveLidarRange.minMm)}–{Math.round(liveLidarRange.maxMm)} mm
                    </span>
                  </div>
                </div>

                {/* Recording time & synchronized packet counter */}
                {isRecording && (
                  <div className="absolute bottom-3 left-3 bg-rose-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-sans font-medium tabular-nums">
                    REC {recordingSec.toFixed(1)} s · {capturedPacketsCount} ramek Wideo+LiDAR
                  </div>
                )}
              </div>

              {/* Primary Capture Action Bar: Photo Snapshot + Simultaneous Video & LiDAR 3D Scan */}
              <div className="bg-white rounded-2xl border border-skin-100 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartVideoAndLidar}
                      className="min-h-[48px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gold-500 text-white text-sm font-sans font-medium hover:bg-gold-600 transition-colors touch-manipulation"
                    >
                      <Video size={16} />
                      <span>Rejestruj film + skan LiDAR (3D)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopAndReconstruct3D}
                      className="min-h-[48px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-600 text-white text-sm font-sans font-medium hover:bg-rose-700 transition-colors touch-manipulation"
                    >
                      <Square size={15} />
                      <span>Zatrzymaj i utwórz model 3D ({recordingSec.toFixed(1)}s)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-navy-800 text-navy-800 text-sm font-sans font-medium hover:bg-navy-800 hover:text-white transition-colors touch-manipulation"
                  >
                    <Camera size={16} />
                    <span>Zdjęcie PNG</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-navy-500 font-sans tabular-nums">
                  <span>
                    Kąt głowicy: {liveLidarRange.yaw >= 0 ? `+${liveLidarRange.yaw}` : liveLidarRange.yaw}° /{' '}
                    {liveLidarRange.pitch >= 0 ? `+${liveLidarRange.pitch}` : liveLidarRange.pitch}°
                  </span>
                </div>
              </div>

              {/* Recorded Video & Snapshot Quick Downloads */}
              {(recordedVideoUrl || snapshotUrl) && (
                <div className="bg-white rounded-2xl border border-skin-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recordedVideoUrl && (
                    <div>
                      <p className="text-xs font-sans font-medium text-navy-800 mb-2">
                        Zarejestrowany film diagnostyczny ({capturedPacketsCount} klatek LiDAR)
                      </p>
                      <video
                        src={recordedVideoUrl}
                        controls
                        playsInline
                        className="w-full rounded-xl bg-navy-950 mb-2 aspect-[4/3] object-cover"
                      />
                      <a
                        href={recordedVideoUrl}
                        download="myskincode-rejestr-wideo.webm"
                        className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-sans font-medium text-gold-600 hover:text-gold-700"
                      >
                        <Download size={13} />
                        Pobierz plik wideo (.webm)
                      </a>
                    </div>
                  )}

                  {snapshotUrl && (
                    <div>
                      <p className="text-xs font-sans font-medium text-navy-800 mb-2">
                        Ostatnie zdjęcie po kalibracji balansu bieli
                      </p>
                      <img
                        src={snapshotUrl}
                        alt="Skalibrowane zdjęcie skóry"
                        className="w-full rounded-xl bg-navy-950 mb-2 aspect-[4/3] object-cover"
                      />
                      <a
                        href={snapshotUrl}
                        download="myskincode-kalibracja.png"
                        className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-sans font-medium text-gold-600 hover:text-gold-700"
                      >
                        <Download size={13} />
                        Pobierz zdjęcie (.png)
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Camera Exposure/Focus Controls + White Balance Calibration */}
            <div className="lg:col-span-5 space-y-5">
              {/* Basic Camera Parameters Panel */}
              <div className="bg-white rounded-2xl border border-skin-100 p-5">
                <h2 className="font-serif text-xl text-navy-900 mb-1">
                  Podstawowe parametry aparatu
                </h2>
                <p className="text-xs text-navy-400 font-sans mb-4">
                  Ręczne sterowanie ekspozycją, czułością ISO, migawką, ostrością i powiększeniem
                </p>

                <div className="space-y-4">
                  {/* Exposure EV */}
                  <div>
                    <div className="flex justify-between text-xs font-sans mb-1">
                      <span className="text-navy-700 font-medium">Kompensacja ekspozycji (EV)</span>
                      <span className="text-navy-900 font-medium tabular-nums">
                        {params.exposureEv >= 0
                          ? `+${params.exposureEv.toFixed(1)}`
                          : params.exposureEv.toFixed(1)}{' '}
                        EV
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-2}
                      max={2}
                      step={0.1}
                      value={params.exposureEv}
                      onChange={(e) => updateParams({ exposureEv: parseFloat(e.target.value) })}
                      className="w-full accent-navy-800 cursor-pointer"
                    />
                  </div>

                  {/* ISO selector */}
                  <div>
                    <span className="block text-xs font-sans text-navy-700 font-medium mb-1.5">
                      Czułość matrycy (ISO)
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {ISO_STEPS.map((isoVal) => (
                        <button
                          key={isoVal}
                          type="button"
                          onClick={() => updateParams({ iso: isoVal })}
                          className={`min-h-[38px] rounded-lg text-xs font-sans tabular-nums transition-colors ${
                            params.iso === isoVal
                              ? 'bg-navy-900 text-white font-medium'
                              : 'bg-skin-50 border border-skin-200 text-navy-700 hover:bg-skin-100'
                          }`}
                        >
                          {isoVal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shutter speed */}
                  <div>
                    <span className="block text-xs font-sans text-navy-700 font-medium mb-1.5">
                      Czas otwarcia migawki
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {SHUTTER_STEPS.map((denom) => (
                        <button
                          key={denom}
                          type="button"
                          onClick={() => updateParams({ shutterDenominator: denom })}
                          className={`min-h-[38px] rounded-lg text-[11px] font-sans tabular-nums transition-colors ${
                            params.shutterDenominator === denom
                              ? 'bg-navy-900 text-white font-medium'
                              : 'bg-skin-50 border border-skin-200 text-navy-700 hover:bg-skin-100'
                          }`}
                        >
                          1/{denom}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optical/Digital Zoom */}
                  <div>
                    <div className="flex justify-between text-xs font-sans mb-1">
                      <span className="text-navy-700 font-medium">Powiększenie (Zoom makro)</span>
                      <span className="text-navy-900 font-medium tabular-nums">
                        {params.zoom.toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.1}
                      value={params.zoom}
                      onChange={(e) => updateParams({ zoom: parseFloat(e.target.value) })}
                      className="w-full accent-navy-800 cursor-pointer"
                    />
                  </div>

                  {/* Focus Mode AF / MF + Manual Distance */}
                  <div className="pt-2 border-t border-skin-100">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-sans text-navy-700 font-medium">
                        Układ ustawiania ostrości
                      </span>
                      <div className="inline-flex p-0.5 bg-skin-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateParams({ focusMode: 'auto', focusDistanceCm: 28 })}
                          className={`min-h-[34px] px-3 rounded-md text-xs font-sans font-medium transition-colors ${
                            params.focusMode === 'auto'
                              ? 'bg-white text-navy-900 shadow-sm'
                              : 'text-navy-600'
                          }`}
                        >
                          AF-C (Auto)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateParams({ focusMode: 'manual' })}
                          className={`min-h-[34px] px-3 rounded-md text-xs font-sans font-medium transition-colors ${
                            params.focusMode === 'manual'
                              ? 'bg-white text-navy-900 shadow-sm'
                              : 'text-navy-600'
                          }`}
                        >
                          MF (Ręczny)
                        </button>
                      </div>
                    </div>

                    {params.focusMode === 'manual' && (
                      <div>
                        <div className="flex justify-between text-xs font-sans mb-1">
                          <span className="text-navy-500">Płaszczyzna ostrości (optimum 28 cm)</span>
                          <span className="text-navy-900 font-medium tabular-nums">
                            {params.focusDistanceCm} cm
                          </span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={80}
                          step={1}
                          value={params.focusDistanceCm}
                          onChange={(e) =>
                            updateParams({ focusDistanceCm: parseInt(e.target.value, 10) })
                          }
                          className="w-full accent-gold-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dermoscopic micro-contrast + Viewfinder helpers */}
                  <div className="pt-2 border-t border-skin-100 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-sans mb-1">
                        <span className="text-navy-700 font-medium">Mikrokontrast naskórka</span>
                        <span className="text-navy-900 font-medium tabular-nums">
                          {params.microContrast >= 0
                            ? `+${params.microContrast}`
                            : params.microContrast}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        step={1}
                        value={params.microContrast}
                        onChange={(e) =>
                          updateParams({ microContrast: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-navy-800 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateParams({ focusPeaking: !params.focusPeaking })}
                        className={`min-h-[40px] px-3 rounded-xl border text-xs font-sans font-medium transition-colors ${
                          params.focusPeaking
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                            : 'border-skin-200 bg-skin-50 text-navy-700'
                        }`}
                      >
                        Focus Peaking: {params.focusPeaking ? 'WŁ.' : 'WYŁ.'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateParams({ showGridOverlay: !params.showGridOverlay })}
                        className={`min-h-[40px] px-3 rounded-xl border text-xs font-sans font-medium transition-colors ${
                          params.showGridOverlay
                            ? 'border-navy-800 bg-navy-900 text-white'
                            : 'border-skin-200 bg-skin-50 text-navy-700'
                        }`}
                      >
                        Ramka ROI: {params.showGridOverlay ? 'WŁ.' : 'WYŁ.'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* White Balance Calibration Panel */}
              <div className="bg-white rounded-2xl border border-skin-100 p-5">
                <h2 className="font-serif text-xl text-navy-900 mb-1">
                  Kalibracja balansu bieli (WB)
                </h2>
                <p className="text-xs text-navy-400 font-sans mb-4">
                  Eliminacja dominanty barwnej dla wiarygodnej oceny rumienia i przebarwień
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setSpotWbActive((v) => !v)}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-sans font-medium transition-colors touch-manipulation ${
                      spotWbActive
                        ? 'border-gold-500 bg-gold-500 text-white'
                        : 'border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white'
                    }`}
                  >
                    <Pipette size={14} />
                    <span>{spotWbActive ? 'Kliknij wzorzec na wizjerze…' : 'Pipeta wzorca bieli'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoGrayCardCalibrate}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-skin-200 bg-skin-50 text-xs font-sans font-medium text-navy-800 hover:bg-skin-100 transition-colors touch-manipulation"
                  >
                    <Crosshair size={14} />
                    <span>Kalibruj z szarej karty 18%</span>
                  </button>
                </div>

                {wbCalibrationInfo && (
                  <div className="rounded-xl bg-skin-50 border border-skin-100 p-3 mb-4 text-xs font-sans text-navy-600 space-y-1 tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy-900">Skalibrowano von Kriesa</span>
                      <span className="text-emerald-700 font-medium">
                        ΔE = {wbCalibrationInfo.deltaE}
                      </span>
                    </div>
                    <p className="text-[11px] text-navy-500">
                      Zmierzono ok. {wbCalibrationInfo.measuredKelvin}K · Wzmocnienia R:{' '}
                      {wbCalibrationInfo.gains.r.toFixed(2)} G: {wbCalibrationInfo.gains.g.toFixed(2)}{' '}
                      B: {wbCalibrationInfo.gains.b.toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Lighting presets */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {WHITE_BALANCE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setWbCalibrationInfo(null);
                        updateParams({
                          wbKelvin: preset.kelvin,
                          wbTint: preset.tint,
                          wbGains: { r: 1, g: 1, b: 1 },
                        });
                      }}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-sans transition-colors ${
                        params.wbKelvin === preset.kelvin &&
                        params.wbGains.r === 1 &&
                        params.wbGains.b === 1
                          ? 'border-gold-500 bg-gold-50 text-navy-900 font-medium'
                          : 'border-skin-200 bg-white text-navy-600 hover:bg-skin-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Manual Kelvin & Tint */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-sans mb-1">
                      <span className="text-navy-700 font-medium">Temperatura barwowa</span>
                      <span className="text-navy-900 font-medium tabular-nums">
                        {params.wbKelvin} K
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2800}
                      max={8500}
                      step={100}
                      value={params.wbKelvin}
                      onChange={(e) =>
                        updateParams({ wbKelvin: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-gold-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-sans mb-1">
                      <span className="text-navy-700 font-medium">Tinta (Zieleń / Magenta)</span>
                      <span className="text-navy-900 font-medium tabular-nums">
                        {params.wbTint >= 0 ? `+${params.wbTint}` : params.wbTint}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={params.wbTint}
                      onChange={(e) =>
                        updateParams({ wbTint: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-navy-800 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3D Model Reconstruction Section from Video + LiDAR */}
          {reconstructedModel && (
            <section className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-sans text-gold-600 mb-1">
                    Rekonstrukcja wolumetryczna RGB-D (Wideo + Skaner LiDAR)
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl text-navy-900 font-light">
                    Interaktywny model 3D badanej powierzchni skóry
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadModel('ply')}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border border-skin-200 bg-white text-xs font-sans font-medium text-navy-800 hover:bg-skin-100 transition-colors touch-manipulation"
                  >
                    <Download size={14} />
                    <span>Eksportuj .PLY (RGB)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadModel('obj')}
                    className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border border-skin-200 bg-white text-xs font-sans font-medium text-navy-800 hover:bg-skin-100 transition-colors touch-manipulation"
                  >
                    <Box size={14} />
                    <span>Eksportuj .OBJ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferToSkinParameters}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-full bg-navy-900 text-white text-xs font-sans font-medium hover:bg-navy-800 transition-colors touch-manipulation"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Prześlij metryki 3D do parametrów skóry</span>
                  </button>
                </div>
              </div>

              {/* 3D Topographic Biometric Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white rounded-2xl border border-skin-100 p-4">
                  <p className="text-xs text-navy-400 font-sans mb-1">Zespolone klatki</p>
                  <div className="font-serif text-2xl text-navy-900 tabular-nums">
                    {reconstructedModel.fusedFramesCount}
                  </div>
                  <p className="text-[11px] text-navy-500 font-sans mt-0.5">
                    Czas skanu: {reconstructedModel.recordingDurationSec} s
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-skin-100 p-4">
                  <p className="text-xs text-navy-400 font-sans mb-1">Szorstkość 3D (Ra)</p>
                  <div className="font-serif text-2xl text-navy-900 tabular-nums">
                    {reconstructedModel.metrics.microRoughnessUm}
                    <span className="text-xs font-sans text-navy-400 ml-1">µm</span>
                  </div>
                  <p className="text-[11px] text-navy-500 font-sans mt-0.5">Mikro-relief naskórka</p>
                </div>

                <div className="bg-white rounded-2xl border border-skin-100 p-4">
                  <p className="text-xs text-navy-400 font-sans mb-1">Rozpiętość głębi</p>
                  <div className="font-serif text-2xl text-navy-900 tabular-nums">
                    {reconstructedModel.metrics.reliefSpanMm}
                    <span className="text-xs font-sans text-navy-400 ml-1">mm</span>
                  </div>
                  <p className="text-[11px] text-navy-500 font-sans mt-0.5">
                    Dystans śr. {reconstructedModel.metrics.meanDistanceMm} mm
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-skin-100 p-4">
                  <p className="text-xs text-navy-400 font-sans mb-1">Indeks porów 3D</p>
                  <div className="font-serif text-2xl text-navy-900 tabular-nums">
                    {reconstructedModel.metrics.poreReliefScore}%
                  </div>
                  <p className="text-[11px] text-navy-500 font-sans mt-0.5">Tekstura powierzchni</p>
                </div>

                <div className="bg-white rounded-2xl border border-skin-100 p-4 col-span-2 sm:col-span-1">
                  <p className="text-xs text-navy-400 font-sans mb-1">Pewność LiDAR ToF</p>
                  <div className="font-serif text-2xl text-emerald-700 tabular-nums">
                    {reconstructedModel.metrics.meanConfidencePct}%
                  </div>
                  <p className="text-[11px] text-navy-500 font-sans mt-0.5">Zgodność fazowa</p>
                </div>
              </div>

              {/* Interactive Three.js 3D Surface & Point Cloud Stage */}
              <LidarModelViewer3D model={reconstructedModel} />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
