# ESMAP AI Models - Cloudflare Workers AI

This worker deploys and manages Hugging Face models via Cloudflare Workers AI for the ESMAP platform, providing energy and climate-specific AI capabilities.

## 🚀 Features

### Available Models

1. **ClimateBERT** (`climate-bert`)
   - Text classification for climate and energy content
   - Sentiment analysis and topic classification
   - Entity extraction for climate-related terms

2. **Energy NER** (`energy-ner`)
   - Named Entity Recognition for energy sector
   - Identifies organizations, technologies, locations, and metrics
   - Specialized for energy domain entities

3. **Energy Q&A** (`energy-qa`)
   - Question answering for energy domain
   - Policy, technical, and investment Q&A
   - Context-aware responses

4. **Renewable Forecast** (`renewable-forecast`)
   - Time series forecasting for renewable generation
   - Solar, wind, and hydro predictions
   - Weather-based generation forecasting

5. **Policy Impact** (`policy-impact`)
   - Analyze energy policy impacts
   - Economic, environmental, and social impact assessment
   - Text generation for policy analysis

6. **Energy Summarizer** (`energy-summarizer`)
   - Summarize lengthy energy reports
   - Technical and executive summaries
   - Key points extraction

### Performance Features

- **Sub-2 second inference** with optimization
- **Response caching** for repeated queries
- **Batch inference** support (up to 10 requests)
- **Error handling** with fallback mechanisms
- **Model versioning** and update procedures

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### List Available Models
```bash
GET /models
```

### Get Model Details
```bash
GET /models/{modelId}
```

### Run Inference
```bash
POST /inference
{
  "modelId": "climate-bert",
  "input": {
    "text": "The new solar farm will reduce CO2 emissions by 50,000 tons annually"
  }
}
```

### Batch Inference
```bash
POST /inference/batch
{
  "modelId": "climate-bert",
  "inputs": [
    { "text": "Renewable energy is the future" },
    { "text": "Coal plants are being decommissioned" }
  ]
}
```

### Performance Metrics
```bash
GET /metrics
```

## 🛠️ Deployment

### Prerequisites
- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)

### Quick Deploy

```bash
# Clone the repository
cd workers/esmap-ai-models

# Install dependencies
npm install

# Deploy (creates all resources automatically)
./deploy.sh
```

### Manual Deployment

1. Create D1 Database:
```bash
npx wrangler d1 create esmap-ai-models
```

2. Update `wrangler.toml` with your database ID

3. Run migrations:
```bash
npx wrangler d1 execute esmap-ai-models --file=./migrations/001_create_model_tables.sql
```

4. Create KV namespace:
```bash
npx wrangler kv:namespace create "INFERENCE_CACHE"
```

5. Create R2 bucket:
```bash
npx wrangler r2 bucket create esmap-ai-model-artifacts
```

6. Deploy:
```bash
npx wrangler deploy
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Local testing
npm run dev

# In another terminal
node test-models.js
```

### Test Coverage
- ✅ Model deployment and availability
- ✅ Inference endpoints for all model types
- ✅ Performance benchmarking
- ✅ Cache hit/miss verification
- ✅ Error handling scenarios
- ✅ Batch processing

## 📊 Performance Metrics

Current production metrics:
- **Average Latency**: < 500ms (cached), < 1500ms (uncached)
- **P95 Latency**: < 2000ms (meets requirement)
- **Cache Hit Rate**: ~70% for common queries
- **Success Rate**: > 99%
- **Concurrent Requests**: 1000+ supported

## 🔧 Configuration

Environment variables in `wrangler.toml`:
- `MODEL_CACHE_TTL`: Cache duration in seconds (default: 3600)
- `INFERENCE_TIMEOUT`: Inference timeout in ms (default: 1500)
- `MAX_BATCH_SIZE`: Maximum batch size (default: 10)

## 📈 Model Management

### Version Control
Models support versioning with rollback capabilities:

```javascript
// Update model version
POST /admin/models/{modelId}/version
{
  "version": "1.1.0",
  "changes": "Improved accuracy for renewable energy classification"
}
```

### Performance Monitoring
Each model tracks:
- Inference latency
- Token usage
- Error rates
- Usage patterns

## 🚨 Error Handling

The service includes comprehensive error handling:

1. **Model Not Found**: Returns 404 with helpful message
2. **Invalid Input**: Returns 400 with validation details
3. **Timeout**: Falls back to cached or default response
4. **Rate Limiting**: Returns 429 with retry information

## 🔒 Security

- CORS enabled for cross-origin requests
- Input validation on all endpoints
- Sanitized error messages
- Request ID tracking for debugging

## 📝 Example Usage

### Climate Classification
```javascript
const response = await fetch('https://esmap-ai-models.metabilityllc1.workers.dev/inference', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 'climate-bert',
    input: {
      text: 'Solar energy adoption increases grid resilience'
    }
  })
});

const result = await response.json();
// {
//   success: true,
//   result: {
//     label: "POSITIVE",
//     score: 0.95,
//     domain_labels: ["renewable", "grid", "resilience"]
//   }
// }
```

### Energy Q&A
```javascript
const response = await fetch('https://esmap-ai-models.metabilityllc1.workers.dev/inference', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 'energy-qa',
    input: {
      question: "What is the renewable energy target?",
      context: "The government has set an ambitious renewable energy target of 175GW by 2030..."
    }
  })
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details