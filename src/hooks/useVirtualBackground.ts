
import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelfieSegmentation as SelfieSegmentationType, Results } from '@mediapipe/selfie_segmentation';

export type BackgroundMode = 'none' | 'blur' | 'image';

export function useVirtualBackground(sourceStream: MediaStream | null, initialEnabled: boolean = false) {
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
    const [isBlurEnabled, setIsBlurEnabled] = useState(initialEnabled);
    const [isLoading, setIsLoading] = useState(false);
    const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(initialEnabled ? 'blur' : 'none');
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const backgroundModeRef = useRef<BackgroundMode>(initialEnabled ? 'blur' : 'none');

    const segmentationRef = useRef<SelfieSegmentationType | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const requestRef = useRef<number | null>(null);
    const scriptLoadedRef = useRef(false);
    // Gate ref — prevents all work after unmount or cleanup
    const isActiveRef = useRef(true);
    const isClosedRef = useRef(false);

    // Lazy-load MediaPipe only when blur is first enabled
    const initMediaPipe = useCallback(async () => {
        if (segmentationRef.current || isClosedRef.current) return;

        try {
            // Load script if not already loaded globally
            if (!(window as any).SelfieSegmentation) {
                if (scriptLoadedRef.current) return; // Script loaded once but class missing
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
                    script.crossOrigin = 'anonymous';
                    script.onload = () => resolve();
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
                scriptLoadedRef.current = true;
            }

            // Bail if component unmounted while we were loading
            if (!isActiveRef.current) return;

            const SelfieSegmentation = (window as any).SelfieSegmentation;
            if (!SelfieSegmentation) {
                console.error("[VirtualBG] SelfieSegmentation class not found");
                return;
            }

            const instance = new SelfieSegmentation({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            instance.setOptions({
                modelSelection: 1,
                selfieMode: false,
            });

            instance.onResults((results: Results) => {
                if (!canvasRef.current || !isActiveRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;

                ctx.save();
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                // 1. Draw the semantic mask (white where the person is)
                ctx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // 2. Draw the clear user. `source-in` means "only draw where the canvas already has pixels (the mask)"
                ctx.globalCompositeOperation = 'source-in';
                ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // 3. Draw the background behind the person
                ctx.globalCompositeOperation = 'destination-over';
                if (backgroundImageRef.current && backgroundModeRef.current === 'image') {
                    // Draw custom background image, covering the full canvas
                    ctx.drawImage(backgroundImageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                } else {
                    // Default: blurred camera feed
                    ctx.filter = 'blur(12px)';
                    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
                }

                ctx.restore();
            });

            // Final check before storing
            if (!isActiveRef.current) {
                instance.close();
                return;
            }

            segmentationRef.current = instance;
        } catch (error) {
            console.warn("[VirtualBG] Init failed (non-fatal):", error);
        }
    }, []);

    // Create video and canvas elements once
    useEffect(() => {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        canvasRef.current = canvas;

        const stream = canvas.captureStream(30);
        setProcessedStream(stream);
    }, []);

    // Processing loop — guarded by isActiveRef and isClosedRef
    const processVideo = useCallback(async () => {
        // Stop immediately if unmounted or blur disabled
        if (!isActiveRef.current || isClosedRef.current || backgroundModeRef.current === 'none') {
            return;
        }

        if (
            segmentationRef.current &&
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState >= 2
        ) {
            try {
                // Await the send() resolution. This prevents flooding the WebAssembly bridge
                // with synchronous frames which causes the model to lock up and freeze the canvas.
                await segmentationRef.current.send({ image: videoRef.current });
            } catch (error: any) {
                const msg = String(error?.message || error);
                if (!msg.includes('deleted') && !msg.includes('memory access')) {
                    console.warn("[VirtualBG] Processing error:", msg);
                }
            }
        }

        // Always queue the next frame if we are still active *after* processing
        if (isActiveRef.current && (backgroundModeRef.current as BackgroundMode) !== 'none' && !isClosedRef.current) {
            requestRef.current = requestAnimationFrame(processVideo);
        }
    }, []);

    // Handle stream updates — guard the play() call and wait for metadata
    useEffect(() => {
        if (videoRef.current && sourceStream) {
            videoRef.current.srcObject = sourceStream;
            
            // Wait until the video actually loads the metadata to have valid width/height
            // Otherwise MediaPipe fails to process the 0x0 video element and outputs black.
            videoRef.current.onloadeddata = () => {
                if (!videoRef.current || !canvasRef.current) return;
                
                // Inherit actual camera dimensions
                const width = videoRef.current.videoWidth || 640;
                const height = videoRef.current.videoHeight || 360;
                videoRef.current.width = width;
                videoRef.current.height = height;
                canvasRef.current.width = width;
                canvasRef.current.height = height;

                const playPromise = videoRef.current.play();
                if (playPromise) {
                    playPromise.catch(() => {
                        // Silently ignore — happens when source changes rapidly
                    });
                }
            };
        }
    }, [sourceStream]);

    // Start/Stop processing loop — lazy-init MediaPipe on first enable
    useEffect(() => {
        if (backgroundMode !== 'none' && isActiveRef.current) {
            setIsLoading(true);
            initMediaPipe().then(() => {
                if (!isActiveRef.current) return;
                setIsLoading(false);
                requestRef.current = requestAnimationFrame(processVideo);
            });
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };
    }, [backgroundMode, processVideo, initMediaPipe]);

    // Cleanup on unmount — mark inactive BEFORE closing to prevent race
    useEffect(() => {
        isActiveRef.current = true;
        isClosedRef.current = false;

        return () => {
            // 1. Mark inactive first — stops all loops immediately
            isActiveRef.current = false;

            // 2. Cancel any pending animation frame
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }

            // 3. Close MediaPipe instance after a tick to let pending send() finish
            const instance = segmentationRef.current;
            if (instance) {
                isClosedRef.current = true;
                segmentationRef.current = null;
                // Delay close to avoid "deleted object" error from in-flight send()
                setTimeout(() => {
                    try {
                        instance.close();
                    } catch {
                        // Already closed or invalid — ignore
                    }
                }, 100);
            }
        };
    }, []);

    const toggleBlur = useCallback(() => {
        const next = backgroundModeRef.current === 'blur' ? 'none' : 'blur';
        backgroundModeRef.current = next;
        setBackgroundMode(next);
        setIsBlurEnabled(next !== 'none');
    }, []);

    const setBackgroundImage = useCallback((url: string | null) => {
        if (!url) {
            backgroundImageRef.current = null;
            backgroundModeRef.current = 'none';
            setBackgroundMode('none');
            setIsBlurEnabled(false);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            backgroundImageRef.current = img;
            backgroundModeRef.current = 'image';
            setBackgroundMode('image');
            setIsBlurEnabled(true);
        };
        img.onerror = () => {
            console.warn('[VirtualBG] Failed to load background image:', url);
        };
        img.src = url;
    }, []);

    return {
        processedStream: backgroundMode !== 'none' ? processedStream : null,
        isBlurEnabled,
        backgroundMode,
        toggleBlur,
        setBlurEnabled: setIsBlurEnabled,
        setBackgroundImage,
        isLoading
    };
}
