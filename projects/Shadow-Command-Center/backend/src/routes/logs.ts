import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/pool.js'
import { z } from 'zod'

const QuerySchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'critical']).optional(),
  source: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  since: z.string().optional(),
})

interface EventRow {
  id: number
  level: 'info' | 'warn' | 'error' | 'critical'
  source: string
  code: string
  message: string
  payload: object | null
  recorded_at: Date
}

export async function logsRoute(app: FastifyInstance) {
  app.get('/', async (req: FastifyRequest, rep: FastifyReply) => {
    const { level, source, limit, since } = QuerySchema.parse(req.query)

    const conditions: string[] = []
    const params: unknown[] = []

    if (level) { conditions.push('level = ?'); params.push(level) }
    if (source) { conditions.push('source = ?'); params.push(source) }
    if (since) { conditions.push('recorded_at >= ?'); params.push(since) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    params.push(limit)

    const rows = await query<EventRow[]>(
      `SELECT * FROM events ${where} ORDER BY recorded_at DESC LIMIT ?`,
      params
    )

    return rep.send({ data: rows.reverse(), total: rows.length })
  })

  app.post('/', async (req: FastifyRequest, rep: FastifyReply) => {
    const body = z.object({
      level: z.enum(['info', 'warn', 'error', 'critical']),
      source: z.string().min(1),
      code: z.string().min(1),
      message: z.string().min(1),
      payload: z.record(z.unknown()).optional(),
    }).parse(req.body)

    const [result] = await query<mysql.ResultSetHeader[]>(
      `INSERT INTO events (level, source, code, message, payload) VALUES (?, ?, ?, ?, ?)`,
      [body.level, body.source, body.code, body.message, body.payload ?? null]
    )

    return rep.status(201).send({ id: result.insertId })
  })
}

import type mysql from 'mysql2/promise'
