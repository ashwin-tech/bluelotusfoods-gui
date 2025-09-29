# Blue Lotus Foods - GUI Applications Monorepo

A scalable monorepo containing all frontend applications organized by user type.

## 🏗️ Architecture

This monorepo is organized into three main categories:
- **vendor-apps/**: Applications for vendors (suppliers)
- **buyer-apps/**: Applications for buyers (customers)  
- **admin-apps/**: Administrative applications for internal use

## 📁 Repository Structure

### Vendor Applications (`vendor-apps/`)
- **quote-form** - Vendor quote submission and management
- **markup-screen** - Markup management and buyer email notifications (planned)

### Buyer Applications (`buyer-apps/`)
- **package-list** - Buyer package browsing (planned)

### Admin Applications (`admin-apps/`)
- **dashboard** - Administrative tools and reporting (planned)

### Shared Resources (`shared/`)
- **components** - Reusable UI components
- **utils** - Common utility functions
- **types** - TypeScript type definitions
- **styles** - Global styling and themes

## 🚀 Development

### Port Assignments

Each application runs on a dedicated port to avoid conflicts:

| Application | Port | URL |
|------------|------|-----|
| **vendor-apps/quote-form** | 5173 | http://localhost:5173 |
| **vendor-apps/markup-screen** | 5174 | http://localhost:5174 |
| **buyer-apps/package-list** | 5175 | http://localhost:5175 |
| **admin-apps/dashboard** | 5176 | http://localhost:5176 |

### Available Scripts

```bash
# Development - Run individual apps
npm run dev:quote-form        # Start quote-form app on port 5173

# Development - Run all apps (when available)
npm run dev:all               # Start all applications

# Build individual apps
npm run build:quote-form      # Build quote-form app

# Build all apps
npm run build:all             # Build all applications

# Install dependencies for all workspaces
npm run install:all           # Install dependencies across all apps
```

### Getting Started

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start development server**:
   ```bash
   npm run dev:quote-form
   ```

3. **Access the application**:
   - Local: http://localhost:5173
   - Network: http://[your-ip]:5173

### Backend Services

The applications connect to these backend services:
- **Main API**: http://localhost:8000 (FastAPI)
- **Email Service**: http://localhost:8001 (FastAPI)

Make sure both backend services are running before starting the frontend applications.

## 🔧 Configuration

### Environment Variables

Environment variables are managed at the root level:
- `.env` - Development environment variables
- `.env.production` - Production environment variables

### Port Configuration

Ports are configured in each app's `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    host: true,
    port: 5173, // Fixed port assignment
  },
  // ... other config
});
```

## 📦 Shared Resources

The `shared/` directory contains common resources used across applications:

- **shared/components/**: Reusable React components
- **shared/types/**: TypeScript interfaces and types  
- **shared/utils/**: Common utility functions
- **shared/styles/**: Global CSS and Tailwind configurations

## 🏃‍♂️ Adding New Applications

1. Create the app directory in the appropriate category:
   ```bash
   mkdir vendor-apps/new-app
   # or buyer-apps/new-app
   # or admin-apps/new-app
   ```

2. Initialize the app with Vite:
   ```bash
   cd vendor-apps/new-app
   npm create vite@latest . -- --template react-ts
   ```

3. Configure the port in `vite.config.ts`:
   ```typescript
   server: {
     host: true,
     port: 5177, // Next available port
   }
   ```

4. Add scripts to root `package.json`:
   ```json
   "dev:new-app": "npm run dev --workspace=vendor-apps/new-app",
   "build:new-app": "npm run build --workspace=vendor-apps/new-app"
   ```

5. Update port documentation in this README and `package.json`

## Technologies Used

- **React 18** - Frontend framework
- **TypeScript** - Type safety  
- **Vite** - Build tool and development server
- **Tailwind CSS** - Styling framework
- **npm Workspaces** - Monorepo management

## 🚨 Troubleshooting

### Port Conflicts
If you encounter port conflicts:
1. Check which processes are using ports: `lsof -i :5173`
2. Ensure each app has a unique port in its `vite.config.ts`
3. Update the port assignments in this README

### Development Server Issues
If the dev server doesn't start:
1. Ensure dependencies are installed: `npm run install:all`
2. Check that backend services are running on ports 8000 and 8001
3. Verify environment variables are properly configured

### Network Access
For mobile/external device access:
- Applications are configured with `host: true` in Vite config
- Access via your machine's IP address (e.g., http://192.168.1.100:5173)