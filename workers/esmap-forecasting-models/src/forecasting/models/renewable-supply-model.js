/**
 * Renewable Supply Model  
 * Specialized forecasting for renewable energy generation
 */

export class RenewableSupplyModel {
  constructor() {
    this.modelType = 'renewable-supply';
    this.renewableTypes = ['solar', 'wind', 'hydro', 'biomass', 'geothermal'];
  }

  async forecastGeneration({ weather_data, capacity, country, horizon }) {
    console.log(`Generating renewable supply forecast for ${country}...`);

    // Validate inputs
    this.validateInputs(weather_data, capacity, horizon);

    // Process weather data
    const processedWeather = this.processWeatherData(weather_data, horizon);

    // Generate forecasts for each renewable type
    const forecasts = {};
    
    if (capacity.solar && capacity.solar > 0) {
      forecasts.solar = await this.forecastSolar(processedWeather, capacity.solar, country, horizon);
    }
    
    if (capacity.wind && capacity.wind > 0) {
      forecasts.wind = await this.forecastWind(processedWeather, capacity.wind, country, horizon);
    }
    
    if (capacity.hydro && capacity.hydro > 0) {
      forecasts.hydro = await this.forecastHydro(processedWeather, capacity.hydro, country, horizon);
    }

    // Combine renewable forecasts
    const combinedForecast = this.combineRenewableForecast(forecasts, horizon);

    return {
      forecast: combinedForecast,
      individual_forecasts: forecasts,
      model_type: 'renewable-supply',
      country: country,
      total_capacity: this.calculateTotalCapacity(capacity),
      weather_factors_used: Object.keys(weather_data),
      accuracy_estimate: this.estimateRenewableAccuracy(country, weather_data)
    };
  }

  async forecastByType({ type, weather_data, capacity, country, horizon }) {
    console.log(`Generating ${type} generation forecast...`);

    const processedWeather = this.processWeatherData(weather_data, horizon);

    switch (type.toLowerCase()) {
      case 'solar':
        return await this.forecastSolar(processedWeather, capacity, country, horizon);
      case 'wind':
        return await this.forecastWind(processedWeather, capacity, country, horizon);
      case 'hydro':
        return await this.forecastHydro(processedWeather, capacity, country, horizon);
      case 'biomass':
        return await this.forecastBiomass(processedWeather, capacity, country, horizon);
      case 'geothermal':
        return await this.forecastGeothermal(processedWeather, capacity, country, horizon);
      default:
        throw new Error(`Unsupported renewable type: ${type}`);
    }
  }

  validateInputs(weather_data, capacity, horizon) {
    if (!weather_data || typeof weather_data !== 'object') {
      throw new Error('Weather data is required');
    }

    if (!capacity || (typeof capacity !== 'number' && typeof capacity !== 'object')) {
      throw new Error('Capacity information is required');
    }

    if (!horizon || horizon < 1 || horizon > 8760) { // Max 1 year
      throw new Error('Horizon must be between 1 and 8760 hours');
    }
  }

  processWeatherData(weather_data, horizon) {
    const processed = [];
    
    for (let i = 0; i < horizon; i++) {
      // If weather data is provided as arrays, use corresponding index
      // Otherwise, use current values
      const weatherPoint = {
        hour: i,
        temperature: this.getWeatherValue(weather_data.temperature, i) || 20,
        solar_irradiance: this.getWeatherValue(weather_data.solar_irradiance, i) || 500,
        wind_speed: this.getWeatherValue(weather_data.wind_speed, i) || 8,
        humidity: this.getWeatherValue(weather_data.humidity, i) || 60,
        cloud_cover: this.getWeatherValue(weather_data.cloud_cover, i) || 30,
        precipitation: this.getWeatherValue(weather_data.precipitation, i) || 0,
        pressure: this.getWeatherValue(weather_data.pressure, i) || 1013,
        
        // Derived weather factors
        heat_index: this.calculateHeatIndex(
          this.getWeatherValue(weather_data.temperature, i) || 20,
          this.getWeatherValue(weather_data.humidity, i) || 60
        ),
        
        // Time-based factors
        timestamp: this.addHours(new Date().toISOString(), i),
        is_daylight: this.isDaylight(i),
        sun_elevation: this.calculateSunElevation(i)
      };
      
      processed.push(weatherPoint);
    }
    
    return processed;
  }

