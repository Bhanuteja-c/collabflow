// src/components/landing/AnimatedBackground.tsx
"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Large gradient orbs */}
      <motion.div
        className="orb w-[600px] h-[600px] bg-violet-500 -top-40 -left-40"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="orb w-[500px] h-[500px] bg-pink-500 top-1/3 -right-32"
        animate={{
          x: [0, -80, 30, 0],
          y: [0, 50, -30, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="orb w-[400px] h-[400px] bg-blue-500 bottom-0 left-1/3"
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -80, 20, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />
      <motion.div
        className="orb w-[350px] h-[350px] bg-cyan-400 top-2/3 right-1/4"
        animate={{
          x: [0, -40, 60, 0],
          y: [0, 40, -50, 0],
          scale: [0.95, 1.05, 1, 0.95],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
