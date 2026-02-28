import { useState, useEffect } from 'react';

interface ClearingCharges {
  id?: number;
  custom_entry_fee: number;
  airline_service_fee: number;
  prior_notice_pre_fda: number;
  food_and_drug_service: number;
  simp_filing: number;
  tariff_filing: number;
  customs_tax_per_10000: number;
  customs_tax_per_20000: number;
  customs_tax_per_30000: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

interface Props {
  apiBaseUrl: string;
}

const ClearingPricingForm = ({ apiBaseUrl }: Props) => {
  const [charges, setCharges] = useState<ClearingCharges>({
    custom_entry_fee: 0,
    airline_service_fee: 0,
    prior_notice_pre_fda: 0,
    food_and_drug_service: 0,
    simp_filing: 0,
    tariff_filing: 0,
    customs_tax_per_10000: 0,
    customs_tax_per_20000: 0,
    customs_tax_per_30000: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchActiveCharges();
  }, []);

  const fetchActiveCharges = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/clearing-charges/active`);
      if (response.ok) {
        const data = await response.json();
        setCharges({
          id: data.id,
          custom_entry_fee: parseFloat(data.custom_entry_fee),
          airline_service_fee: parseFloat(data.airline_service_fee),
          prior_notice_pre_fda: parseFloat(data.prior_notice_pre_fda),
          food_and_drug_service: parseFloat(data.food_and_drug_service),
          simp_filing: parseFloat(data.simp_filing),
          tariff_filing: parseFloat(data.tariff_filing),
          customs_tax_per_10000: parseFloat(data.customs_tax_per_10000),
          customs_tax_per_20000: parseFloat(data.customs_tax_per_20000),
          customs_tax_per_30000: parseFloat(data.customs_tax_per_30000),
          valid_from: data.valid_from,
          valid_to: data.valid_to,
          is_active: data.is_active,
        });
        if (data.valid_from) {
          setLastUpdated(new Date(data.valid_from).toLocaleString());
        }
      }
    } catch (error) {
      console.error('Error fetching clearing charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ClearingCharges, value: string) => {
    setCharges(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/clearing-charges/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_entry_fee: charges.custom_entry_fee,
          airline_service_fee: charges.airline_service_fee,
          prior_notice_pre_fda: charges.prior_notice_pre_fda,
          food_and_drug_service: charges.food_and_drug_service,
          simp_filing: charges.simp_filing,
          tariff_filing: charges.tariff_filing,
          customs_tax_per_10000: charges.customs_tax_per_10000,
          customs_tax_per_20000: charges.customs_tax_per_20000,
          customs_tax_per_30000: charges.customs_tax_per_30000,
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Clearing charges saved successfully!');
        setLastUpdated(new Date(data.valid_from).toLocaleString());
        // Refresh to get the new active record
        fetchActiveCharges();
      } else {
        alert('Error saving clearing charges');
      }
    } catch (error) {
      console.error('Error saving clearing charges:', error);
      alert('Error saving clearing charges');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading clearing charges...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Clearing Charges</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        <div className="bg-white shadow-md rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Price ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Custom Entry Fee</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.custom_entry_fee}
                    onChange={(e) => handleChange('custom_entry_fee', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Airline Service Fee</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.airline_service_fee}
                    onChange={(e) => handleChange('airline_service_fee', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Prior Notice PRE FDA</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.prior_notice_pre_fda}
                    onChange={(e) => handleChange('prior_notice_pre_fda', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Food and Drug Service</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.food_and_drug_service}
                    onChange={(e) => handleChange('food_and_drug_service', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50 bg-yellow-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  SIMP Filing
                  <span className="ml-2 text-xs text-gray-500">(Only applicable to certain fish species)</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.simp_filing}
                    onChange={(e) => handleChange('simp_filing', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Tariff Filing</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.tariff_filing}
                    onChange={(e) => handleChange('tariff_filing', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Customs tax per $10,000</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.customs_tax_per_10000}
                    onChange={(e) => handleChange('customs_tax_per_10000', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Customs tax per $20,000</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.customs_tax_per_20000}
                    onChange={(e) => handleChange('customs_tax_per_20000', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">Customs tax per $30,000</td>
                <td className="px-6 py-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={charges.customs_tax_per_30000}
                    onChange={(e) => handleChange('customs_tax_per_30000', e.target.value)}
                    className="w-32 px-3 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            {saving ? 'Saving...' : 'Save Clearing Charges'}
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> When you save, the current charges will be archived with a valid_to timestamp, 
            and your new values will become active immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClearingPricingForm;