  async forecastSolar(weather_data, capacity, country, horizon) {
    console.log('Forecasting solar generation...');
    
    const solarForecast = [];
    const countryFactors = this.getSolarCountryFactors(country);
    
    for (let i = 0; i < horizon; i++) {
      const weather = weather_data[i];
      let generation = 0;
      
      if (weather.is_daylight) {
        // Base solar calculation using irradiance
        const irradianceEffect = Math.min(1.0, weather.solar_irradiance / 1000); // Normalize to peak sun
        
        // Temperature effect on solar panels (efficiency decreases with heat)
        const temperatureEffect = this.calculateSolarTemperatureEffect(weather.temperature);
        
        // Cloud cover effect
        const cloudEffect = Math.max(0.1, 1 - (weather.cloud_cover / 100) * 0.8);
        
        // Sun elevation effect
        const elevationEffect = Math.max(0, Math.sin(weather.sun_elevation * Math.PI / 180));
        
        // Calculate generation
        generation = capacity * 
                    irradianceEffect * 
                    temperatureEffect * 
                    cloudEffect * 
                    elevationEffect * 
                    countryFactors.efficiency;
        
        // Add realistic variability
        const variability = (Math.random() - 0.5) * 0.1;
        generation *= (1 + variability);
      }
      
      solarForecast.push({
        hour: i,
        timestamp: weather.timestamp,
        generation: Math.max(0, generation),
        capacity_factor: capacity > 0 ? generation / capacity : 0,
        weather_factors: {
          irradiance: weather.solar_irradiance,
          temperature: weather.temperature,
          cloud_cover: weather.cloud_cover,
          sun_elevation: weather.sun_elevation
        }
      });
    }
    
    return solarForecast;
  }

  async forecastWind(weather_data, capacity, country, horizon) {
    console.log('Forecasting wind generation...');
    
    const windForecast = [];
    const countryFactors = this.getWindCountryFactors(country);
    
    for (let i = 0; i < horizon; i++) {
      const weather = weather_data[i];
      
      // Wind power curve calculation
      let generation = 0;
      const windSpeed = weather.wind_speed;
      
      // Typical wind turbine power curve
      if (windSpeed >= 3 && windSpeed <= 25) { // Cut-in and cut-out speeds
        if (windSpeed <= 12) {
          // Power increases with cube of wind speed up to rated speed
          generation = capacity * Math.pow(windSpeed / 12, 3);
        } else {
          // Rated power between 12-25 m/s
          generation = capacity;
        }
      }
      
      // Apply country-specific factors
      generation *= countryFactors.efficiency;
      
      // Air density effect (temperature and pressure)
      const airDensityEffect = this.calculateAirDensityEffect(weather.temperature, weather.pressure);
      generation *= airDensityEffect;
      
      // Turbulence and gusting effects
      const turbulenceEffect = this.calculateTurbulenceEffect(windSpeed);
      generation *= turbulenceEffect;
      
      // Add realistic variability for wind
      const variability = (Math.random() - 0.5) * 0.2; // Higher variability than solar
      generation *= (1 + variability);
      
      windForecast.push({
        hour: i,
        timestamp: weather.timestamp,
        generation: Math.max(0, generation),
        capacity_factor: capacity > 0 ? generation / capacity : 0,
        weather_factors: {
          wind_speed: windSpeed,
          air_density: airDensityEffect,
          turbulence: turbulenceEffect,
          temperature: weather.temperature,
          pressure: weather.pressure
        }
      });
    }
    
    return windForecast;
  }

  async forecastHydro(weather_data, capacity, country, horizon) {
    console.log('Forecasting hydro generation...');
    
    const hydroForecast = [];
    const countryFactors = this.getHydroCountryFactors(country);
    
    // Hydro generation is more stable but affected by seasonal water availability
    const baseGeneration = capacity * countryFactors.base_capacity_factor;
    
    for (let i = 0; i < horizon; i++) {
      const weather = weather_data[i];
      let generation = baseGeneration;
      
      // Precipitation effect (lagged and accumulated)
      const precipitationEffect = this.calculatePrecipitationEffect(weather_data, i);
      generation *= precipitationEffect;
      
      // Seasonal effect
      const month = new Date(weather.timestamp).getMonth();
      const seasonalEffect = this.getHydroSeasonalEffect(month, country);
      generation *= seasonalEffect;
      
      // Temperature effect on snow melt (for mountainous regions)
      if (countryFactors.has_snow_melt) {
        const snowMeltEffect = this.calculateSnowMeltEffect(weather.temperature, month);
        generation *= snowMeltEffect;
      }
      
      // Reservoir management (simplified)
      const reservoirEffect = this.calculateReservoirEffect(i, horizon);
      generation *= reservoirEffect;
      
      // Add small variability (hydro is more stable)
      const variability = (Math.random() - 0.5) * 0.05;
      generation *= (1 + variability);
      
      hydroForecast.push({
        hour: i,
        timestamp: weather.timestamp,
        generation: Math.max(0, generation),
        capacity_factor: capacity > 0 ? generation / capacity : 0,
        weather_factors: {
          precipitation: weather.precipitation,
          temperature: weather.temperature,
          seasonal_effect: seasonalEffect,
          precipitation_effect: precipitationEffect
        }
      });
    }
    
    return hydroForecast;
  }

