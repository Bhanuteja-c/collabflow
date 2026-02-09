
import { useEffect, useRef, useState } from 'react';

export function useAudioAnalysis(stream: MediaStream | null) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!stream) {
            setIsSpeaking(false);
            return;
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled) {
            setIsSpeaking(false);
            return;
        }

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVolume = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                if (Date.now() - lastVolumeUpdate > 50) {
                    setVolume(average);
                    lastVolumeUpdate = Date.now();
                }

                // Threshold for detecting speech
                const threshold = 15;

                if (average > threshold) {
                    setIsSpeaking(true);
                    // Clear any existing silence timeout
                    if (speechTimeoutRef.current) {
                        clearTimeout(speechTimeoutRef.current);
                        speechTimeoutRef.current = null;
                    }
                } else if (isSpeaking) {
                    // Add a small delay before switching off speaking state to prevent flickering
                    if (!speechTimeoutRef.current) {
                        speechTimeoutRef.current = setTimeout(() => {
                            setIsSpeaking(false);
                            speechTimeoutRef.current = null;
                        }, 500);
                    }
                }

                rafRef.current = requestAnimationFrame(checkVolume);
            };

            let lastVolumeUpdate = 0;
            checkVolume();

            return () => {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                source.disconnect();
                analyser.disconnect();
                if (audioContext.state !== 'closed') {
                    audioContext.close();
                }
            };
        } catch (error) {
            console.error("Error initializing audio analysis:", error);
        }
    }, [stream]);

    return { isSpeaking, volume };
}
