import React, { useState } from 'react';
import { RegisterData, LoadingState } from '../../types';

interface RegisterFormProps {
  onRegister: (data: RegisterData) => Promise<void>;
  onNavigateToLogin: () => void;
  loading?: LoadingState;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigateToLogin,
  loading = { isLoading: false, error: null }
}) => {
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: ''
  });

  const [validation, setValidation] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const validateForm = (): boolean => {
    const errors = { name: '', email: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
      isValid = false;
    }

    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setValidation(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onRegister(formData);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleInputChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear validation error when user starts typing
    if (field in validation && validation[field as keyof typeof validation]) {
      setValidation(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-600">Join the ESMAP AI Platform</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {loading.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{loading.error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange('name')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  validation.name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-slate-50 focus:bg-white`}
                placeholder="Enter your full name"
                disabled={loading.isLoading}
              />
              {validation.name && (
                <p className="mt-1 text-sm text-red-600">{validation.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  validation.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-slate-50 focus:bg-white`}
                placeholder="Enter your email"
                disabled={loading.isLoading}
              />
              {validation.email && (
                <p className="mt-1 text-sm text-red-600">{validation.email}</p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="block text-sm font-semibold text-slate-700 mb-2">
                Organization <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={handleInputChange('organization')}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-slate-50 focus:bg-white transition-colors"
                placeholder="Your organization or company"
                disabled={loading.isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  validation.password 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-slate-50 focus:bg-white`}
                placeholder="Create a strong password"
                disabled={loading.isLoading}
              />
              {validation.password && (
                <p className="mt-1 text-sm text-red-600">{validation.password}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Must be 8+ characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  validation.confirmPassword 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-slate-50 focus:bg-white`}
                placeholder="Confirm your password"
                disabled={loading.isLoading}
              />
              {validation.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validation.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading.isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading.isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <button
                onClick={onNavigateToLogin}
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                disabled={loading.isLoading}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-xs">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-emerald-600 hover:text-emerald-700">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-emerald-600 hover:text-emerald-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};