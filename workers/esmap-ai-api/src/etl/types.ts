/**
 * ETL Pipeline Types and Interfaces
 */

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'file' | 'database' | 'scraper';
  priority: number;
  config: Record<string, any>;
}

export interface DataRecord {
  id: string;
  sourceId: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata: RecordMetadata;
}

export interface RecordMetadata {
  source: string;
  ingestionTime: Date;
  transformationTime?: Date;
  validationStatus?: ValidationStatus;
  qualityScore?: number;
  lineage: LineageInfo[];
}

export interface LineageInfo {
  step: string;
  timestamp: Date;
  operation: string;
  inputRecords?: string[];
  outputRecords?: string[];
  transformations?: string[];
}

export interface ValidationStatus {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  value: any;
  rule: string;
  message: string;
}

export interface TransformationRule {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  mappings: FieldMapping[];
  validations: ValidationRule[];
  postProcessing?: PostProcessingStep[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  defaultValue?: any;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  config: Record<string, any>;
  severity: 'error' | 'warning';
}

export interface PostProcessingStep {
  name: string;
  order: number;
  processor: (records: DataRecord[]) => DataRecord[];
}

export interface ETLPipelineConfig {
  name: string;
  sources: DataSource[];
  transformations: TransformationRule[];
  batchSize: number;
  parallelism: number;
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandlingStrategy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface ErrorHandlingStrategy {
  onValidationError: 'skip' | 'quarantine' | 'fail';
  onTransformError: 'skip' | 'default' | 'fail';
  quarantineTable?: string;
}

export interface ETLMetrics {
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  recordsSkipped: number;
  averageProcessingTime: number;
  errors: ETLError[];
}

export interface ETLError {
  timestamp: Date;
  recordId?: string;
  stage: 'extraction' | 'transformation' | 'loading';
  error: string;
  stack?: string;
}

export interface DuplicateDetectionConfig {
  strategy: 'hash' | 'key' | 'similarity';
  keyFields?: string[];
  similarityThreshold?: number;
  action: 'skip' | 'merge' | 'replace' | 'version';
}

export interface DataQualityCheck {
  id: string;
  name: string;
  type: 'completeness' | 'consistency' | 'accuracy' | 'timeliness';
  check: (record: DataRecord) => QualityCheckResult;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
}