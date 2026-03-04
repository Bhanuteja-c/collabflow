// src/hooks/useAdaptiveBitrate.ts
// Monitors WebRTC stats and dynamically adjusts video encoding quality
// Based on packet loss and round-trip time, scales maxBitrate and resolution
"use client";

import { useEffect, useRef, useCallback } from "react";

interface QualityProfile {
    maxBitrate: number;     // bps
    scaleDown: number;      // scaleResolutionDownBy factor
    maxFramerate: number;
    label: string;
}

const QUALITY_PROFILES: QualityProfile[] = [
    { maxBitrate: 2500000, scaleDown: 1,   maxFramerate: 30, label: "HD" },
    { maxBitrate: 1200000, scaleDown: 1.5, maxFramerate: 24, label: "Medium" },
    { maxBitrate: 600000,  scaleDown: 2,   maxFramerate: 20, label: "Low" },
    { maxBitrate: 250000,  scaleDown: 3,   maxFramerate: 15, label: "Very Low" },
    { maxBitrate: 100000,  scaleDown: 4,   maxFramerate: 10, label: "Audio Priority" },
];

// Thresholds for quality adjustment
const PACKET_LOSS_UP = 0.01;   // < 1% loss → try higher quality
const PACKET_LOSS_DOWN = 0.05; // > 5% loss → reduce quality
const RTT_HIGH = 300;          // > 300ms RTT → reduce quality

export function useAdaptiveBitrate(
    peers: Array<{ socketId: string; connection: RTCPeerConnection }>,
    enabled: boolean = true
) {
    const qualityIndexRef = useRef<Map<string, number>>(new Map());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevStatsRef = useRef<Map<string, { bytesSent: number; timestamp: number; packetsLost: number; packetsSent: number }>>(new Map());

    const adjustQuality = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
        try {
            const stats = await pc.getStats();
            let packetsLost = 0;
            let packetsSent = 0;
            let roundTripTime = 0;
            let bytesSent = 0;
            let timestamp = 0;

            stats.forEach((report) => {
                if (report.type === "outbound-rtp" && report.kind === "video") {
                    packetsSent = report.packetsSent || 0;
                    bytesSent = report.bytesSent || 0;
                    timestamp = report.timestamp || Date.now();
                }
                if (report.type === "remote-inbound-rtp" && report.kind === "video") {
                    packetsLost = report.packetsLost || 0;
                    roundTripTime = (report.roundTripTime || 0) * 1000; // convert to ms
                }
            });

            if (packetsSent === 0) return;

            // Calculate incremental packet loss since last check
            const prev = prevStatsRef.current.get(socketId);
            let incrementalLoss = 0;

            if (prev) {
                const deltaPackets = packetsSent - prev.packetsSent;
                const deltaLost = packetsLost - prev.packetsLost;
                incrementalLoss = deltaPackets > 0 ? deltaLost / deltaPackets : 0;
            }

            prevStatsRef.current.set(socketId, { bytesSent, timestamp, packetsLost, packetsSent });

            if (!prev) return; // Need at least 2 samples

            const currentIndex = qualityIndexRef.current.get(socketId) ?? 0;

            let newIndex = currentIndex;

            // Decide direction
            if (incrementalLoss > PACKET_LOSS_DOWN || roundTripTime > RTT_HIGH) {
                // Network is struggling → reduce quality
                newIndex = Math.min(currentIndex + 1, QUALITY_PROFILES.length - 1);
            } else if (incrementalLoss < PACKET_LOSS_UP && roundTripTime < RTT_HIGH * 0.5) {
                // Network is healthy → try higher quality (slowly)
                newIndex = Math.max(currentIndex - 1, 0);
            }

            if (newIndex === currentIndex) return;

            qualityIndexRef.current.set(socketId, newIndex);
            const profile = QUALITY_PROFILES[newIndex];

            console.log(`[AdaptiveBitrate] ${socketId}: ${QUALITY_PROFILES[currentIndex].label} → ${profile.label} (loss: ${(incrementalLoss * 100).toFixed(1)}%, RTT: ${roundTripTime.toFixed(0)}ms)`);

            // Apply the new parameters to the video sender
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === "video");

            if (videoSender) {
                const params = videoSender.getParameters();
                if (params.encodings && params.encodings.length > 0) {
                    params.encodings[0].maxBitrate = profile.maxBitrate;
                    params.encodings[0].maxFramerate = profile.maxFramerate;
                    params.encodings[0].scaleResolutionDownBy = profile.scaleDown;
                    await videoSender.setParameters(params);
                }
            }
        } catch (err) {
            // Non-fatal — some browsers may not support all stats
        }
    }, []);

    useEffect(() => {
        if (!enabled || peers.length === 0) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Check stats every 5 seconds
        intervalRef.current = setInterval(() => {
            peers.forEach(peer => {
                adjustQuality(peer.socketId, peer.connection);
            });
        }, 5000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, peers, adjustQuality]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            qualityIndexRef.current.clear();
            prevStatsRef.current.clear();
        };
    }, []);
}
