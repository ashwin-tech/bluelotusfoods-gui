export interface Destination {
  id: string;
  destination: string;
  airfreightPerKg: string;
  arrivalDate: string;
  minWeight: string;
  maxWeight: string;
  selected: boolean;
}

export interface Size {
  id: string;
  fishType: string;
  cut: string;
  grade: string;
  weightRange: string;
  pricePerKg: string;
  quantity: string;
  selected: boolean;
}

export interface FormData {
  vendorName: string;
  quoteValidTill: string;
  fishType: string;
  countryOfOrigin: string;
  destinations: Destination[];
  sizes: Size[];
  notes: string;
  priceNegotiable: boolean;
  exclusiveOffer: boolean;
}
