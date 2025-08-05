import type { Env } from '../types';
import { Logger } from '../utils/logger';
import { handleError, createSuccessResponse } from '../utils/error-handler';
import { DataSourceManager } from '../data-sources/data-source-manager';

export async function handleDataSourcesRoute(
  request: Request,
  env: Env,
  logger: Logger,
  path: string
): Promise<Response> {
  const url = new URL(request.url);
  const pathSegments = path.split('/').filter(Boolean);
  
  // Remove 'api/v1/data-sources' from path
  const route = pathSegments.slice(3).join('/');
  const params = Object.fromEntries(url.searchParams.entries());
  
  const dataManager = new DataSourceManager(env);
  
  try {
    switch (route) {
      // CORS Proxy endpoint
      case 'proxy':
        return await handleCORSProxy(request, dataManager, logger, params);
      
      // World Bank endpoints
      case 'world-bank/electrification':
        return await handleWorldBankElectrification(dataManager, logger, params);
      
      case 'world-bank/renewable-consumption':
        return await handleWorldBankRenewable(dataManager, logger, params);
      
      case 'world-bank/co2-emissions':
        return await handleWorldBankCO2(dataManager, logger, params);
      
      // NASA POWER endpoints
      case 'nasa-power/solar':
        return await handleNASASolar(dataManager, logger, params);
      
      case 'nasa-power/wind':
        return await handleNASAWind(dataManager, logger, params);
      
      case 'nasa-power/comprehensive':
        return await handleNASAComprehensive(dataManager, logger, params);
      
      // OpenStreetMap endpoints
      case 'openstreetmap/energy-infrastructure':
        return await handleOSMInfrastructure(dataManager, logger, params);
      
      case 'openstreetmap/power-plants':
        return await handleOSMPowerPlants(dataManager, logger, params);
      
      case 'openstreetmap/reverse-geocode':
        return await handleOSMReverseGeocode(dataManager, logger, params);
      
      // IRENA endpoints
      case 'irena/renewable-capacity':
        return await handleIRENACapacity(dataManager, logger, params);
      
      case 'irena/country-capacity':
        return await handleIRENACountryCapacity(dataManager, logger, params);
      
      // IEA endpoints
      case 'iea/electricity-access':
        return await handleIEAElectricityAccess(dataManager, logger, params);
      
      case 'iea/renewable-share':
        return await handleIEARenewableShare(dataManager, logger, params);
      
      // Combined data endpoints
      case 'combined/country-overview':
        return await handleCountryOverview(dataManager, logger, params);
      
      case 'combined/location-potential':
        return await handleLocationPotential(dataManager, logger, params);
      
      // Health check for all data sources
      case 'health':
        return await handleDataSourcesHealth(dataManager, logger);
      
      // List available endpoints
      case '':
        return handleDataSourcesList(logger);
      
      default:
        throw new Error(`Data source endpoint not found: ${route}`);
    }
  } catch (error) {
    return handleError(error, logger);
  }
}

async function handleCORSProxy(
  request: Request,
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const targetUrl = params.url;
  if (!targetUrl) {
    throw new Error('Missing required parameter: url');
  }
  
  logger.info('CORS proxy request', { targetUrl });
  return await dataManager.proxyCORSRequest(targetUrl);
}

