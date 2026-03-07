import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface FormData {
  vendorName: string;
  countryOfOrigin: string;
}
import VendorQuoteForm from "../components/vendor-quote/VendorQuoteForm";
import VendorPOTab from "../components/vendor-po/VendorPOTab";
// Resolve logo with import.meta.url so Vite/Rollup produces a proper URL in production
const logoSrc = new URL('../Logo/BLF-Logo.png', import.meta.url).href;

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
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#f1f5f9',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
      }}>
        <img src={logoSrc} alt="Blue Lotus Foods" style={{ height: '48px', opacity: 0.8 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ color: '#0A3D5C', fontSize: '14px', fontWeight: 500 }}>Loading vendor data…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* ── Branded Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0A3D5C 0%, #0d4f75 50%, #0A3D5C 100%)',
        padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        position: 'sticky', top: 0, zIndex: 40,
        height: '60px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoSrc}
            alt="Blue Lotus Foods"
            style={{ height: '38px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700, letterSpacing: '0.3px', lineHeight: 1.2 }}>
              Blue Lotus Foods
            </div>
            <div style={{ color: '#93c5fd', fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px' }}>
              VENDOR APPLICATION
            </div>
          </div>
        </div>

        {/* Center — Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['quote', 'po'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.6)',
                backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                letterSpacing: '0.2px',
              }}
            >
              {tab === 'quote' ? '📝 Quote' : '📦 Purchase Orders'}
            </button>
          ))}
        </div>

        {formData && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px',
            padding: '6px 14px',
          }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, lineHeight: 1.2 }}>
              {formData.vendorName}
            </div>
            <div style={{ color: '#93c5fd', fontSize: '10px' }}>
              {formData.countryOfOrigin}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 12px' }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
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

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center', padding: '16px 12px',
        fontSize: '12px', color: '#94a3b8',
      }}>
        © Blue Lotus Foods LLC. All rights reserved.
      </footer>
    </div>
  );
}