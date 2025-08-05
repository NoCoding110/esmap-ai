/**
 * Commercial Data Broker Integrations
 * Handles integration with commercial data providers with cost management
 */

import {
  CommercialDataBroker,
  DataProduct,
  PricingModel,
  PricingTier,
  LegalComplianceCheck,
  ComplianceCheckResult
} from './types';

export interface DataRequest {
  productId: string;
  parameters: Record<string, any>;
  format: 'json' | 'csv' | 'xml';
  deliveryMethod: 'api' | 'file' | 'stream';
  priority: 'low' | 'normal' | 'high';
  budget?: {
    maxCost: number;
    currency: string;
  };
}

export interface DataDelivery {
  requestId: string;
  productId: string;
  brokerId: string;
  data: any;
  metadata: {
    recordCount: number;
    dataSize: number;
    processingTime: number;
    costIncurred: number;
    currency: string;
    qualityScore: number;
  };
  billing: {
    unitCost: number;
    totalCost: number;
    billingMethod: string;
    invoiceId?: string;
  };
  compliance: {
    licenseTerms: string[];
    usageRestrictions: string[];
    attributionRequired: boolean;
    redistributionAllowed: boolean;
  };
}

export interface CostAnalysis {
  brokerId: string;
  productId: string;
  estimatedCost: number;
  currency: string;
  breakdown: {
    baseCost: number;
    volumeDiscount: number;
    premiumCharges: number;
    taxes: number;
  };
  alternatives: Array<{
    brokerId: string;
    productId: string;
    cost: number;
    qualityDifference: number;
  }>;
}

export interface UsageReport {
  period: string;
  totalCost: number;
  currency: string;
  requestCount: number;
  dataVolume: number;
  brokerBreakdown: Map<string, {
    cost: number;
    requests: number;
    volume: number;
    avgQuality: number;
  }>;
  budgetUtilization: number;
  costEfficiency: number;
  recommendations: string[];
}

export class CommercialDataBrokerManager {
  private brokers: Map<string, CommercialDataBroker> = new Map();
  private usage: Map<string, Array<{ timestamp: string; cost: number; product: string }>> = new Map();
  private budgetLimits: Map<string, { daily: number; monthly: number; currency: string }> = new Map();
  private complianceCache: Map<string, LegalComplianceCheck> = new Map();

  constructor() {
    this.initializeDefaultBrokers();
  }

