// src/hooks/useCountUp.ts
"use client";

import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
    end: number;
    duration?: number;
    start?: number;
    decimals?: number;
    suffix?: string;
    prefix?: string;
}

export function useCountUp({
    end,
    duration = 2000,
    start = 0,
    decimals = 0,
    suffix = "",
    prefix = "",
}: UseCountUpOptions) {
    const [count, setCount] = useState(start);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true);
                        animateCount();
                    }
                });
            },
            { threshold: 0.3 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    const animateCount = () => {
        const startTime = Date.now();
        const startValue = start;

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentCount = startValue + (end - startValue) * easeOut;

            setCount(Number(currentCount.toFixed(decimals)));

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        };

        requestAnimationFrame(tick);
    };

    const formattedCount = `${prefix}${count.toLocaleString()}${suffix}`;

    return { count, formattedCount, ref };
}
