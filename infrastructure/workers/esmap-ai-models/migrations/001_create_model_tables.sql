-- Model metadata and versioning tables

-- Model registry
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'active',
  config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model inference history
CREATE TABLE IF NOT EXISTS inference_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  request_id TEXT UNIQUE,
  input_hash TEXT,
  inference_time_ms INTEGER,
  tokens_used INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Model performance metrics
CREATE TABLE IF NOT EXISTS model_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'latency', 'accuracy', 'usage'
  metric_value REAL,
  metadata JSON,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Model versions
CREATE TABLE IF NOT EXISTS model_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  changes TEXT,
  performance_delta JSON,
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deprecated_at TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id),
  UNIQUE(model_id, version)
);

-- Indexes for performance
CREATE INDEX idx_inference_history_model_id ON inference_history(model_id);
CREATE INDEX idx_inference_history_created_at ON inference_history(created_at);
CREATE INDEX idx_model_metrics_model_id ON model_metrics(model_id);
CREATE INDEX idx_model_metrics_recorded_at ON model_metrics(recorded_at);
CREATE INDEX idx_model_versions_model_id ON model_versions(model_id);

-- Insert initial models
INSERT INTO models (id, name, description, type, domain, provider, model_id, config) VALUES
  ('climate-bert', 'ClimateBERT', 'Fine-tuned BERT model for climate and energy text analysis', 'text-classification', 'climate', 'huggingface', '@cf/huggingface/distilbert-sst-2-int8', '{"maxTokens": 512, "features": ["sentiment", "topic-classification", "entity-extraction"]}'),
  ('energy-ner', 'Energy NER', 'Named Entity Recognition for energy sector entities', 'token-classification', 'energy', 'huggingface', '@cf/huggingface/distilbert-sst-2-int8', '{"maxTokens": 512, "features": ["organization", "technology", "location", "metric"]}'),
  ('energy-qa', 'Energy Q&A', 'Question answering model for energy domain', 'question-answering', 'energy', 'huggingface', '@cf/meta/llama-2-7b-chat-int8', '{"maxTokens": 2048, "features": ["policy-qa", "technical-qa", "investment-qa"]}'),
  ('renewable-forecast', 'Renewable Energy Forecasting', 'Time series forecasting for renewable energy generation', 'regression', 'renewable-energy', 'custom', '@cf/huggingface/distilbert-sst-2-int8', '{"features": ["solar", "wind", "hydro"]}'),
  ('policy-impact', 'Policy Impact Analysis', 'Analyze potential impact of energy policies', 'text-generation', 'policy', 'huggingface', '@cf/meta/llama-2-7b-chat-int8', '{"maxTokens": 2048, "features": ["economic-impact", "environmental-impact", "social-impact"]}'),
  ('energy-summarizer', 'Energy Report Summarizer', 'Summarize lengthy energy reports and documents', 'summarization', 'energy', 'huggingface', '@cf/facebook/bart-large-cnn', '{"maxTokens": 1024, "features": ["technical-summary", "executive-summary", "key-points"]}');