  async forecastBiomass(weather_data, capacity, country, horizon) {
    console.log('Forecasting biomass generation...');
    
    const biomassForecast = [];
    const countryFactors = this.getBiomassCountryFactors(country);
    
    // Biomass is typically baseload with high capacity factor
    const baseGeneration = capacity * countryFactors.base_capacity_factor;
    
    for (let i = 0; i < horizon; i++) {
      const weather = weather_data[i];
      let generation = baseGeneration;
      
      // Seasonal availability effects
      const month = new Date(weather.timestamp).getMonth();
      const seasonalEffect = this.getBiomassSeasonalEffect(month);
      generation *= seasonalEffect;
      
      // Maintenance scheduling (simplified)
      const maintenanceEffect = this.getBiomassMaintenanceEffect(i, horizon);
      generation *= maintenanceEffect;
      
      // Small variability
      const variability = (Math.random() - 0.5) * 0.03;
      generation *= (1 + variability);
      
      biomassForecast.push({
        hour: i,
        timestamp: weather.timestamp,
        generation: Math.max(0, generation),
        capacity_factor: capacity > 0 ? generation / capacity : 0,
        factors: {
          seasonal_effect: seasonalEffect,
          maintenance_effect: maintenanceEffect
        }
      });
    }
    
    return biomassForecast;
  }

  async forecastGeothermal(weather_data, capacity, country, horizon) {
    console.log('Forecasting geothermal generation...');
    
    const geothermalForecast = [];
    const countryFactors = this.getGeothermalCountryFactors(country);
    
    // Geothermal is very stable baseload
    const baseGeneration = capacity * countryFactors.base_capacity_factor;
    
    for (let i = 0; i < horizon; i++) {
      const weather = weather_data[i];
      let generation = baseGeneration;
      
      // Very minimal variability (geothermal is extremely stable)
      const variability = (Math.random() - 0.5) * 0.01;
      generation *= (1 + variability);
      
      // Maintenance scheduling
      const maintenanceEffect = this.getGeothermalMaintenanceEffect(i, horizon);
      generation *= maintenanceEffect;
      
      geothermalForecast.push({
        hour: i,
        timestamp: weather.timestamp,
        generation: Math.max(0, generation),
        capacity_factor: capacity > 0 ? generation / capacity : 0,
        factors: {
          maintenance_effect: maintenanceEffect
        }
      });
    }
    
    return geothermalForecast;
  }

  // Utility methods
  getWeatherValue(value, index) {
    if (Array.isArray(value)) {
      return value[Math.min(index, value.length - 1)];
    }
    return value;
  }

  calculateHeatIndex(temperature, humidity) {
    // Simplified heat index calculation
    if (temperature < 27) return temperature;
    
    const t = temperature;
    const h = humidity;
    
    return -8.78469475556 + 1.61139411 * t + 2.33854883889 * h +
           -0.14611605 * t * h + -0.012308094 * t * t +
           -0.0164248277778 * h * h;
  }

  isDaylight(hour) {
    // Simplified daylight calculation (6 AM to 6 PM)
    const timeOfDay = hour % 24;
    return timeOfDay >= 6 && timeOfDay <= 18;
  }

  calculateSunElevation(hour) {
    // Simplified sun elevation (peak at noon)
    const timeOfDay = hour % 24;
    const hourFromNoon = Math.abs(timeOfDay - 12);
    return Math.max(0, 90 - (hourFromNoon * 7.5)); // Degrees
  }

