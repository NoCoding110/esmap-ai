#!/bin/bash

echo "🚀 Deploying ESMAP AI Models to Cloudflare Workers..."

# Create D1 database if it doesn't exist
echo "📊 Creating D1 database..."
npx wrangler d1 create esmap-ai-models --experimental-backend || true

# Get the database ID from the output
DB_ID=$(npx wrangler d1 list | grep esmap-ai-models | awk '{print $2}')

# Update wrangler.toml with the database ID
if [ ! -z "$DB_ID" ]; then
  sed -i "s/database_id = \"your-database-id\"/database_id = \"$DB_ID\"/" wrangler.toml
fi

# Run migrations
echo "🔄 Running database migrations..."
npx wrangler d1 execute esmap-ai-models --file=./migrations/001_create_model_tables.sql

# Create KV namespace
echo "📦 Creating KV namespace for inference cache..."
npx wrangler kv:namespace create "INFERENCE_CACHE" || true

# Get the KV namespace ID
KV_ID=$(npx wrangler kv:namespace list | grep INFERENCE_CACHE | awk -F'"' '{print $4}')

# Update wrangler.toml with the KV namespace ID
if [ ! -z "$KV_ID" ]; then
  sed -i "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
fi

# Create R2 bucket
echo "🪣 Creating R2 bucket for model artifacts..."
npx wrangler r2 bucket create esmap-ai-model-artifacts || true

# Deploy the worker
echo "🔧 Deploying worker..."
npx wrangler deploy

echo "✅ Deployment complete!"
echo "🌐 Your AI models are now available at: https://esmap-ai-models.metabilityllc1.workers.dev"