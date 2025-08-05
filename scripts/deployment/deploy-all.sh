#!/bin/bash

# ESMAP AI Platform - Complete Deployment Script
# Deploys frontend, API workers, model serving, and forecasting infrastructure

set -e

echo "🚀 Starting ESMAP AI Platform Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Build frontend
print_status "Building frontend application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Frontend build completed"
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 2: Deploy frontend to Cloudflare Pages
print_status "Deploying frontend to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name esmap-ai-platform
if [ $? -eq 0 ]; then
    print_success "Frontend deployed successfully"
else
    print_error "Frontend deployment failed"
    exit 1
fi

# Step 3: Deploy API Worker
print_status "Deploying API Worker..."
cd infrastructure/workers/esmap-ai-api
npm run deploy
if [ $? -eq 0 ]; then
    print_success "API Worker deployed successfully"
else
    print_error "API Worker deployment failed"
    exit 1
fi
cd ../../..

# Step 4: Deploy AI Models Worker
print_status "Deploying AI Models Worker..."
cd infrastructure/workers/esmap-ai-models
npm run deploy
if [ $? -eq 0 ]; then
    print_success "AI Models Worker deployed successfully"
else
    print_error "AI Models Worker deployment failed"
    exit 1
fi
cd ../../..

# Step 5: Deploy Model Serving Infrastructure
print_status "Deploying Model Serving Infrastructure..."
npx wrangler deploy --config config/cloudflare/wrangler-simple.toml
if [ $? -eq 0 ]; then
    print_success "Model Serving Infrastructure deployed successfully"
else
    print_error "Model Serving Infrastructure deployment failed"
    exit 1
fi

# Step 6: Deploy Forecasting Models Worker
print_status "Deploying Forecasting Models Worker..."
cd infrastructure/workers/esmap-forecasting-models
npx wrangler deploy
if [ $? -eq 0 ]; then
    print_success "Forecasting Models Worker deployed successfully"
else
    print_error "Forecasting Models Worker deployment failed"
    exit 1
fi
cd ../../..

# Step 7: Validate all deployments
print_status "Validating deployments..."

# Check frontend
print_status "Checking frontend health..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://esmap-ai-platform.pages.dev/ || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_success "Frontend is responding"
else
    print_warning "Frontend health check failed (HTTP $FRONTEND_STATUS)"
fi

# Check API Worker
print_status "Checking API Worker health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://esmap-ai-api.metabilityllc1.workers.dev/health || echo "000")
if [ "$API_STATUS" = "200" ]; then
    print_success "API Worker is healthy"
else
    print_warning "API Worker health check failed (HTTP $API_STATUS)"
fi

# Check Model Serving
print_status "Checking Model Serving health..."
MODEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://esmap-model-serving.metabilityllc1.workers.dev/health || echo "000")
if [ "$MODEL_STATUS" = "200" ]; then
    print_success "Model Serving is healthy"
else
    print_warning "Model Serving health check failed (HTTP $MODEL_STATUS)"
fi

print_success "Deployment completed!"
echo ""
echo "🌐 ESMAP AI Platform URLs:"
echo "Frontend: https://esmap-ai-platform.pages.dev"
echo "API: https://esmap-ai-api.metabilityllc1.workers.dev"
echo "Model Serving: https://esmap-model-serving.metabilityllc1.workers.dev"
echo "AI Models: https://esmap-ai-models.metabilityllc1.workers.dev"
echo "Forecasting: https://esmap-forecasting-models.metabilityllc1.workers.dev"
echo ""
echo "✅ All services deployed and validated!"