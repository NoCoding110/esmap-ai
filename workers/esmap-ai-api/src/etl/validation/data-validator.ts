/**
 * Data Validation and Quality Check System
 */

import {
  DataRecord,
  ValidationStatus,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  DataQualityCheck,
  QualityCheckResult
} from '../types';

export class DataValidator {
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private qualityChecks: Map<string, DataQualityCheck[]> = new Map();

  /**
   * Register validation rules for a data source
   */
  registerValidationRules(sourceType: string, rules: ValidationRule[]): void {
    this.validationRules.set(sourceType, rules);
  }

  /**
   * Register quality checks for a data source
   */
  registerQualityChecks(sourceType: string, checks: DataQualityCheck[]): void {
    this.qualityChecks.set(sourceType, checks);
  }

  /**
   * Validate a data record
   */
  async validateRecord(record: DataRecord, sourceType: string): Promise<ValidationStatus> {
    const rules = this.validationRules.get(sourceType) || [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const rule of rules) {
      const result = await this.applyValidationRule(record.data, rule);
      
      if (!result.isValid) {
        if (rule.severity === 'error') {
          errors.push({
            field: rule.field,
            value: record.data[rule.field],
            rule: rule.type,
            message: result.message
          });
        } else {
          warnings.push({
            field: rule.field,
            value: record.data[rule.field],
            rule: rule.type,
            message: result.message
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply a single validation rule
   */
  private async applyValidationRule(
    data: Record<string, any>,
    rule: ValidationRule
  ): Promise<{ isValid: boolean; message: string }> {
    const value = this.getNestedValue(data, rule.field);

    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule);
      
      case 'type':
        return this.validateType(value, rule);
      
      case 'range':
        return this.validateRange(value, rule);
      
      case 'pattern':
        return this.validatePattern(value, rule);
      
      case 'custom':
        return this.validateCustom(value, rule, data);
      
      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Required field validation
   */
  private validateRequired(value: any, rule: ValidationRule): { isValid: boolean; message: string } {
    const isValid = value !== null && value !== undefined && value !== '';
    
    return {
      isValid,
      message: isValid ? '' : `Field '${rule.field}' is required`
    };
  }

  /**
   * Type validation
   */
  private validateType(value: any, rule: ValidationRule): { isValid: boolean; message: string } {
    const expectedType = rule.config.type;
    let isValid = false;

    switch (expectedType) {
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'date':
        isValid = value instanceof Date || !isNaN(Date.parse(value));
        break;
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'object':
        isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
    }

    return {
      isValid,
      message: isValid ? '' : `Field '${rule.field}' must be of type ${expectedType}`
    };
  }

  /**
   * Range validation for numeric values
   */
  private validateRange(value: any, rule: ValidationRule): { isValid: boolean; message: string } {
    if (typeof value !== 'number') {
      return { isValid: false, message: `Field '${rule.field}' must be a number for range validation` };
    }

    const { min, max } = rule.config;
    let isValid = true;
    let message = '';

    if (min !== undefined && value < min) {
      isValid = false;
      message = `Field '${rule.field}' must be >= ${min}`;
    }

    if (max !== undefined && value > max) {
      isValid = false;
      message = `Field '${rule.field}' must be <= ${max}`;
    }

    return { isValid, message };
  }

  /**
   * Pattern validation using regex
   */
  private validatePattern(value: any, rule: ValidationRule): { isValid: boolean; message: string } {
    if (typeof value !== 'string') {
      return { isValid: false, message: `Field '${rule.field}' must be a string for pattern validation` };
    }

    const pattern = new RegExp(rule.config.pattern);
    const isValid = pattern.test(value);

    return {
      isValid,
      message: isValid ? '' : `Field '${rule.field}' does not match required pattern`
    };
  }

  /**
   * Custom validation function
   */
  private async validateCustom(
    value: any, 
    rule: ValidationRule, 
    data: Record<string, any>
  ): Promise<{ isValid: boolean; message: string }> {
    if (typeof rule.config.validator !== 'function') {
      return { isValid: true, message: '' };
    }

    try {
      const result = await rule.config.validator(value, data);
      return {
        isValid: result.isValid,
        message: result.message || `Field '${rule.field}' failed custom validation`
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Custom validation error for field '${rule.field}': ${error}`
      };
    }
  }

  /**
   * Run quality checks on a record
   */
  async runQualityChecks(record: DataRecord, sourceType: string): Promise<number> {
    const checks = this.qualityChecks.get(sourceType) || [];
    let totalScore = 0;
    let checkCount = 0;

    for (const check of checks) {
      const result = await check.check(record);
      
      if (result.score > 0) {
        totalScore += result.score;
        checkCount++;
      }

      // Store quality check results in metadata
      if (!record.metadata.qualityScore) {
        record.metadata.qualityScore = 0;
      }
    }

    // Calculate average quality score
    const averageScore = checkCount > 0 ? totalScore / checkCount : 0;
    record.metadata.qualityScore = averageScore;

    return averageScore;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create standard quality checks
   */
  static createStandardQualityChecks(): DataQualityCheck[] {
    return [
      {
        id: 'completeness',
        name: 'Data Completeness Check',
        type: 'completeness',
        check: (record: DataRecord): QualityCheckResult => {
          const data = record.data;
          const totalFields = Object.keys(data).length;
          const filledFields = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
          const score = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

          return {
            passed: score >= 80,
            score,
            issues: score < 80 ? [`Data completeness is ${score.toFixed(1)}%`] : []
          };
        }
      },
      {
        id: 'consistency',
        name: 'Data Consistency Check',
        type: 'consistency',
        check: (record: DataRecord): QualityCheckResult => {
          const issues: string[] = [];
          let score = 100;

          // Check for inconsistent date formats
          const dateFields = Object.entries(record.data).filter(([_, value]) => 
            typeof value === 'string' && /\d{4}/.test(value)
          );

          const dateFormats = new Set(dateFields.map(([_, value]) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value as string)) return 'YYYY-MM-DD';
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(value as string)) return 'MM/DD/YYYY';
            if (/^\d{2}-\d{2}-\d{4}$/.test(value as string)) return 'DD-MM-YYYY';
            return 'unknown';
          }));

          if (dateFormats.size > 1) {
            issues.push('Inconsistent date formats detected');
            score -= 20;
          }

          return {
            passed: score >= 80,
            score,
            issues
          };
        }
      },
      {
        id: 'timeliness',
        name: 'Data Timeliness Check',
        type: 'timeliness',
        check: (record: DataRecord): QualityCheckResult => {
          const now = new Date();
          const dataAge = now.getTime() - record.timestamp.getTime();
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          
          const score = Math.max(0, 100 - (dataAge / maxAge) * 100);

          return {
            passed: score >= 70,
            score,
            issues: score < 70 ? ['Data is older than 30 days'] : []
          };
        }
      }
    ];
  }
}