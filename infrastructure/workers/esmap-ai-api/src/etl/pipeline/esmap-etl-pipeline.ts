/**
 * ESMAP ETL Pipeline Implementation
 */

import { BaseETLPipeline } from './base-pipeline';
import { DataValidator } from '../validation/data-validator';
import { DuplicateDetector } from '../deduplication/duplicate-detector';
import { 
  DataRecord, 
  DataSource, 
  ValidationStatus, 
  ETLPipelineConfig,
  DuplicateDetectionConfig
} from '../types';
import { getTransformationRule } from '../transformations/esmap-transformations';

export class ESMAPETLPipeline extends BaseETLPipeline {
  private validator: DataValidator;
  private duplicateDetector: DuplicateDetector;
  private quarantineRecords: DataRecord[] = [];
  private processedRecords: Map<string, DataRecord> = new Map();

  constructor(config: ETLPipelineConfig) {
    super(config);
    this.validator = new DataValidator();
    this.duplicateDetector = new DuplicateDetector({
      strategy: 'key',
      keyFields: ['countryCode', 'year', 'indicatorCode'],
      action: 'merge'
    } as DuplicateDetectionConfig);

    // Register standard quality checks
    this.registerQualityChecks();
  }

  /**
   * Extract data from a specific source
   */
  protected async extractFromSource(source: DataSource): Promise<DataRecord[]> {
    const records: DataRecord[] = [];

    try {
      switch (source.type) {
        case 'api':
          const apiData = await this.extractFromAPI(source);
          records.push(...apiData);
          break;

        case 'file':
          const fileData = await this.extractFromFile(source);
          records.push(...fileData);
          break;

        case 'scraper':
          const scrapedData = await this.extractFromScraper(source);
          records.push(...scrapedData);
          break;

        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }
    } catch (error) {
      console.error(`Failed to extract from ${source.name}:`, error);
      throw error;
    }

    return records;
  }

  /**
   * Extract data from API source
   */
  private async extractFromAPI(source: DataSource): Promise<DataRecord[]> {
    const { url, headers, params } = source.config;
    const records: DataRecord[] = [];

    try {
      const queryString = new URLSearchParams(params).toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: headers || {}
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert API response to DataRecord format
      const apiRecords = Array.isArray(data) ? data : [data];
      
      for (const item of apiRecords) {
        const record: DataRecord = {
          id: this.generateRecordId(source.id, item),
          sourceId: source.id,
          timestamp: new Date(),
          data: item,
          metadata: {
            source: source.name,
            ingestionTime: new Date(),
            lineage: []
          }
        };
        records.push(record);
      }
    } catch (error) {
      console.error(`API extraction error for ${source.name}:`, error);
      throw error;
    }

    return records;
  }

  /**
   * Extract data from file source
   */
  private async extractFromFile(source: DataSource): Promise<DataRecord[]> {
    // Implementation for file extraction (CSV, JSON, etc.)
    // This would be implemented based on specific file handling requirements
    console.log(`File extraction for ${source.name} not implemented yet`);
    return [];
  }

  /**
   * Extract data from web scraper
   */
  private async extractFromScraper(source: DataSource): Promise<DataRecord[]> {
    // Implementation for web scraping
    // This would use the web-scraper utility
    console.log(`Scraper extraction for ${source.name} not implemented yet`);
    return [];
  }

  /**
   * Apply transformations to a record
   */
  protected async applyTransformations(record: DataRecord): Promise<DataRecord> {
    const sourceType = this.getSourceType(record.sourceId);
    const transformationRule = getTransformationRule(sourceType);

    if (!transformationRule) {
      console.warn(`No transformation rule found for source type: ${sourceType}`);
      return record;
    }

    // Create transformed record
    const transformedData: Record<string, any> = {};

    // Apply field mappings
    for (const mapping of transformationRule.mappings) {
      const sourceValue = this.getNestedValue(record.data, mapping.sourceField);
      
      if (sourceValue !== undefined || mapping.defaultValue !== undefined) {
        const value = sourceValue !== undefined ? sourceValue : mapping.defaultValue;
        transformedData[mapping.targetField] = mapping.transform ? 
          mapping.transform(value) : value;
      }
    }

    // Create transformed record with updated metadata
    const transformedRecord: DataRecord = {
      ...record,
      data: transformedData,
      metadata: {
        ...record.metadata,
        transformationTime: new Date()
      }
    };

    // Apply post-processing steps if any
    if (transformationRule.postProcessing) {
      const sortedSteps = [...transformationRule.postProcessing].sort((a, b) => a.order - b.order);
      
      for (const step of sortedSteps) {
        const result = step.processor([transformedRecord]);
        if (result.length > 0) {
          Object.assign(transformedRecord, result[0]);
        }
      }
    }

    return transformedRecord;
  }

