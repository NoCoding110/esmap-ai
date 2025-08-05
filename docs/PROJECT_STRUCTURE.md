# ESMAP AI Platform - Project Structure

## Overview

This document describes the organized project structure for the ESMAP AI Platform, designed for maintainability, scalability, and clear separation of concerns.

## 📁 Root Directory Structure

```
esmap-ai/
├── 📁 src/                          # Frontend source code
├── 📁 infrastructure/               # Backend infrastructure
├── 📁 tests/                       # Testing suites
├── 📁 docs/                        # Documentation
├── 📁 config/                      # Configuration files
├── 📁 scripts/                     # Automation scripts
├── 📁 public/                      # Static assets
├── 📁 dist/                        # Build output
├── 📄 package.json                 # Main project dependencies
├── 📄 vite.config.js              # Vite configuration
├── 📄 tailwind.config.js          # Tailwind CSS config
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 _headers                     # Cloudflare headers
└── 📄 _redirects                   # Cloudflare redirects
```

## 📂 Detailed Directory Structure

### `/src/` - Frontend Application
```
src/
├── 📄 App.jsx                      # Main application component
├── 📄 main.jsx                     # Application entry point
├── 📄 index.css                    # Global styles
├── 📁 components/                  # React components
│   ├── 📄 ApiTestingInterface.jsx  # API testing UI
│   ├── 📄 CountryProfile.jsx       # Country analysis
│   ├── 📄 ESMAPDashboard.jsx       # ESMAP dashboard
│   ├── 📄 ESMAPSearch.jsx          # Search functionality
│   ├── 📁 auth/                    # Authentication components
│   │   ├── 📄 AuthManager.jsx      # Auth state management
│   │   ├── 📄 LoginForm.jsx        # Login interface
│   │   ├── 📄 RegisterForm.jsx     # Registration form
│   │   └── 📄 ResetPasswordForm.jsx # Password reset
│   ├── 📁 modern/                  # Modern UI components
│   │   ├── 📄 ModernHeader.jsx     # Navigation header
│   │   ├── 📄 ModernDashboard.jsx  # Modern dashboard
│   │   ├── 📄 ModernDataTable.jsx  # Data table component
│   │   ├── 📄 ChatInterface.jsx    # AI chat interface
│   │   └── 📄 ModernLoading.jsx    # Loading states
│   └── 📁 DataManagement/          # Data management UI
│       ├── 📄 DataManagementDashboard.jsx
│       ├── 📄 DataQualityMetrics.jsx
│       ├── 📄 DataValidationResults.jsx
│       └── ... (other data components)
├── 📁 services/                    # Frontend services
│   ├── 📄 dataService.js           # Data API client
│   ├── 📄 freeDataService.js       # Free data sources
│   └── 📄 webScrapingService.js    # Web scraping client
├── 📁 styles/                      # Styling
│   └── 📄 design-system.css        # Design system
├── 📁 api/                         # API clients
│   ├── 📄 EnergyDataApiModule.ts   # Energy data API
│   ├── 📄 EnergyDataIntegrationModule.ts
│   ├── 📁 clients/                 # API clients
│   ├── 📁 types/                   # Type definitions
│   └── 📁 __tests__/               # API tests
└── 📁 types/                       # TypeScript types
    └── 📄 index.ts                 # Type exports
```

### `/infrastructure/` - Backend Infrastructure
```
infrastructure/
├── 📁 model-serving/               # Model serving infrastructure
│   └── 📄 model-serving-worker.js  # Cloudflare Worker
├── 📁 workers/                     # Cloudflare Workers
│   ├── 📁 esmap-ai-api/            # Main API worker
│   │   ├── 📄 package.json         # Dependencies
│   │   ├── 📄 wrangler.toml        # Deployment config
│   │   ├── 📁 src/                 # Source code
│   │   │   ├── 📄 index.ts         # Worker entry point
│   │   │   ├── 📁 routes/          # API routes
│   │   │   ├── 📁 database/        # Database layer
│   │   │   ├── 📁 etl/             # ETL pipelines
│   │   │   ├── 📁 storage/         # Storage management
│   │   │   ├── 📁 vectorize/       # Vector operations
│   │   │   └── 📁 resilience/      # Failover systems
│   │   └── 📁 migrations/          # Database migrations
│   ├── 📁 esmap-ai-models/         # AI models worker
│   │   ├── 📄 package.json         # Dependencies
│   │   ├── 📄 wrangler.toml        # Config
│   │   └── 📁 src/                 # Model inference
│   └── 📁 esmap-forecasting-models/ # Forecasting worker
│       ├── 📄 package.json         # Dependencies
│       ├── 📄 wrangler.toml        # Config
│       └── 📁 src/                 # Forecasting models
```

