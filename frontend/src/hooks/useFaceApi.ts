import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

// Premium high-speed jsDelivr CDN URL with Cloudflare edge caching
const CDN_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
const LOCAL_URL = '/models';

export const useFaceApi = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Attempting to load face-api.js models from high-speed CDN...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
        ]);
        console.log('Face-api.js models loaded successfully from CDN (Aggressively cached)!');
        setIsLoaded(true);
      } catch (err: any) {
        console.warn('Failed to load models from CDN. Falling back to local host /models...', err);
        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(LOCAL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_URL)
          ]);
          console.log('Face-api.js models loaded successfully from local host!');
          setIsLoaded(true);
        } catch (localErr: any) {
          console.error('All model loading strategies failed:', localErr);
          setError(localErr.message || 'Failed to load face-api models');
        }
      }
    };

    loadModels();
  }, []);

  const getEmbedding = async (videoEl: HTMLVideoElement): Promise<Float32Array | null> => {
    if (!isLoaded) {
      console.warn("Face-api models are not loaded yet.");
      return null;
    }

    if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      console.warn("Video element is not ready or has 0 dimensions.");
      return null;
    }

    try {
      // Draw frame to offscreen canvas for deterministic image reading
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Failed to get 2d context for offscreen canvas");
        return null;
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      console.log(`Captured static frame: ${canvas.width}x${canvas.height}. Starting detection...`);

      // Detect face with standard 0.35 confidence threshold
      let detection = await faceapi
        .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Fallback with lenient 0.15 confidence threshold
      if (!detection) {
        console.log("Face not detected at 0.35. Retrying with highly lenient 0.15...");
        detection = await faceapi
          .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!detection) {
        console.warn("No face detected in the frame.");
        return null;
      }

      console.log("Face successfully detected!", detection.detection.score);
      return detection.descriptor;
    } catch (err) {
      console.error("Error during face detection / embedding extraction:", err);
      return null;
    }
  };

  return { isLoaded, error, getEmbedding };
};
