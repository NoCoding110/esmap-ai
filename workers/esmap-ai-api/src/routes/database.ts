import type { Env } from '../types';
import { Logger } from '../utils/logger';
import { handleError, createSuccessResponse, ApiError } from '../utils/error-handler';
import { DatabaseManager } from '../database/services/database-manager';

export async function handleDatabaseRoute(
  request: Request,
  env: Env,
  logger: Logger,
  path: string
): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = path.split('/').filter(Boolean);
  
  // Remove 'api/v1/database' from path
  const route = pathSegments.slice(3).join('/');
  const params = Object.fromEntries(url.searchParams.entries());
  
  const dbManager = new DatabaseManager(env);
  
  try {
    switch (route) {
      // Database management endpoints
      case 'health':
        return await handleDatabaseHealth(dbManager, logger);
      
      case 'schema':
        return await handleDatabaseSchema(dbManager, logger);
      
      case 'stats':
        return await handleDatabaseStats(dbManager, logger);
      
      case 'migrate':
        return await handleMigration(request, dbManager, logger);
      
      case 'seed':
        return await handleSeed(request, dbManager, logger);
      
      // Countries endpoints
      case 'countries':
        return await handleCountries(request, dbManager, logger, params);
      
      case 'countries/search':
        return await handleCountriesSearch(dbManager, logger, params);
      
      case 'countries/regions':
        return await handleCountriesRegions(dbManager, logger);
      
      case 'countries/income-groups':
        return await handleCountriesIncomeGroups(dbManager, logger);
      
      // Energy data endpoints
      case 'energy-data':
        return await handleEnergyData(request, dbManager, logger, params);
      
      case 'energy-data/stats':
        return await handleEnergyDataStats(dbManager, logger);
      
      // Renewable capacity endpoints
      case 'renewable-capacity':
        return await handleRenewableCapacity(request, dbManager, logger, params);
      
      case 'renewable-capacity/stats':
        return await handleRenewableCapacityStats(dbManager, logger);
      
      case 'renewable-capacity/global':
        return await handleGlobalCapacity(dbManager, logger, params);
      
      case 'renewable-capacity/ranking':
        return await handleCapacityRanking(dbManager, logger, params);
      
      // Complex queries
      case 'country-profiles':
        return await handleCountryProfiles(dbManager, logger, params);
      
      // Raw query endpoint (admin only - for development)
      case 'query':
        return await handleRawQuery(request, dbManager, logger);
      
      // List available endpoints
      case '':
        return handleDatabaseEndpointsList(logger);
      
      default:
        // Check if it's a specific country or resource by ID
        if (route.startsWith('countries/') && route.split('/').length === 2) {
          const countryId = parseInt(route.split('/')[1]);
          return await handleCountryById(countryId, dbManager, logger);
        }
        
        if (route.startsWith('energy-data/') && route.split('/').length === 2) {
          const dataId = parseInt(route.split('/')[1]);
          return await handleEnergyDataById(dataId, dbManager, logger);
        }
        
        throw new ApiError(`Database endpoint not found: ${route}`, 404, 'NOT_FOUND');
    }
  } catch (error) {
    return handleError(error, logger);
  }
}

async function handleDatabaseHealth(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Database health check requested');
  
  const health = await dbManager.healthCheck();
  const response = createSuccessResponse(health, logger.getRequestId());
  
  return Response.json(response, { 
    status: health.status === 'healthy' ? 200 : 503 
  });
}

async function handleDatabaseSchema(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Database schema requested');
  
  const schema = await dbManager.getDatabaseSchema();
  const response = createSuccessResponse(schema, logger.getRequestId());
  
  return Response.json(response);
}

async function handleDatabaseStats(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Database stats requested');
  
  const stats = await dbManager.getDatabaseStats();
  const response = createSuccessResponse(stats, logger.getRequestId());
  
  return Response.json(response);
}