### `/tests/` - Testing Infrastructure
```
tests/
├── 📁 unit/                        # Unit tests
├── 📁 integration/                 # Integration tests
│   ├── 📄 api-test.js              # API testing
│   ├── 📄 test-comprehensive.js    # Full platform tests
│   ├── 📄 test-ai-models.js        # AI model tests
│   ├── 📄 test-etl-live.js         # ETL pipeline tests
│   └── ... (other integration tests)
├── 📁 load/                        # Load testing
│   └── 📄 load-test-model-serving.js # Model serving load tests
└── 📁 validation/                  # Deployment validation
    ├── 📄 simple-validation-test.js # Quick validation
    └── 📄 validate-deployment.js   # Full deployment validation
```

### `/docs/` - Documentation
```
docs/
├── 📄 README.md                    # Main documentation
├── 📄 CLAUDE.md                    # Project instructions
├── 📄 PROJECT_STRUCTURE.md        # This file
├── 📁 completion-reports/          # Task completion reports
│   ├── 📄 TASK_3_1_COMPLETE.md     # AI Models deployment
│   ├── 📄 TASK_3_2_COMPLETE.md     # Forecasting models
│   ├── 📄 TASK_3_3_COMPLETE.md     # Model serving & caching
│   └── 📄 UI_DESIGN_COMPLETE.md    # Modern UI implementation
├── 📁 api/                         # API documentation
└── 📁 deployment/                  # Deployment guides
```

### `/config/` - Configuration Files
```
config/
├── 📁 cloudflare/                  # Cloudflare configurations
│   ├── 📄 wrangler.toml            # Main wrangler config
│   ├── 📄 wrangler-simple.toml     # Simplified config
│   └── 📄 wrangler-model-serving.toml # Model serving config
├── 📁 build/                       # Build configurations
│   └── (moved to root for build tools)
└── 📁 env/                         # Environment configs
    └── (package configurations)
```

### `/scripts/` - Automation Scripts
```
scripts/
├── 📁 deployment/                  # Deployment scripts
│   └── 📄 deploy-all.sh            # Complete deployment
├── 📁 testing/                     # Testing scripts
└── 📁 utilities/                   # Utility scripts
```

### `/public/` - Static Assets
```
public/
├── 📄 manifest.json                # PWA manifest
├── 📄 favicon.svg                  # Favicon
└── 📄 robots.txt                   # SEO robots file
```

## 🛠️ Build & Development Files

### Root Configuration Files
- `package.json` - Main project dependencies and scripts
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest testing configuration
- `_headers` - Cloudflare Pages headers
- `_redirects` - Cloudflare Pages redirects

## 📋 NPM Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Testing
- `npm run test` - Run unit tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:load` - Run load tests
- `npm run test:validation` - Run deployment validation
- `npm run test:all` - Run all tests

### Deployment  
- `npm run deploy` - Deploy frontend
- `npm run deploy:workers` - Deploy all workers
- `npm run deploy:api` - Deploy API worker
- `npm run deploy:models` - Deploy AI models worker
- `npm run deploy:serving` - Deploy model serving

### Maintenance
- `npm run lint` - Lint code
- `npm run typecheck` - Type checking
- `npm run clean` - Clean build artifacts
- `npm run health:check` - Check service health

## 🔗 Service URLs

### Production Deployments
- **Frontend**: https://esmap-ai-platform.pages.dev (Primary)
- **Frontend Deployment**: https://2c8c41d6.esmap-ai-platform.pages.dev (Current deployment)
- **API Worker**: https://esmap-ai-api.metabilityllc1.workers.dev
- **Model Serving**: https://esmap-model-serving.metabilityllc1.workers.dev
- **AI Models**: https://esmap-ai-models.metabilityllc1.workers.dev
- **Forecasting**: https://esmap-forecasting-models.metabilityllc1.workers.dev

### Health Endpoints
- API Health: `/health`
- Model Serving Health: `/health`
- Metrics: `/metrics`
- Admin: `/admin/cache`, `/admin/scaling`

## 🎯 Key Benefits of This Structure

### 1. **Clear Separation of Concerns**
- Frontend (`src/`) and backend (`infrastructure/`) clearly separated
- Testing organized by type (`unit/`, `integration/`, `load/`, `validation/`)
- Documentation centralized in `docs/`

### 2. **Scalable Architecture**
- Modular component structure
- Worker-based microservices architecture
- Independent service deployment

### 3. **Maintainable Codebase**
- Logical file organization
- Consistent naming conventions
- Centralized configuration

### 4. **Developer Experience**  
- Intuitive folder navigation
- Comprehensive NPM scripts
- Automated deployment pipelines

### 5. **Production Ready**
- Proper build configurations
- Comprehensive testing framework
- Health monitoring and validation

## 📊 File Count Summary

- **Total Components**: 25+ React components
- **Worker Services**: 3 Cloudflare Workers
- **Test Files**: 15+ test suites
- **Documentation**: 6+ comprehensive docs
- **Configuration Files**: 10+ config files
- **Scripts**: 5+ automation scripts

This organized structure provides a solid foundation for the ESMAP AI Platform's continued development and maintenance.