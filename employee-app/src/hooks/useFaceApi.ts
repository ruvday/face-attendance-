import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
const LOCAL_URL = '/models';

const MODELS = [
  { net: faceapi.nets.ssdMobilenetv1, name: 'ssdMobilenetv1' },
  { net: faceapi.nets.faceLandmark68Net, name: 'faceLandmark68Net' },
  { net: faceapi.nets.faceRecognitionNet, name: 'faceRecognitionNet' },
];

export const useFaceApi = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  useEffect(() => {
    const loadModels = async () => {
      setLoadingStatus('Loading AI models...');

      // Try CDN first, then local fallback
      for (const baseUrl of [CDN_BASE, LOCAL_URL]) {
        try {
          setLoadingStatus(`Loading from ${baseUrl === CDN_BASE ? 'CDN' : 'local'}...`);
          await Promise.all(MODELS.map(m => m.net.loadFromUri(baseUrl)));
          console.log('[FaceAPI] Models loaded from:', baseUrl);
          setIsLoaded(true);
          setLoadingStatus('Ready');
          return;
        } catch (err) {
          console.warn('[FaceAPI] Failed to load from', baseUrl, err);
        }
      }

      setError('Could not load face recognition models. Check your internet connection.');
      setLoadingStatus('Failed');
    };

    loadModels();
  }, []);

  const waitForVideoReady = (video: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 3 && video.videoWidth > 0) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => reject(new Error('Video not ready')), 8000);
      const check = () => {
        if (video.readyState >= 3 && video.videoWidth > 0) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  const getEmbedding = async (videoEl: HTMLVideoElement): Promise<Float32Array | null> => {
    if (!isLoaded) {
      console.warn('[FaceAPI] Models not loaded yet.');
      return null;
    }

    try {
      // Wait until video has real frames
      await waitForVideoReady(videoEl);

      // Try up to 5 frames with increasing delay for best detection
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 300));
        }

        // Capture a static frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(videoEl, 0, 0);

        console.log(`[FaceAPI] Attempt ${attempt + 1} — frame ${canvas.width}x${canvas.height}`);

        // Try with SsdMobilenetv1 at low threshold
        let detection = await faceapi
          .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        // Try even more lenient
        if (!detection) {
          detection = await faceapi
            .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.05 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
        }

        if (detection) {
          console.log('[FaceAPI] Face detected! Score:', detection.detection.score);
          return detection.descriptor;
        }
      }

      console.warn('[FaceAPI] No face detected after 5 attempts.');
      return null;
    } catch (err) {
      console.error('[FaceAPI] Detection error:', err);
      return null;
    }
  };

  return { isLoaded, error, loadingStatus, getEmbedding };
};
