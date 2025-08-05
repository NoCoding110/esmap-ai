import type { Env } from '../../types';
import type { DatabaseError } from '../models/types';

export abstract class BaseService {
  protected db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  protected handleDatabaseError(error: any): DatabaseError {
    const dbError = new Error(error.message || 'Database operation failed') as DatabaseError;
    dbError.code = error.code;
    
    // Parse D1 specific errors
    if (error.message?.includes('UNIQUE constraint failed')) {
      dbError.code = 'CONSTRAINT_UNIQUE';
      dbError.constraint = 'unique';
    } else if (error.message?.includes('FOREIGN KEY constraint failed')) {
      dbError.code = 'CONSTRAINT_FOREIGN_KEY';
      dbError.constraint = 'foreign_key';
    } else if (error.message?.includes('NOT NULL constraint failed')) {
      dbError.code = 'CONSTRAINT_NOT_NULL';
      dbError.constraint = 'not_null';
    }

    return dbError;
  }

  protected buildWhereClause(conditions: Record<string, any>): { clause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    return {
      clause: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  protected buildLimitOffset(limit?: number, offset?: number): string {
    let clause = '';
    if (limit) {
      clause += ` LIMIT ${limit}`;
    }
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    return clause;
  }

  protected buildInsertQuery(table: string, data: Record<string, any>): { query: string; params: any[] } {
    const columns = Object.keys(data).filter(key => data[key] !== undefined);
    const placeholders = columns.map(() => '?').join(', ');
    const params = columns.map(key => data[key]);

    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    return { query, params };
  }

  protected buildUpdateQuery(table: string, data: Record<string, any>, whereConditions: Record<string, any>): { query: string; params: any[] } {
    const setColumns = Object.keys(data).filter(key => data[key] !== undefined);
    const setClause = setColumns.map(key => `${key} = ?`).join(', ');
    const setParams = setColumns.map(key => data[key]);

    const { clause: whereClause, params: whereParams } = this.buildWhereClause(whereConditions);

    const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP${whereClause}`;
    const params = [...setParams, ...whereParams];

    return { query, params };
  }

  protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).all();
      return result.results as T[];
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  protected async executeFirst<T = any>(query: string, params: any[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).first();
      return result as T | null;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  protected async executeRun(query: string, params: any[] = []): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(query);
      return await stmt.bind(...params).run();
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  protected async executeBatch(statements: { query: string; params: any[] }[]): Promise<D1Result[]> {
    try {
      const stmts = statements.map(({ query, params }) => 
        this.db.prepare(query).bind(...params)
      );
      return await this.db.batch(stmts);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  // Utility method to get total count for pagination
  protected async getCount(table: string, whereClause: string = '', params: any[] = []): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM ${table}${whereClause}`;
    const result = await this.executeFirst<{ count: number }>(query, params);
    return result?.count || 0;
  }
}