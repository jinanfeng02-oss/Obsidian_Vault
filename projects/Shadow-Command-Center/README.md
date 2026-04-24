# Shadow Command Center

> Shadow-Gateway 的中央指挥面板。实时监控、事件溯源、价值捕捉。

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Next.js   │────▶│   Fastify   │────▶│    MySQL     │
│  Dashboard  │     │   API :3001 │     │   :3306      │
│   :3000     │◀────│  WebSocket  │◀────│              │
└─────────────┘     └─────────────┘     └──────────────┘
```

## 快速启动（Docker）

```bash
cd infra
cp .env.example .env   # edit if needed
docker compose up -d
```

访问：
- Dashboard → http://localhost:3000
- API Docs → http://localhost:3001/docs

## 本地开发

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## 数据库初始化

```bash
mysql -u root -p < backend/src/db/schema.sql
```

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/metrics | 时间序列指标 |
| POST | /api/metrics | 写入指标点 |
| GET | /api/logs | 事件日志 |
| POST | /api/logs | 写入事件 |
| GET | /api/health | 系统健康状态 |
| POST | /api/events/crash | 记录崩溃事件 |
| PATCH | /api/events/crash/:id/recover | 标记恢复 |
| GET | /api/events/values | 价值捕捉记录 |
| POST | /api/events/values | 创建价值记录 |
