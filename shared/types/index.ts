// Shared TypeScript definitions across all apps

export interface Vendor {
  id: number;
  code: string;
  name: string;
  country: string;
  nextQuoteId: number;
}

export interface Product {
  fish_common_name: string;
  weight_range: string;
  cut_name: string;
  grade_name: string;
  price_per_kg: number;
  quantity: number;
}

export interface Destination {
  destination: string;
  airfreight_per_kg: number;
  arrival_date: string;
  min_weight: number;
  max_weight: number;
}

export interface Quote {
  id: number;
  vendor_name: string;
  quote_valid_till: string;
  notes: string;
  price_negotiable: boolean;
  exclusive_offer: boolean;
  destinations: Destination[];
  products: Product[];
}

export interface FormData {
  vendorName: string;
  countryOfOrigin: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Common dropdown option type
export interface DropdownOption {
  value: string;
  label: string;
}