  getSolarCountryFactors(country) {
    const factors = {
      'ESP': { efficiency: 0.92, degradation: 0.995 }, // High solar resource
      'ITA': { efficiency: 0.88, degradation: 0.996 },
      'GRC': { efficiency: 0.90, degradation: 0.995 },
      'TUR': { efficiency: 0.85, degradation: 0.994 },
      'MAR': { efficiency: 0.87, degradation: 0.993 },
      'IND': { efficiency: 0.82, degradation: 0.992 },
      'CHN': { efficiency: 0.84, degradation: 0.994 },
      'USA': { efficiency: 0.86, degradation: 0.995 },
      'default': { efficiency: 0.85, degradation: 0.994 }
    };
    
    return factors[country] || factors['default'];
  }

  calculateSolarTemperatureEffect(temperature) {
    // Solar panel efficiency decreases with temperature
    // Typical temperature coefficient: -0.4%/°C above 25°C
    const referenceTemp = 25;
    const tempCoefficient = -0.004;
    
    if (temperature > referenceTemp) {
      return 1 + tempCoefficient * (temperature - referenceTemp);
    }
    
    return 1.0;
  }

  getWindCountryFactors(country) {
    const factors = {
      'DNK': { efficiency: 0.95, turbulence: 0.1 }, // Excellent wind resource
      'DEU': { efficiency: 0.88, turbulence: 0.15 },
      'GBR': { efficiency: 0.90, turbulence: 0.12 },
      'NLD': { efficiency: 0.87, turbulence: 0.14 },
      'NOR': { efficiency: 0.92, turbulence: 0.11 },
      'USA': { efficiency: 0.85, turbulence: 0.16 },
      'CHN': { efficiency: 0.82, turbulence: 0.18 },
      'IND': { efficiency: 0.78, turbulence: 0.20 },
      'default': { efficiency: 0.85, turbulence: 0.15 }
    };
    
    return factors[country] || factors['default'];
  }

  calculateAirDensityEffect(temperature, pressure) {
    // Air density affects wind turbine performance
    // Standard conditions: 15°C, 1013.25 hPa
    const standardTemp = 15 + 273.15; // Convert to Kelvin
    const standardPressure = 1013.25;
    const currentTemp = temperature + 273.15;
    
    const densityRatio = (pressure / standardPressure) * (standardTemp / currentTemp);
    return Math.pow(densityRatio, 0.5); // Power is proportional to square root of density
  }

  calculateTurbulenceEffect(windSpeed) {
    // Higher wind speeds can create more turbulence, slightly reducing efficiency
    if (windSpeed > 15) {
      return 0.95 - (windSpeed - 15) * 0.01;
    }
    return 1.0;
  }

  getHydroCountryFactors(country) {
    const factors = {
      'NOR': { base_capacity_factor: 0.85, has_snow_melt: true },
      'SWE': { base_capacity_factor: 0.82, has_snow_melt: true },
      'CAN': { base_capacity_factor: 0.80, has_snow_melt: true },
      'BRA': { base_capacity_factor: 0.75, has_snow_melt: false },
      'COL': { base_capacity_factor: 0.78, has_snow_melt: false },
      'CHN': { base_capacity_factor: 0.72, has_snow_melt: true },
      'USA': { base_capacity_factor: 0.70, has_snow_melt: true },
      'default': { base_capacity_factor: 0.70, has_snow_melt: false }
    };
    
    return factors[country] || factors['default'];
  }

  calculatePrecipitationEffect(weather_data, currentIndex) {
    // Accumulate precipitation over last 30 days (simplified)
    const lookback = Math.min(720, currentIndex); // 30 days * 24 hours
    let totalPrecipitation = 0;
    
    for (let i = Math.max(0, currentIndex - lookback); i <= currentIndex; i++) {
      totalPrecipitation += weather_data[i].precipitation || 0;
    }
    
    // Normalize to effect multiplier (more rain = more water = more generation)
    const normalPrecipitation = 50; // mm per 30 days
    return Math.min(1.3, Math.max(0.7, 1 + (totalPrecipitation - normalPrecipitation) / 100));
  }

  getHydroSeasonalEffect(month, country) {
    // Seasonal water availability patterns
    const patterns = {
      'NOR': [0.6, 0.6, 0.7, 0.9, 1.3, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6], // Spring melt
      'BRA': [1.2, 1.3, 1.2, 1.0, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2], // Wet/dry seasons
      'default': [0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.9, 0.9, 0.9, 0.9]
    };
    
    const pattern = patterns[country] || patterns['default'];
    return pattern[month];
  }

