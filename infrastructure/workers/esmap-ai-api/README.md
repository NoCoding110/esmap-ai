# ESMAP AI Cloudflare Workers API

This is the Cloudflare Workers API backend for the ESMAP AI Platform, providing scalable edge computing capabilities for energy data processing and AI services.

## Features

- **TypeScript Support**: Full TypeScript implementation with strict type checking
- **Health Check Endpoint**: Comprehensive service health monitoring
- **Error Handling**: Structured error handling with proper HTTP status codes
- **Logging**: Structured JSON logging with request tracking
- **CORS Support**: Cross-origin request handling for web applications
- **Environment Configuration**: Multi-environment support (development, staging, production)

## Architecture

The worker is designed to integrate with Cloudflare's edge computing ecosystem:

- **D1 Database**: SQL database for structured data storage
- **R2 Storage**: Object storage for large datasets and files
- **Vectorize**: Vector database for AI embeddings and semantic search
- **AI Binding**: Access to Cloudflare's AI models
- **KV Store**: Key-value cache for fast data retrieval

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Development**
   ```bash
   npm run dev
   ```

## Deployment

### From Project Root
```bash
# Deploy API worker only
npm run deploy:api

# Deploy all workers
npm run deploy:workers

# Deploy everything (frontend + all workers)
./scripts/deployment/deploy-all.sh
```

### From Worker Directory (infrastructure/workers/esmap-ai-api/)
```bash
# Development
npm run deploy

# With specific environment config
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns comprehensive health status of all connected services
- Response includes service connectivity, uptime, and overall system status

### Root
- **GET** `/`
- Returns API information and available endpoints

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ENVIRONMENT` | Deployment environment (development/staging/production) | Yes |
| `WORLD_BANK_API_KEY` | World Bank API access key | No |
| `NASA_POWER_API_KEY` | NASA POWER API access key | No |
| `OPENSTREETMAP_API_KEY` | OpenStreetMap API access key | No |

## Development Commands

- `npm run dev` - Start development server
- `npm run typecheck` - Run TypeScript type checking
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run tail` - View live logs from deployed worker

## Testing

From project root:
- `npm run test:integration` - Run integration tests
- `npm run test:validation` - Quick deployment validation
- `npm run health:check` - Check all service health

## Project Structure

```
infrastructure/workers/esmap-ai-api/
├── package.json          # Dependencies and scripts
├── wrangler.toml         # Cloudflare Workers deployment config
├── src/
│   ├── index.ts          # Main worker entry point
│   ├── types.ts          # TypeScript type definitions
│   ├── routes/           # API route handlers
│   │   ├── health.ts     # Health check route handler
│   │   ├── database/     # Database operations
│   │   ├── etl/          # ETL pipeline handlers
│   │   ├── storage/      # R2 storage operations
│   │   ├── vectorize/    # Vector database operations
│   │   └── resilience/   # Failover and resilience
│   └── utils/
│       ├── logger.ts     # Structured logging utility
│       └── error-handler.ts  # Error handling and API responses
└── migrations/           # Database migration scripts
```

## Error Handling

The API uses structured error responses with proper HTTP status codes:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4"
}
```

## Logging

All requests are logged with structured JSON format including:
- Request ID for tracing
- Timestamp
- Log level (debug, info, warn, error)
- Message and metadata
- Request details (method, URL, user agent)