async function handleMigration(request: Request, dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  if (request.method !== 'POST') {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
  
  const body = await request.json() as { migrationSql?: string };
  const { migrationSql } = body;
  
  if (!migrationSql) {
    throw new ApiError('Missing migration SQL', 400, 'MISSING_MIGRATION_SQL');
  }
  
  logger.info('Running database migration');
  
  await dbManager.runMigration(migrationSql);
  
  const response = createSuccessResponse({ message: 'Migration completed successfully' }, logger.getRequestId());
  return Response.json(response);
}

async function handleSeed(request: Request, dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  if (request.method !== 'POST') {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
  
  const body = await request.json() as { seedSql?: string };
  const { seedSql } = body;
  
  if (!seedSql) {
    throw new ApiError('Missing seed SQL', 400, 'MISSING_SEED_SQL');
  }
  
  logger.info('Running database seed');
  
  await dbManager.runSeed(seedSql);
  
  const response = createSuccessResponse({ message: 'Seed completed successfully' }, logger.getRequestId());
  return Response.json(response);
}

async function handleCountries(request: Request, dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    logger.info('Countries list requested', params);
    
    const query = {
      iso2_code: params.iso2_code,
      iso3_code: params.iso3_code,
      name: params.name,
      region: params.region,
      income_group: params.income_group,
      limit: params.limit ? parseInt(params.limit) : undefined,
      offset: params.offset ? parseInt(params.offset) : undefined
    };
    
    const result = await dbManager.countries.getAll(query);
    const response = createSuccessResponse(result, logger.getRequestId());
    
    return Response.json(response);
  } else if (request.method === 'POST') {
    const body = await request.json() as any;
    logger.info('Creating new country', { name: body.name });
    
    const country = await dbManager.countries.create(body);
    const response = createSuccessResponse(country, logger.getRequestId());
    
    return Response.json(response, { status: 201 });
  } else {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
}

async function handleCountryById(countryId: number, dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Country by ID requested', { countryId });
  
  const country = await dbManager.countries.getById(countryId);
  if (!country) {
    throw new ApiError('Country not found', 404, 'COUNTRY_NOT_FOUND');
  }
  
  const response = createSuccessResponse(country, logger.getRequestId());
  return Response.json(response);
}

async function handleCountriesSearch(dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  const searchTerm = params.q;
  if (!searchTerm) {
    throw new ApiError('Missing search term', 400, 'MISSING_SEARCH_TERM');
  }
  
  logger.info('Countries search requested', { searchTerm });
  
  const limit = params.limit ? parseInt(params.limit) : 10;
  const countries = await dbManager.countries.searchByName(searchTerm, limit);
  
  const response = createSuccessResponse({ countries, total: countries.length }, logger.getRequestId());
  return Response.json(response);
}

async function handleCountriesRegions(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Countries regions requested');
  
  const regions = await dbManager.countries.getRegions();
  const response = createSuccessResponse({ regions }, logger.getRequestId());
  
  return Response.json(response);
}

async function handleCountriesIncomeGroups(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Countries income groups requested');
  
  const income_groups = await dbManager.countries.getIncomeGroups();
  const response = createSuccessResponse({ income_groups }, logger.getRequestId());
  
  return Response.json(response);
}

async function handleEnergyData(request: Request, dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    logger.info('Energy data requested', params);
    
    const query = {
      country_id: params.country_id ? parseInt(params.country_id) : undefined,
      country_iso: params.country_iso,
      indicator_id: params.indicator_id ? parseInt(params.indicator_id) : undefined,
      indicator_code: params.indicator_code,
      year: params.year ? parseInt(params.year) : undefined,
      year_start: params.year_start ? parseInt(params.year_start) : undefined,
      year_end: params.year_end ? parseInt(params.year_end) : undefined,
      source: params.source,
      limit: params.limit ? parseInt(params.limit) : undefined,
      offset: params.offset ? parseInt(params.offset) : undefined
    };
    
    const result = await dbManager.energyData.getAll(query);
    const response = createSuccessResponse(result, logger.getRequestId());
    
    return Response.json(response);
  } else if (request.method === 'POST') {
    const body = await request.json() as any;
    logger.info('Creating new energy data', { country_id: body.country_id, indicator_id: body.indicator_id });
    
    const energyData = await dbManager.energyData.create(body);
    const response = createSuccessResponse(energyData, logger.getRequestId());
    
    return Response.json(response, { status: 201 });
  } else {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
}

async function handleEnergyDataById(dataId: number, dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Energy data by ID requested', { dataId });
  
  const energyData = await dbManager.energyData.getById(dataId);
  if (!energyData) {
    throw new ApiError('Energy data not found', 404, 'ENERGY_DATA_NOT_FOUND');
  }
  
  const response = createSuccessResponse(energyData, logger.getRequestId());
  return Response.json(response);
}

async function handleEnergyDataStats(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Energy data stats requested');
  
  const stats = await dbManager.energyData.getDataQualityStats();
  const response = createSuccessResponse(stats, logger.getRequestId());
  
  return Response.json(response);
}

async function handleRenewableCapacity(request: Request, dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    logger.info('Renewable capacity requested', params);
    
    const query = {
      country_id: params.country_id ? parseInt(params.country_id) : undefined,
      country_iso: params.country_iso,
      technology_id: params.technology_id ? parseInt(params.technology_id) : undefined,
      technology_code: params.technology_code,
      year: params.year ? parseInt(params.year) : undefined,
      year_start: params.year_start ? parseInt(params.year_start) : undefined,
      year_end: params.year_end ? parseInt(params.year_end) : undefined,
      source: params.source,
      limit: params.limit ? parseInt(params.limit) : undefined,
      offset: params.offset ? parseInt(params.offset) : undefined
    };
    
    const result = await dbManager.renewableCapacity.getAll(query);
    const response = createSuccessResponse(result, logger.getRequestId());
    
    return Response.json(response);
  } else if (request.method === 'POST') {
    const body = await request.json() as any;
    logger.info('Creating new renewable capacity data', { country_id: body.country_id, technology_id: body.technology_id });
    
    const capacity = await dbManager.renewableCapacity.create(body);
    const response = createSuccessResponse(capacity, logger.getRequestId());
    
    return Response.json(response, { status: 201 });
  } else {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
}

async function handleRenewableCapacityStats(dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  logger.info('Renewable capacity stats requested');
  
  const stats = await dbManager.renewableCapacity.getCapacityStats();
  const response = createSuccessResponse(stats, logger.getRequestId());
  
  return Response.json(response);
}

async function handleGlobalCapacity(dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  const year = params.year ? parseInt(params.year) : new Date().getFullYear() - 1;
  
  logger.info('Global renewable capacity requested', { year });
  
  const capacity = await dbManager.renewableCapacity.getGlobalCapacityByTechnology(year);
  const response = createSuccessResponse({ year, capacity }, logger.getRequestId());
  
  return Response.json(response);
}

async function handleCapacityRanking(dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  const year = params.year ? parseInt(params.year) : new Date().getFullYear() - 1;
  const technologyId = params.technology_id ? parseInt(params.technology_id) : undefined;
  
  logger.info('Capacity ranking requested', { year, technologyId });
  
  const ranking = await dbManager.renewableCapacity.getCountryRanking(year, technologyId);
  const response = createSuccessResponse({ year, technologyId, ranking }, logger.getRequestId());
  
  return Response.json(response);
}

async function handleCountryProfiles(dbManager: DatabaseManager, logger: Logger, params: Record<string, string>): Promise<Response> {
  const countryId = params.country_id ? parseInt(params.country_id) : undefined;
  const year = params.year ? parseInt(params.year) : undefined;
  
  if (!countryId) {
    throw new ApiError('Missing country_id parameter', 400, 'MISSING_COUNTRY_ID');
  }
  
  logger.info('Country energy profile requested', { countryId, year });
  
  const profile = await dbManager.getCountryEnergyProfile(countryId, year);
  const response = createSuccessResponse(profile, logger.getRequestId());
  
  return Response.json(response);
}

async function handleRawQuery(request: Request, dbManager: DatabaseManager, logger: Logger): Promise<Response> {
  if (request.method !== 'POST') {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }
  
  const body = await request.json() as { query?: string; params?: any[] };
  const { query, params = [] } = body;
  
  if (!query) {
    throw new ApiError('Missing query', 400, 'MISSING_QUERY');
  }
  
  logger.info('Raw query requested', { query: query.substring(0, 100) });
  
  const result = await dbManager.executeRawQuery(query, params);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

function handleDatabaseEndpointsList(logger: Logger): Response {
  logger.info('Database endpoints list requested');
  
  const endpoints = {
    'Database Management': {
      '/api/v1/database/health': 'Check database health status',
      '/api/v1/database/schema': 'Get database schema information',
      '/api/v1/database/stats': 'Get database statistics',
      '/api/v1/database/migrate': 'Run database migration (POST)',
      '/api/v1/database/seed': 'Run database seed (POST)'
    },
    'Countries': {
      '/api/v1/database/countries': 'Get all countries (GET) or create new (POST)',
      '/api/v1/database/countries/{id}': 'Get specific country by ID',
      '/api/v1/database/countries/search': 'Search countries by name',
      '/api/v1/database/countries/regions': 'Get list of regions',
      '/api/v1/database/countries/income-groups': 'Get list of income groups'
    },
    'Energy Data': {
      '/api/v1/database/energy-data': 'Get energy data (GET) or create new (POST)',
      '/api/v1/database/energy-data/{id}': 'Get specific energy data by ID',
      '/api/v1/database/energy-data/stats': 'Get energy data quality statistics'
    },
    'Renewable Capacity': {
      '/api/v1/database/renewable-capacity': 'Get renewable capacity (GET) or create new (POST)',
      '/api/v1/database/renewable-capacity/stats': 'Get renewable capacity statistics',
      '/api/v1/database/renewable-capacity/global': 'Get global capacity by technology',
      '/api/v1/database/renewable-capacity/ranking': 'Get country ranking by capacity'
    },
    'Complex Queries': {
      '/api/v1/database/country-profiles': 'Get comprehensive country energy profiles',
      '/api/v1/database/query': 'Execute raw SQL query (POST)'
    }
  };
  
  const response = createSuccessResponse(endpoints, logger.getRequestId());
  return Response.json(response);
}