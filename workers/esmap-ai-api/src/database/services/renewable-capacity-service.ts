import { BaseService } from './base-service';
import type { RenewableCapacity, RenewableCapacityQuery, Technology } from '../models/types';
import type { Env } from '../../types';

export class RenewableCapacityService extends BaseService {
  constructor(env: Env) {
    super(env);
  }

  async getById(id: number): Promise<RenewableCapacity | null> {
    const query = `
      SELECT rc.*, c.name as country_name, c.iso3_code, t.name as technology_name, t.category as technology_category
      FROM renewable_capacity rc
      JOIN countries c ON rc.country_id = c.id
      JOIN technologies t ON rc.technology_id = t.id
      WHERE rc.id = ?
    `;
    return await this.executeFirst<RenewableCapacity>(query, [id]);
  }

  async getAll(queryParams: RenewableCapacityQuery = {}): Promise<{ data: RenewableCapacity[]; total: number }> {
    let query = `
      SELECT rc.*, c.name as country_name, c.iso3_code, t.name as technology_name, t.category as technology_category
      FROM renewable_capacity rc
      JOIN countries c ON rc.country_id = c.id
      JOIN technologies t ON rc.technology_id = t.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (queryParams.country_id) {
      conditions.push('rc.country_id = ?');
      params.push(queryParams.country_id);
    }

    if (queryParams.country_iso) {
      conditions.push('(c.iso2_code = ? OR c.iso3_code = ?)');
      params.push(queryParams.country_iso.toUpperCase(), queryParams.country_iso.toUpperCase());
    }

    if (queryParams.technology_id) {
      conditions.push('rc.technology_id = ?');
      params.push(queryParams.technology_id);
    }

    if (queryParams.technology_code) {
      conditions.push('t.code = ?');
      params.push(queryParams.technology_code);
    }

    if (queryParams.year) {
      conditions.push('rc.year = ?');
      params.push(queryParams.year);
    }

    if (queryParams.year_start && queryParams.year_end) {
      conditions.push('rc.year BETWEEN ? AND ?');
      params.push(queryParams.year_start, queryParams.year_end);
    } else if (queryParams.year_start) {
      conditions.push('rc.year >= ?');
      params.push(queryParams.year_start);
    } else if (queryParams.year_end) {
      conditions.push('rc.year <= ?');
      params.push(queryParams.year_end);
    }

    if (queryParams.source) {
      conditions.push('rc.source = ?');
      params.push(queryParams.source);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const countQuery = query.replace(
      'SELECT rc.*, c.name as country_name, c.iso3_code, t.name as technology_name, t.category as technology_category',
      'SELECT COUNT(*) as count'
    );

    query += ' ORDER BY rc.year DESC, c.name, t.category';
    query += this.buildLimitOffset(queryParams.limit, queryParams.offset);

    const [data, countResult] = await Promise.all([
      this.executeQuery<RenewableCapacity>(query, params),
      this.executeFirst<{ count: number }>(countQuery, params)
    ]);

    return { data, total: countResult?.count || 0 };
  }

  async create(capacity: Omit<RenewableCapacity, 'id' | 'created_at' | 'updated_at'>): Promise<RenewableCapacity> {
    const { query, params } = this.buildInsertQuery('renewable_capacity', capacity);
    const result = await this.executeRun(query, params);
    
    if (!result.meta?.last_row_id) {
      throw new Error('Failed to create renewable capacity data');
    }

    const created = await this.getById(result.meta.last_row_id);
    if (!created) {
      throw new Error('Failed to retrieve created renewable capacity data');
    }

    return created;
  }

  async update(id: number, updates: Partial<RenewableCapacity>): Promise<RenewableCapacity | null> {
    const { query, params } = this.buildUpdateQuery('renewable_capacity', updates, { id });
    const result = await this.executeRun(query, params);

    if (result.meta?.changes === 0) {
      return null;
    }

    return await this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM renewable_capacity WHERE id = ?';
    const result = await this.executeRun(query, [id]);
    return (result.meta?.changes || 0) > 0;
  }

  async upsert(capacity: Omit<RenewableCapacity, 'id' | 'created_at' | 'updated_at'>): Promise<RenewableCapacity> {
    // Check if record exists
    const existing = await this.executeFirst<RenewableCapacity>(
      'SELECT * FROM renewable_capacity WHERE country_id = ? AND technology_id = ? AND year = ? AND source = ?',
      [capacity.country_id, capacity.technology_id, capacity.year, capacity.source]
    );

    if (existing) {
      const updated = await this.update(existing.id!, capacity);
      return updated!;
    } else {
      return await this.create(capacity);
    }
  }

  async getByCountry(countryId: number, yearStart?: number, yearEnd?: number): Promise<RenewableCapacity[]> {
    let query = `
      SELECT rc.*, t.name as technology_name, t.category as technology_category
      FROM renewable_capacity rc
      JOIN technologies t ON rc.technology_id = t.id
      WHERE rc.country_id = ?
    `;
    const params = [countryId];

    if (yearStart && yearEnd) {
      query += ' AND rc.year BETWEEN ? AND ?';
      params.push(yearStart, yearEnd);
    }

    query += ' ORDER BY rc.year DESC, t.category, t.name';

    return await this.executeQuery<RenewableCapacity>(query, params);
  }

  async getByTechnology(technologyId: number, yearStart?: number, yearEnd?: number): Promise<RenewableCapacity[]> {
    let query = `
      SELECT rc.*, c.name as country_name, c.iso3_code
      FROM renewable_capacity rc
      JOIN countries c ON rc.country_id = c.id
      WHERE rc.technology_id = ?
    `;
    const params = [technologyId];

    if (yearStart && yearEnd) {
      query += ' AND rc.year BETWEEN ? AND ?';
      params.push(yearStart, yearEnd);
    }

    query += ' ORDER BY rc.year DESC, rc.capacity_mw DESC';

    return await this.executeQuery<RenewableCapacity>(query, params);
  }

  async getGlobalCapacityByTechnology(year: number): Promise<Array<{ technology_name: string; total_capacity_mw: number; total_generation_gwh: number }>> {
    const query = `
      SELECT t.name as technology_name, 
             SUM(rc.capacity_mw) as total_capacity_mw,
             SUM(rc.generation_gwh) as total_generation_gwh
      FROM renewable_capacity rc
      JOIN technologies t ON rc.technology_id = t.id
      WHERE rc.year = ?
      GROUP BY rc.technology_id, t.name
      ORDER BY total_capacity_mw DESC
    `;

    return await this.executeQuery(query, [year]);
  }

  async getCountryRanking(year: number, technologyId?: number): Promise<Array<{ country_name: string; iso3_code: string; total_capacity_mw: number }>> {
    let query = `
      SELECT c.name as country_name, c.iso3_code,
             SUM(rc.capacity_mw) as total_capacity_mw
      FROM renewable_capacity rc
      JOIN countries c ON rc.country_id = c.id
      WHERE rc.year = ?
    `;
    const params = [year];

    if (technologyId) {
      query += ' AND rc.technology_id = ?';
      params.push(technologyId);
    }

    query += `
      GROUP BY rc.country_id, c.name, c.iso3_code
      ORDER BY total_capacity_mw DESC
      LIMIT 20
    `;

    return await this.executeQuery(query, params);
  }

  async getCapacityGrowth(countryId: number, technologyId: number): Promise<Array<{ year: number; capacity_mw: number; growth_rate: number }>> {
    const query = `
      SELECT year, capacity_mw,
             CASE 
               WHEN LAG(capacity_mw) OVER (ORDER BY year) IS NOT NULL 
               THEN ROUND(((capacity_mw - LAG(capacity_mw) OVER (ORDER BY year)) / LAG(capacity_mw) OVER (ORDER BY year)) * 100, 2)
               ELSE NULL 
             END as growth_rate
      FROM renewable_capacity
      WHERE country_id = ? AND technology_id = ?
      ORDER BY year
    `;

    return await this.executeQuery(query, [countryId, technologyId]);
  }

  async getLatestCapacityByCountry(countryId: number): Promise<RenewableCapacity[]> {
    const query = `
      SELECT rc.*, t.name as technology_name, t.category as technology_category
      FROM renewable_capacity rc
      JOIN technologies t ON rc.technology_id = t.id
      WHERE rc.country_id = ? AND rc.year = (
        SELECT MAX(year) FROM renewable_capacity rc2 
        WHERE rc2.country_id = rc.country_id AND rc2.technology_id = rc.technology_id
      )
      ORDER BY t.category, t.name
    `;

    return await this.executeQuery<RenewableCapacity>(query, [countryId]);
  }

  async getCapacityStats(): Promise<{
    total_records: number;
    total_capacity_mw: number;
    by_technology: Record<string, { capacity_mw: number; generation_gwh: number }>;
    by_data_quality: Record<string, number>;
    latest_year: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as count, SUM(capacity_mw) as total_capacity FROM renewable_capacity',
      `SELECT t.name, SUM(rc.capacity_mw) as capacity_mw, SUM(rc.generation_gwh) as generation_gwh
       FROM renewable_capacity rc 
       JOIN technologies t ON rc.technology_id = t.id 
       GROUP BY rc.technology_id, t.name`,
      'SELECT data_quality, COUNT(*) as count FROM renewable_capacity WHERE data_quality IS NOT NULL GROUP BY data_quality',
      'SELECT MAX(year) as latest_year FROM renewable_capacity'
    ];

    const [totalResult, techResults, qualityResults, yearResult] = await Promise.all([
      this.executeFirst<{ count: number; total_capacity: number }>(queries[0]),
      this.executeQuery<{ name: string; capacity_mw: number; generation_gwh: number }>(queries[1]),
      this.executeQuery<{ data_quality: string; count: number }>(queries[2]),
      this.executeFirst<{ latest_year: number }>(queries[3])
    ]);

    const by_technology: Record<string, { capacity_mw: number; generation_gwh: number }> = {};
    techResults.forEach(r => {
      by_technology[r.name] = {
        capacity_mw: r.capacity_mw || 0,
        generation_gwh: r.generation_gwh || 0
      };
    });

    const by_data_quality: Record<string, number> = {};
    qualityResults.forEach(r => {
      by_data_quality[r.data_quality] = r.count;
    });

    return {
      total_records: totalResult?.count || 0,
      total_capacity_mw: totalResult?.total_capacity || 0,
      by_technology,
      by_data_quality,
      latest_year: yearResult?.latest_year || 0
    };
  }

  async bulkInsert(capacityArray: Omit<RenewableCapacity, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    const statements = capacityArray.map(data => {
      const { query, params } = this.buildInsertQuery('renewable_capacity', data);
      return { query, params };
    });

    await this.executeBatch(statements);
  }
}