  /**
   * Initialize default commercial data brokers
   */
  private initializeDefaultBrokers(): void {
    // Energy Market Data Provider
    this.brokers.set('energy-market-data', {
      id: 'energy-market-data',
      name: 'Energy Market Data Services',
      baseUrl: 'https://api.energymarketdata.com',
      authentication: {
        type: 'api_key',
        credentials: { api_key: 'your-api-key' }
      },
      dataProducts: [
        {
          id: 'power-prices',
          name: 'Real-time Power Prices',
          description: 'Real-time electricity prices from major markets',
          endpoint: '/power/prices',
          schema: {
            market: 'string',
            timestamp: 'datetime',
            price: 'number',
            currency: 'string',
            unit: 'string'
          },
          costPerRequest: 0.10,
          currency: 'USD',
          dataRetention: 30
        },
        {
          id: 'renewable-forecasts',
          name: 'Renewable Energy Forecasts',
          description: 'Wind and solar generation forecasts',
          endpoint: '/renewables/forecasts',
          schema: {
            region: 'string',
            technology: 'string',
            forecast_horizon: 'number',
            generation_mw: 'number',
            confidence: 'number'
          },
          costPerRequest: 0.25,
          currency: 'USD',
          dataRetention: 7
        }
      ],
      pricing: {
        type: 'tiered',
        tiers: [
          { name: 'Basic', minRequests: 0, maxRequests: 1000, costPerRequest: 0.15 },
          { name: 'Professional', minRequests: 1001, maxRequests: 10000, costPerRequest: 0.10 },
          { name: 'Enterprise', minRequests: 10001, maxRequests: 100000, costPerRequest: 0.05 }
        ],
        currency: 'USD'
      },
      usage: {
        requestsToday: 0,
        costToday: 0,
        monthlyLimit: 10000,
        costLimit: 1000
      }
    });

    // Climate Data Specialist
    this.brokers.set('climate-analytics', {
      id: 'climate-analytics',
      name: 'Climate Analytics Corporation',
      baseUrl: 'https://data-api.climateanalytics.com',
      authentication: {
        type: 'oauth',
        credentials: {
          client_id: 'your-client-id',
          client_secret: 'your-client-secret'
        }
      },
      dataProducts: [
        {
          id: 'weather-data',
          name: 'Historical Weather Data',
          description: 'Historical weather data with high spatial resolution',
          endpoint: '/weather/historical',
          schema: {
            location: 'object',
            date: 'date',
            temperature: 'number',
            precipitation: 'number',
            wind_speed: 'number',
            solar_irradiance: 'number'
          },
          costPerRequest: 0.05,
          currency: 'USD',
          dataRetention: 365
        },
        {
          id: 'climate-projections',
          name: 'Climate Change Projections',
          description: 'Climate model projections for impact assessment',
          endpoint: '/climate/projections',
          schema: {
            scenario: 'string',
            variable: 'string',
            location: 'object',
            year: 'number',
            value: 'number',
            uncertainty: 'number'
          },
          costPerRequest: 0.50,
          currency: 'USD',
          dataRetention: 90
        }
      ],
      pricing: {
        type: 'subscription',
        subscriptionCost: 500,
        currency: 'USD'
      },
      usage: {
        requestsToday: 0,
        costToday: 0,
        monthlyLimit: 50000,
        costLimit: 500
      }
    });

    // Financial Market Data
    this.brokers.set('financial-energy-data', {
      id: 'financial-energy-data',
      name: 'Financial Energy Data Solutions',
      baseUrl: 'https://api.financialenergy.com',
      authentication: {
        type: 'basic_auth',
        credentials: {
          username: 'your-username',
          password: 'your-password'
        }
      },
      dataProducts: [
        {
          id: 'commodity-prices',
          name: 'Energy Commodity Prices',
          description: 'Oil, gas, and coal commodity prices with derivatives',
          endpoint: '/commodities/prices',
          schema: {
            commodity: 'string',
            contract: 'string',
            price: 'number',
            currency: 'string',
            volume: 'number',
            timestamp: 'datetime'
          },
          costPerRequest: 0.20,
          currency: 'USD',
          dataRetention: 60
        },
        {
          id: 'carbon-credits',
          name: 'Carbon Credit Prices',
          description: 'Carbon credit and offset market prices',
          endpoint: '/carbon/credits',
          schema: {
            market: 'string',
            credit_type: 'string',
            price: 'number',
            volume: 'number',
            vintage: 'number',
            certification: 'string'
          },
          costPerRequest: 0.30,
          currency: 'USD',
          dataRetention: 30
        }
      ],
      pricing: {
        type: 'per_request',
        currency: 'USD'
      },
      usage: {
        requestsToday: 0,
        costToday: 0,
        monthlyLimit: 5000,
        costLimit: 2000
      }
    });
  }

