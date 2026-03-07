import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface FormData {
  vendorName: string;
  countryOfOrigin: string;
}
import VendorQuoteForm from "../components/vendor-quote/VendorQuoteForm";
import VendorPOTab from "../components/vendor-po/VendorPOTab";

interface Vendor {
  id: number;
  code: string;
  name: string;
  country: string;
  nextQuoteId: number;
}

export default function FetchVendor() {
  const { vendorCode } = useParams<{ vendorCode: string }>();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [nextQuoteId, setNextQuoteId] = useState<number | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true; // Add a flag to track if the component is still mounted

    const fetchData = async () => {
      try {
        console.log("🔍 VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vendors/${vendorCode}`);
        const data = await response.json();
        if (isMounted) { // Only update state if the component is still mounted
          console.log("Fetched data:", data); // Debug log
          setFormData({
            vendorName: data.name,
            countryOfOrigin: data.country,
          });
          setNextQuoteId(data.nextquoteid); // Use nextquoteid from the response
          setVendorId(data.id); // Store the vendor ID
        }
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      }
    };

    fetchData();

    return () => {
      isMounted = false; // Cleanup function to set the flag to false
    };
  }, [vendorCode]);

  const [activeTab, setActiveTab] = useState<'quote' | 'po'>('quote');

  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen p-4 bg-gray-50">
      <div className="w-full bg-white shadow-md rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b-2 border-gray-200 px-4 pt-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('quote')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'quote'
                  ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Quote
            </button>
            <button
              onClick={() => setActiveTab('po')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'po'
                  ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Purchase Orders
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'quote' && (
          <VendorQuoteForm
            initialVendorName={formData.vendorName}
            initialCountry={formData.countryOfOrigin}
            nextQuoteId={nextQuoteId ?? undefined}
          />
        )}

        {activeTab === 'po' && vendorId && (
          <VendorPOTab
            vendorId={vendorId}
            vendorName={formData.vendorName}
          />
        )}
      </div>
    </div>
  );
}