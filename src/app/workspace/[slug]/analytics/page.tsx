// src/app/workspace/[slug]/analytics/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, CheckCircle2, Clock,
  Loader2, Zap, Users, Target, AlertTriangle, ArrowUpRight,
  Activity, Flame, Award,
} from "lucide-react";
import { DateRangePicker, DateRange } from "@/components/analytics/DateRangePicker";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadialBarChart, RadialBar,
} from "recharts";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ── Types ─────────────────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#10b981", none: "#94a3b8",
};

const priorityLabels: Record<string, string> = {
  high: "High", medium: "Medium", low: "Low", none: "None",
};

const issueTypeLabels: Record<string, string> = {
  task: "Tasks", story: "Stories", bug: "Bugs", feature: "Features",
};

const issueTypeColors: Record<string, string> = {
  task: "#6366f1", story: "#22c55e", bug: "#ef4444", feature: "#f59e0b",
};

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];

// ── Custom Tooltip ────────────────────────────────────────────────────
interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function ChartTooltip({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-lg shadow-xl px-3.5 py-2.5 text-sm">
      {label && <p className="text-[11px] text-muted-foreground font-medium mb-1.5">{label}</p>}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground text-xs">{item.name}:</span>
          <span className="font-semibold text-foreground text-xs">
            {formatter ? formatter(item.value, item.name) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({
  label, value, subtitle, icon: Icon, color, bg, trend, delay,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  trend?: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 group hover:shadow-lg hover:shadow-primary/5 transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${bg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </motion.div>
  );
}

// ── Section Card Wrapper ──────────────────────────────────────────────
function ChartCard({
  children, title, icon, delay, className = "",
}: {
  children: React.ReactNode;
  title: string;
  icon: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const slug = params?.slug as string;

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange) {
          queryParams.append("dateStart", dateRange.start);
          queryParams.append("dateEnd", dateRange.end);
        }
        const res = await fetch(`/api/workspaces/${slug}/analytics?${queryParams.toString()}`);
        if (res.ok) setData(await res.json());
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [slug, dateRange]);

  // ── Computed stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data) return null;
    const { summary, velocity, memberWorkload } = data;
    const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
    const avgVelocity = velocity.length > 0
      ? Math.round(velocity.reduce((sum, v) => sum + v.points, 0) / velocity.length)
      : 0;
    const topContributor = memberWorkload.reduce((top, m) =>
      m.completedCards > (top?.completedCards ?? 0) ? m : top, memberWorkload[0]);

    return { completionRate, avgVelocity, topContributor };
  }, [data]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // ── Loading / Error ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data || !stats) {
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
  const { completionRate, avgVelocity, topContributor } = stats;
  const maxColCount = Math.max(...columnDistribution.map((c) => c.count), 1);

  // Prepare velocity data with cumulative points
  const velocityWithCumulative = velocity.map((v, i) => ({
    ...v,
    cumulative: velocity.slice(0, i + 1).reduce((sum, w) => sum + w.points, 0),
  }));

  // Prepare priority data for donut
  const priorityPieData = priorityDistribution.filter(p => p.count > 0).map(p => ({
    name: priorityLabels[p.priority] || p.priority,
    value: p.count,
    fill: priorityColors[p.priority] || "#94a3b8",
  }));

  // Prepare issue type pie data
  const typePieData = issueTypeDistribution.filter(t => t.count > 0).map(t => ({
    name: issueTypeLabels[t.type] || t.type,
    value: t.count,
    fill: issueTypeColors[t.type] || "#94a3b8",
  }));

  // Prepare team workload with completion percentage
  const teamData = memberWorkload.map(m => ({
    ...m,
    remaining: m.totalCards - m.completedCards,
    completionPct: m.totalCards > 0 ? Math.round((m.completedCards / m.totalCards) * 100) : 0,
  }));

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-border/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-xs text-muted-foreground lg:max-w-md line-clamp-2">
              {dateRange
                ? `${format(new Date(dateRange.start + "T00:00:00"), "MMM d, yyyy")} — ${format(new Date(dateRange.end + "T00:00:00"), "MMM d, yyyy")}`
                : "Last 30 days · All boards"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full xl:w-auto"
        >
          <DateRangePicker onChange={setDateRange} defaultRange={dateRange || undefined} />
        </motion.div>
      </div>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* ── Summary Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Tasks"
            value={summary.total}
            subtitle={`${summary.inProgress} in progress`}
            icon={Target} color="text-blue-500" bg="bg-blue-500/10"
            delay={0}
          />
          <StatCard
            label="Completed"
            value={`${completionRate}%`}
            subtitle={`${summary.completed} of ${summary.total} tasks`}
            icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-500/10"
            delay={0.05}
          />
          <StatCard
            label="Story Points"
            value={`${summary.completedPoints}`}
            subtitle={`of ${summary.totalPoints} total points`}
            icon={Zap} color="text-amber-500" bg="bg-amber-500/10"
            delay={0.1}
          />
          <StatCard
            label="Avg Velocity"
            value={`${avgVelocity} pts`}
            subtitle="per week"
            icon={Activity} color="text-primary" bg="bg-primary/10"
            delay={0.15}
          />
          <StatCard
            label="Time Logged"
            value={formatTime(summary.totalTimeLogged)}
            subtitle={`across ${timeTracking.filter(t => t.minutes > 0).length} weeks`}
            icon={Clock} color="text-violet-500" bg="bg-violet-500/10"
            delay={0.2}
          />
        </div>

        {/* ── Row 1: Status Distribution + Priority / Type Donut ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column Distribution Bar */}
          <ChartCard
            title="Task Distribution by Status"
            icon={<BarChart3 className="w-4 h-4 text-primary" />}
            delay={0.25}
            className="lg:col-span-2"
          >
            <div className="space-y-3">
              {columnDistribution.map((col) => (
                <div key={col.columnId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-medium text-foreground">{col.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {col.count} cards · {col.points} pts
                    </span>
                  </div>
                  <div className="h-7 bg-muted/30 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((col.count / maxColCount) * 100, 3)}%` }}
                      transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-lg flex items-center px-2.5 relative overflow-hidden"
                      style={{ backgroundColor: col.color }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                      {col.count > 0 && (
                        <span className="text-[10px] font-bold text-white drop-shadow-sm relative z-10">{col.count}</span>
                      )}
                    </motion.div>
                  </div>
                </div>
              ))}
              {columnDistribution.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No columns yet</p>
              )}
            </div>
          </ChartCard>

          {/* Priority + Type + Completion Ring */}
          <ChartCard
            title="Breakdown"
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            delay={0.3}
          >
            <div className="space-y-5">
              {/* Completion Donut */}
              <div className="flex justify-center">
                {summary.total === 0 ? (
                  <div className="w-[160px] h-[160px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
                ) : (
                  <div className="relative">
                    <PieChart width={160} height={160}>
                      <Pie
                        data={[
                          { name: "Completed", value: summary.completed },
                          { name: "Remaining", value: summary.total - summary.completed },
                        ]}
                        cx={80} cy={80}
                        innerRadius={52} outerRadius={72}
                        dataKey="value" strokeWidth={0}
                        startAngle={90} endAngle={-270}
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
                      <span className="text-[10px] text-muted-foreground font-medium">complete</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Priority</h4>
                <div className="space-y-1.5">
                  {priorityDistribution.map((p) => {
                    const total = priorityDistribution.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                    return (
                      <div key={p.priority} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[p.priority] }} />
                        <span className="text-xs text-foreground capitalize flex-1">{priorityLabels[p.priority] || p.priority}</span>
                        <span className="text-[11px] text-muted-foreground">{pct}%</span>
                        <span className="text-xs font-bold text-foreground w-6 text-right">{p.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issue Type */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Type</h4>
                <div className="space-y-1.5">
                  {issueTypeDistribution.map((t) => (
                    <div key={t.type} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: issueTypeColors[t.type] }} />
                      <span className="text-xs text-foreground flex-1">{issueTypeLabels[t.type] || t.type}</span>
                      <span className="text-xs font-bold text-foreground w-6 text-right">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ── Row 2: Velocity Area + Time Tracking ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Velocity Chart — Area + Bar combination */}
          <ChartCard
            title="Sprint Velocity"
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            delay={0.35}
          >
            <div className="h-[300px]">
              {velocity.every(v => v.points === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No velocity data</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={velocityWithCumulative}>
                    <defs>
                      <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="week" fontSize={10} tickMargin={10} />
                    <YAxis fontSize={10} width={35} />
                    <Tooltip
                      content={<ChartTooltip />}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    />
                    <Area
                      type="monotone" dataKey="points" name="Story Points"
                      stroke="#6366f1" strokeWidth={2}
                      fill="url(#velocityGradient)"
                      dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{ r: 5, stroke: "#6366f1", strokeWidth: 2, fill: "#fff" }}
                    />
                    <Area
                      type="monotone" dataKey="completed" name="Tasks Done"
                      stroke="#10b981" strokeWidth={2}
                      fill="url(#completedGradient)"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          {/* Time Tracking — Gradient Bar */}
          <ChartCard
            title="Time Logged per Week"
            icon={<Clock className="w-4 h-4 text-violet-500" />}
            delay={0.4}
          >
            <div className="h-[300px]">
              {timeTracking.every(t => t.minutes === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No time data</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeTracking}>
                    <defs>
                      <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="week" fontSize={10} tickMargin={10} />
                    <YAxis
                      fontSize={10}
                      width={40}
                      tickFormatter={(val) => Math.floor(val / 60) + "h"}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(val) => `${Math.floor(val / 60)}h ${val % 60}m`} />
                      }
                    />
                    <Bar dataKey="minutes" name="Time Logged" fill="url(#timeGradient)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* ── Row 3: Team Workload ─────────────────────────────────── */}
        <ChartCard
          title="Team Workload"
          icon={<Users className="w-4 h-4 text-blue-500" />}
          delay={0.45}
        >
          {memberWorkload.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No team members yet</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stacked Bar Chart */}
              <div className="lg:col-span-2 h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis type="number" fontSize={10} />
                    <YAxis
                      dataKey="name" type="category" width={100} fontSize={11}
                      tick={{ fill: "#a1a1aa" }}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "#d4d4d8", opacity: 0.15 }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="completedCards" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Member Cards */}
              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                {teamData.map((member, i) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border bg-card/50 transition-colors"
                  >
                    <UserAvatar user={member} className="h-8 w-8 border border-border/50" showStatus={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {member.completedCards}/{member.totalCards} tasks
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{member.totalPoints} pts</span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${member.completionPct}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${member.completionPct >= 80 ? "text-emerald-500" : member.completionPct >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                      {member.completionPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* ── Row 4: Quick Insights ────────────────────────────────── */}
        {(summary.total > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {/* Insight: Top Contributor */}
            {topContributor && topContributor.completedCards > 0 && (
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Contributor</p>
                  <p className="text-sm font-bold truncate">{topContributor.name}</p>
                  <p className="text-[11px] text-muted-foreground">{topContributor.completedCards} tasks completed</p>
                </div>
              </div>
            )}

            {/* Insight: Avg Velocity */}
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Velocity</p>
                <p className="text-sm font-bold">{avgVelocity} points/week</p>
                <p className="text-[11px] text-muted-foreground">over {velocity.length} week{velocity.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Insight: Burn rate */}
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Points Done</p>
                <p className="text-sm font-bold">
                  {summary.totalPoints > 0
                    ? `${Math.round((summary.completedPoints / summary.totalPoints) * 100)}%`
                    : "—"
                  }
                </p>
                <p className="text-[11px] text-muted-foreground">{summary.completedPoints} of {summary.totalPoints} points</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