  /**
   * Validate a record
   */
  protected async validateRecord(record: DataRecord): Promise<ValidationStatus> {
    const sourceType = this.getSourceType(record.sourceId);
    const transformationRule = getTransformationRule(sourceType);

    if (!transformationRule) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Register validation rules for this source type
    this.validator.registerValidationRules(sourceType, transformationRule.validations);

    // Perform validation
    const validationStatus = await this.validator.validateRecord(record, sourceType);

    // Run quality checks
    const qualityScore = await this.validator.runQualityChecks(record, sourceType);
    record.metadata.qualityScore = qualityScore;

    return validationStatus;
  }

  /**
   * Load transformed data to destination
   */
  protected async load(records: DataRecord[]): Promise<void> {
    // Check for duplicates and handle them
    const uniqueRecords: DataRecord[] = [];

    for (const record of records) {
      const duplicateResult = await this.duplicateDetector.checkDuplicate(
        record, 
        Array.from(this.processedRecords.values())
      );

      if (duplicateResult.isDuplicate && duplicateResult.existingRecordId) {
        const existingRecord = this.processedRecords.get(duplicateResult.existingRecordId);
        if (existingRecord) {
          const mergedRecord = await this.duplicateDetector.handleDuplicate(record, existingRecord);
          if (mergedRecord) {
            uniqueRecords.push(mergedRecord);
            this.processedRecords.set(mergedRecord.id, mergedRecord);
          }
        }
      } else {
        uniqueRecords.push(record);
        this.processedRecords.set(record.id, record);
      }
    }

    // In a real implementation, this would:
    // 1. Connect to Cloudflare D1 database
    // 2. Insert/update records in appropriate tables
    // 3. Handle transaction management
    // 4. Update indices and aggregated tables

    console.log(`Loading ${uniqueRecords.length} records to destination`);
    
    // Simulate loading to database
    for (const record of uniqueRecords) {
      await this.loadRecordToDatabase(record);
    }
  }

  /**
   * Load a single record to database
   */
  private async loadRecordToDatabase(record: DataRecord): Promise<void> {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // In production, this would execute SQL like:
    // INSERT INTO energy_data (id, country_code, indicator_code, year, value, ...)
    // VALUES (?, ?, ?, ?, ?, ...)
    // ON CONFLICT (country_code, indicator_code, year) 
    // DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  }

  /**
   * Quarantine a record that failed validation
   */
  protected async quarantineRecord(record: DataRecord): Promise<void> {
    this.quarantineRecords.push(record);
    
    // In production, this would insert into a quarantine table
    console.log(`Quarantined record ${record.id} due to validation failure`);
  }

  /**
   * Register quality checks for different source types
   */
  private registerQualityChecks(): void {
    const standardChecks = DataValidator.createStandardQualityChecks();
    
    // Register for all source types
    ['world-bank', 'nasa-power', 'irena', 'esmap-hub', 'mtf-survey'].forEach(sourceType => {
      this.validator.registerQualityChecks(sourceType, standardChecks);
    });
  }

  /**
   * Get source type from source ID
   */
  private getSourceType(sourceId: string): string {
    const source = this.config.sources.find(s => s.id === sourceId);
    return source?.type || 'unknown';
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(sourceId: string, data: any): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(7);
    
    // Try to extract meaningful identifiers from data
    const countryCode = data.country?.id || data.countryCode || '';
    const indicator = data.indicator?.id || data.indicatorCode || '';
    const year = data.date || data.year || '';

    if (countryCode && indicator && year) {
      return `${sourceId}_${countryCode}_${indicator}_${year}_${randomPart}`;
    }

    return `${sourceId}_${timestamp}_${randomPart}`;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get pipeline statistics
   */
  getPipelineStats(): {
    metrics: any;
    duplicates: { hashes: number; keys: number };
    quarantined: number;
    processed: number;
  } {
    return {
      metrics: this.getMetrics(),
      duplicates: this.duplicateDetector.getCacheStats(),
      quarantined: this.quarantineRecords.length,
      processed: this.processedRecords.size
    };
  }

  /**
   * Clear pipeline caches and temporary data
   */
  clearPipelineData(): void {
    this.duplicateDetector.clearCache();
    this.processedRecords.clear();
    this.quarantineRecords = [];
  }
}