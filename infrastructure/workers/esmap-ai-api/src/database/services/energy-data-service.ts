import { BaseService } from './base-service';
import type { EnergyData, EnergyDataQuery, EnergyIndicator } from '../models/types';
import type { Env } from '../../types';

export class EnergyDataService extends BaseService {
  constructor(env: Env) {
    super(env);
  }

  async getById(id: number): Promise<EnergyData | null> {
    const query = `
      SELECT ed.*, c.name as country_name, c.iso3_code, ei.name as indicator_name, ei.unit as indicator_unit
      FROM energy_data ed
      JOIN countries c ON ed.country_id = c.id
      JOIN energy_indicators ei ON ed.indicator_id = ei.id
      WHERE ed.id = ?
    `;
    return await this.executeFirst<EnergyData>(query, [id]);
  }

  async getAll(queryParams: EnergyDataQuery = {}): Promise<{ data: EnergyData[]; total: number }> {
    let query = `
      SELECT ed.*, c.name as country_name, c.iso3_code, ei.name as indicator_name, ei.unit as indicator_unit
      FROM energy_data ed
      JOIN countries c ON ed.country_id = c.id
      JOIN energy_indicators ei ON ed.indicator_id = ei.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    if (queryParams.country_id) {
      conditions.push('ed.country_id = ?');
      params.push(queryParams.country_id);
    }

    if (queryParams.country_iso) {
      conditions.push('(c.iso2_code = ? OR c.iso3_code = ?)');
      params.push(queryParams.country_iso.toUpperCase(), queryParams.country_iso.toUpperCase());
    }

    if (queryParams.indicator_id) {
      conditions.push('ed.indicator_id = ?');
      params.push(queryParams.indicator_id);
    }

    if (queryParams.indicator_code) {
      conditions.push('ei.code = ?');
      params.push(queryParams.indicator_code);
    }

    if (queryParams.year) {
      conditions.push('ed.year = ?');
      params.push(queryParams.year);
    }

    if (queryParams.year_start && queryParams.year_end) {
      conditions.push('ed.year BETWEEN ? AND ?');
      params.push(queryParams.year_start, queryParams.year_end);
    } else if (queryParams.year_start) {
      conditions.push('ed.year >= ?');
      params.push(queryParams.year_start);
    } else if (queryParams.year_end) {
      conditions.push('ed.year <= ?');
      params.push(queryParams.year_end);
    }

    if (queryParams.source) {
      conditions.push('ed.source = ?');
      params.push(queryParams.source);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const countQuery = query.replace(
      'SELECT ed.*, c.name as country_name, c.iso3_code, ei.name as indicator_name, ei.unit as indicator_unit',
      'SELECT COUNT(*) as count'
    );

    query += ' ORDER BY ed.year DESC, c.name';
    query += this.buildLimitOffset(queryParams.limit, queryParams.offset);

    const [data, countResult] = await Promise.all([
      this.executeQuery<EnergyData>(query, params),
      this.executeFirst<{ count: number }>(countQuery, params)
    ]);

    return { data, total: countResult?.count || 0 };
  }

  async create(energyData: Omit<EnergyData, 'id' | 'created_at' | 'updated_at'>): Promise<EnergyData> {
    const { query, params } = this.buildInsertQuery('energy_data', energyData);
    const result = await this.executeRun(query, params);
    
    if (!result.meta?.last_row_id) {
      throw new Error('Failed to create energy data');
    }

    const created = await this.getById(result.meta.last_row_id);
    if (!created) {
      throw new Error('Failed to retrieve created energy data');
    }

    return created;
  }

  async update(id: number, updates: Partial<EnergyData>): Promise<EnergyData | null> {
    const { query, params } = this.buildUpdateQuery('energy_data', updates, { id });
    const result = await this.executeRun(query, params);

    if (result.meta?.changes === 0) {
      return null;
    }

    return await this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM energy_data WHERE id = ?';
    const result = await this.executeRun(query, [id]);
    return (result.meta?.changes || 0) > 0;
  }

  async upsert(energyData: Omit<EnergyData, 'id' | 'created_at' | 'updated_at'>): Promise<EnergyData> {
    // Check if record exists
    const existing = await this.executeFirst<EnergyData>(
      'SELECT * FROM energy_data WHERE country_id = ? AND indicator_id = ? AND year = ? AND source = ?',
      [energyData.country_id, energyData.indicator_id, energyData.year, energyData.source]
    );

    if (existing) {
      const updated = await this.update(existing.id!, energyData);
      return updated!;
    } else {
      return await this.create(energyData);
    }
  }

  async getByCountry(countryId: number, yearStart?: number, yearEnd?: number): Promise<EnergyData[]> {
    let query = `
      SELECT ed.*, ei.name as indicator_name, ei.unit as indicator_unit, ei.category
      FROM energy_data ed
      JOIN energy_indicators ei ON ed.indicator_id = ei.id
      WHERE ed.country_id = ?
    `;
    const params = [countryId];

    if (yearStart && yearEnd) {
      query += ' AND ed.year BETWEEN ? AND ?';
      params.push(yearStart, yearEnd);
    }

    query += ' ORDER BY ed.year DESC, ei.category, ei.name';

    return await this.executeQuery<EnergyData>(query, params);
  }

  async getByIndicator(indicatorId: number, yearStart?: number, yearEnd?: number): Promise<EnergyData[]> {
    let query = `
      SELECT ed.*, c.name as country_name, c.iso3_code
      FROM energy_data ed
      JOIN countries c ON ed.country_id = c.id
      WHERE ed.indicator_id = ?
    `;
    const params = [indicatorId];

    if (yearStart && yearEnd) {
      query += ' AND ed.year BETWEEN ? AND ?';
      params.push(yearStart, yearEnd);
    }

    query += ' ORDER BY ed.year DESC, c.name';

    return await this.executeQuery<EnergyData>(query, params);
  }

  async getLatestByCountry(countryId: number): Promise<EnergyData[]> {
    const query = `
      SELECT ed.*, ei.name as indicator_name, ei.unit as indicator_unit, ei.category
      FROM energy_data ed
      JOIN energy_indicators ei ON ed.indicator_id = ei.id
      WHERE ed.country_id = ? AND ed.year = (
        SELECT MAX(year) FROM energy_data ed2 
        WHERE ed2.country_id = ed.country_id AND ed2.indicator_id = ed.indicator_id
      )
      ORDER BY ei.category, ei.name
    `;

    return await this.executeQuery<EnergyData>(query, [countryId]);
  }

  async getTimeSeriesData(countryId: number, indicatorId: number): Promise<EnergyData[]> {
    const query = `
      SELECT ed.*, c.name as country_name, ei.name as indicator_name
      FROM energy_data ed
      JOIN countries c ON ed.country_id = c.id
      JOIN energy_indicators ei ON ed.indicator_id = ei.id
      WHERE ed.country_id = ? AND ed.indicator_id = ?
      ORDER BY ed.year ASC
    `;

    return await this.executeQuery<EnergyData>(query, [countryId, indicatorId]);
  }

  async getDataQualityStats(): Promise<{
    total_records: number;
    by_confidence_level: Record<string, number>;
    by_source: Record<string, number>;
    estimated_vs_actual: { estimated: number; actual: number };
  }> {
    const queries = [
      'SELECT COUNT(*) as count FROM energy_data',
      'SELECT confidence_level, COUNT(*) as count FROM energy_data WHERE confidence_level IS NOT NULL GROUP BY confidence_level',
      'SELECT source, COUNT(*) as count FROM energy_data GROUP BY source',
      'SELECT is_estimated, COUNT(*) as count FROM energy_data GROUP BY is_estimated'
    ];

    const [totalResult, confidenceResults, sourceResults, estimatedResults] = await Promise.all([
      this.executeFirst<{ count: number }>(queries[0]),
      this.executeQuery<{ confidence_level: string; count: number }>(queries[1]),
      this.executeQuery<{ source: string; count: number }>(queries[2]),
      this.executeQuery<{ is_estimated: boolean; count: number }>(queries[3])
    ]);

    const by_confidence_level: Record<string, number> = {};
    confidenceResults.forEach(r => {
      by_confidence_level[r.confidence_level] = r.count;
    });

    const by_source: Record<string, number> = {};
    sourceResults.forEach(r => {
      by_source[r.source] = r.count;
    });

    const estimated_vs_actual = { estimated: 0, actual: 0 };
    estimatedResults.forEach(r => {
      if (r.is_estimated) {
        estimated_vs_actual.estimated = r.count;
      } else {
        estimated_vs_actual.actual = r.count;
      }
    });

    return {
      total_records: totalResult?.count || 0,
      by_confidence_level,
      by_source,
      estimated_vs_actual
    };
  }

  async bulkInsert(dataArray: Omit<EnergyData, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    const statements = dataArray.map(data => {
      const { query, params } = this.buildInsertQuery('energy_data', data);
      return { query, params };
    });

    await this.executeBatch(statements);
  }
}