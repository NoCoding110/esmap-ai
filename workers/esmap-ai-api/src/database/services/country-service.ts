import { BaseService } from './base-service';
import type { Country, CountryQuery } from '../models/types';
import type { Env } from '../../types';

export class CountryService extends BaseService {
  constructor(env: Env) {
    super(env);
  }

  async getById(id: number): Promise<Country | null> {
    const query = 'SELECT * FROM countries WHERE id = ?';
    return await this.executeFirst<Country>(query, [id]);
  }

  async getByISOCode(code: string): Promise<Country | null> {
    const query = 'SELECT * FROM countries WHERE iso2_code = ? OR iso3_code = ?';
    return await this.executeFirst<Country>(query, [code.toUpperCase(), code.toUpperCase()]);
  }

  async getAll(queryParams: CountryQuery = {}): Promise<{ countries: Country[]; total: number }> {
    const conditions: Record<string, any> = {};
    
    if (queryParams.iso2_code) conditions.iso2_code = queryParams.iso2_code.toUpperCase();
    if (queryParams.iso3_code) conditions.iso3_code = queryParams.iso3_code.toUpperCase();
    if (queryParams.region) conditions.region = queryParams.region;
    if (queryParams.income_group) conditions.income_group = queryParams.income_group;

    let whereClause = '';
    let params: any[] = [];

    if (queryParams.name) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'name LIKE ?';
      params.push(`%${queryParams.name}%`);
    }

    const { clause: additionalWhere, params: additionalParams } = this.buildWhereClause(conditions);
    whereClause += additionalWhere;
    params.push(...additionalParams);

    const limitOffset = this.buildLimitOffset(queryParams.limit, queryParams.offset);

    const query = `SELECT * FROM countries${whereClause} ORDER BY name${limitOffset}`;
    const countries = await this.executeQuery<Country>(query, params);

    const total = await this.getCount('countries', whereClause, params);

    return { countries, total };
  }

  async create(country: Omit<Country, 'id' | 'created_at' | 'updated_at'>): Promise<Country> {
    const { query, params } = this.buildInsertQuery('countries', country);
    const result = await this.executeRun(query, params);
    
    if (!result.meta?.last_row_id) {
      throw new Error('Failed to create country');
    }

    const created = await this.getById(result.meta.last_row_id);
    if (!created) {
      throw new Error('Failed to retrieve created country');
    }

    return created;
  }

  async update(id: number, updates: Partial<Country>): Promise<Country | null> {
    const { query, params } = this.buildUpdateQuery('countries', updates, { id });
    const result = await this.executeRun(query, params);

    if (result.meta?.changes === 0) {
      return null;
    }

    return await this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM countries WHERE id = ?';
    const result = await this.executeRun(query, [id]);
    return (result.meta?.changes || 0) > 0;
  }

  async getByRegion(region: string): Promise<Country[]> {
    const query = 'SELECT * FROM countries WHERE region = ? ORDER BY name';
    return await this.executeQuery<Country>(query, [region]);
  }

  async getByIncomeGroup(incomeGroup: string): Promise<Country[]> {
    const query = 'SELECT * FROM countries WHERE income_group = ? ORDER BY name';
    return await this.executeQuery<Country>(query, [incomeGroup]);
  }

  async searchByName(name: string, limit: number = 10): Promise<Country[]> {
    const query = 'SELECT * FROM countries WHERE name LIKE ? OR official_name LIKE ? ORDER BY name LIMIT ?';
    const searchTerm = `%${name}%`;
    return await this.executeQuery<Country>(query, [searchTerm, searchTerm, limit]);
  }

  async getRegions(): Promise<string[]> {
    const query = 'SELECT DISTINCT region FROM countries WHERE region IS NOT NULL ORDER BY region';
    const results = await this.executeQuery<{ region: string }>(query);
    return results.map(r => r.region);
  }

  async getIncomeGroups(): Promise<string[]> {
    const query = 'SELECT DISTINCT income_group FROM countries WHERE income_group IS NOT NULL ORDER BY income_group';
    const results = await this.executeQuery<{ income_group: string }>(query);
    return results.map(r => r.income_group);
  }

  async getCountryStats(): Promise<{
    total_countries: number;
    by_region: Record<string, number>;
    by_income_group: Record<string, number>;
  }> {
    const totalQuery = 'SELECT COUNT(*) as count FROM countries';
    const regionQuery = 'SELECT region, COUNT(*) as count FROM countries WHERE region IS NOT NULL GROUP BY region';
    const incomeQuery = 'SELECT income_group, COUNT(*) as count FROM countries WHERE income_group IS NOT NULL GROUP BY income_group';

    const [totalResult, regionResults, incomeResults] = await Promise.all([
      this.executeFirst<{ count: number }>(totalQuery),
      this.executeQuery<{ region: string; count: number }>(regionQuery),
      this.executeQuery<{ income_group: string; count: number }>(incomeQuery)
    ]);

    const by_region: Record<string, number> = {};
    regionResults.forEach(r => {
      by_region[r.region] = r.count;
    });

    const by_income_group: Record<string, number> = {};
    incomeResults.forEach(r => {
      by_income_group[r.income_group] = r.count;
    });

    return {
      total_countries: totalResult?.count || 0,
      by_region,
      by_income_group
    };
  }
}