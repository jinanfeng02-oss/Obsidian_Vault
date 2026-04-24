import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/pool.js'
import { z } from 'zod'

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).default(200),
})

interface MetricRow {
  id: number
  recorded_at: Date
  throughput: number
  latency_avg: number
  latency_p99: number | null
  error_rate: number
  uptime_pct: number
  cpu_pct: number | null
  mem_used_mb: number | null
}

export async function metricsRoute(app: FastifyInstance) {
  app.get('/', async (req: FastifyRequest, rep: FastifyReply) => {
    const { from, to, limit } = QuerySchema.parse(req.query)

    let sql = `SELECT * FROM metrics ORDER BY recorded_at DESC LIMIT ?`
    const params: unknown[] = [limit]

    if (from) {
      sql = `SELECT * FROM metrics WHERE recorded_at >= ? ORDER BY recorded_at DESC LIMIT ?`
      params.unshift(from)
    }
    if (to) {
      sql = sql.replace('WHERE', 'WHERE recorded_at <= ? AND')
      params.splice(1, 0, to)
    }

    const rows = await query<MetricRow[]>(sql, params)
    const total = rows.length
    const latest = rows[0]

    // Compute aggregates
    const avgLatency = total ? rows.reduce((s, r) => s + Number(r.latency_avg), 0) / total : 0
    const avgThroughput = total ? rows.reduce((s, r) => s + Number(r.throughput), 0) / total : 0
    const avgErrorRate = total ? rows.reduce((s, r) => s + Number(r.error_rate), 0) / total : 0

    return rep.send({
      data: rows.reverse(),
      meta: {
        total,
        avgLatency: +avgLatency.toFixed(2),
        avgThroughput: +avgThroughput.toFixed(2),
        avgErrorRate: +avgErrorRate.toFixed(3),
        latest: latest ?? null,
      },
    })
  })

  app.post('/', async (req: FastifyRequest, rep: FastifyReply) => {
    const body = z.object({
      throughput: z.number(),
      latency_avg: z.number(),
      latency_p99: z.number().optional(),
      error_rate: z.number(),
      uptime_pct: z.number(),
      cpu_pct: z.number().optional(),
      mem_used_mb: z.number().optional(),
    }).parse(req.body)

    await query(
      `INSERT INTO metrics (throughput, latency_avg, latency_p99, error_rate, uptime_pct, cpu_pct, mem_used_mb)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [body.throughput, body.latency_avg, body.latency_p99 ?? null, body.error_rate, body.uptime_pct, body.cpu_pct ?? null, body.mem_used_mb ?? null]
    )

    return rep.status(201).send({ ok: true })
  })
}
