// src/components/video/Whiteboard.tsx
// Collaborative whiteboard overlay with drawing tools, synced via Socket.IO
// Enhanced: touch support, Bézier smoothing, Ctrl+Z undo, stroke count, laser pointer
"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Pen, Eraser, Trash2, Undo2,
  Minus, MousePointer2, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: "pen" | "highlighter" | "eraser" | "laser";
  text?: string;
}

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#f44336", label: "Red" },
  { value: "#ff9800", label: "Orange" },
  { value: "#ffeb3b", label: "Yellow" },
  { value: "#4caf50", label: "Green" },
  { value: "#2196f3", label: "Blue" },
  { value: "#9c27b0", label: "Purple" },
  { value: "#e91e63", label: "Pink" },
];

type ToolType = "pen" | "highlighter" | "eraser" | "laser";

const TOOLS: { id: ToolType; icon: any; label: string; shortcut: string }[] = [
  { id: "pen", icon: Pen, label: "Pen", shortcut: "P" },
  { id: "highlighter", icon: Minus, label: "Highlighter", shortcut: "H" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
  { id: "laser", icon: MousePointer2, label: "Laser pointer", shortcut: "L" },
];

const BRUSH_SIZES = [
  { value: 2, label: "S" },
  { value: 4, label: "M" },
  { value: 8, label: "L" },
  { value: 14, label: "XL" },
];

export function Whiteboard({ isOpen, onClose, roomId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const laserRef = useRef<Point | null>(null);
  const laserTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to socket for whiteboard events
  useEffect(() => {
    if (!isOpen) return;

    const socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("whiteboard-draw", (data: { stroke: Stroke }) => {
      strokesRef.current.push(data.stroke);
      setStrokeCount(strokesRef.current.length);
      redraw();
    });

    socket.on("whiteboard-clear", () => {
      strokesRef.current = [];
      setStrokeCount(0);
      redraw();
    });

    socket.on("whiteboard-undo", (data: { strokeId: string }) => {
      strokesRef.current = strokesRef.current.filter(s => s.id !== data.strokeId);
      setStrokeCount(strokesRef.current.length);
      redraw();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Canvas sizing
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx?.scale(dpr, dpr);
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); handleUndo(); return; }
      if (e.key === "p" || e.key === "P") setTool("pen");
      if (e.key === "h" || e.key === "H") setTool("highlighter");
      if (e.key === "e" || e.key === "E") setTool("eraser");
      if (e.key === "l" || e.key === "L") setTool("laser");
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Draw a smooth Bézier path through the points
  const drawSmoothStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const pts = stroke.points;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    else if (stroke.tool === "highlighter") { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.35; }
    else ctx.globalCompositeOperation = "source-over";

    ctx.moveTo(pts[0].x, pts[0].y);

    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      // Quadratic Bézier — use midpoints as on-curve points for smoothness
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      // Connect to last point
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    strokesRef.current.forEach((stroke) => {
      if (stroke.tool === "laser") return; // Laser strokes are ephemeral
      drawSmoothStroke(ctx, stroke);
    });
  }, [drawSmoothStroke]);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY || 0 : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "laser") {
      laserRef.current = getPoint(e);
      return;
    }
    setIsDrawing(true);
    const point = getPoint(e);
    currentStrokeRef.current = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      points: [point],
      color: tool === "eraser" ? "#000000" : color,
      width: tool === "eraser" ? brushSize * 4 : tool === "highlighter" ? brushSize * 3 : brushSize,
      tool,
    };
  }, [getPoint, color, brushSize, tool]);

  const moveDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "laser") {
      const pt = getPoint(e);
      laserRef.current = pt;
      // Draw the laser dot
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        redraw(); // Clear and redraw strokes first
        // Draw laser dot with glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0000";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (!isDrawing || !currentStrokeRef.current) return;
    const point = getPoint(e);
    currentStrokeRef.current.points.push(point);

    // Live smooth preview
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, (canvas?.width || 0) / dpr, (canvas?.height || 0) / dpr);

    // Redraw committed strokes
    strokesRef.current.forEach((stroke) => {
      if (stroke.tool === "laser") return;
      drawSmoothStroke(ctx, stroke);
    });

    // Draw current in-progress stroke
    drawSmoothStroke(ctx, currentStrokeRef.current);
  }, [isDrawing, getPoint, tool, redraw, drawSmoothStroke]);

  const endDraw = useCallback(() => {
    if (tool === "laser") {
      laserRef.current = null;
      if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
      laserTimeoutRef.current = setTimeout(() => redraw(), 100);
      return;
    }

    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);

    const stroke = currentStrokeRef.current;
    if (stroke.points.length >= 2) {
      strokesRef.current.push(stroke);
      setStrokeCount(strokesRef.current.length);
      socketRef.current?.emit("whiteboard-draw", { roomId, stroke });
    }
    currentStrokeRef.current = null;
  }, [isDrawing, roomId, tool, redraw]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    setStrokeCount(0);
    redraw();
    socketRef.current?.emit("whiteboard-clear", { roomId });
  }, [redraw, roomId]);

  const handleUndo = useCallback(() => {
    const last = strokesRef.current.pop();
    if (last) {
      setStrokeCount(strokesRef.current.length);
      redraw();
      socketRef.current?.emit("whiteboard-undo", { roomId, strokeId: last.id });
    }
  }, [redraw, roomId]);

  const cursorStyle = tool === "eraser"
    ? "cursor-cell"
    : tool === "laser"
    ? "cursor-none"
    : "cursor-crosshair";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30"
        >
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            className={cn("absolute inset-0 touch-none", cursorStyle)}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
          />

          {/* Toolbar */}
          <AnimatePresence>
            {showToolbar && (
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#303134]/95 backdrop-blur-md border border-[#5f6368]/30 rounded-2xl px-4 py-2.5 shadow-2xl z-40"
              >
                {/* Tools */}
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all relative group",
                      tool === t.id
                        ? "bg-[#8ab4f8]/20 text-[#8ab4f8] shadow-sm shadow-[#8ab4f8]/10"
                        : "text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed]"
                    )}
                    title={`${t.label} (${t.shortcut})`}
                  >
                    <t.icon className="w-4 h-4" />
                    {/* Active indicator dot */}
                    {tool === t.id && (
                      <motion.div
                        layoutId="tool-indicator"
                        className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#8ab4f8]"
                      />
                    )}
                  </button>
                ))}

                <div className="w-px h-7 bg-[#5f6368]/30 mx-1" />

                {/* Colors */}
                <div className="flex items-center gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => { setColor(c.value); if (tool === "eraser" || tool === "laser") setTool("pen"); }}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all border-2",
                        color === c.value && tool !== "eraser" && tool !== "laser"
                          ? "border-[#8ab4f8] scale-125 shadow-md"
                          : "border-transparent hover:scale-110"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="w-px h-7 bg-[#5f6368]/30 mx-1" />

                {/* Brush size buttons */}
                <div className="flex items-center gap-0.5">
                  {BRUSH_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setBrushSize(s.value)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                        brushSize === s.value
                          ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                          : "text-[#5f6368] hover:text-[#9aa0a6] hover:bg-[#3c4043]"
                      )}
                      title={`Size: ${s.label}`}
                    >
                      <div
                        className="rounded-full bg-current"
                        style={{ width: s.value + 2, height: s.value + 2 }}
                      />
                    </button>
                  ))}
                </div>

                <div className="w-px h-7 bg-[#5f6368]/30 mx-1" />

                {/* Actions */}
                <button
                  onClick={handleUndo}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors disabled:opacity-30"
                  title="Undo (Ctrl+Z)"
                  disabled={strokeCount === 0}
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#ea4335] transition-colors disabled:opacity-30"
                  title="Clear all"
                  disabled={strokeCount === 0}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Stroke counter */}
                {strokeCount > 0 && (
                  <span className="text-[10px] text-[#5f6368] tabular-nums ml-0.5">
                    {strokeCount}
                  </span>
                )}

                <div className="w-px h-7 bg-[#5f6368]/30 mx-1" />

                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9aa0a6] hover:bg-[#ea4335]/20 hover:text-[#ea4335] transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle toolbar visibility */}
          <button
            onClick={() => setShowToolbar(p => !p)}
            className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full bg-[#303134]/80 backdrop-blur flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] transition-colors"
            title={showToolbar ? "Hide toolbar" : "Show toolbar"}
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
