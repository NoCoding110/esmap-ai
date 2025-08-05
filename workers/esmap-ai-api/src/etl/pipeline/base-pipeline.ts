/**
 * Base ETL Pipeline Implementation
 */

import { 
  ETLPipelineConfig, 
  DataRecord, 
  ETLMetrics, 
  ETLError,
  ValidationStatus,
  LineageInfo,
  DataSource
} from '../types';

export abstract class BaseETLPipeline {
  protected config: ETLPipelineConfig;
  protected metrics: ETLMetrics;
  protected isRunning: boolean = false;

  constructor(config: ETLPipelineConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): ETLMetrics {
    return {
      pipelineId: `${this.config.name}-${Date.now()}`,
      startTime: new Date(),
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      recordsSkipped: 0,
      averageProcessingTime: 0,
      errors: []
    };
  }

  /**
   * Main pipeline execution method
   */
  async execute(): Promise<ETLMetrics> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running');
    }

    this.isRunning = true;
    this.metrics.startTime = new Date();

    try {
      // Extract phase
      const extractedData = await this.extract();
      
      // Transform phase
      const transformedData = await this.transform(extractedData);
      
      // Load phase
      await this.load(transformedData);
      
      this.metrics.endTime = new Date();
      this.calculateAverageProcessingTime();
      
      return this.metrics;
    } catch (error) {
      this.handlePipelineError(error as Error, 'execution');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Extract data from configured sources
   */
  protected async extract(): Promise<DataRecord[]> {
    const allRecords: DataRecord[] = [];

    for (const source of this.config.sources) {
      try {
        const records = await this.extractFromSource(source);
        
        // Add lineage information
        const recordsWithLineage = records.map(record => ({
          ...record,
          metadata: {
            ...record.metadata,
            lineage: [
              ...record.metadata.lineage,
              {
                step: 'extraction',
                timestamp: new Date(),
                operation: `Extract from ${source.name}`,
                outputRecords: [record.id]
              } as LineageInfo
            ]
          }
        }));

        allRecords.push(...recordsWithLineage);
      } catch (error) {
        this.handleSourceError(error as Error, source);
        
        if (this.config.errorHandling.onTransformError === 'fail') {
          throw error;
        }
      }
    }

    return allRecords;
  }

  /**
   * Transform extracted data
   */
  protected async transform(records: DataRecord[]): Promise<DataRecord[]> {
    const transformedRecords: DataRecord[] = [];
    const batches = this.createBatches(records, this.config.batchSize);

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      transformedRecords.push(...batchResults);
    }

    return transformedRecords;
  }

  /**
   * Load transformed data to destination
   */
  protected abstract async load(records: DataRecord[]): Promise<void>;

  /**
   * Extract data from a specific source
   */
  protected abstract async extractFromSource(source: DataSource): Promise<DataRecord[]>;

  /**
   * Process a batch of records
   */
  private async processBatch(batch: DataRecord[]): Promise<DataRecord[]> {
    const results: DataRecord[] = [];

    // Process records in parallel based on configuration
    const chunks = this.createBatches(batch, Math.ceil(batch.length / this.config.parallelism));
    
    const processedChunks = await Promise.all(
      chunks.map(chunk => this.processChunk(chunk))
    );

    processedChunks.forEach(chunk => results.push(...chunk));
    
    return results;
  }

  /**
   * Process a chunk of records
   */
  private async processChunk(records: DataRecord[]): Promise<DataRecord[]> {
    const results: DataRecord[] = [];

    for (const record of records) {
      const startTime = Date.now();

      try {
        // Apply transformations
        const transformed = await this.applyTransformations(record);
        
        // Validate transformed data
        const validation = await this.validateRecord(transformed);
        
        if (validation.isValid) {
          // Add transformation lineage
          transformed.metadata.lineage.push({
            step: 'transformation',
            timestamp: new Date(),
            operation: 'Transform and validate',
            inputRecords: [record.id],
            outputRecords: [transformed.id],
            transformations: this.config.transformations.map(t => t.name)
          });

          results.push(transformed);
          this.metrics.recordsSuccessful++;
        } else {
          await this.handleValidationFailure(transformed, validation);
        }
      } catch (error) {
        this.handleRecordError(error as Error, record);
      }

      this.metrics.recordsProcessed++;
      this.updateProcessingTime(Date.now() - startTime);
    }

    return results;
  }

  /**
   * Apply transformation rules to a record
   */
  protected abstract async applyTransformations(record: DataRecord): Promise<DataRecord>;

  /**
   * Validate a record
   */
  protected abstract async validateRecord(record: DataRecord): Promise<ValidationStatus>;

  /**
   * Handle validation failures
   */
  private async handleValidationFailure(record: DataRecord, validation: ValidationStatus): Promise<void> {
    record.metadata.validationStatus = validation;

    switch (this.config.errorHandling.onValidationError) {
      case 'skip':
        this.metrics.recordsSkipped++;
        break;
      case 'quarantine':
        await this.quarantineRecord(record);
        this.metrics.recordsFailed++;
        break;
      case 'fail':
        throw new Error(`Validation failed for record ${record.id}: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Quarantine a record that failed validation
   */
  protected abstract async quarantineRecord(record: DataRecord): Promise<void>;

  /**
   * Create batches from records
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Update average processing time
   */
  private updateProcessingTime(duration: number): void {
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.recordsProcessed - 1);
    this.metrics.averageProcessingTime = (totalTime + duration) / this.metrics.recordsProcessed;
  }

  /**
   * Calculate final average processing time
   */
  private calculateAverageProcessingTime(): void {
    if (this.metrics.startTime && this.metrics.endTime && this.metrics.recordsProcessed > 0) {
      const totalDuration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
      this.metrics.averageProcessingTime = totalDuration / this.metrics.recordsProcessed;
    }
  }

  /**
   * Handle errors at different stages
   */
  private handlePipelineError(error: Error, stage: string): void {
    this.metrics.errors.push({
      timestamp: new Date(),
      stage: 'execution',
      error: error.message,
      stack: error.stack
    });
  }

  private handleSourceError(error: Error, source: DataSource): void {
    this.metrics.errors.push({
      timestamp: new Date(),
      stage: 'extraction',
      error: `Failed to extract from ${source.name}: ${error.message}`,
      stack: error.stack
    });
  }

  private handleRecordError(error: Error, record: DataRecord): void {
    this.metrics.errors.push({
      timestamp: new Date(),
      recordId: record.id,
      stage: 'transformation',
      error: error.message,
      stack: error.stack
    });
    this.metrics.recordsFailed++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ETLMetrics {
    return { ...this.metrics };
  }
}