async function handleWorldBankElectrification(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const countries = params.countries ? params.countries.split(',') : ['all'];
  const startYear = params.startYear ? parseInt(params.startYear) : undefined;
  const endYear = params.endYear ? parseInt(params.endYear) : undefined;
  
  logger.info('World Bank electrification request', { countries, startYear, endYear });
  
  const result = await dataManager.getElectrificationRate(countries, startYear, endYear);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleWorldBankRenewable(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const countries = params.countries ? params.countries.split(',') : ['all'];
  const startYear = params.startYear ? parseInt(params.startYear) : undefined;
  const endYear = params.endYear ? parseInt(params.endYear) : undefined;
  
  logger.info('World Bank renewable consumption request', { countries, startYear, endYear });
  
  const result = await dataManager.getRenewableEnergyConsumption(countries, startYear, endYear);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleWorldBankCO2(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const countries = params.countries ? params.countries.split(',') : ['all'];
  const startYear = params.startYear ? parseInt(params.startYear) : undefined;
  const endYear = params.endYear ? parseInt(params.endYear) : undefined;
  
  logger.info('World Bank CO2 emissions request', { countries, startYear, endYear });
  
  const worldBank = new (await import('../data-sources/clients/world-bank')).WorldBankClient(
    {} as any // We'll need to pass env properly
  );
  // For now, return a placeholder
  const response = createSuccessResponse({ message: 'CO2 data endpoint - implementation in progress' }, logger.getRequestId());
  
  return Response.json(response);
}

async function handleNASASolar(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const latitude = parseFloat(params.latitude);
  const longitude = parseFloat(params.longitude);
  const startDate = params.startDate;
  const endDate = params.endDate;
  
  if (isNaN(latitude) || isNaN(longitude) || !startDate || !endDate) {
    throw new Error('Missing or invalid parameters: latitude, longitude, startDate, endDate required');
  }
  
  logger.info('NASA POWER solar request', { latitude, longitude, startDate, endDate });
  
  const result = await dataManager.getSolarRadiation(latitude, longitude, startDate, endDate);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleNASAWind(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const latitude = parseFloat(params.latitude);
  const longitude = parseFloat(params.longitude);
  const startDate = params.startDate;
  const endDate = params.endDate;
  
  if (isNaN(latitude) || isNaN(longitude) || !startDate || !endDate) {
    throw new Error('Missing or invalid parameters: latitude, longitude, startDate, endDate required');
  }
  
  logger.info('NASA POWER wind request', { latitude, longitude, startDate, endDate });
  
  const result = await dataManager.getWindData(latitude, longitude, startDate, endDate);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleNASAComprehensive(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const latitude = parseFloat(params.latitude);
  const longitude = parseFloat(params.longitude);
  const startDate = params.startDate;
  const endDate = params.endDate;
  
  if (isNaN(latitude) || isNaN(longitude) || !startDate || !endDate) {
    throw new Error('Missing or invalid parameters: latitude, longitude, startDate, endDate required');
  }
  
  logger.info('NASA POWER comprehensive request', { latitude, longitude, startDate, endDate });
  
  const nasaPower = new (await import('../data-sources/clients/nasa-power')).NASAPowerClient({} as any);
  const result = await nasaPower.getComprehensiveRenewableData(latitude, longitude, startDate, endDate);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleOSMInfrastructure(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const query = params.query;
  const country = params.country;
  const limit = params.limit ? parseInt(params.limit) : 10;
  
  if (!query) {
    throw new Error('Missing required parameter: query');
  }
  
  logger.info('OSM infrastructure search', { query, country, limit });
  
  const result = await dataManager.searchEnergyInfrastructure(query, country, limit);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleOSMPowerPlants(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const country = params.country;
  const limit = params.limit ? parseInt(params.limit) : 20;
  
  logger.info('OSM power plants search', { country, limit });
  
  const result = await dataManager.searchPowerPlants(country, limit);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleOSMReverseGeocode(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const latitude = parseFloat(params.latitude);
  const longitude = parseFloat(params.longitude);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Missing or invalid parameters: latitude, longitude required');
  }
  
  logger.info('OSM reverse geocode', { latitude, longitude });
  
  const openStreetMap = new (await import('../data-sources/clients/openstreetmap')).OpenStreetMapClient({} as any);
  const result = await openStreetMap.reverseGeocode(latitude, longitude);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleIRENACapacity(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const year = params.year ? parseInt(params.year) : undefined;
  
  logger.info('IRENA global capacity request', { year });
  
  const result = await dataManager.getGlobalRenewableCapacity(year);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleIRENACountryCapacity(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const country = params.country;
  const year = params.year ? parseInt(params.year) : undefined;
  
  if (!country) {
    throw new Error('Missing required parameter: country');
  }
  
  logger.info('IRENA country capacity request', { country, year });
  
  const result = await dataManager.getCountryRenewableCapacity(country, year);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleIEAElectricityAccess(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const country = params.country;
  const year = params.year ? parseInt(params.year) : undefined;
  
  logger.info('IEA electricity access request', { country, year });
  
  const result = await dataManager.getElectricityAccess(country, year);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleIEARenewableShare(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const country = params.country;
  const year = params.year ? parseInt(params.year) : undefined;
  
  logger.info('IEA renewable share request', { country, year });
  
  const result = await dataManager.getIEARenewableShare(country, year);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleCountryOverview(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const country = params.country;
  const year = params.year ? parseInt(params.year) : undefined;
  
  if (!country) {
    throw new Error('Missing required parameter: country');
  }
  
  logger.info('Country overview request', { country, year });
  
  const result = await dataManager.getComprehensiveCountryData(country, year);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleLocationPotential(
  dataManager: DataSourceManager,
  logger: Logger,
  params: Record<string, string>
): Promise<Response> {
  const latitude = parseFloat(params.latitude);
  const longitude = parseFloat(params.longitude);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Missing or invalid parameters: latitude, longitude required');
  }
  
  logger.info('Location energy potential request', { latitude, longitude });
  
  const result = await dataManager.getLocationEnergyPotential(latitude, longitude);
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

async function handleDataSourcesHealth(
  dataManager: DataSourceManager,
  logger: Logger
): Promise<Response> {
  logger.info('Data sources health check requested');
  
  const result = await dataManager.getDataSourcesHealth();
  const response = createSuccessResponse(result, logger.getRequestId());
  
  return Response.json(response);
}

function handleDataSourcesList(logger: Logger): Response {
  logger.info('Data sources list requested');
  
  const endpoints = {
    'CORS Proxy': {
      '/api/v1/data-sources/proxy': 'Proxy requests to bypass CORS (requires url parameter)'
    },
    'World Bank': {
      '/api/v1/data-sources/world-bank/electrification': 'Get electrification rates by country',
      '/api/v1/data-sources/world-bank/renewable-consumption': 'Get renewable energy consumption data',
      '/api/v1/data-sources/world-bank/co2-emissions': 'Get CO2 emissions data'
    },
    'NASA POWER': {
      '/api/v1/data-sources/nasa-power/solar': 'Get solar radiation data for coordinates',
      '/api/v1/data-sources/nasa-power/wind': 'Get wind data for coordinates',
      '/api/v1/data-sources/nasa-power/comprehensive': 'Get comprehensive renewable energy data'
    },
    'OpenStreetMap': {
      '/api/v1/data-sources/openstreetmap/energy-infrastructure': 'Search for energy infrastructure',
      '/api/v1/data-sources/openstreetmap/power-plants': 'Search for power plants',
      '/api/v1/data-sources/openstreetmap/reverse-geocode': 'Reverse geocode coordinates'
    },
    'IRENA': {
      '/api/v1/data-sources/irena/renewable-capacity': 'Get global renewable capacity data',
      '/api/v1/data-sources/irena/country-capacity': 'Get country-specific renewable capacity'
    },
    'IEA': {
      '/api/v1/data-sources/iea/electricity-access': 'Get electricity access data',
      '/api/v1/data-sources/iea/renewable-share': 'Get renewable energy share data'
    },
    'Combined Data': {
      '/api/v1/data-sources/combined/country-overview': 'Get comprehensive country energy data',
      '/api/v1/data-sources/combined/location-potential': 'Get renewable energy potential for location'
    },
    'Health': {
      '/api/v1/data-sources/health': 'Check health status of all data sources'
    }
  };
  
  const response = createSuccessResponse(endpoints, logger.getRequestId());
  return Response.json(response);
}