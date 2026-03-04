// src/hooks/useNoiseSuppression.ts
// Noise suppression using Web Audio API — noise gate + high-pass + low-pass filters
// This eliminates background hum, fan noise, and keyboard clicks.
"use client";

import { useCallback, useRef, useState } from "react";

export function useNoiseSuppression() {
    const [isEnabled, setIsEnabled] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const originalStreamRef = useRef<MediaStream | null>(null);

    // Noise gate parameters
    const GATE_THRESHOLD = -50; // dB — signals below this are gated
    const GATE_ATTACK = 0.005;  // seconds — how fast the gate opens
    const GATE_RELEASE = 0.05;  // seconds — how fast the gate closes

    const processNoisegate = useCallback(() => {
        if (!analyserRef.current || !gainNodeRef.current || !audioContextRef.current) return;

        const analyser = analyserRef.current;
        const gain = gainNodeRef.current;
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        // Calculate RMS volume in dB
        let rms = 0;
        for (let i = 0; i < bufferLength; i++) {
            rms += dataArray[i] * dataArray[i];
        }
        rms = Math.sqrt(rms / bufferLength);
        const db = 20 * Math.log10(Math.max(rms, 1e-10));

        // Open/close the gate
        const now = audioContextRef.current.currentTime;
        if (db > GATE_THRESHOLD) {
            // Signal is above threshold — open gate quickly
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(1, now, GATE_ATTACK);
        } else {
            // Signal is below threshold — close gate smoothly
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(0, now, GATE_RELEASE);
        }

        animFrameRef.current = requestAnimationFrame(processNoisegate);
    }, []);

    const enableSuppression = useCallback((stream: MediaStream): MediaStream => {
        if (audioContextRef.current) {
            // Already enabled, return existing processed stream
            return destinationRef.current?.stream || stream;
        }

        try {
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            originalStreamRef.current = stream;

            // Source from the mic stream
            const source = audioContext.createMediaStreamSource(stream);
            sourceNodeRef.current = source;

            // High-pass filter — removes low-frequency rumble (AC hum, fans)
            const highpass = audioContext.createBiquadFilter();
            highpass.type = "highpass";
            highpass.frequency.value = 85; // Hz — cut below 85Hz
            highpass.Q.value = 0.7;

            // Low-pass filter — removes high-frequency hiss
            const lowpass = audioContext.createBiquadFilter();
            lowpass.type = "lowpass";
            lowpass.frequency.value = 14000; // Hz — human speech tops out ~8kHz
            lowpass.Q.value = 0.7;

            // Notch filter — remove 50/60Hz power line hum
            const notch = audioContext.createBiquadFilter();
            notch.type = "notch";
            notch.frequency.value = 50;
            notch.Q.value = 10;

            // Compressor — evens out loud/quiet speech
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 12;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Noise gate via gain node
            const gain = audioContext.createGain();
            gain.gain.value = 1;
            gainNodeRef.current = gain;

            // Analyser for noise gate level detection
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyserRef.current = analyser;

            // Audio graph: source → highpass → notch → lowpass → analyser → gain → compressor → destination
            const destination = audioContext.createMediaStreamDestination();
            destinationRef.current = destination;

            source.connect(highpass);
            highpass.connect(notch);
            notch.connect(lowpass);
            lowpass.connect(analyser);
            analyser.connect(gain);
            gain.connect(compressor);
            compressor.connect(destination);

            // Start noise gate processing loop
            animFrameRef.current = requestAnimationFrame(processNoisegate);

            setIsEnabled(true);

            // Return a new stream that combines the processed audio with the original video track
            const processedStream = new MediaStream();
            destination.stream.getAudioTracks().forEach(t => processedStream.addTrack(t));
            stream.getVideoTracks().forEach(t => processedStream.addTrack(t));

            return processedStream;
        } catch (err) {
            console.warn("[NoiseSuppression] Failed to initialize:", err);
            return stream;
        }
    }, [processNoisegate]);

    const disableSuppression = useCallback((): MediaStream | null => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        sourceNodeRef.current?.disconnect();
        gainNodeRef.current?.disconnect();
        analyserRef.current?.disconnect();

        if (audioContextRef.current?.state !== "closed") {
            audioContextRef.current?.close().catch(() => {});
        }

        audioContextRef.current = null;
        sourceNodeRef.current = null;
        gainNodeRef.current = null;
        analyserRef.current = null;
        destinationRef.current = null;

        setIsEnabled(false);

        return originalStreamRef.current;
    }, []);

    const cleanup = useCallback(() => {
        disableSuppression();
        originalStreamRef.current = null;
    }, [disableSuppression]);

    return {
        isEnabled,
        enableSuppression,
        disableSuppression,
        cleanup,
    };
}
