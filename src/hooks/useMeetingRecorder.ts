// src/hooks/useMeetingRecorder.ts
// Client-side meeting recording using MediaRecorder API → local .webm download
"use client";

import { useState, useRef, useCallback } from "react";

export function useMeetingRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            // Capture the entire screen + audio
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "browser" } as any,
                audio: true,
            });

            const recorder = new MediaRecorder(displayStream, {
                mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
                    ? "video/webm;codecs=vp9,opus"
                    : "video/webm",
            });

            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `meeting-recording-${new Date().toISOString().slice(0, 19)}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                chunksRef.current = [];

                // Stop all tracks
                displayStream.getTracks().forEach((t) => t.stop());
            };

            // Handle screen share stop event (user clicks browser stop)
            displayStream.getVideoTracks()[0].addEventListener("ended", () => {
                if (mediaRecorderRef.current?.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
                setIsRecording(false);
            });

            recorder.start(1000); // Record in 1s chunks
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            console.warn("[Recorder] Failed to start recording:", err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
    };
}
