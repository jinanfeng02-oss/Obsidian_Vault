import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/pool.js'

interface CrashRow { id: number; crashed_at: Date; recovered_at: Date | null; reason: string; duration_ms: number | null; stack_trace: string | null }

export async function healthRoute(app: FastifyInstance) {
  app.get('/', async (_req: FastifyRequest, rep: FastifyReply) => {
    const [recentCrashes] = await query<CrashRow[]>(
      `SELECT * FROM crashes ORDER BY crashed_at DESC LIMIT 5`
    )

    const [totalCrashes] = await query<[{ cnt: bigint }]>(`SELECT COUNT(*) as cnt FROM crashes`)
    const [uptime] = await query<[{ val: number }]>(`SELECT uptime_pct as val FROM metrics ORDER BY recorded_at DESC LIMIT 1`)

    return rep.send({
      status: 'operational',
      uptime: uptime?.[0]?.val ?? 100,
      totalCrashes: Number(totalCrashes[0]?.cnt ?? 0),
      recentCrashes: recentCrashes ?? [],
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    })
  })
}
