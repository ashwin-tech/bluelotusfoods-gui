# Buyer Pricing Form

Admin interface for creating buyer estimates based on vendor quotes.

## Features

- Select multiple buyers/customers
- Filter vendor quotes by port and date range
- View buyer contact information
- Generate estimates from vendor quotes
- Real-time quote search

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
Create `.env` file with:
```
VITE_API_BASE_URL=http://localhost:8000
```

3. Run development server:
```bash
npm run dev
```

The app will be available at http://localhost:5174

## API Endpoints Used

- `GET /buyer-pricing/buyers` - Get all buyers
- `GET /buyer-pricing/buyers/{id}` - Get buyer with ports
- `GET /buyer-pricing/company/{id}/buyers` - Get company buyers
- `POST /buyer-pricing/estimates/search` - Search vendor quotes
- `GET /vendors` - Get all vendors
- `GET /dictionary?category=DESTINATION` - Get ports

## Build

```bash
npm run build
```
