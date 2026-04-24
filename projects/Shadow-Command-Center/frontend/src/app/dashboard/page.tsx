'use client'

import { useState, useEffect } from 'react'
import { Activity, Cpu, HardDrive, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ────────────────────────────────────────────────────
interface Metrics { throughput: number; latency: number; errors: number; uptime: number; ts: string }
interface LogEntry { id: number; level: 'info' | 'warn' | 'error'; message: string; ts: string }
interface SystemHealth { status: 'healthy' | 'degraded' | 'down'; cpu: number; mem: number; memTotal: number }

// ── Mock data generators ────────────────────────────────────
function genMetrics(base: Partial<Metrics> = {}): Metrics {
  const jitter = () => (Math.random() - 0.5) * 20
  return {
    throughput: Math.max(0, (base.throughput ?? 2400) + jitter()),
    latency: Math.max(1, (base.latency ?? 42) + jitter() * 0.5),
    errors: Math.max(0, (base.errors ?? 2) + (Math.random() > 0.9 ? 1 : 0)),
    uptime: (base.uptime ?? 99.7) + (Math.random() - 0.4) * 0.3,
    ts: new Date().toISOString(),
  }
}

function genLogs(count = 30): LogEntry[] {
  const messages = [
    'Gateway health check passed',
    'New connection established',
    'Request routed to upstream',
    'Cache hit ratio: 94.2%',
    'Circuit breaker closed',
    'Rate limit applied to client',
    'TLS handshake completed',
    'Upstream timeout — retrying',
    'Memory pressure threshold reached',
    'WebSocket message broadcast',
  ]
  const levels: Array<'info' | 'warn' | 'error'> = ['info', 'info', 'info', 'info', 'warn', 'error', 'info', 'info', 'warn', 'info']
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() - i * 1000,
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    ts: new Date(Date.now() - i * 8000).toISOString(),
  }))
}

// ── Components ───────────────────────────────────────────────