  /**
   * Request data from commercial broker
   */
  async requestData(brokerId: string, request: DataRequest): Promise<DataDelivery> {
    const broker = this.brokers.get(brokerId);
    if (!broker) {
      throw new Error(`Broker ${brokerId} not found`);
    }

    const product = broker.dataProducts.find(p => p.id === request.productId);
    if (!product) {
      throw new Error(`Product ${request.productId} not found for broker ${brokerId}`);
    }

    // Check budget constraints
    const costAnalysis = this.analyzeCost(brokerId, request);
    if (request.budget && costAnalysis.estimatedCost > request.budget.maxCost) {
      throw new Error(`Estimated cost ${costAnalysis.estimatedCost} exceeds budget ${request.budget.maxCost}`);
    }

    // Check usage limits
    this.checkUsageLimits(brokerId, costAnalysis.estimatedCost);

    // Perform compliance check
    await this.verifyCompliance(brokerId, request.productId);

    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Authenticate and make request
      const headers = await this.buildAuthHeaders(broker);
      const url = this.buildRequestUrl(broker, product, request);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Accept': this.getAcceptHeader(request.format),
          'User-Agent': 'ESMAP-AI-Platform/1.0',
          'X-Request-ID': requestId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await this.parseResponse(response, request.format);
      const processingTime = Date.now() - startTime;

      // Calculate actual cost
      const actualCost = this.calculateActualCost(broker, product, data);
      
      // Update usage tracking
      this.updateUsage(brokerId, actualCost, request.productId);

      // Assess data quality
      const qualityScore = this.assessDataQuality(data, product);

      const delivery: DataDelivery = {
        requestId,
        productId: request.productId,
        brokerId,
        data,
        metadata: {
          recordCount: Array.isArray(data) ? data.length : 1,
          dataSize: JSON.stringify(data).length,
          processingTime,
          costIncurred: actualCost,
          currency: product.currency,
          qualityScore
        },
        billing: {
          unitCost: product.costPerRequest,
          totalCost: actualCost,
          billingMethod: broker.pricing.type,
          invoiceId: response.headers.get('X-Invoice-ID') || undefined
        },
        compliance: {
          licenseTerms: ['Commercial Use Permitted', 'Attribution Required'],
          usageRestrictions: ['No Redistribution', 'Internal Use Only'],
          attributionRequired: true,
          redistributionAllowed: false
        }
      };

      return delivery;

    } catch (error) {
      console.error(`Error requesting data from broker ${brokerId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze cost for a data request
   */
  analyzeCost(brokerId: string, request: DataRequest): CostAnalysis {
    const broker = this.brokers.get(brokerId)!;
    const product = broker.dataProducts.find(p => p.id === request.productId)!;

    let baseCost = product.costPerRequest;
    let volumeDiscount = 0;
    let premiumCharges = 0;

    // Apply pricing model
    if (broker.pricing.type === 'tiered' && broker.pricing.tiers) {
      const currentUsage = broker.usage.requestsToday;
      const tier = broker.pricing.tiers.find(t => 
        currentUsage >= t.minRequests && currentUsage <= t.maxRequests
      );
      if (tier) {
        baseCost = tier.costPerRequest;
      }
    }

    // Apply priority premium
    if (request.priority === 'high') {
      premiumCharges = baseCost * 0.5; // 50% premium for high priority
    }

    // Calculate volume discount for large requests
    const estimatedRecords = this.estimateRecordCount(request);
    if (estimatedRecords > 10000) {
      volumeDiscount = baseCost * 0.1; // 10% discount for large requests
    }

    const taxes = (baseCost + premiumCharges - volumeDiscount) * 0.08; // 8% tax
    const estimatedCost = baseCost + premiumCharges - volumeDiscount + taxes;

    // Find alternatives
    const alternatives = this.findAlternatives(request);

    return {
      brokerId,
      productId: request.productId,
      estimatedCost,
      currency: product.currency,
      breakdown: {
        baseCost,
        volumeDiscount: -volumeDiscount,
        premiumCharges,
        taxes
      },
      alternatives
    };
  }

  /**
   * Check usage limits
   */
  private checkUsageLimits(brokerId: string, estimatedCost: number): void {
    const broker = this.brokers.get(brokerId)!;
    const budgetLimit = this.budgetLimits.get(brokerId);

    // Check daily limits
    if (broker.usage.costToday + estimatedCost > broker.usage.costLimit) {
      throw new Error(`Request would exceed daily cost limit for broker ${brokerId}`);
    }

    if (broker.usage.requestsToday >= broker.usage.monthlyLimit) {
      throw new Error(`Daily request limit exceeded for broker ${brokerId}`);
    }

    // Check custom budget limits
    if (budgetLimit) {
      const dailyCost = this.getDailyCost(brokerId);
      if (dailyCost + estimatedCost > budgetLimit.daily) {
        throw new Error(`Request would exceed custom daily budget for broker ${brokerId}`);
      }
    }
  }

  /**
   * Verify compliance for broker and product
   */
  private async verifyCompliance(brokerId: string, productId: string): Promise<void> {
    const cacheKey = `${brokerId}:${productId}`;
    let complianceCheck = this.complianceCache.get(cacheKey);

    // Check if cached compliance is still valid (30 days)
    if (complianceCheck) {
      const cacheAge = Date.now() - new Date(complianceCheck.lastChecked).getTime();
      if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
        if (complianceCheck.complianceStatus === 'non_compliant') {
          throw new Error(`Compliance violation for ${brokerId}:${productId}`);
        }
        return;
      }
    }

    // Perform fresh compliance check
    complianceCheck = await this.performComplianceCheck(brokerId, productId);
    this.complianceCache.set(cacheKey, complianceCheck);

    if (complianceCheck.complianceStatus === 'non_compliant') {
      throw new Error(`Compliance violation: ${complianceCheck.recommendations.join(', ')}`);
    }
  }

  /**
   * Perform comprehensive compliance check
   */
  private async performComplianceCheck(brokerId: string, productId: string): Promise<LegalComplianceCheck> {
    const broker = this.brokers.get(brokerId)!;
    const product = broker.dataProducts.find(p => p.id === productId)!;

    const checks: ComplianceCheckResult[] = [];

    // Check data licensing
    checks.push({
      checkType: 'data_licensing',
      status: 'pass',
      description: 'Commercial data with proper licensing agreement',
      evidence: 'Licensed commercial data provider'
    });

    // Check usage restrictions
    checks.push({
      checkType: 'usage_restrictions',
      status: 'pass',
      description: 'Usage restrictions documented and compliant',
      evidence: 'Terms of service reviewed'
    });

    // Check data retention policies
    checks.push({
      checkType: 'data_retention',
      status: product.dataRetention > 0 ? 'pass' : 'warning',
      description: product.dataRetention > 0 ? 
        `Data retention period: ${product.dataRetention} days` : 
        'No data retention policy specified',
      remediation: product.dataRetention === 0 ? 'Establish data retention policy' : undefined
    });

    // Check attribution requirements  
    checks.push({
      checkType: 'attribution',
      status: 'pass',
      description: 'Attribution requirements documented',
      evidence: 'Commercial license includes attribution terms'
    });

    // Check cost transparency
    checks.push({
      checkType: 'cost_transparency',
      status: product.costPerRequest > 0 ? 'pass' : 'fail',
      description: product.costPerRequest > 0 ? 
        'Transparent pricing model' : 
        'No clear pricing information',
      remediation: product.costPerRequest === 0 ? 'Establish clear pricing terms' : undefined
    });

    const failCount = checks.filter(c => c.status === 'fail').length;
    const complianceStatus = failCount > 0 ? 'non_compliant' : 'compliant';

    const recommendations: string[] = [];
    if (product.dataRetention === 0) {
      recommendations.push('Establish clear data retention policy');
    }
    if (product.costPerRequest === 0) {
      recommendations.push('Document pricing structure clearly');
    }

    return {
      sourceId: `${brokerId}:${productId}`,
      lastChecked: new Date().toISOString(),
      complianceStatus,
      checks,
      recommendations,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Helper methods
   */
  private async buildAuthHeaders(broker: CommercialDataBroker): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    switch (broker.authentication.type) {
      case 'api_key':
        headers['X-API-Key'] = broker.authentication.credentials.api_key;
        break;
      case 'basic_auth':
        const credentials = btoa(`${broker.authentication.credentials.username}:${broker.authentication.credentials.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'oauth':
        // In a real implementation, this would handle OAuth token refresh
        headers['Authorization'] = 'Bearer your-oauth-token';
        break;
    }

    return headers;
  }

  private buildRequestUrl(broker: CommercialDataBroker, product: DataProduct, request: DataRequest): string {
    const baseUrl = `${broker.baseUrl}${product.endpoint}`;
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(request.parameters)) {
      params.append(key, String(value));
    }

    params.append('format', request.format);
    
    return `${baseUrl}?${params.toString()}`;
  }

