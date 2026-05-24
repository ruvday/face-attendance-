import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const LOCAL_URL = '/models';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

// ── Accuracy constants ────────────────────────────────────────────────────────
const MIN_DETECTION_SCORE  = 0.55;   // Minimum face detection confidence
const MIN_FACE_WIDTH_RATIO = 0.18;   // Face must fill ≥18% of frame width
const MAX_OFFSET_RATIO     = 0.28;   // Face centre must be within 28% of frame centre
const MIN_BRIGHTNESS       = 40;     // Average pixel luminance (0-255)
const MAX_BRIGHTNESS       = 220;    // Avoid overexposed frames
const EAR_BLINK_THRESHOLD  = 0.20;   // EAR below this → eyes closed
const EAR_OPEN_THRESHOLD   = 0.26;   // EAR above this → eyes open
const LOOP_FPS             = 15;     // Detection loop frequency

// 68-point indices for eyes
const LEFT_EYE  = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];

export interface DetectionSnapshot {
  detected:   boolean;
  score:      number;
  box:        { x: number; y: number; w: number; h: number } | null;
  qualityOk:  boolean;
  qualityMsg: string;
  ear:        number;
  eyesClosed: boolean;
}

const DEFAULT_SNAP: DetectionSnapshot = {
  detected: false, score: 0, box: null,
  qualityOk: false, qualityMsg: 'Position your face in the frame',
  ear: 0.3, eyesClosed: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function dist(a: faceapi.Point, b: faceapi.Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(landmarks: faceapi.FaceLandmarks68): number {
  const pts = landmarks.positions;
  const L = LEFT_EYE, R = RIGHT_EYE;
  const earL = (dist(pts[L[1]], pts[L[5]]) + dist(pts[L[2]], pts[L[4]])) / (2 * dist(pts[L[0]], pts[L[3]]));
  const earR = (dist(pts[R[1]], pts[R[5]]) + dist(pts[R[2]], pts[R[4]])) / (2 * dist(pts[R[0]], pts[R[3]]));
  return (earL + earR) / 2;
}

function measureBrightness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 128;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

export function averageEmbeddings(embeddings: Float32Array[]): Float32Array {
  const len = embeddings[0].length;
  const avg = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    avg[i] = embeddings.reduce((s, e) => s + e[i], 0) / embeddings.length;
  }
  return avg;
}

async function captureFrame(video: HTMLVideoElement): Promise<HTMLCanvasElement | null> {
  if (!video || video.videoWidth === 0 || video.readyState < 2) return null;
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return c;
}

async function detectOnCanvas(canvas: HTMLCanvasElement) {
  return faceapi
    .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_DETECTION_SCORE }))
    .withFaceLandmarks()
    .withFaceDescriptor();
}

