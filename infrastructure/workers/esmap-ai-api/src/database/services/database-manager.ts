import type { Env } from '../../types';
import { CountryService } from './country-service';
import { EnergyDataService } from './energy-data-service';
import { RenewableCapacityService } from './renewable-capacity-service';

export class DatabaseManager {
  public countries: CountryService;
  public energyData: EnergyDataService;
  public renewableCapacity: RenewableCapacityService;
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
    this.countries = new CountryService(env);
    this.energyData = new EnergyDataService(env);
    this.renewableCapacity = new RenewableCapacityService(env);
  }

  // Database management methods
  async runMigration(migrationSql: string): Promise<void> {
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await this.db.prepare(statement).run();
    }
  }

  async runSeed(seedSql: string): Promise<void> {
    const statements = seedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await this.db.prepare(statement).run();
    }
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    const query = `PRAGMA table_info(${tableName})`;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  async getIndexInfo(tableName: string): Promise<any[]> {
    const query = `PRAGMA index_list(${tableName})`;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  async getDatabaseSchema(): Promise<{
    tables: Record<string, any[]>;
    indexes: Record<string, any[]>;
  }> {
    // Get all table names
    const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    const tablesResult = await this.db.prepare(tablesQuery).all();
    const tableNames = (tablesResult.results as { name: string }[]).map(row => row.name);

    const tables: Record<string, any[]> = {};
    const indexes: Record<string, any[]> = {};

    for (const tableName of tableNames) {
      tables[tableName] = await this.getTableInfo(tableName);
      indexes[tableName] = await this.getIndexInfo(tableName);
    }

    return { tables, indexes };
  }

  async getDatabaseStats(): Promise<{
    table_counts: Record<string, number>;
    database_size: number;
    last_updated: string;
  }> {
    const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    const tablesResult = await this.db.prepare(tablesQuery).all();
    const tableNames = (tablesResult.results as { name: string }[]).map(row => row.name);

    const table_counts: Record<string, number> = {};

    for (const tableName of tableNames) {
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const countResult = await this.db.prepare(countQuery).first();
      table_counts[tableName] = (countResult as { count: number }).count;
    }

    // Get database size (in pages, multiply by page size for bytes)
    const sizeQuery = "PRAGMA page_count";
    const sizeResult = await this.db.prepare(sizeQuery).first();
    const pageCount = (sizeResult as { 'page_count()': number })['page_count()'];
    
    const pageSizeQuery = "PRAGMA page_size";
    const pageSizeResult = await this.db.prepare(pageSizeQuery).first();
    const pageSize = (pageSizeResult as { 'page_size()': number })['page_size()'];

    return {
      table_counts,
      database_size: pageCount * pageSize,
      last_updated: new Date().toISOString()
    };
  }

  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(query);
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return await stmt.bind(...params).all();
    } else {
      return await stmt.bind(...params).run();
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connection: boolean;
    tables_accessible: boolean;
    sample_query_works: boolean;
    error?: string;
  }> {
    try {
      // Test basic connection
      await this.db.prepare('SELECT 1').first();
      const connection = true;

      // Test table access
      let tables_accessible = false;
      try {
        await this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").first();
        tables_accessible = true;
      } catch (e) {
        // Table access failed
      }

      // Test sample query
      let sample_query_works = false;
      try {
        await this.db.prepare('SELECT COUNT(*) FROM countries').first();
        sample_query_works = true;
      } catch (e) {
        // Sample query failed (might be expected if tables don't exist yet)
      }

      const status = connection && tables_accessible ? 'healthy' : 'unhealthy';

      return {
        status,
        connection,
        tables_accessible,
        sample_query_works
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        connection: false,
        tables_accessible: false,
        sample_query_works: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Utility methods for complex queries across multiple tables
  async getCountryEnergyProfile(countryId: number, year?: number): Promise<any> {
    const targetYear = year || new Date().getFullYear() - 1;
    
    const query = `
      SELECT 
        c.name as country_name,
        c.iso3_code,
        ed_access.value as electricity_access_percent,
        ed_renewable.value as renewable_share_percent,
        ed_intensity.value as energy_intensity,
        ed_co2.value as co2_emissions_mt,
        (SELECT SUM(capacity_mw) FROM renewable_capacity rc WHERE rc.country_id = c.id AND rc.year = ?) as total_renewable_capacity_mw
      FROM countries c
      LEFT JOIN energy_data ed_access ON c.id = ed_access.country_id 
        AND ed_access.indicator_id = (SELECT id FROM energy_indicators WHERE code = 'EG.ELC.ACCS.ZS')
        AND ed_access.year = ?
      LEFT JOIN energy_data ed_renewable ON c.id = ed_renewable.country_id 
        AND ed_renewable.indicator_id = (SELECT id FROM energy_indicators WHERE code = 'EG.FEC.RNEW.ZS')
        AND ed_renewable.year = ?
      LEFT JOIN energy_data ed_intensity ON c.id = ed_intensity.country_id 
        AND ed_intensity.indicator_id = (SELECT id FROM energy_indicators WHERE code = 'EG.EGY.PRIM.PP.KD')
        AND ed_intensity.year = ?
      LEFT JOIN energy_data ed_co2 ON c.id = ed_co2.country_id 
        AND ed_co2.indicator_id = (SELECT id FROM energy_indicators WHERE code = 'EN.ATM.CO2E.KT')
        AND ed_co2.year = ?
      WHERE c.id = ?
    `;

    return await this.db.prepare(query).bind(
      targetYear, targetYear, targetYear, targetYear, targetYear, countryId
    ).first();
  }

  async searchCountriesWithEnergyData(searchTerm: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT DISTINCT c.*, 
        COUNT(ed.id) as energy_data_points,
        MAX(ed.year) as latest_data_year
      FROM countries c
      LEFT JOIN energy_data ed ON c.id = ed.country_id
      WHERE (c.name LIKE ? OR c.official_name LIKE ? OR c.iso3_code LIKE ?)
      GROUP BY c.id
      ORDER BY energy_data_points DESC, c.name
      LIMIT ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await this.db.prepare(query).bind(
      searchPattern, searchPattern, searchPattern, limit
    ).all();
    
    return result.results;
  }
}