  calculateSnowMeltEffect(temperature, month) {
    // Snow melt contribution (spring months with warming temperatures)
    if (month >= 3 && month <= 6 && temperature > 5) { // Apr-Jul above 5°C
      return 1 + Math.min(0.3, (temperature - 5) / 20);
    }
    return 1.0;
  }

  calculateReservoirEffect(hour, horizon) {
    // Simplified reservoir management - varies throughout day and season
    const timeOfDay = hour % 24;
    
    // Higher generation during peak hours
    if (timeOfDay >= 7 && timeOfDay <= 9) return 1.1; // Morning peak
    if (timeOfDay >= 17 && timeOfDay <= 21) return 1.2; // Evening peak
    if (timeOfDay >= 1 && timeOfDay <= 5) return 0.8; // Night time reduction
    
    return 1.0;
  }

  getBiomassCountryFactors(country) {
    const factors = {
      'USA': { base_capacity_factor: 0.80 },
      'BRA': { base_capacity_factor: 0.75 },
      'DEU': { base_capacity_factor: 0.85 },
      'FIN': { base_capacity_factor: 0.90 },
      'SWE': { base_capacity_factor: 0.88 },
      'default': { base_capacity_factor: 0.80 }
    };
    
    return factors[country] || factors['default'];
  }

  getBiomassSeasonalEffect(month) {
    // Biomass availability varies with agricultural cycles
    const seasonalPattern = [0.9, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 1.0, 1.1, 1.0, 0.9];
    return seasonalPattern[month];
  }

  getBiomassMaintenanceEffect(hour, horizon) {
    // Scheduled maintenance periods (simplified)
    const maintenancePeriod = Math.floor(horizon / 10); // 10% maintenance time
    if (hour >= horizon - maintenancePeriod) {
      return 0.3; // Reduced capacity during maintenance
    }
    return 1.0;
  }

  getGeothermalCountryFactors(country) {
    const factors = {
      'ISL': { base_capacity_factor: 0.95 },
      'NZL': { base_capacity_factor: 0.92 },
      'ITA': { base_capacity_factor: 0.88 },
      'USA': { base_capacity_factor: 0.85 },
      'TUR': { base_capacity_factor: 0.87 },
      'default': { base_capacity_factor: 0.85 }
    };
    
    return factors[country] || factors['default'];
  }

  getGeothermalMaintenanceEffect(hour, horizon) {
    // Very minimal maintenance (geothermal is very reliable)
    const maintenancePeriod = Math.floor(horizon / 100); // 1% maintenance time
    if (hour >= horizon - maintenancePeriod) {
      return 0.8;
    }
    return 1.0;
  }

  combineRenewableForecast(forecasts, horizon) {
    const combined = [];
    
    for (let i = 0; i < horizon; i++) {
      let totalGeneration = 0;
      let totalCapacity = 0;
      const components = {};
      
      Object.keys(forecasts).forEach(type => {
        if (forecasts[type] && forecasts[type][i]) {
          const generation = forecasts[type][i].generation || 0;
          totalGeneration += generation;
          components[type] = generation;
        }
      });
      
      combined.push({
        hour: i,
        timestamp: Object.values(forecasts)[0]?.[i]?.timestamp,
        total_generation: totalGeneration,
        components: components
      });
    }
    
    return combined;
  }

  calculateTotalCapacity(capacity) {
    if (typeof capacity === 'number') return capacity;
    
    return Object.values(capacity).reduce((total, cap) => total + (cap || 0), 0);
  }

  estimateRenewableAccuracy(country, weather_data) {
    let baseAccuracy = 82; // Base accuracy for renewable forecasting
    
    // Country-specific adjustments based on grid integration maturity
    const countryAccuracy = {
      'DNK': 88, // Advanced wind integration
      'DEU': 86, // Strong renewable sector
      'ESP': 85, // Good solar resources
      'USA': 84,
      'CHN': 81,
      'IND': 78,
      'default': 82
    };
    
    baseAccuracy = countryAccuracy[country] || countryAccuracy['default'];
    
    // Weather data quality adjustments
    if (weather_data.solar_irradiance) baseAccuracy += 2;
    if (weather_data.wind_speed) baseAccuracy += 2;
    if (weather_data.precipitation) baseAccuracy += 1;
    if (weather_data.humidity) baseAccuracy += 1;
    
    return Math.min(92, Math.max(75, baseAccuracy));
  }

  addHours(timestamp, hours) {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }
}