function buildSnapshot(
  det: Awaited<ReturnType<typeof detectOnCanvas>>,
  videoW: number, videoH: number,
  brightness?: number
): DetectionSnapshot {
  if (!det) return DEFAULT_SNAP;

  const box    = det.detection.box;
  const score  = det.detection.score;
  const ear    = computeEAR(det.landmarks);

  const faceCenterX  = box.x + box.width / 2;
  const faceCenterY  = box.y + box.height / 2;
  const offsetX      = Math.abs(faceCenterX - videoW / 2) / videoW;
  const offsetY      = Math.abs(faceCenterY - videoH / 2) / videoH;
  const widthRatio   = box.width / videoW;

  let qualityOk  = true;
  let qualityMsg = 'Hold still — looking good!';

  if (brightness !== undefined && brightness < MIN_BRIGHTNESS) {
    qualityOk = false; qualityMsg = 'Too dark — find better lighting';
  } else if (brightness !== undefined && brightness > MAX_BRIGHTNESS) {
    qualityOk = false; qualityMsg = 'Too bright — avoid direct light';
  } else if (widthRatio < MIN_FACE_WIDTH_RATIO) {
    qualityOk = false; qualityMsg = 'Move closer to the camera';
  } else if (offsetX > MAX_OFFSET_RATIO) {
    qualityOk = false; qualityMsg = faceCenterX < videoW / 2 ? 'Move right' : 'Move left';
  } else if (offsetY > MAX_OFFSET_RATIO) {
    qualityOk = false; qualityMsg = faceCenterY < videoH / 2 ? 'Move down' : 'Move up';
  } else if (score < MIN_DETECTION_SCORE) {
    qualityOk = false; qualityMsg = 'Look straight at the camera';
  }

  return {
    detected: true, score,
    box: { x: box.x, y: box.y, w: box.width, h: box.height },
    qualityOk, qualityMsg, ear,
    eyesClosed: ear < EAR_BLINK_THRESHOLD,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useFaceApi = () => {
  const [isLoaded,      setIsLoaded]      = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error,         setError]         = useState<string | null>(null);
  const [snapshot,      setSnapshot]      = useState<DetectionSnapshot>(DEFAULT_SNAP);

  const loopRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotRef   = useRef<DetectionSnapshot>(DEFAULT_SNAP);
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const isLoadedRef   = useRef(false);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      for (const base of [LOCAL_URL, CDN_BASE]) {
        try {
          setLoadingStatus(base === LOCAL_URL ? 'Loading models...' : 'Fetching from CDN...');
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(base),
            faceapi.nets.faceLandmark68Net.loadFromUri(base),
            faceapi.nets.faceRecognitionNet.loadFromUri(base),
          ]);
          isLoadedRef.current = true;
          setIsLoaded(true);
          setLoadingStatus('Ready');
          return;
        } catch { /* try next */ }
      }
      setError('Failed to load face models. Check your connection and reload.');
      setLoadingStatus('Error');
    };
    loadModels();
  }, []);

  const startLoop = useCallback((video: HTMLVideoElement) => {
    if (loopRef.current) clearInterval(loopRef.current);
    videoRef.current = video;

    loopRef.current = setInterval(async () => {
      if (!isLoadedRef.current) return;
      const canvas = await captureFrame(video);
      if (!canvas) return;
      try {
        const brightness = measureBrightness(canvas);
        const det  = await detectOnCanvas(canvas);
        const snap = buildSnapshot(det, video.videoWidth, video.videoHeight, brightness);
        snapshotRef.current = snap;
        setSnapshot({ ...snap });
      } catch { /* skip bad frame */ }
    }, Math.round(1000 / LOOP_FPS));
  }, []);

  const stopLoop = useCallback(() => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    snapshotRef.current = DEFAULT_SNAP;
    setSnapshot(DEFAULT_SNAP);
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

  /** Wait for a real blink (eyes close then open). Returns true if detected before timeout. */
  const waitForBlink = useCallback((timeoutMs = 14000): Promise<boolean> => {
    return new Promise((resolve) => {
      let phase: 'open' | 'closed' = 'open';
      const deadline = Date.now() + timeoutMs;

      const poll = setInterval(() => {
        if (Date.now() > deadline) { clearInterval(poll); resolve(false); return; }
        const { ear, detected } = snapshotRef.current;
        if (!detected) return; // don't count when no face
        if (phase === 'open'   && ear < EAR_BLINK_THRESHOLD) phase = 'closed';
        else if (phase === 'closed' && ear > EAR_OPEN_THRESHOLD) { clearInterval(poll); resolve(true); }
      }, 60);
    });
  }, []);

  /**
   * Capture `n` high-quality frames and return averaged embedding + all samples.
   * Requires ≥70% of frames to pass ALL quality checks before accepting.
   */
  const captureMultiSample = useCallback(
    async (video: HTMLVideoElement, n: number): Promise<{ averaged: Float32Array; samples: number[][] } | null> => {
      if (!isLoadedRef.current) return null;

      const embeddings: Float32Array[] = [];
      const GAP_MS = 300;

      for (let i = 0; i < n; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, GAP_MS));
        const canvas = await captureFrame(video);
        if (!canvas) continue;
        try {
          const brightness = measureBrightness(canvas);
          // Reject frames with bad brightness
          if (brightness < MIN_BRIGHTNESS || brightness > MAX_BRIGHTNESS) continue;

          const det = await detectOnCanvas(canvas);
          if (!det) continue;

          const snap = buildSnapshot(det, video.videoWidth, video.videoHeight, brightness);
          // Only accept frames where quality is fully OK
          if (snap.qualityOk && det.detection.score >= MIN_DETECTION_SCORE) {
            embeddings.push(det.descriptor);
          }
        } catch { /* skip */ }
      }

      // Require at least 70% of attempted frames to be high quality
      const minRequired = Math.ceil(n * 0.7);
      if (embeddings.length < minRequired) return null;

      const averaged = averageEmbeddings(embeddings);
      const samples  = embeddings.map(e => Array.from(e));
      return { averaged, samples };
    },
    []
  );

  return {
    isLoaded, loadingStatus, error,
    snapshot, snapshotRef,
    startLoop, stopLoop,
    waitForBlink, captureMultiSample,
  };
};
