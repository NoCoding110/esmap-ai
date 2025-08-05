import type { DataValidator, ValidationResult, ValidationError } from '../types/base';

export class JSONSchemaValidator<T> implements DataValidator<T> {
  private schema: any;

  constructor(schema: any) {
    this.schema = schema;
  }

  async validate(data: unknown): Promise<ValidationResult<T>> {
    const errors: ValidationError[] = [];

    try {
      // Basic validation - in production, use a proper JSON schema validator
      const validatedData = this.validateObject(data, this.schema, '', errors);
      
      return {
        isValid: errors.length === 0,
        data: errors.length === 0 ? validatedData as T : undefined,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'root',
          message: error instanceof Error ? error.message : 'Validation failed',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  private validateObject(data: any, schema: any, path: string, errors: ValidationError[]): any {
    if (schema.type === 'object' && schema.properties) {
      if (typeof data !== 'object' || data === null) {
        errors.push({
          field: path || 'root',
          message: 'Expected object',
          code: 'TYPE_ERROR'
        });
        return null;
      }

      const result: any = {};
      
      // Check required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in data)) {
            errors.push({
              field: path ? `${path}.${field}` : field,
              message: `Required field missing`,
              code: 'REQUIRED_FIELD'
            });
          }
        }
      }

      // Validate each property
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const fieldPath = path ? `${path}.${key}` : key;
          result[key] = this.validateObject(data[key], propSchema, fieldPath, errors);
        }
      }

      return result;
    }

    if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        errors.push({
          field: path,
          message: 'Expected array',
          code: 'TYPE_ERROR'
        });
        return null;
      }

      return data.map((item, index) => 
        this.validateObject(item, schema.items, `${path}[${index}]`, errors)
      );
    }

    // Primitive type validation
    if (schema.type === 'string' && typeof data !== 'string') {
      errors.push({
        field: path,
        message: 'Expected string',
        code: 'TYPE_ERROR'
      });
      return null;
    }

    if (schema.type === 'number' && typeof data !== 'number') {
      errors.push({
        field: path,
        message: 'Expected number',
        code: 'TYPE_ERROR'
      });
      return null;
    }

    if (schema.type === 'boolean' && typeof data !== 'boolean') {
      errors.push({
        field: path,
        message: 'Expected boolean',
        code: 'TYPE_ERROR'
      });
      return null;
    }

    return data;
  }
}

// Pre-defined schemas for common data sources
export const worldBankSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      indicator: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          value: { type: 'string' }
        },
        required: ['id', 'value']
      },
      country: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          value: { type: 'string' }
        },
        required: ['id', 'value']
      },
      countryiso3code: { type: 'string' },
      date: { type: 'string' },
      value: { type: ['number', 'null'] },
      unit: { type: 'string' },
      obs_status: { type: 'string' },
      decimal: { type: 'number' }
    },
    required: ['indicator', 'country', 'date']
  }
};

export const nasaPowerSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    geometry: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        coordinates: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      required: ['type', 'coordinates']
    },
    properties: {
      type: 'object',
      properties: {
        parameter: {
          type: 'object'
        }
      },
      required: ['parameter']
    }
  },
  required: ['type', 'geometry', 'properties']
};

export const openStreetMapSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      place_id: { type: 'number' },
      licence: { type: 'string' },
      osm_type: { type: 'string' },
      osm_id: { type: 'number' },
      boundingbox: {
        type: 'array',
        items: { type: 'string' }
      },
      lat: { type: 'string' },
      lon: { type: 'string' },
      display_name: { type: 'string' },
      class: { type: 'string' },
      type: { type: 'string' },
      importance: { type: 'number' }
    },
    required: ['lat', 'lon', 'display_name']
  }
};