import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFaceApi } from '../../hooks/useFaceApi';
import type { DetectionSnapshot } from '../../hooks/useFaceApi';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import {
  Loader2, CheckCircle2, XCircle, Eye, Scan,
  UserCheck, RefreshCw, ScanFace as ScanIcon,
} from 'lucide-react';

type Phase = 'idle' | 'aligning' | 'liveness' | 'capturing' | 'processing' | 'success' | 'failed';
type Action = 'register' | 'checkin';

const REGISTER_SAMPLES = 10;   // frames captured for registration
const SCAN_SAMPLES     = 7;    // frames captured for verification

// ── Canvas overlay ────────────────────────────────────────────────────────────
function drawOverlay(
  canvas: HTMLCanvasElement,
  video:  HTMLVideoElement,
  snap:   DetectionSnapshot,
  phase:  Phase,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = video.videoWidth || canvas.width;
  const H = video.videoHeight || canvas.height;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);

  if (!snap.detected || !snap.box) {
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, W * 0.19, H * 0.30, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const { x, y, w, h } = snap.box;
  const color = phase === 'liveness'
    ? (snap.eyesClosed ? '#a78bfa' : '#60a5fa')
    : snap.qualityOk ? '#22c55e' : '#f59e0b';

  const corner = Math.min(w, h) * 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  const corners: [number,number,number,number,number,number][] = [
    [x, y + corner, x, y, x + corner, y],
    [x + w - corner, y, x + w, y, x + w, y + corner],
    [x + w, y + h - corner, x + w, y + h, x + w - corner, y + h],
    [x + corner, y + h, x, y + h, x, y + h - corner],
  ];
  corners.forEach(([x1,y1,x2,y2,x3,y3]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
  });

  if (phase === 'liveness') {
    ctx.fillStyle = snap.eyesClosed ? 'rgba(167,139,250,0.85)' : 'rgba(96,165,250,0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y - 28, 100, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(snap.eyesClosed ? '👁 BLINK!' : '👁 Eyes open', x + 6, y - 11);
  }
  ctx.restore();

  if (phase === 'capturing') {
    const t = (Date.now() % 1200) / 1200;
    const scanY = H * t;
    const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    grad.addColorStop(0, 'rgba(34,197,94,0)');
    grad.addColorStop(0.5, 'rgba(34,197,94,0.5)');
    grad.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - 20, W, 40);
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScanFace() {
  const navigate   = useNavigate();
  const { user }   = useAuthStore();
  const videoRef   = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);

  const [webcamReady,      setWebcamReady]      = useState(false);
  const [phase,            setPhase]            = useState<Phase>('idle');
  const [action,           setAction]           = useState<Action>('checkin');
  const [captureProgress,  setCaptureProgress]  = useState(0);
  const [captureTotal,     setCaptureTotal]      = useState(SCAN_SAMPLES);
  const [statusMsg,        setStatusMsg]         = useState('');
  const [successData,      setSuccessData]       = useState<{ msg: string; confidence?: number } | null>(null);
  const [failReason,       setFailReason]        = useState('');

  const {
    isLoaded, loadingStatus, error: faceApiError,
    snapshot, startLoop, stopLoop, waitForBlink, captureMultiSample,
  } = useFaceApi();

  // ── Webcam ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.onplaying = () => setWebcamReady(true);
        v.onloadeddata = () => v.play().catch(() => {});
      } catch {
        setFailReason('Camera access denied. Please allow camera and reload.');
        setPhase('failed');
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // ── Overlay render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const render = () => {
      if (videoRef.current && overlayRef.current && webcamReady) {
        drawOverlay(overlayRef.current, videoRef.current, snapshot, phase);
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [snapshot, phase, webcamReady]);

  // ── GPS helper ──────────────────────────────────────────────────────────────
  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(null),
        { timeout: 8000 },
      );
    });

  const fingerprint = () =>
    btoa(`${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}`);

  // ── Main scan flow ──────────────────────────────────────────────────────────
  const startScan = useCallback(async (sel: Action) => {
    if (!isLoaded || !webcamReady || !videoRef.current) return;
    setAction(sel);
    setFailReason('');
    setSuccessData(null);
    const totalSamples = sel === 'register' ? REGISTER_SAMPLES : SCAN_SAMPLES;
    setCaptureTotal(totalSamples);

    // ── 1. Align ────────────────────────────────────────────────────────────
    setPhase('aligning');
    setStatusMsg('Position your face clearly in the frame…');
    startLoop(videoRef.current);

    const alignDeadline = Date.now() + 15000;
    await new Promise<void>(resolve => {
      const t = setInterval(() => {
        if (snapshot.qualityOk || Date.now() > alignDeadline) { clearInterval(t); resolve(); }
      }, 150);
    });

    if (!snapshot.qualityOk && !snapshot.detected) {
      setPhase('failed');
      setFailReason('Could not detect your face. Move to a well-lit area and try again.');
      stopLoop(); return;
    }

    // ── 2. Liveness ─────────────────────────────────────────────────────────
    setPhase('liveness');
    setStatusMsg('Blink once slowly to prove you\'re real…');

    const blinked = await waitForBlink(14000);
    if (!blinked) {
      setPhase('failed');
      setFailReason('Liveness check failed — blink not detected. Please look at the camera and blink clearly.');
      stopLoop(); return;
    }

    // ── 3. Capture ──────────────────────────────────────────────────────────
    setPhase('capturing');
    setCaptureProgress(0);
    setStatusMsg(`Capturing ${totalSamples} frames for analysis…`);

    const tick = setInterval(() => {
      setCaptureProgress(p => Math.min(p + 1, totalSamples));
      setStatusMsg(prev => {
        const n = parseInt(prev.match(/\d+/)?.[0] ?? '0') + 1;
        return `Capturing face data… (${Math.min(n, totalSamples)}/${totalSamples})`;
      });
    }, 320);

    const result = await captureMultiSample(videoRef.current!, totalSamples);
    clearInterval(tick);
    setCaptureProgress(totalSamples);

    if (!result) {
      setPhase('failed');
      setFailReason('Not enough high-quality frames captured. Ensure good lighting and hold still.');
      stopLoop(); return;
    }

    stopLoop();
    setPhase('processing');

    try {
      if (sel === 'register') {
        setStatusMsg('Saving your face profile…');
        await api.post('/employee/face/register', {
          embedding:  Array.from(result.averaged),
          allSamples: result.samples,
        });
        setSuccessData({ msg: 'Face registered!' });
        setPhase('success');

      } else {
        setStatusMsg('Getting your GPS location…');
        const location = await getLocation();

        setStatusMsg('Verifying your identity…');
        const res = await api.post('/employee/attendance/scan', {
          embedding:         Array.from(result.averaged),
          allSamples:        result.samples,
          location,
          deviceFingerprint: fingerprint(),
        });

        const confidence = res.data.confidence ? Math.round(res.data.confidence * 100) : null;
        setSuccessData({
          msg: res.data.isCheckOut ? 'Checked Out!' : 'Checked In!',
          confidence: confidence ?? undefined,
        });
        setPhase('success');

        // Auto-return to home after 3 s
        setTimeout(() => navigate('/employee'), 3000);
      }

    } catch (err: any) {
      setPhase('failed');
      setFailReason(
        err.response?.data?.error ||
        err.response?.data?.hint  ||
        'Something went wrong. Please try again.'
      );
    }
  }, [isLoaded, webcamReady, snapshot, startLoop, stopLoop, waitForBlink, captureMultiSample, navigate]);

  const reset = () => {
    setPhase('idle'); setStatusMsg(''); setCaptureProgress(0);
    setSuccessData(null); setFailReason(''); stopLoop();
  };

  const ready       = isLoaded && webcamReady;
  const isProcessing = ['aligning','liveness','capturing','processing'].includes(phase);

  // ── Full-screen SUCCESS overlay ─────────────────────────────────────────────
  if (phase === 'success' && successData) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-500 px-6 text-white text-center">
        <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-16 h-16 text-white" />
        </div>
        <p className="text-4xl font-black mb-2">{successData.msg}</p>
        {successData.confidence !== undefined && (
          <p className="text-lg font-semibold text-green-100 mb-1">
            Match confidence: {successData.confidence}%
          </p>
        )}
        <p className="text-sm text-green-200 mt-2">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {action === 'register' && (
          <button
            onClick={reset}
            className="mt-8 px-6 py-3 rounded-2xl bg-white text-green-600 font-bold text-base active:scale-95 transition-all"
          >
            Done
          </button>
        )}
        {action === 'checkin' && (
          <p className="mt-6 text-green-200 text-sm">Returning to home…</p>
        )}
      </div>
    );
  }

  // ── Full-screen FAIL overlay ────────────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-5">
          <XCircle className="w-14 h-14 text-red-500" />
        </div>
        <p className="text-2xl font-black text-slate-800 mb-3">Scan Failed</p>
        <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">
          {failReason || 'Face verification failed. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-500 text-white font-bold text-base shadow-lg active:scale-95 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> Try Again
        </button>
      </div>
    );
  }

  // ── Main scan UI ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 pb-4">
      <h1 className="text-xl font-black text-slate-900 self-start">Face Scan</h1>

      {/* Camera */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-black aspect-[3/4] shadow-xl">

        {/* Loading */}
        {(!webcamReady || !isLoaded) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 gap-3">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-slate-300 text-sm">{!webcamReady ? 'Starting camera…' : loadingStatus}</span>
          </div>
        )}

        <video
          ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Phase pill */}
        {phase !== 'idle' && ready && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <PhasePill phase={phase} />
          </div>
        )}

        {/* Instruction badge */}
        {(phase === 'aligning' || phase === 'liveness') && ready && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border ${
              phase === 'liveness'
                ? 'bg-purple-900/80 border-purple-500/40 text-purple-100'
                : snapshot.qualityOk
                ? 'bg-green-900/80 border-green-500/40 text-green-100'
                : 'bg-amber-900/80 border-amber-500/40 text-amber-100'
            }`}>
              {phase === 'liveness' ? <Eye className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
              {phase === 'liveness' ? 'Blink once to verify liveness' : snapshot.qualityMsg || 'Align your face'}
            </div>
          </div>
        )}

        {/* Processing badge */}
        {phase === 'processing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/80 border border-blue-500/40 text-blue-100 backdrop-blur-md text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {statusMsg}
            </div>
          </div>
        )}

        {/* Capture progress */}
        {phase === 'capturing' && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(captureProgress / captureTotal) * 100}%` }}
              />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-900/80 border border-green-500/40 text-green-100 backdrop-blur-md text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Capturing frame {captureProgress} of {captureTotal}…
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {phase === 'idle' && !isProcessing && (
        <div className="w-full space-y-3">
          <button
            onClick={() => startScan('checkin')}
            disabled={!ready || isProcessing}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold text-base shadow-lg active:scale-95 transition-all"
          >
            <UserCheck className="w-5 h-5" />
            {!ready ? loadingStatus : 'Mark Attendance'}
          </button>

          <button
            onClick={() => startScan('register')}
            disabled={!ready || isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold disabled:opacity-40 active:scale-95 transition-all"
          >
            <ScanIcon className="w-4 h-4" />
            Register / Update Face
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {statusMsg || 'Processing…'}
        </div>
      )}

      {/* Steps guide */}
      {phase === 'idle' && ready && (
        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">How it works</p>
          <div className="space-y-2">
            {[
              { icon: '🎯', text: 'Align face in the frame — good lighting, straight on' },
              { icon: '👁️', text: 'Blink once to confirm you are real (anti-spoof)' },
              { icon: '📸', text: `${SCAN_SAMPLES} frames captured & averaged for accuracy` },
              { icon: '🔐', text: 'All 4 verification gates must pass to record attendance' },
              { icon: '📍', text: 'GPS location stamped on your attendance record' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                <span className="text-base">{s.icon}</span>
                {s.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {faceApiError && (
        <div className="w-full p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠️ {faceApiError}
        </div>
      )}
    </div>
  );
}

function PhasePill({ phase }: { phase: Phase }) {
  const MAP: Record<string, { label: string; cls: string }> = {
    aligning:   { label: '● Aligning',        cls: 'bg-amber-900/80 border-amber-500/40 text-amber-100' },
    liveness:   { label: '● Liveness Check',  cls: 'bg-purple-900/80 border-purple-500/40 text-purple-100' },
    capturing:  { label: '● Capturing',        cls: 'bg-green-900/80 border-green-500/40 text-green-100' },
    processing: { label: '● Verifying',        cls: 'bg-blue-900/80 border-blue-500/40 text-blue-100' },
  };
  const c = MAP[phase];
  if (!c) return null;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${c.cls}`}>
      {c.label}
    </span>
  );
}
