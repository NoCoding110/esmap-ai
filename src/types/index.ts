// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization?: string;
}

export interface ResetPasswordData {
  email: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string>;
}

// Loading and Error types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  message?: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  badge?: string | number;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  mode: 'light' | 'dark';
}

// Energy Data types (enhanced)
export interface CountryData {
  id: string;
  name: string;
  code: string;
  region: string;
  population?: number;
  gdp?: number;
  energyAccess?: number;
  renewableShare?: number;
}

export interface EnergyIndicator {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  source: string;
}

export interface EnergyDataPoint {
  countryCode: string;
  indicatorCode: string;
  year: number;
  value: number;
  unit: string;
  source: string;
}