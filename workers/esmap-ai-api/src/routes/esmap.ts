/**
 * ESMAP-Specific Data Integration Routes
 * 
 * Handles all ESMAP data source integrations including:
 * - Energy Data Analytics Hub
 * - MTF Surveys
 * - RISE Database
 * - SDG7 Tracking
 * - Integrated data endpoints
 */

import type { Env } from '../types';
import type { Logger } from '../utils/logger';
import { ApiError, createSuccessResponse } from '../utils/error-handler';
import { esmapIntegration } from '../data-sources/esmap-integration';
import { esmapHubClient } from '../data-sources/clients/esmap-hub';
import { mtfSurveyClient } from '../data-sources/clients/mtf-surveys';
import { riseDatabaseClient } from '../data-sources/clients/rise-database';
import { sdg7TrackingClient } from '../data-sources/clients/sdg7-tracking';

export async function handleESMAPRoute(
  request: Request,
  env: Env,
  logger: Logger,
  path: string
): Promise<Response> {
  logger.info('ESMAP route accessed', { path });

  try {
    const url = new URL(request.url);
    const pathSegments = path.replace('/api/v1/esmap', '').split('/').filter(Boolean);
    const method = request.method;

    // Handle different ESMAP endpoints
    const endpoint = pathSegments[0] || '';
    switch (endpoint) {
      case 'dashboard':
        return await handleDashboard(request, env, logger);
        
      case 'countries':
        return await handleCountries(request, env, logger, pathSegments.slice(1));
        
      case 'hub':
        return await handleHub(request, env, logger, pathSegments.slice(1));
        
      case 'mtf':
        return await handleMTF(request, env, logger, pathSegments.slice(1));
        
      case 'rise':
        return await handleRISE(request, env, logger, pathSegments.slice(1));
        
      case 'sdg7':
        return await handleSDG7(request, env, logger, pathSegments.slice(1));
        
      case 'search':
        return await handleSearch(request, env, logger);
        
      case 'recommendations':
        return await handleRecommendations(request, env, logger, pathSegments.slice(1));
        
      case '':
        // ESMAP API overview
        const overview = {
          name: 'ESMAP Data Integration API',
          version: '1.0.0',
          description: 'Comprehensive API for ESMAP energy data sources',
          endpoints: {
            dashboard: '/api/v1/esmap/dashboard - Global dashboard data',
            countries: '/api/v1/esmap/countries - Integrated country data',
            hub: '/api/v1/esmap/hub - Energy Data Analytics Hub (908 datasets)',
            mtf: '/api/v1/esmap/mtf - Multi-Tier Framework surveys (25 countries)',
            rise: '/api/v1/esmap/rise - RISE database (140+ countries)',
            sdg7: '/api/v1/esmap/sdg7 - SDG7 tracking data',
            search: '/api/v1/esmap/search - Search across all datasets',
            recommendations: '/api/v1/esmap/recommendations - Policy recommendations'
          },
          dataSources: {
            totalDatasets: 908,
            countriesCovered: 193,
            mtfCountries: 25,
            riseCountries: 140,
            indicators: 200,
            lastUpdated: new Date().toISOString()
          }
        };
        
        logger.info('ESMAP overview accessed');
        return Response.json(createSuccessResponse(overview, crypto.randomUUID()));
        
      default:
        throw new ApiError(`ESMAP endpoint not found: ${endpoint}`, 404, 'NOT_FOUND');
    }

  } catch (error) {
    logger.error('ESMAP route error', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

async function handleDashboard(
  request: Request,
  env: Env,
  logger: Logger
): Promise<Response> {
  logger.info('Fetching ESMAP dashboard data');

  try {
    const result = await esmapIntegration.getDashboardData();
    
    logger.info('Dashboard data retrieved', {
      success: result.success,
      dataPoints: result.data ? Object.keys(result.data).length : 0
    });

    return Response.json(createSuccessResponse(result, crypto.randomUUID()));
  } catch (error) {
    logger.error('Dashboard data error', { error });
    throw new ApiError('Failed to fetch dashboard data', 500, 'DASHBOARD_ERROR');
  }
}

async function handleCountries(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const url = new URL(request.url);
  const countriesParam = url.searchParams.get('countries');
  const regionsParam = url.searchParams.get('regions');
  const includeGender = url.searchParams.get('includeGender') === 'true';
  const includeClimate = url.searchParams.get('includeClimate') === 'true';
  const includeFinance = url.searchParams.get('includeFinance') === 'true';
  const includeProjects = url.searchParams.get('includeProjects') === 'true';

  logger.info('Fetching integrated country data', {
    countries: countriesParam,
    regions: regionsParam,
    options: { includeGender, includeClimate, includeFinance, includeProjects }
  });

  try {
    const countries = countriesParam ? countriesParam.split(',') : 
                     ['USA', 'CHN', 'IND', 'BRA', 'RUS', 'JPN', 'DEU', 'GBR', 'FRA', 'KEN'];

    const options = {
      regions: regionsParam ? regionsParam.split(',') : undefined,
      includeGender,
      includeClimate,
      includeFinance,
      includeProjects
    };

    const result = await esmapIntegration.getIntegratedCountryData(countries, options);
    
    logger.info('Country data retrieved', {
      success: result.success,
      countries: result.data.length,
      errors: result.errors?.length || 0
    });

    return Response.json(createSuccessResponse(result, crypto.randomUUID()));
  } catch (error) {
    logger.error('Country data error', { error });
    throw new ApiError('Failed to fetch country data', 500, 'COUNTRY_DATA_ERROR');
  }
}

async function handleHub(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const url = new URL(request.url);
  
  try {
    switch (pathSegments[0]) {
      case 'datasets':
        const categories = url.searchParams.get('categories')?.split(',');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        logger.info('Fetching ESMAP Hub datasets', { categories, limit, offset });

        const datasetsResult = await esmapHubClient.getAllDatasets({
          categories: categories as any,
          limit,
          offset
        });

        return Response.json(createSuccessResponse(datasetsResult, crypto.randomUUID()));

      case 'profiles':
        const countries = url.searchParams.get('countries')?.split(',');
        
        logger.info('Fetching ESMAP Hub country profiles', { countries });

        const profilesResult = await esmapHubClient.getCountryProfiles(countries);

        return Response.json(createSuccessResponse(profilesResult, crypto.randomUUID()));

      default:
        const overviewResult = await esmapHubClient.getAllDatasets({ limit: 10 });
        return Response.json(createSuccessResponse({
          ...overviewResult,
          description: 'ESMAP Energy Data Analytics Hub - 908 datasets covering 193 countries'
        }, crypto.randomUUID()));
    }
  } catch (error) {
    logger.error('Hub data error', { error });
    throw new ApiError('Failed to fetch hub data', 500, 'HUB_DATA_ERROR');
  }
}

async function handleMTF(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const url = new URL(request.url);
  
  try {
    switch (pathSegments[0]) {
      case 'surveys':
        const countries = url.searchParams.get('countries')?.split(',');
        const surveyTypes = url.searchParams.get('types')?.split(',') as any;

        logger.info('Fetching MTF survey data', { countries, surveyTypes });

        const surveysResult = await mtfSurveyClient.getAllSurveyData({
          countries,
          surveyTypes
        });

        return Response.json(createSuccessResponse(surveysResult, crypto.randomUUID()));

      case 'electricity':
        const electricityCountry = url.searchParams.get('country');
        
        logger.info('Fetching MTF electricity tiers', { country: electricityCountry });

        const electricityResult = await mtfSurveyClient.getElectricityTiers(electricityCountry || undefined);

        return Response.json(createSuccessResponse(electricityResult, crypto.randomUUID()));

      case 'cooking':
        const cookingCountry = url.searchParams.get('country');
        
        logger.info('Fetching MTF cooking tiers', { country: cookingCountry });

        const cookingResult = await mtfSurveyClient.getCookingTiers(cookingCountry || undefined);

        return Response.json(createSuccessResponse(cookingResult, crypto.randomUUID()));

      default:
        const mtfOverview = await mtfSurveyClient.getAllSurveyData({ countries: ['KEN', 'NGA', 'IND'] });
        return Response.json(createSuccessResponse({
          ...mtfOverview,
          description: 'Multi-Tier Framework surveys covering 25 countries with detailed energy access metrics'
        }, crypto.randomUUID()));
    }
  } catch (error) {
    logger.error('MTF data error', { error });
    throw new ApiError('Failed to fetch MTF data', 500, 'MTF_DATA_ERROR');
  }
}

async function handleRISE(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const url = new URL(request.url);
  
  try {
    switch (pathSegments[0]) {
      case 'scores':
        const countries = url.searchParams.get('countries')?.split(',');
        const years = url.searchParams.get('years')?.split(',').map(Number);

        logger.info('Fetching RISE scores', { countries, years });

        const scoresResult = await riseDatabaseClient.getAllCountryScores({
          countries,
          years
        });

        return Response.json(createSuccessResponse(scoresResult, crypto.randomUUID()));

      case 'indicators':
        const category = url.searchParams.get('category') as any;
        
        logger.info('Fetching RISE indicators', { category });

        const indicatorsResult = await riseDatabaseClient.getIndicators(category || undefined);

        return Response.json(createSuccessResponse(indicatorsResult, crypto.randomUUID()));

      case 'compare':
        const compareCountries = url.searchParams.get('countries')?.split(',');
        const compareIndicators = url.searchParams.get('indicators')?.split(',');

        if (!compareCountries || compareCountries.length < 2) {
          throw new ApiError('At least 2 countries required for comparison', 400, 'INVALID_PARAMS');
        }

        logger.info('Comparing RISE countries', { countries: compareCountries, indicators: compareIndicators });

        const compareResult = await riseDatabaseClient.compareCountries(compareCountries, compareIndicators);

        return Response.json(createSuccessResponse(compareResult, crypto.randomUUID()));

      case 'gaps':
        const gapCountry = pathSegments[1];
        const gapCategory = url.searchParams.get('category') as any;

        if (!gapCountry) {
          throw new ApiError('Country code required for policy gaps analysis', 400, 'MISSING_COUNTRY');
        }

        logger.info('Analyzing policy gaps', { country: gapCountry, category: gapCategory });

        const gapsResult = await riseDatabaseClient.getPolicyGaps(gapCountry, gapCategory);

        return Response.json(createSuccessResponse(gapsResult, crypto.randomUUID()));

      case 'rankings':
        const rankingCategory = url.searchParams.get('category') as any;
        const region = url.searchParams.get('region');

        logger.info('Fetching RISE rankings', { category: rankingCategory, region });

        const rankingsResult = await riseDatabaseClient.getRankings(rankingCategory || undefined, region || undefined);

        return Response.json(createSuccessResponse(rankingsResult, crypto.randomUUID()));

      default:
        const riseOverview = await riseDatabaseClient.getAllCountryScores({ countries: ['USA', 'DEU', 'IND'] });
        return Response.json(createSuccessResponse({
          ...riseOverview,
          description: 'Regulatory Indicators for Sustainable Energy database covering 140+ countries'
        }, crypto.randomUUID()));
    }
  } catch (error) {
    logger.error('RISE data error', { error });
    throw new ApiError('Failed to fetch RISE data', 500, 'RISE_DATA_ERROR');
  }
}

async function handleSDG7(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const url = new URL(request.url);
  
  try {
    switch (pathSegments[0]) {
      case 'global':
        logger.info('Fetching SDG7 global progress');

        const globalResult = await sdg7TrackingClient.getGlobalProgress();

        return Response.json(createSuccessResponse(globalResult, crypto.randomUUID()));

      case 'countries':
        const countries = url.searchParams.get('countries')?.split(',');
        const regions = url.searchParams.get('regions')?.split(',');
        const onlyLDCs = url.searchParams.get('onlyLDCs') === 'true';
        const onlySIDS = url.searchParams.get('onlySIDS') === 'true';

        logger.info('Fetching SDG7 country data', { countries, regions, onlyLDCs, onlySIDS });

        const countriesResult = await sdg7TrackingClient.getCountryData({
          countries,
          regions,
          onlyLDCs,
          onlySIDS
        });

        return Response.json(createSuccessResponse(countriesResult, crypto.randomUUID()));

      case 'regional':
        const analysisRegion = url.searchParams.get('region');
        
        logger.info('Fetching SDG7 regional analysis', { region: analysisRegion });

        const regionalResult = await sdg7TrackingClient.getRegionalAnalysis(analysisRegion || undefined);

        return Response.json(createSuccessResponse(regionalResult, crypto.randomUUID()));

      case 'indicators':
        logger.info('Fetching SDG7 indicators');

        const indicatorsResult = await sdg7TrackingClient.getIndicators();

        return Response.json(createSuccessResponse(indicatorsResult, crypto.randomUUID()));

      case 'targets':
        const target = url.searchParams.get('target') as any;
        
        logger.info('Fetching SDG7 target progress', { target });

        const targetResult = await sdg7TrackingClient.getTargetProgress(target);

        return Response.json(createSuccessResponse(targetResult, crypto.randomUUID()));

      default:
        const sdg7Overview = await sdg7TrackingClient.getGlobalProgress();
        return Response.json(createSuccessResponse({
          ...sdg7Overview,
          description: 'SDG7 Energy Progress tracking for 193 countries with projections to 2030'
        }, crypto.randomUUID()));
    }
  } catch (error) {
    logger.error('SDG7 data error', { error });
    throw new ApiError('Failed to fetch SDG7 data', 500, 'SDG7_DATA_ERROR');
  }
}

async function handleSearch(
  request: Request,
  env: Env,
  logger: Logger
): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const countries = url.searchParams.get('countries')?.split(',');
  const categories = url.searchParams.get('categories')?.split(',');
  const dataSources = url.searchParams.get('sources')?.split(',');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!query) {
    throw new ApiError('Search query is required', 400, 'MISSING_QUERY');
  }

  logger.info('Searching ESMAP data', { query, countries, categories, dataSources, limit });

  try {
    const searchResult = await esmapIntegration.searchESMAPData(query, {
      countries,
      categories,
      dataSources,
      limit
    });

    return Response.json(createSuccessResponse(searchResult, crypto.randomUUID()));
  } catch (error) {
    logger.error('Search error', { error });
    throw new ApiError('Failed to search ESMAP data', 500, 'SEARCH_ERROR');
  }
}

async function handleRecommendations(
  request: Request,
  env: Env,
  logger: Logger,
  pathSegments: string[]
): Promise<Response> {
  const countryCode = pathSegments[0];

  if (!countryCode) {
    throw new ApiError('Country code is required for recommendations', 400, 'MISSING_COUNTRY');
  }

  logger.info('Generating policy recommendations', { country: countryCode });

  try {
    const recommendationsResult = await esmapIntegration.getPolicyRecommendations(countryCode);

    return Response.json(createSuccessResponse(recommendationsResult, crypto.randomUUID()));
  } catch (error) {
    logger.error('Recommendations error', { error });
    throw new ApiError('Failed to generate policy recommendations', 500, 'RECOMMENDATIONS_ERROR');
  }
}