function StatusBadge({ status }: { status: SystemHealth['status'] }) {
  const map = {
    healthy: { label: 'Operational', cls: 'text-success bg-success/10 border-success/20' },
    degraded: { label: 'Degraded', cls: 'text-warning bg-warning/10 border-warning/20' },
    down: { label: 'Down', cls: 'text-error bg-error/10 border-error/20' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {status === 'healthy' ? <CheckCircle2 size={12} /> : status === 'degraded' ? <AlertTriangle size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  )
}

function MetricCard({ icon: Icon, label, value, unit, delta, trend }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; delta?: number; trend?: 'up' | 'down'
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-accent/10">
          <Icon size={18} className="text-accent" />
        </div>
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-success' : 'text-error'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-text-secondary text-sm ml-1">{unit}</span>}
      </div>
      <div className="text-text-secondary text-xs mt-1">{label}</div>
    </div>
  )
}

function LatencyChart({ data }: { data: Metrics[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium mb-4">Latency (ms)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data.slice(-20)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="ts" tickFormatter={v => format(new Date(v), 'HH:mm')} stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            labelFormatter={v => format(new Date(v), 'HH:mm:ss')}
          />
          <Line type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ThroughputChart({ data }: { data: Metrics[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium mb-4">Throughput (req/min)</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data.slice(-20)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="ts" tickFormatter={v => format(new Date(v), 'HH:mm')} stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            labelFormatter={v => format(new Date(v), 'HH:mm:ss')}
          />
          <Line type="monotone" dataKey="throughput" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function LogStream({ logs }: { logs: LogEntry[] }) {
  const levelColors = { info: 'text-accent', warn: 'text-warning', error: 'text-error' }
  const levelIcons = { info: '●', warn: '▲', error: '✕' }
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium mb-4">Self-Heal Logs</h3>
      <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2 py-0.5">
            <span className={`${levelColors[log.level]} shrink-0 mt-0.5`}>{levelIcons[log.level]}</span>
            <span className="text-text-secondary shrink-0">{format(new Date(log.ts), 'HH:mm:ss')}</span>
            <span className={`${levelColors[log.level]} flex-1`}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CrashHistory() {
  const crashes = [
    { id: 1, ts: '2026-04-23 14:32:07', reason: 'Memory exhaustion — OOM kill', duration: '3s', recovered: true },
    { id: 2, ts: '2026-04-21 09:15:43', reason: 'Upstream timeout cascade', duration: '11s', recovered: true },
    { id: 3, ts: '2026-04-18 22:07:01', reason: 'SIGKILL — container restart', duration: '28s', recovered: true },
  ]
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium mb-4">Crash History</h3>
      <div className="space-y-2">
        {crashes.map(c => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div>
              <div className="text-xs font-medium">{c.reason}</div>
              <div className="text-text-secondary text-xs">{c.ts}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">down {c.duration}</span>
              {c.recovered && <span className="text-success text-xs">✓ recovered</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [latest, setLatest] = useState<Partial<Metrics>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [health] = useState<SystemHealth>({ status: 'healthy', cpu: 34, mem: 1847, memTotal: 4096 })

  useEffect(() => {
    // Seed with initial data
    const seed = Array.from({ length: 20 }, (_, i) => genMetrics({ throughput: 2200 + i * 10, latency: 40 + i * 0.5, errors: 1, uptime: 99.5 + i * 0.02 }))
    setMetrics(seed)
    setLatest(seed[seed.length - 1])
    setLogs(genLogs(30))

    // Real-time updates every 2s
    const interval = setInterval(() => {
      setMetrics(prev => {
        const last = prev[prev.length - 1] ?? genMetrics()
        const next = genMetrics(last)
        return [...prev.slice(-49), next]
      })
      setLatest(prev => genMetrics(prev))
      setLogs(prev => [genLogs(1)[0], ...prev.slice(0, 29)])
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            <span className="font-semibold text-sm">Shadow CC</span>
          </div>
          <div className="text-text-secondary text-xs mt-0.5">Command Center</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { icon: Activity, label: 'Dashboard', active: true },
            { icon: HardDrive, label: 'Logs', active: false },
            { icon: Cpu, label: 'Processes', active: false },
            { icon: AlertTriangle, label: 'Alerts', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <StatusBadge status={health.status} />
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">CPU</span>
              <span className="font-medium">{health.cpu}%</span>
            </div>
            <div className="w-full bg-surface-elevated rounded-full h-1">
              <div className="bg-accent h-1 rounded-full" style={{ width: `${health.cpu}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">MEM</span>
              <span className="font-medium">{health.mem}MB</span>
            </div>
            <div className="w-full bg-surface-elevated rounded-full h-1">
              <div className="bg-accent h-1 rounded-full" style={{ width: `${(health.mem / health.memTotal) * 100}%` }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Dashboard</h1>
            <p className="text-text-secondary text-xs">Shadow-Gateway real-time monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live · 2s refresh
            </div>
            <div className="text-xs text-text-secondary">
              <Clock size={12} className="inline mr-1" />
              {format(new Date(), 'HH:mm:ss')}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-5">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Activity} label="Throughput" value={Math.round(latest.throughput ?? 0)} unit="req/min" delta={2.3} trend="up" />
            <MetricCard icon={Zap} label="Avg Latency" value={(latest.latency ?? 0).toFixed(1)} unit="ms" delta={-5.1} trend="down" />
            <MetricCard icon={AlertTriangle} label="Error Rate" value={latest.errors ?? 0} unit="/min" delta={0.2} trend="up" />
            <MetricCard icon={CheckCircle2} label="Uptime" value={(latest.uptime ?? 99.9).toFixed(2)} unit="%" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThroughputChart data={metrics} />
            <LatencyChart data={metrics} />
          </div>

          {/* Logs + Crash History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LogStream logs={logs} />
            <CrashHistory />
          </div>
        </div>
      </main>
    </div>
  )
}
