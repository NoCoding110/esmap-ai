-- Forecasting models database schema

-- Models table
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  model_type TEXT NOT NULL,
  countries TEXT, -- JSON array
  accuracy REAL DEFAULT 0,
  mape REAL DEFAULT 100,
  rmse REAL DEFAULT 0,
  mae REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  version TEXT DEFAULT '1.0.0',
  trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hyperparameters TEXT, -- JSON
  validation_results TEXT, -- JSON
  deployment_config TEXT -- JSON
);

-- Forecast history
CREATE TABLE IF NOT EXISTS forecast_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  country TEXT,
  forecast_type TEXT, -- demand, supply, renewable
  forecast_horizon INTEGER,
  data_points INTEGER,
  accuracy REAL,
  mape REAL,
  rmse REAL,
  mae REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  forecast_data TEXT, -- JSON
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Model training history
CREATE TABLE IF NOT EXISTS model_training_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id TEXT UNIQUE NOT NULL,
  model_type TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  countries TEXT, -- JSON array
  status TEXT NOT NULL, -- training, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  training_time_ms INTEGER,
  target_accuracy REAL,
  achieved_accuracy REAL,
  achieved_mape REAL,
  data_points INTEGER,
  hyperparameters TEXT, -- JSON
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cross-validation sessions
CREATE TABLE IF NOT EXISTS cross_validation_sessions (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  validation_method TEXT NOT NULL,
  k_folds INTEGER,
  countries TEXT, -- JSON array
  status TEXT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  target_accuracy REAL,
  mean_accuracy REAL,
  std_accuracy REAL,
  mean_mape REAL,
  std_mape REAL,
  stability_score REAL,
  generalization_score REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Validation fold results
CREATE TABLE IF NOT EXISTS validation_fold_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_id TEXT NOT NULL,
  fold_number INTEGER,
  overall_accuracy REAL,
  overall_mape REAL,
  overall_rmse REAL,
  overall_mae REAL,
  countries_tested TEXT, -- JSON array
  detailed_results TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (validation_id) REFERENCES cross_validation_sessions(id)
);

-- A/B testing sessions
CREATE TABLE IF NOT EXISTS ab_test_sessions (
  id TEXT PRIMARY KEY,
  test_name TEXT NOT NULL,
  model_a_id TEXT NOT NULL,
  model_b_id TEXT NOT NULL,
  test_type TEXT NOT NULL, -- accuracy_comparison, latency_comparison, stability_comparison
  traffic_split REAL DEFAULT 0.5,
  duration_hours INTEGER DEFAULT 24,
  significance_level REAL DEFAULT 0.05,
  status TEXT NOT NULL, -- running, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  winner_model TEXT,
  is_significant BOOLEAN DEFAULT FALSE,
  confidence_level REAL DEFAULT 95,
  relative_improvement REAL DEFAULT 0,
  detailed_results TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_a_id) REFERENCES models(id),
  FOREIGN KEY (model_b_id) REFERENCES models(id)
);

-- Model performance metrics (time series)
CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  country TEXT,
  metric_type TEXT NOT NULL, -- accuracy, latency, throughput, memory
  metric_value REAL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Model deployment events
CREATE TABLE IF NOT EXISTS model_deployment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- deployed, updated, retired
  version TEXT,
  countries TEXT, -- JSON array
  deployment_config TEXT, -- JSON
  status TEXT, -- success, failed, in_progress
  error_message TEXT,
  deployed_by TEXT,
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Data sources and quality metrics
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  country TEXT,
  data_type TEXT, -- demand, supply, weather, economic
  quality_score REAL, -- 0-100
  completeness REAL, -- 0-100
  accuracy REAL, -- 0-100
  consistency REAL, -- 0-100
  timeliness REAL, -- 0-100
  data_points INTEGER,
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP,
  assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT -- JSON
);

-- Hyperparameter optimization history
CREATE TABLE IF NOT EXISTS hyperparameter_optimization (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  optimization_id TEXT UNIQUE NOT NULL,
  model_type TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  countries TEXT, -- JSON array
  search_method TEXT, -- grid_search, random_search, bayesian
  parameter_space TEXT, -- JSON
  best_parameters TEXT, -- JSON
  best_score REAL,
  iterations INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  optimization_time_ms INTEGER,
  status TEXT, -- running, completed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model ensemble configurations
CREATE TABLE IF NOT EXISTS model_ensembles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ensemble_method TEXT NOT NULL, -- weighted_average, stacking, voting
  base_model_ids TEXT, -- JSON array
  weights TEXT, -- JSON
  meta_model_config TEXT, -- JSON
  performance_metrics TEXT, -- JSON
  countries TEXT, -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- Model interpretability results
CREATE TABLE IF NOT EXISTS model_interpretability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  interpretation_method TEXT NOT NULL, -- feature_importance, shap, lime
  country TEXT,
  feature_importance TEXT, -- JSON
  model_explanations TEXT, -- JSON
  global_explanations TEXT, -- JSON
  local_explanations TEXT, -- JSON (sample)
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id)
);

-- Create indexes for performance
CREATE INDEX idx_forecast_history_model_country ON forecast_history(model_id, country);
CREATE INDEX idx_forecast_history_created_at ON forecast_history(created_at);
CREATE INDEX idx_model_training_history_status ON model_training_history(status);
CREATE INDEX idx_model_training_history_created_at ON model_training_history(created_at);
CREATE INDEX idx_cross_validation_model_id ON cross_validation_sessions(model_id);
CREATE INDEX idx_ab_test_sessions_models ON ab_test_sessions(model_a_id, model_b_id);
CREATE INDEX idx_ab_test_sessions_status ON ab_test_sessions(status);
CREATE INDEX idx_model_performance_metrics_model ON model_performance_metrics(model_id, metric_type);
CREATE INDEX idx_model_performance_metrics_timestamp ON model_performance_metrics(timestamp);
CREATE INDEX idx_data_quality_metrics_source ON data_quality_metrics(source_name, country);
CREATE INDEX idx_hyperparameter_optimization_status ON hyperparameter_optimization(status);

-- Create triggers for updated_at
CREATE TRIGGER update_models_timestamp 
  AFTER UPDATE ON models
  BEGIN
    UPDATE models SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER update_ensembles_timestamp 
  AFTER UPDATE ON model_ensembles
  BEGIN
    UPDATE model_ensembles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;