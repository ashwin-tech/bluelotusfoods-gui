import { useState, useEffect } from 'react';
import './App.css';
import BuyerPricingForm from './components/BuyerPricingForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BuyerPricingForm apiBaseUrl={API_BASE_URL} />
    </div>
  );
}

export default App;
