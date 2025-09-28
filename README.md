# Blue Lotus Foods - GUI Applications

This repository contains the frontend applications for Blue Lotus Foods.

## Projects

### vendor-quote-api
React + TypeScript application for managing vendor quotes and pricing.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
cd vendor-quote-api
npm install
```

### Development

```bash
npm run dev
```

The application will be available at:
- Local: http://localhost:5173
- Network: http://[your-ip]:5173

### Building for Production

```bash
npm run build
```

## Project Structure

```
bluelotusfoods-gui/
├── vendor-quote-api/          # Vendor quote management frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── common/           # Shared utilities and components
│   │   ├── api/              # API integration
│   │   └── utils/            # Helper functions
│   ├── public/               # Static assets
│   └── package.json          # Dependencies and scripts
└── README.md
```

## Technologies Used

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and development server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling framework

## Configuration

The application uses environment variables for configuration:

- `VITE_API_BASE_URL` - Base URL for API calls

## Contributing

1. Make changes in appropriate feature branches
2. Test thoroughly in development environment
3. Submit pull requests for review