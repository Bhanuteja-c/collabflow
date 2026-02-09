
import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelfieSegmentation as SelfieSegmentationType, Results } from '@mediapipe/selfie_segmentation';

export function useVirtualBackground(sourceStream: MediaStream | null, initialEnabled: boolean = false) {
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
    const [isBlurEnabled, setIsBlurEnabled] = useState(initialEnabled);
    const [isLoading, setIsLoading] = useState(false);

    const segmentationRef = useRef<SelfieSegmentationType | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const requestRef = useRef<number | null>(null);
    const scriptLoadedRef = useRef(false);

    // Initialize MediaPipe
    useEffect(() => {
        let instance: SelfieSegmentationType | null = null;

        const loadMediaPipe = async () => {
            if (scriptLoadedRef.current) return;

            // Load script if not already loaded globally
            if (!(window as any).SelfieSegmentation) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
                    script.crossOrigin = 'anonymous';
                    script.onload = () => resolve();
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }
            scriptLoadedRef.current = true;

            // Initialize instance
            const SelfieSegmentation = (window as any).SelfieSegmentation;
            if (!SelfieSegmentation) {
                console.error("Failed to load SelfieSegmentation");
                return;
            }

            const newInstance = new SelfieSegmentation({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            newInstance.setOptions({
                modelSelection: 1, // 0: general, 1: landscape
                selfieMode: false,
            });

            instance = newInstance;

            newInstance.onResults((results: Results) => {
                if (!canvasRef.current) return;
                const canvasCtx = canvasRef.current.getContext('2d');
                if (!canvasCtx) return;

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw segmentation mask
                canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw the blur
                canvasCtx.globalCompositeOperation = 'source-in';
                canvasCtx.filter = 'blur(10px)'; // Blur intensity
                canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw the person on top
                canvasCtx.filter = 'none';
                canvasCtx.globalCompositeOperation = 'destination-over';
                canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

                canvasCtx.restore();
            });

            segmentationRef.current = instance;
        };

        loadMediaPipe();

        return () => {
            instance?.close();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Create video and canvas elements once
    useEffect(() => {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.width = 640; // Default resolution
        canvas.height = 360;
        canvasRef.current = canvas;

        const stream = canvas.captureStream(30);
        setProcessedStream(stream);
    }, []);


    // Processing loop
    const processVideo = useCallback(async () => {
        if (
            !isBlurEnabled ||
            !segmentationRef.current ||
            !videoRef.current ||
            !canvasRef.current ||
            videoRef.current.readyState < 2
        ) {
            requestRef.current = requestAnimationFrame(processVideo);
            return;
        }

        try {
            await segmentationRef.current.send({ image: videoRef.current });
        } catch (error) {
            console.error("SelfieSegmentation error:", error);
        }

        requestRef.current = requestAnimationFrame(processVideo);
    }, [isBlurEnabled]);

    // Handle stream updates
    useEffect(() => {
        if (videoRef.current && sourceStream) {
            videoRef.current.srcObject = sourceStream;
            videoRef.current.play().catch(e => console.error("Error playing video for segmentation:", e));
        }
    }, [sourceStream]);

    // Start/Stop processing loop
    useEffect(() => {
        if (isBlurEnabled) {
            setIsLoading(true);
            requestRef.current = requestAnimationFrame(processVideo);
            setIsLoading(false);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isBlurEnabled, processVideo]);


    const toggleBlur = useCallback(() => {
        setIsBlurEnabled(prev => !prev);
    }, []);

    return {
        processedStream: isBlurEnabled ? processedStream : null,
        isBlurEnabled,
        toggleBlur,
        setBlurEnabled: setIsBlurEnabled,
        isLoading
    };
}
