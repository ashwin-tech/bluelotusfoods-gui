import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface FormData {
  vendorName: string;
  countryOfOrigin: string;
}
import VendorQuoteForm from "../components/vendor-quote/VendorQuoteForm"; // Fix the import path

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

  useEffect(() => {
    let isMounted = true; // Add a flag to track if the component is still mounted

    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vendors/${vendorCode}`);
        const data = await response.json();
        if (isMounted) { // Only update state if the component is still mounted
          console.log("Fetched data:", data); // Debug log
          setFormData({
            vendorName: data.name,
            countryOfOrigin: data.country,
          });
          setNextQuoteId(data.nextquoteid); // Use nextquoteid from the response
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

  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <VendorQuoteForm
      initialVendorName={formData.vendorName} // Pass initialVendorName
      initialCountry={formData.countryOfOrigin} // Pass initialCountry
      nextQuoteId={nextQuoteId ?? undefined} // Pass nextQuoteId as undefined if null
    />
  );
}