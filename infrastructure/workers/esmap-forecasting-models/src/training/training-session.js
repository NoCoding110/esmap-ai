/**
 * Training Session Durable Object
 * Manages long-running model training sessions
 */

export class TrainingSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const sessionId = url.pathname.split('/')[1];

    switch (request.method) {
      case 'POST':
        return this.startTraining(sessionId, await request.json());
      
      case 'GET':
        return this.getTrainingStatus(sessionId);
      
      case 'DELETE':
        return this.stopTraining(sessionId);
      
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  async startTraining(sessionId, trainingRequest) {
    try {
      const session = {
        id: sessionId,
        status: 'training',
        started_at: new Date().toISOString(),
        training_request: trainingRequest,
        progress: 0,
        current_epoch: 0,
        best_accuracy: 0,
        training_log: []
      };

      this.sessions.set(sessionId, session);
      await this.state.storage.put(sessionId, session);

      // Start async training process
      this.runTrainingProcess(sessionId, trainingRequest);

      return new Response(JSON.stringify({
        session_id: sessionId,
        status: 'started',
        message: 'Training session initiated'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to start training session',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async getTrainingStatus(sessionId) {
    try {
      let session = this.sessions.get(sessionId);
      
      if (!session) {
        session = await this.state.storage.get(sessionId);
        if (session) {
          this.sessions.set(sessionId, session);
        }
      }

      if (!session) {
        return new Response(JSON.stringify({
          error: 'Training session not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(session), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to get training status',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async stopTraining(sessionId) {
    try {
      const session = this.sessions.get(sessionId) || await this.state.storage.get(sessionId);
      
      if (!session) {
        return new Response(JSON.stringify({
          error: 'Training session not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      session.status = 'stopped';
      session.stopped_at = new Date().toISOString();

      this.sessions.set(sessionId, session);
      await this.state.storage.put(sessionId, session);

      return new Response(JSON.stringify({
        session_id: sessionId,
        status: 'stopped',
        message: 'Training session stopped'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to stop training session',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async runTrainingProcess(sessionId, trainingRequest) {
    try {
      const session = this.sessions.get(sessionId);
      const { algorithm, training_data, target_accuracy = 85, max_epochs = 100 } = trainingRequest;

      // Simulate training epochs
      for (let epoch = 1; epoch <= max_epochs; epoch++) {
        if (session.status === 'stopped') break;

        // Simulate training time
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate accuracy improvement
        const accuracy = this.simulateTrainingAccuracy(epoch, max_epochs, algorithm);
        const loss = this.simulateTrainingLoss(epoch, max_epochs);

        session.current_epoch = epoch;
        session.progress = (epoch / max_epochs) * 100;
        session.best_accuracy = Math.max(session.best_accuracy, accuracy);

        session.training_log.push({
          epoch,
          accuracy: parseFloat(accuracy.toFixed(3)),
          loss: parseFloat(loss.toFixed(4)),
          timestamp: new Date().toISOString()
        });

        // Update session
        this.sessions.set(sessionId, session);
        await this.state.storage.put(sessionId, session);

        // Check if target accuracy reached
        if (accuracy >= target_accuracy) {
          session.status = 'completed';
          session.completed_at = new Date().toISOString();
          session.final_accuracy = accuracy;
          session.convergence_epoch = epoch;
          break;
        }
      }

      // Complete training if not already completed
      if (session.status === 'training') {
        session.status = session.best_accuracy >= target_accuracy ? 'completed' : 'failed';
        session.completed_at = new Date().toISOString();
        session.final_accuracy = session.best_accuracy;
      }

      // Final update
      this.sessions.set(sessionId, session);
      await this.state.storage.put(sessionId, session);

    } catch (error) {
      console.error('Training process error:', error);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.error = error.message;
        session.failed_at = new Date().toISOString();
        
        this.sessions.set(sessionId, session);
        await this.state.storage.put(sessionId, session);
      }
    }
  }

  simulateTrainingAccuracy(epoch, maxEpochs, algorithm) {
    // Different algorithms have different learning curves
    const algorithmConfigs = {
      'ARIMA': { initial: 70, final: 87, curve: 'logarithmic' },
      'LSTM': { initial: 65, final: 84, curve: 'exponential' },
      'Prophet': { initial: 75, final: 89, curve: 'linear' },
      'Random Forest': { initial: 78, final: 86, curve: 'stepwise' },
      'Ensemble': { initial: 80, final: 91, curve: 'smooth' }
    };

    const config = algorithmConfigs[algorithm] || algorithmConfigs['ARIMA'];
    const progress = epoch / maxEpochs;
    
    let accuracy;
    switch (config.curve) {
      case 'logarithmic':
        accuracy = config.initial + (config.final - config.initial) * Math.log(1 + progress) / Math.log(2);
        break;
      case 'exponential':
        accuracy = config.initial + (config.final - config.initial) * (1 - Math.exp(-3 * progress));
        break;
      case 'stepwise':
        accuracy = config.initial + (config.final - config.initial) * Math.min(1, progress * 1.2);
        break;
      case 'smooth':
        accuracy = config.initial + (config.final - config.initial) * (1 - Math.cos(progress * Math.PI)) / 2;
        break;
      case 'linear':
      default:
        accuracy = config.initial + (config.final - config.initial) * progress;
        break;
    }

    // Add some random variation
    accuracy += (Math.random() - 0.5) * 2;
    
    return Math.max(config.initial, Math.min(config.final + 5, accuracy));
  }

  simulateTrainingLoss(epoch, maxEpochs) {
    const progress = epoch / maxEpochs;
    
    // Loss typically decreases exponentially with some noise
    const baseLoss = 1.0 * Math.exp(-2 * progress);
    const noise = (Math.random() - 0.5) * 0.1;
    
    return Math.max(0.01, baseLoss + noise);
  }
}