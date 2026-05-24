import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFaceApi } from '../../hooks/useFaceApi';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { ScanFace as ScanIcon, Loader2, Camera, CheckCircle2 } from 'lucide-react';

export default function ScanFace() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const { isLoaded, error: faceApiError, loadingStatus, getEmbedding } = useFaceApi();
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for actual playback to start before marking as ready
          videoRef.current.onplaying = () => setIsWebcamReady(true);
          videoRef.current.onloadeddata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }
      } catch (err) {
        console.error('Webcam error:', err);
        toast({
          title: 'Camera Error',
          description: 'Please allow camera access and reload the page.',
          variant: 'destructive',
        });
      }
    };

    startWebcam();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const generateFingerprint = () => {
    const nav = window.navigator;
    const fp = `${nav.userAgent}-${window.screen.width}x${window.screen.height}-${nav.language}`;
    return btoa(fp);
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleScan = useCallback(async (action: 'register' | 'checkin') => {
    if (!videoRef.current || !isLoaded || !isWebcamReady) return;

    setIsScanning(true);
    setScanStatus('Looking for your face...');

    try {
      const embedding = await getEmbedding(videoRef.current);

      if (!embedding) {
        toast({
          title: 'Face Not Detected',
          description: 'Make sure your face is clearly visible, well-lit, and looking at the camera.',
          variant: 'destructive',
        });
        setScanStatus('');
        setIsScanning(false);
        return;
      }

      setScanStatus(action === 'register' ? 'Saving face data...' : 'Verifying identity...');

      let location = null;
      let deviceFingerprint = null;

      if (action === 'checkin') {
        setScanStatus('Getting your location...');
        location = await getLocation();
        if (!location) {
          toast({
            title: 'Location Required',
            description: 'Please enable GPS/location to mark attendance.',
            variant: 'destructive',
          });
          setScanStatus('');
          setIsScanning(false);
          return;
        }
        deviceFingerprint = generateFingerprint();
      }

      const endpoint = action === 'register' ? '/employee/face/register' : '/employee/attendance/scan';
      setScanStatus('Communicating with server...');

      const response = await api.post(endpoint, {
        embedding: Array.from(embedding),
        location,
        deviceFingerprint,
      });

      setScanStatus('Done!');
      toast({
        title: action === 'register' ? '✅ Face Registered!' : '✅ Attendance Marked!',
        description: response.data.message,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || `Failed to ${action}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => { setIsScanning(false); setScanStatus(''); }, 1000);
    }
  }, [getEmbedding, isLoaded, isWebcamReady, toast]);

  if (faceApiError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <p className="text-red-400">⚠️ AI Model Error: {faceApiError}</p>
            <p className="text-sm text-slate-400 mt-2">Check your internet connection and reload the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Face Authentication
          </CardTitle>
          <CardDescription>
            Register your face once, then use it to mark attendance daily
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Camera Feed */}
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner">
            {/* Loading overlay */}
            {(!isWebcamReady || !isLoaded) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-3 z-10">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">
                  {!isWebcamReady ? 'Starting camera...' : loadingStatus}
                </span>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isWebcamReady ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: 'scaleX(-1)' }} /* Mirror for natural selfie view */
            />

            {/* Scanning animation */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-4 border-blue-500 rounded-xl animate-pulse" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <span className="bg-black/70 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
                    {scanStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Face guide overlay */}
            {isWebcamReady && isLoaded && !isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-56 border-2 border-white/30 rounded-full" />
              </div>
            )}
          </div>

          {/* Tips */}
          {isWebcamReady && isLoaded && (
            <div className="text-xs text-slate-400 flex gap-4 justify-center">
              <span>💡 Good lighting</span>
              <span>👁️ Look straight ahead</span>
              <span>📏 Keep face centered</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => handleScan('register')}
              disabled={!isLoaded || !isWebcamReady || isScanning}
              variant="outline"
              className="w-44"
              id="btn-register-face"
            >
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanIcon className="w-4 h-4 mr-2" />}
              Register Face
            </Button>
            <Button
              onClick={() => handleScan('checkin')}
              disabled={!isLoaded || !isWebcamReady || isScanning}
              className="w-44 bg-blue-600 hover:bg-blue-700"
              id="btn-mark-attendance"
            >
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Mark Attendance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
