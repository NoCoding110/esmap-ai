/**
 * ESMAP-specific Data Transformation Rules
 */

import { 
  TransformationRule, 
  FieldMapping, 
  ValidationRule,
  PostProcessingStep 
} from '../types';

/**
 * World Bank Data Transformation Rules
 */
export const worldBankTransformations: TransformationRule = {
  id: 'world-bank-transform',
  name: 'World Bank Data Transformation',
  sourceType: 'world-bank',
  targetType: 'energy-indicator',
  mappings: [
    {
      sourceField: 'country.value',
      targetField: 'countryName',
      transform: (value: string) => value?.trim() || 'Unknown'
    },
    {
      sourceField: 'country.id',
      targetField: 'countryCode',
      transform: (value: string) => value?.toUpperCase() || ''
    },
    {
      sourceField: 'indicator.id',
      targetField: 'indicatorCode',
      transform: (value: string) => value || ''
    },
    {
      sourceField: 'indicator.value',
      targetField: 'indicatorName',
      transform: (value: string) => value?.trim() || ''
    },
    {
      sourceField: 'value',
      targetField: 'value',
      transform: (value: any) => {
        if (value === null || value === undefined) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
    },
    {
      sourceField: 'date',
      targetField: 'year',
      transform: (value: string) => parseInt(value, 10) || null
    },
    {
      sourceField: 'unit',
      targetField: 'unit',
      defaultValue: 'N/A'
    },
    {
      sourceField: 'obs_status',
      targetField: 'observationStatus',
      defaultValue: 'A' // Actual value
    },
    {
      sourceField: 'decimal',
      targetField: 'decimalPlaces',
      transform: (value: any) => parseInt(value, 10) || 2
    }
  ],
  validations: [
    {
      field: 'countryCode',
      type: 'required',
      config: {},
      severity: 'error'
    },
    {
      field: 'countryCode',
      type: 'pattern',
      config: { pattern: '^[A-Z]{2,3}$' },
      severity: 'error'
    },
    {
      field: 'year',
      type: 'range',
      config: { min: 1960, max: new Date().getFullYear() + 1 },
      severity: 'warning'
    },
    {
      field: 'value',
      type: 'type',
      config: { type: 'number' },
      severity: 'warning'
    }
  ],
  postProcessing: [
    {
      name: 'normalizeEnergyUnits',
      order: 1,
      processor: (records) => {
        return records.map(record => {
          // Normalize energy units to standard format
          if (record.data.unit === 'kWh per capita') {
            record.data.unit = 'kWh/capita';
          } else if (record.data.unit === 'kg of oil equivalent per capita') {
            record.data.unit = 'kgoe/capita';
          }
          return record;
        });
      }
    }
  ]
};

/**
 * NASA POWER Climate Data Transformation Rules
 */
export const nasaPowerTransformations: TransformationRule = {
  id: 'nasa-power-transform',
  name: 'NASA POWER Climate Data Transformation',
  sourceType: 'nasa-power',
  targetType: 'climate-data',
  mappings: [
    {
      sourceField: 'parameters.ALLSKY_SFC_SW_DWN',
      targetField: 'solarIrradiance',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'parameters.WS10M',
      targetField: 'windSpeed10m',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'parameters.T2M',
      targetField: 'temperature2m',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'parameters.PRECTOTCORR',
      targetField: 'precipitation',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'header.lon',
      targetField: 'longitude',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'header.lat',
      targetField: 'latitude',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'header.start',
      targetField: 'startDate',
      transform: (value: string) => new Date(value).toISOString()
    },
    {
      sourceField: 'header.end',
      targetField: 'endDate',
      transform: (value: string) => new Date(value).toISOString()
    }
  ],
  validations: [
    {
      field: 'latitude',
      type: 'range',
      config: { min: -90, max: 90 },
      severity: 'error'
    },
    {
      field: 'longitude',
      type: 'range',
      config: { min: -180, max: 180 },
      severity: 'error'
    },
    {
      field: 'solarIrradiance',
      type: 'range',
      config: { min: 0, max: 1000 },
      severity: 'warning'
    }
  ]
};

/**
 * IRENA Renewable Energy Statistics Transformation Rules
 */
export const irenaTransformations: TransformationRule = {
  id: 'irena-transform',
  name: 'IRENA Renewable Energy Transformation',
  sourceType: 'irena',
  targetType: 'renewable-capacity',
  mappings: [
    {
      sourceField: 'Country',
      targetField: 'countryName',
      transform: (value: string) => value?.trim() || ''
    },
    {
      sourceField: 'Technology',
      targetField: 'technology',
      transform: (value: string) => {
        // Standardize technology names
        const techMap: Record<string, string> = {
          'Solar photovoltaic': 'Solar PV',
          'Onshore wind energy': 'Wind Onshore',
          'Offshore wind energy': 'Wind Offshore',
          'Hydropower': 'Hydro',
          'Bioenergy': 'Biomass'
        };
        return techMap[value] || value;
      }
    },
    {
      sourceField: 'Year',
      targetField: 'year',
      transform: (value: any) => parseInt(value, 10) || null
    },
    {
      sourceField: 'Electricity Installed Capacity (MW)',
      targetField: 'installedCapacityMW',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'Electricity Generation (GWh)',
      targetField: 'generationGWh',
      transform: (value: any) => parseFloat(value) || 0
    },
    {
      sourceField: 'Region',
      targetField: 'region',
      defaultValue: 'Global'
    }
  ],
  validations: [
    {
      field: 'technology',
      type: 'required',
      config: {},
      severity: 'error'
    },
    {
      field: 'year',
      type: 'required',
      config: {},
      severity: 'error'
    },
    {
      field: 'installedCapacityMW',
      type: 'range',
      config: { min: 0 },
      severity: 'warning'
    }
  ],
  postProcessing: [
    {
      name: 'calculateCapacityFactor',
      order: 1,
      processor: (records) => {
        return records.map(record => {
          const capacity = record.data.installedCapacityMW;
          const generation = record.data.generationGWh;
          
          if (capacity > 0 && generation > 0) {
            // Capacity factor = (Generation in MWh) / (Capacity in MW * 8760 hours)
            const capacityFactor = (generation * 1000) / (capacity * 8760);
            record.data.capacityFactor = Math.min(1, Math.max(0, capacityFactor));
          } else {
            record.data.capacityFactor = 0;
          }
          
          return record;
        });
      }
    }
  ]
};

/**
 * ESMAP Hub Dataset Transformation Rules
 */
export const esmapHubTransformations: TransformationRule = {
  id: 'esmap-hub-transform',
  name: 'ESMAP Hub Dataset Transformation',
  sourceType: 'esmap-hub',
  targetType: 'esmap-dataset',
  mappings: [
    {
      sourceField: 'dataset_name',
      targetField: 'datasetName',
      transform: (value: string) => value?.trim() || ''
    },
    {
      sourceField: 'country',
      targetField: 'country',
      transform: (value: string) => value?.trim() || 'Global'
    },
    {
      sourceField: 'category',
      targetField: 'category',
      transform: (value: string) => {
        // Standardize categories
        const categoryMap: Record<string, string> = {
          'energy_access': 'Energy Access',
          'renewable_energy': 'Renewable Energy',
          'energy_efficiency': 'Energy Efficiency',
          'clean_cooking': 'Clean Cooking',
          'grid_infrastructure': 'Grid Infrastructure'
        };
        return categoryMap[value?.toLowerCase()] || value;
      }
    },
    {
      sourceField: 'last_updated',
      targetField: 'lastUpdated',
      transform: (value: string) => new Date(value).toISOString()
    },
    {
      sourceField: 'data_points',
      targetField: 'dataPoints',
      transform: (value: any) => parseInt(value, 10) || 0
    },
    {
      sourceField: 'temporal_coverage_start',
      targetField: 'temporalCoverageStart',
      transform: (value: any) => parseInt(value, 10) || null
    },
    {
      sourceField: 'temporal_coverage_end',
      targetField: 'temporalCoverageEnd',
      transform: (value: any) => parseInt(value, 10) || null
    },
    {
      sourceField: 'spatial_resolution',
      targetField: 'spatialResolution',
      defaultValue: 'National'
    },
    {
      sourceField: 'update_frequency',
      targetField: 'updateFrequency',
      defaultValue: 'Annual'
    }
  ],
  validations: [
    {
      field: 'datasetName',
      type: 'required',
      config: {},
      severity: 'error'
    },
    {
      field: 'category',
      type: 'required',
      config: {},
      severity: 'error'
    },
    {
      field: 'lastUpdated',
      type: 'custom',
      config: {
        validator: async (value: string) => {
          const date = new Date(value);
          const now = new Date();
          const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
          
          return {
            isValid: date > sixMonthsAgo,
            message: 'Dataset has not been updated in the last 6 months'
          };
        }
      },
      severity: 'warning'
    }
  ]
};

/**
 * Multi-Tier Framework (MTF) Survey Transformation Rules
 */
export const mtfTransformations: TransformationRule = {
  id: 'mtf-transform',
  name: 'MTF Survey Data Transformation',
  sourceType: 'mtf-survey',
  targetType: 'energy-access-tier',
  mappings: [
    {
      sourceField: 'household_id',
      targetField: 'householdId',
      transform: (value: string) => value || ''
    },
    {
      sourceField: 'country',
      targetField: 'country',
      transform: (value: string) => value?.trim() || ''
    },
    {
      sourceField: 'region',
      targetField: 'region',
      transform: (value: string) => value?.trim() || ''
    },
    {
      sourceField: 'electricity_tier',
      targetField: 'electricityTier',
      transform: (value: any) => {
        const tier = parseInt(value, 10);
        return tier >= 0 && tier <= 5 ? tier : 0;
      }
    },
    {
      sourceField: 'cooking_tier',
      targetField: 'cookingTier',
      transform: (value: any) => {
        const tier = parseInt(value, 10);
        return tier >= 0 && tier <= 5 ? tier : 0;
      }
    },
    {
      sourceField: 'survey_date',
      targetField: 'surveyDate',
      transform: (value: string) => new Date(value).toISOString()
    },
    {
      sourceField: 'grid_connected',
      targetField: 'gridConnected',
      transform: (value: any) => Boolean(value)
    },
    {
      sourceField: 'primary_lighting_source',
      targetField: 'primaryLightingSource',
      transform: (value: string) => value || 'None'
    },
    {
      sourceField: 'primary_cooking_fuel',
      targetField: 'primaryCookingFuel',
      transform: (value: string) => value || 'None'
    }
  ],
  validations: [
    {
      field: 'electricityTier',
      type: 'range',
      config: { min: 0, max: 5 },
      severity: 'error'
    },
    {
      field: 'cookingTier',
      type: 'range',
      config: { min: 0, max: 5 },
      severity: 'error'
    },
    {
      field: 'country',
      type: 'required',
      config: {},
      severity: 'error'
    }
  ],
  postProcessing: [
    {
      name: 'calculateAccessScore',
      order: 1,
      processor: (records) => {
        return records.map(record => {
          const electricityTier = record.data.electricityTier || 0;
          const cookingTier = record.data.cookingTier || 0;
          
          // Calculate composite access score (0-100)
          record.data.accessScore = ((electricityTier + cookingTier) / 10) * 100;
          
          // Determine access category
          if (electricityTier >= 4 && cookingTier >= 4) {
            record.data.accessCategory = 'Full Access';
          } else if (electricityTier >= 2 || cookingTier >= 2) {
            record.data.accessCategory = 'Basic Access';
          } else {
            record.data.accessCategory = 'No Access';
          }
          
          return record;
        });
      }
    }
  ]
};

/**
 * Get all transformation rules
 */
export function getAllTransformationRules(): TransformationRule[] {
  return [
    worldBankTransformations,
    nasaPowerTransformations,
    irenaTransformations,
    esmapHubTransformations,
    mtfTransformations
  ];
}

/**
 * Get transformation rule by source type
 */
export function getTransformationRule(sourceType: string): TransformationRule | undefined {
  const rules = getAllTransformationRules();
  return rules.find(rule => rule.sourceType === sourceType);
}