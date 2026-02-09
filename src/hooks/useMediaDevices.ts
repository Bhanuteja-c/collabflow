
import { useState, useEffect, useCallback } from 'react';

export interface MediaDevicesState {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
}

export function useMediaDevices() {
    const [devices, setDevices] = useState<MediaDevicesState>({
        cameras: [],
        microphones: [],
        speakers: [],
    });

    const getDevices = useCallback(async () => {
        try {
            // Request permission first to get labels
            // Note: This might trigger a permission prompt if not already granted
            // However, we usually call this after getUserMedia has succeeded once or if we suspect permission is granted.
            // If we call enumerateDevices without permission, labels are empty.

            const allDevices = await navigator.mediaDevices.enumerateDevices();

            const cameras = allDevices.filter(d => d.kind === 'videoinput' && d.deviceId !== "");
            const microphones = allDevices.filter(d => d.kind === 'audioinput' && d.deviceId !== "");
            const speakers = allDevices.filter(d => d.kind === 'audiooutput' && d.deviceId !== "");

            setDevices({ cameras, microphones, speakers });
        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    }, []);

    useEffect(() => {
        getDevices();

        const handleDeviceChange = () => {
            getDevices();
        };

        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
    }, [getDevices]);

    return {
        ...devices,
        refreshDevices: getDevices,
    };
}
