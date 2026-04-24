import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'shadow',
  password: process.env.DB_PASSWORD ?? 'shadow_secret',
  database: process.env.DB_NAME ?? 'shadow_command_center',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function query<T>(sql: string, values?: unknown[]): Promise<T> {
  const [rows] = await pool.execute(sql, values)
  return rows as T
}
