import { useState, useEffect } from 'react';

// Cache to prevent re-calculating the same image URL multiple times during a session
const colorCache = new Map<string, string>();

/**
 * Extracts the average dominant color from an image URL and generates a dark,
 * aesthetic gradient similar to Google Meet's profile backgrounds.
 */
export function useDominantColor(imageUrl?: string | null): string | null {
    const [gradient, setGradient] = useState<string | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setGradient(null);
            return;
        }

        // Return cached gradient immediately if we've already processed this image
        if (colorCache.has(imageUrl)) {
            setGradient(colorCache.get(imageUrl)!);
            return;
        }

        let isMounted = true;
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Required to read pixels from external URLs like Google/GitHub avatars
        img.src = imageUrl;

        img.onload = () => {
            if (!isMounted) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!ctx) return;

            // Scale down drastically for performance; we only need an average color
            canvas.width = 32;
            canvas.height = 32;

            ctx.drawImage(img, 0, 0, 32, 32);

            try {
                const imageData = ctx.getImageData(0, 0, 32, 32);
                const data = imageData.data;
                let r = 0, g = 0, b = 0, count = 0;

                // Sample every 4th pixel for speed (4 bytes per pixel * 4 skip = 16)
                for (let i = 0; i < data.length; i += 16) {
                    // Ignore transparent or nearly-transparent pixels
                    if (data[i + 3] < 128) continue;

                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }

                if (count > 0) {
                    // Calculate average
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);

                    // To match the Google Meet aesthetic, we need to artificially darken the average
                    // and create a deep gradient from the color.

                    // Deepen base color by roughly 50%
                    const darkR = Math.floor(r * 0.4);
                    const darkG = Math.floor(g * 0.4);
                    const darkB = Math.floor(b * 0.4);

                    // Deepen even further for the edge gradient
                    const darkerR = Math.floor(r * 0.15);
                    const darkerG = Math.floor(g * 0.15);
                    const darkerB = Math.floor(b * 0.15);

                    const generatedGradient = `radial-gradient(circle at center, rgb(${darkR}, ${darkG}, ${darkB}) 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 100%)`;
                    
                    colorCache.set(imageUrl, generatedGradient);
                    setGradient(generatedGradient);
                }
            } catch (err) {
                console.warn("[useDominantColor] Fast extraction failed (likely CORS issue with avatar domain)", err);
                // Fail silently, component will fall back to default name-based gradient
            }
        };

        img.onerror = () => {
            console.warn("[useDominantColor] Failed to load image for color extraction", imageUrl);
        };

        return () => {
            isMounted = false;
        };
    }, [imageUrl]);

    return gradient;
}
