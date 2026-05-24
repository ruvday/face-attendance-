import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFaceApi } from '../../hooks/useFaceApi';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { ScanFace as ScanIcon, Loader2 } from 'lucide-react';

export default function ScanFace() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { isLoaded, error: faceApiError, getEmbedding } = useFaceApi();
  const { toast } = useToast();

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamReady(true);
      }
    } catch (err) {
      console.error('Error accessing webcam', err);
      toast({
        title: 'Webcam Error',
        description: 'Please allow webcam access to use face recognition.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    startWebcam();
    return () => {
      // Cleanup webcam
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const generateFingerprint = () => {
    const nav = window.navigator;
    const screen = window.screen;
    const fp = `${nav.userAgent}-${screen.width}x${screen.height}-${nav.language}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    return btoa(fp);
  };

  const getLocation = (): Promise<{latitude: number, longitude: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => resolve(null), // optionally handle denied location
        { timeout: 5000 }
      );
    });
  };

  const handleScan = useCallback(async (action: 'register' | 'checkin') => {
    if (!videoRef.current || !isLoaded) return;
    
    setIsScanning(true);
    try {
      const embedding = await getEmbedding(videoRef.current);
      
      if (!embedding) {
        toast({
          title: 'Face not detected',
          description: 'Please position your face clearly in the camera view.',
          variant: 'destructive',
        });
        setIsScanning(false);
        return;
      }

      let location = null;
      let deviceFingerprint = null;

      if (action === 'checkin') {
        location = await getLocation();
        if (!location) {
          toast({
            title: 'Location Required',
            description: 'GPS location is required to mark attendance.',
            variant: 'destructive'
          });
          setIsScanning(false);
          return;
        }
        deviceFingerprint = generateFingerprint();
      }

      const endpoint = action === 'register' ? '/employee/face/register' : '/employee/attendance/scan';
      
      const response = await api.post(endpoint, {
        embedding: Array.from(embedding), // Convert Float32Array to standard array for JSON
        location,
        deviceFingerprint
      });

      toast({
        title: 'Success',
        description: response.data.message,
      });

    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || `Failed to ${action}`,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  }, [getEmbedding, isLoaded, toast]);

  if (faceApiError) {
    return <div className="text-red-500">Error loading face recognition models: {faceApiError}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Face Authentication</CardTitle>
          <CardDescription>
            Register your face or scan to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
            {!isWebcamReady && <div className="text-slate-400 animate-pulse">Initializing webcam...</div>}
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${!isWebcamReady ? 'hidden' : ''} ${!isLoaded ? 'opacity-50' : ''}`}
            />
            {(!isLoaded) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>Loading AI Models...</span>
                </div>
              </div>
            )}
            {isScanning && (
              <div className="absolute inset-0 border-4 border-blue-500 animate-pulse pointer-events-none rounded-lg" />
            )}
          </div>

          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => handleScan('register')} 
              disabled={!isLoaded || !isWebcamReady || isScanning}
              variant="outline"
              className="w-40"
            >
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanIcon className="w-4 h-4 mr-2" />}
              Register Face
            </Button>
            <Button 
              onClick={() => handleScan('checkin')} 
              disabled={!isLoaded || !isWebcamReady || isScanning}
              className="w-40 bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanIcon className="w-4 h-4 mr-2" />}
              Mark Attendance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