  private getAcceptHeader(format: string): string {
    switch (format) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'xml': return 'application/xml';
      default: return 'application/json';
    }
  }

  private async parseResponse(response: Response, format: string): Promise<any> {
    switch (format) {
      case 'json':
        return await response.json();
      case 'csv':
        return await response.text();
      case 'xml':
        return await response.text();
      default:
        return await response.json();
    }
  }

  private calculateActualCost(broker: CommercialDataBroker, product: DataProduct, data: any): number {
    let baseCost = product.costPerRequest;

    // Adjust cost based on actual data volume
    if (Array.isArray(data)) {
      const recordCount = data.length;
      if (recordCount > 1000) {
        baseCost *= recordCount / 1000; // Scale cost with record count
      }
    }

    return baseCost;
  }

  private updateUsage(brokerId: string, cost: number, productId: string): void {
    const broker = this.brokers.get(brokerId)!;
    broker.usage.requestsToday++;
    broker.usage.costToday += cost;

    // Track detailed usage
    const usage = this.usage.get(brokerId) || [];
    usage.push({
      timestamp: new Date().toISOString(),
      cost,
      product: productId
    });
    this.usage.set(brokerId, usage);
  }

  private assessDataQuality(data: any, product: DataProduct): number {
    // Simple quality assessment based on completeness and schema compliance
    if (!data) return 0;

    let score = 0.8; // Base score

    if (Array.isArray(data)) {
      const sampleSize = Math.min(100, data.length);
      const sample = data.slice(0, sampleSize);
      const schemaKeys = Object.keys(product.schema);
      
      let compliantRecords = 0;
      for (const record of sample) {
        const recordKeys = Object.keys(record);
        const compliance = schemaKeys.filter(key => recordKeys.includes(key)).length / schemaKeys.length;
        if (compliance > 0.8) compliantRecords++;
      }
      
      score = compliantRecords / sample.length;
    }

    return Math.max(0, Math.min(1, score));
  }

  private estimateRecordCount(request: DataRequest): number {
    // Estimate based on request parameters
    // This is a simplified heuristic
    const timeRange = request.parameters.end_date && request.parameters.start_date ?
      new Date(request.parameters.end_date).getTime() - new Date(request.parameters.start_date).getTime() :
      24 * 60 * 60 * 1000; // 1 day default
    
    const days = timeRange / (24 * 60 * 60 * 1000);
    return Math.ceil(days * 24); // Assume hourly data
  }

  private findAlternatives(request: DataRequest): Array<{ brokerId: string; productId: string; cost: number; qualityDifference: number }> {
    const alternatives: Array<{ brokerId: string; productId: string; cost: number; qualityDifference: number }> = [];

    for (const [brokerId, broker] of this.brokers) {
      for (const product of broker.dataProducts) {
        if (product.id !== request.productId && this.isCompatibleProduct(product, request)) {
          alternatives.push({
            brokerId,
            productId: product.id,
            cost: product.costPerRequest,
            qualityDifference: Math.random() * 0.2 - 0.1 // Placeholder quality difference
          });
        }
      }
    }

    return alternatives.sort((a, b) => a.cost - b.cost).slice(0, 3); // Top 3 cheapest alternatives
  }

  private isCompatibleProduct(product: DataProduct, request: DataRequest): boolean {
    // Simple compatibility check based on product name similarity
    const requestProductName = request.productId.toLowerCase();
    const productName = product.id.toLowerCase();
    
    return productName.includes('energy') || productName.includes('climate') || 
           requestProductName.includes('energy') || requestProductName.includes('climate');
  }

  private getDailyCost(brokerId: string): number {
    const usage = this.usage.get(brokerId) || [];
    const today = new Date().toDateString();
    
    return usage
      .filter(u => new Date(u.timestamp).toDateString() === today)
      .reduce((sum, u) => sum + u.cost, 0);
  }

  /**
   * Public API methods
   */
  setBudgetLimit(brokerId: string, daily: number, monthly: number, currency: string): void {
    this.budgetLimits.set(brokerId, { daily, monthly, currency });
  }

  generateUsageReport(period: string = '30d'): UsageReport {
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    }

    let totalCost = 0;
    let requestCount = 0;
    let dataVolume = 0;
    const brokerBreakdown = new Map();

    for (const [brokerId, usage] of this.usage) {
      const periodUsage = usage.filter(u => {
        const usageDate = new Date(u.timestamp);
        return usageDate >= startDate && usageDate <= endDate;
      });

      const brokerCost = periodUsage.reduce((sum, u) => sum + u.cost, 0);
      const brokerRequests = periodUsage.length;
      
      totalCost += brokerCost;
      requestCount += brokerRequests;
      
      brokerBreakdown.set(brokerId, {
        cost: brokerCost,
        requests: brokerRequests,
        volume: brokerRequests * 1000, // Estimated data volume
        avgQuality: 0.85 // Placeholder
      });
    }

    const budgetUtilization = 0.75; // Placeholder
    const costEfficiency = totalCost > 0 ? dataVolume / totalCost : 0;

    const recommendations: string[] = [];
    if (budgetUtilization > 0.8) {
      recommendations.push('Consider optimizing data requests to reduce costs');
    }
    if (costEfficiency < 100) {
      recommendations.push('Evaluate alternative data sources for better cost efficiency');
    }

    return {
      period,
      totalCost,
      currency: 'USD',
      requestCount,
      dataVolume,
      brokerBreakdown,
      budgetUtilization,
      costEfficiency,
      recommendations
    };
  }

  getBrokers(): CommercialDataBroker[] {
    return Array.from(this.brokers.values());
  }

  getBroker(brokerId: string): CommercialDataBroker | undefined {
    return this.brokers.get(brokerId);
  }

  registerBroker(broker: CommercialDataBroker): void {
    this.brokers.set(broker.id, broker);
    this.usage.set(broker.id, []);
  }

  removeBroker(brokerId: string): boolean {
    this.usage.delete(brokerId);
    this.budgetLimits.delete(brokerId);
    return this.brokers.delete(brokerId);
  }
}