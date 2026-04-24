import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/pool.js'
import { z } from 'zod'

export async function eventsRoute(app: FastifyInstance) {
  // Post a crash event
  app.post('/crash', async (req: FastifyRequest, rep: FastifyReply) => {
    const body = z.object({
      reason: z.string(),
      duration_ms: z.number().int().nonnegative().optional(),
      stack_trace: z.string().optional(),
      watchdog_log: z.string().optional(),
    }).parse(req.body)

    const [result] = await query<mysql.ResultSetHeader[]>(
      `INSERT INTO crashes (reason, duration_ms, stack_trace, watchdog_log) VALUES (?, ?, ?, ?)`,
      [body.reason, body.duration_ms ?? null, body.stack_trace ?? null, body.watchdog_log ?? null]
    )

    // Also log as event
    await query(
      `INSERT INTO events (level, source, code, message, payload) VALUES (?, ?, ?, ?, ?)`,
      ['critical', 'watchdog', 'CRASH', body.reason, JSON.stringify({ crash_id: result.insertId })]
    )

    return rep.status(201).send({ id: result.insertId })
  })

  // Record recovery
  app.patch('/crash/:id/recover', async (req: FastifyRequest, rep: FastifyReply) => {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params)
    await query(`UPDATE crashes SET recovered_at = NOW(3) WHERE id = ?`, [id])
    await query(
      `INSERT INTO events (level, source, code, message, payload) VALUES (?, ?, ?, ?, ?)`,
      ['info', 'watchdog', 'RECOVERED', `Crash #${id} recovered`, JSON.stringify({ crash_id: id })]
    )
    return rep.send({ ok: true })
  })

  // Value records CRUD
  app.get('/values', async (req: FastifyRequest, rep: FastifyReply) => {
    const { category, limit = 50 } = z.object({
      category: z.string().optional(),
      limit: z.coerce.number().min(1).max(500).default(50),
    }).parse(req.query)

    const params: unknown[] = [limit]
    const where = category ? 'WHERE category = ?' : ''
    if (category) params.unshift(category)

    const rows = await query(
      `SELECT * FROM value_records ${where} ORDER BY created_at DESC LIMIT ?`,
      params
    )
    return rep.send({ data: rows })
  })

  app.post('/values', async (req: FastifyRequest, rep: FastifyReply) => {
    const body = z.object({
      event_code: z.string(),
      category: z.string(),
      description: z.string(),
      impact: z.enum(['high', 'medium', 'low']).optional(),
      metadata: z.record(z.unknown()).optional(),
    }).parse(req.body)

    const [result] = await query<mysql.ResultSetHeader[]>(
      `INSERT INTO value_records (event_code, category, description, impact, metadata) VALUES (?, ?, ?, ?, ?)`,
      [body.event_code, body.category, body.description, body.impact ?? null, body.metadata ?? null]
    )
    return rep.status(201).send({ id: result.insertId })
  })
}

import type mysql from 'mysql2/promise'
