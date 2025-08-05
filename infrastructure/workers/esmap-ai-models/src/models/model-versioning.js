/**
 * Model Versioning and Update Manager
 * Handles model version control and deployment procedures
 */

export class ModelVersioning {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
  }

  async getCurrentVersion(modelId) {
    if (!this.db) return '1.0.0';

    try {
      const result = await this.db
        .prepare('SELECT version FROM models WHERE id = ? AND status = "active"')
        .bind(modelId)
        .first();
      
      return result?.version || '1.0.0';
    } catch (error) {
      console.error('Error getting model version:', error);
      return '1.0.0';
    }
  }

  async updateModelVersion(modelId, newVersion, changes) {
    if (!this.db) return;

    try {
      // Start transaction
      const batch = [];

      // Update model version
      batch.push(
        this.db
          .prepare('UPDATE models SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(newVersion, modelId)
      );

      // Record version history
      batch.push(
        this.db
          .prepare('INSERT INTO model_versions (model_id, version, changes) VALUES (?, ?, ?)')
          .bind(modelId, newVersion, changes)
      );

      await this.db.batch(batch);
      
      console.log(`Model ${modelId} updated to version ${newVersion}`);
    } catch (error) {
      console.error('Error updating model version:', error);
      throw error;
    }
  }

  async rollbackVersion(modelId, targetVersion) {
    if (!this.db) return;

    try {
      // Check if target version exists
      const versionExists = await this.db
        .prepare('SELECT * FROM model_versions WHERE model_id = ? AND version = ?')
        .bind(modelId, targetVersion)
        .first();

      if (!versionExists) {
        throw new Error(`Version ${targetVersion} not found for model ${modelId}`);
      }

      // Update to target version
      await this.db
        .prepare('UPDATE models SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(targetVersion, modelId)
        .run();

      console.log(`Model ${modelId} rolled back to version ${targetVersion}`);
    } catch (error) {
      console.error('Error rolling back model version:', error);
      throw error;
    }
  }

  async getVersionHistory(modelId) {
    if (!this.db) return [];

    try {
      const { results } = await this.db
        .prepare(`
          SELECT version, changes, deployed_at, deprecated_at 
          FROM model_versions 
          WHERE model_id = ? 
          ORDER BY deployed_at DESC
        `)
        .bind(modelId)
        .all();

      return results || [];
    } catch (error) {
      console.error('Error getting version history:', error);
      return [];
    }
  }

  async compareVersions(modelId, version1, version2) {
    if (!this.db) return null;

    try {
      const metrics1 = await this.getVersionMetrics(modelId, version1);
      const metrics2 = await this.getVersionMetrics(modelId, version2);

      return {
        version1: {
          version: version1,
          metrics: metrics1
        },
        version2: {
          version: version2,
          metrics: metrics2
        },
        comparison: this.calculateMetricsDelta(metrics1, metrics2)
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      return null;
    }
  }

  async getVersionMetrics(modelId, version) {
    if (!this.db) return {};

    try {
      const { results } = await this.db
        .prepare(`
          SELECT 
            AVG(CASE WHEN metric_type = 'latency' THEN metric_value END) as avg_latency,
            AVG(CASE WHEN metric_type = 'accuracy' THEN metric_value END) as avg_accuracy,
            COUNT(CASE WHEN metric_type = 'usage' THEN 1 END) as total_usage
          FROM model_metrics 
          WHERE model_id = ? 
          AND recorded_at >= (
            SELECT deployed_at FROM model_versions 
            WHERE model_id = ? AND version = ?
          )
          AND recorded_at <= COALESCE(
            (SELECT deployed_at FROM model_versions 
             WHERE model_id = ? AND deployed_at > 
               (SELECT deployed_at FROM model_versions 
                WHERE model_id = ? AND version = ?)
             ORDER BY deployed_at ASC LIMIT 1),
            CURRENT_TIMESTAMP
          )
        `)
        .bind(modelId, modelId, version, modelId, modelId, version)
        .all();

      return results?.[0] || {};
    } catch (error) {
      console.error('Error getting version metrics:', error);
      return {};
    }
  }

  calculateMetricsDelta(metrics1, metrics2) {
    const delta = {};

    if (metrics1.avg_latency && metrics2.avg_latency) {
      delta.latency_change = ((metrics2.avg_latency - metrics1.avg_latency) / metrics1.avg_latency) * 100;
    }

    if (metrics1.avg_accuracy && metrics2.avg_accuracy) {
      delta.accuracy_change = ((metrics2.avg_accuracy - metrics1.avg_accuracy) / metrics1.avg_accuracy) * 100;
    }

    if (metrics1.total_usage && metrics2.total_usage) {
      delta.usage_change = ((metrics2.total_usage - metrics1.total_usage) / metrics1.total_usage) * 100;
    }

    return delta;
  }

  async validateDeployment(modelId, version) {
    const validationResults = {
      passed: true,
      checks: {}
    };

    // Check 1: Model exists
    const modelExists = await this.db
      .prepare('SELECT * FROM models WHERE id = ?')
      .bind(modelId)
      .first();

    validationResults.checks.model_exists = {
      passed: !!modelExists,
      message: modelExists ? 'Model found' : 'Model not found'
    };

    if (!modelExists) {
      validationResults.passed = false;
      return validationResults;
    }

    // Check 2: Performance metrics
    const recentMetrics = await this.db
      .prepare(`
        SELECT AVG(metric_value) as avg_latency 
        FROM model_metrics 
        WHERE model_id = ? 
        AND metric_type = 'latency' 
        AND recorded_at > datetime('now', '-1 hour')
      `)
      .bind(modelId)
      .first();

    const avgLatency = recentMetrics?.avg_latency || 0;
    validationResults.checks.performance = {
      passed: avgLatency < 2000, // Sub-2 second requirement
      message: `Average latency: ${avgLatency}ms`,
      value: avgLatency
    };

    if (avgLatency >= 2000) {
      validationResults.passed = false;
    }

    // Check 3: Error rate
    const errorRate = await this.db
      .prepare(`
        SELECT 
          COUNT(CASE WHEN success = false THEN 1 END) * 100.0 / COUNT(*) as error_rate
        FROM inference_history
        WHERE model_id = ?
        AND created_at > datetime('now', '-1 hour')
      `)
      .bind(modelId)
      .first();

    const currentErrorRate = errorRate?.error_rate || 0;
    validationResults.checks.error_rate = {
      passed: currentErrorRate < 5, // Less than 5% error rate
      message: `Error rate: ${currentErrorRate.toFixed(2)}%`,
      value: currentErrorRate
    };

    if (currentErrorRate >= 5) {
      validationResults.passed = false;
    }

    return validationResults;
  }

  async scheduleUpdate(modelId, newVersion, scheduledTime) {
    // In production, this would integrate with a job scheduler
    console.log(`Update scheduled for model ${modelId} to version ${newVersion} at ${scheduledTime}`);
    
    // Store scheduled update
    if (this.db) {
      await this.db
        .prepare(`
          INSERT INTO scheduled_updates (model_id, target_version, scheduled_time, status)
          VALUES (?, ?, ?, 'pending')
        `)
        .bind(modelId, newVersion, scheduledTime)
        .run();
    }
  }
}