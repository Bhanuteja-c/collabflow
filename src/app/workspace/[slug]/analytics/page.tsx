// src/app/workspace/[slug]/analytics/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  Zap,
  Users,
  Target,
  AlertTriangle,
} from "lucide-react";

interface Analytics {
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    totalPoints: number;
    completedPoints: number;
    totalTimeLogged: number;
  };
  columnDistribution: {
    columnId: string;
    title: string;
    category: string;
    color: string;
    count: number;
    points: number;
  }[];
  priorityDistribution: { priority: string; count: number }[];
  issueTypeDistribution: { type: string; count: number }[];
  velocity: { week: string; points: number; completed: number }[];
  memberWorkload: {
    userId: string;
    name: string;
    image: string | null;
    totalCards: number;
    completedCards: number;
    totalPoints: number;
    timeLogged: number;
  }[];
  timeTracking: { week: string; minutes: number }[];
}

const priorityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

const issueTypeLabels: Record<string, string> = {
  task: "Tasks",
  story: "Stories",
  bug: "Bugs",
  feature: "Features",
};

const issueTypeColors: Record<string, string> = {
  task: "#6366f1",
  story: "#22c55e",
  bug: "#ef4444",
  feature: "#f59e0b",
};

export default function AnalyticsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const slug = params?.slug as string;

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${slug}/analytics`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  const { summary, columnDistribution, priorityDistribution, issueTypeDistribution, velocity, memberWorkload, timeTracking } = data;
  const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const maxColCount = Math.max(...columnDistribution.map((c) => c.count), 1);
  const maxVelocityPoints = Math.max(...velocity.map((v) => v.points), 1);
  const maxVelocityCompleted = Math.max(...velocity.map((v) => v.completed), 1);
  const maxMemberCards = Math.max(...memberWorkload.map((m) => m.totalCards), 1);
  const maxTimeMinutes = Math.max(...timeTracking.map((t) => t.minutes), 1);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/30">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Project insights and performance metrics</p>
          </div>
        </motion.div>
      </div>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks", value: summary.total, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Completed", value: `${summary.completed} (${completionRate}%)`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Story Points", value: `${summary.completedPoints} / ${summary.totalPoints}`, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Time Logged", value: formatTime(summary.totalTimeLogged), icon: Clock, color: "text-violet-500", bg: "bg-violet-500/10" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              {/* Subtle gradient accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${card.bg}`} />
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1: Column Distribution + Priority/Type */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Task Distribution by Status
            </h3>
            <div className="space-y-3">
              {columnDistribution.map((col) => (
                <div key={col.columnId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{col.title}</span>
                    <span className="text-xs text-muted-foreground">{col.count} cards · {col.points} pts</span>
                  </div>
                  <div className="h-6 bg-muted/30 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((col.count / maxColCount) * 100, 2)}%` }}
                      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-lg flex items-center pl-2"
                      style={{ backgroundColor: col.color }}
                    >
                      {col.count > 0 && (
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">{col.count}</span>
                      )}
                    </motion.div>
                  </div>
                </div>
              ))}
              {columnDistribution.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No columns yet</p>
              )}
            </div>
          </motion.div>

          {/* Priority & Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-6"
          >
            {/* Priority */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">By Priority</h3>
              <div className="space-y-2">
                {priorityDistribution.map((p) => (
                  <div key={p.priority} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[p.priority] }} />
                    <span className="text-xs font-medium text-foreground capitalize flex-1">{p.priority}</span>
                    <span className="text-xs font-bold text-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue Type */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">By Type</h3>
              <div className="space-y-2">
                {issueTypeDistribution.map((t) => (
                  <div key={t.type} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: issueTypeColors[t.type] }} />
                    <span className="text-xs font-medium text-foreground flex-1">{issueTypeLabels[t.type] || t.type}</span>
                    <span className="text-xs font-bold text-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion ring */}
            <div className="flex flex-col items-center pt-2">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                  className="text-emerald-500"
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${completionRate * 2.51} ${251 - completionRate * 2.51}`}
                  strokeDashoffset="63"
                  style={{ transition: "stroke-dasharray 1s ease-out" }}
                />
                <text x="50" y="46" textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="18">{completionRate}%</text>
                <text x="50" y="62" textAnchor="middle" className="fill-muted-foreground" fontSize="9">complete</text>
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2: Velocity + Time Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Velocity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Velocity (Story Points / Week)
            </h3>
            <div className="h-[200px]">
              <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="40" y1={20 + i * 40} x2="390" y2={20 + i * 40} stroke="currentColor" className="text-border/30" strokeWidth="1" />
                ))}
                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <text key={i} x="35" y={24 + i * 40} textAnchor="end" className="fill-muted-foreground" fontSize="9">
                    {Math.round(maxVelocityPoints * (1 - i / 4))}
                  </text>
                ))}
                {/* Bars */}
                {velocity.map((v, i) => {
                  const barWidth = 30;
                  const gap = (350 - barWidth * 8) / 9;
                  const x = 40 + gap + i * (barWidth + gap);
                  const barHeight = maxVelocityPoints > 0 ? (v.points / maxVelocityPoints) * 160 : 0;
                  return (
                    <g key={i}>
                      <rect
                        x={x} y={180 - barHeight} width={barWidth} height={barHeight}
                        rx="4" fill="#6366f1" opacity="0.8"
                      />
                      {v.points > 0 && (
                        <text x={x + barWidth / 2} y={175 - barHeight} textAnchor="middle" className="fill-foreground" fontSize="9" fontWeight="600">
                          {v.points}
                        </text>
                      )}
                      <text x={x + barWidth / 2} y={196} textAnchor="middle" className="fill-muted-foreground" fontSize="7">
                        {v.week}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </motion.div>

          {/* Time Tracking Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              Time Logged (Hours / Week)
            </h3>
            <div className="h-[200px]">
              <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1="40" y1={20 + i * 40} x2="390" y2={20 + i * 40} stroke="currentColor" className="text-border/30" strokeWidth="1" />
                ))}
                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <text key={i} x="35" y={24 + i * 40} textAnchor="end" className="fill-muted-foreground" fontSize="9">
                    {formatTime(Math.round(maxTimeMinutes * (1 - i / 4)))}
                  </text>
                ))}
                {/* Bars */}
                {timeTracking.map((t, i) => {
                  const barWidth = 30;
                  const gap = (350 - barWidth * 8) / 9;
                  const x = 40 + gap + i * (barWidth + gap);
                  const barHeight = maxTimeMinutes > 0 ? (t.minutes / maxTimeMinutes) * 160 : 0;
                  return (
                    <g key={i}>
                      <rect
                        x={x} y={180 - barHeight} width={barWidth} height={barHeight}
                        rx="4" fill="#8b5cf6" opacity="0.8"
                      />
                      {t.minutes > 0 && (
                        <text x={x + barWidth / 2} y={175 - barHeight} textAnchor="middle" className="fill-foreground" fontSize="9" fontWeight="600">
                          {formatTime(t.minutes)}
                        </text>
                      )}
                      <text x={x + barWidth / 2} y={196} textAnchor="middle" className="fill-muted-foreground" fontSize="7">
                        {t.week}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Member Workload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Team Workload
          </h3>
          {memberWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No team members yet</p>
          ) : (
            <div className="space-y-4">
              {memberWorkload.map((member) => {
                const completionPct = member.totalCards > 0 ? Math.round((member.completedCards / member.totalCards) * 100) : 0;
                return (
                  <div key={member.userId} className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                      {member.image ? (
                        <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name[0]?.toUpperCase() || "?"
                      )}
                    </div>

                    {/* Name + stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground truncate">{member.name}</span>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{member.totalCards} cards</span>
                          <span>{member.totalPoints} pts</span>
                          {member.timeLogged > 0 && <span>{formatTime(member.timeLogged)}</span>}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-4 bg-muted/30 rounded-full overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max((member.totalCards / maxMemberCards) * 100, 3)}%` }}
                          transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full relative overflow-hidden"
                          style={{ backgroundColor: "#6366f1" }}
                        >
                          {/* Completed portion inside the bar */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${completionPct}%`,
                              backgroundColor: "#22c55e",
                            }}
                          />
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{completionPct}% done</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[9px] text-muted-foreground">Completed</span>
                          <div className="w-2 h-2 rounded-full bg-indigo-500 ml-1" />
                          <span className="text-[9px] text-muted-foreground">In Progress</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
