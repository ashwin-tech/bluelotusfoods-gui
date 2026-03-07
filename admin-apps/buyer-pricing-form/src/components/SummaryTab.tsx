import React, { useState } from 'react';
import PODialog from './PODialog';

interface Company {
  company_id: number;
  company_name: string;
}

interface Estimate {
  id: number;
  estimate_number: string;
  estimate_date: string;
  delivery_date_from?: string;
  delivery_date_to?: string;
  status: string;
  buyer_name: string;
  all_buyers?: string;
  item_count: number;
  items?: EstimateItem[];
}

interface EstimateItem {
  vendor_id: number;
  quote_id?: number;
  fish_species_id: number;
  cut_id: number;
  grade_id: number;
  port_code: string;
  common_name: string;
  scientific_name: string;
  cut_name: string;
  grade_name: string;
  vendor_name: string;
  offer_quantity: number;
  fish_price: number;
  margin: number;
  freight_price: number;
  tariff_percent: number;
  clearing_charges: number;
  total_price: number;
  fish_size?: string;
}

interface SummaryTabProps {
  companies: Company[];
  apiBaseUrl: string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ companies, apiBaseUrl }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEstimateIds, setExpandedEstimateIds] = useState<Set<number>>(new Set());
  const [sendingEstimateId, setSendingEstimateId] = useState<number | null>(null);
  const [poEstimate, setPoEstimate] = useState<Estimate | null>(null);
  // Track estimates that have at least one PO sent (set of estimate IDs)
  const [poSentEstimateIds, setPoSentEstimateIds] = useState<Set<number>>(new Set());

  const checkEstimatePOStatus = async (estimateId: number) => {
    try {
      const resp = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/purchase-orders/by-estimate/${estimateId}`);
      const data = await resp.json();
      if (data.success && data.purchase_orders && Object.keys(data.purchase_orders).length > 0) {
        setPoSentEstimateIds((prev) => new Set([...prev, estimateId]));
      }
    } catch {
      // ignore
    }
  };

  const fetchCompanyEstimates = async (companyId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/company/${companyId}?limit=5`);
      const data = await response.json();
      if (data.success) {
        const ests = data.estimates || [];
        setEstimates(ests);
        // Check PO status for all sent estimates
        ests.forEach((est: Estimate) => {
          if (est.status === 'sent') {
            checkEstimatePOStatus(est.id);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching company estimates:', error);
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEstimate = async (estimateId: number, estimateNumber: string) => {
    if (!confirm(`Send estimate #${estimateNumber}? This will email the estimate PDF to the buyer(s).`)) {
      return;
    }

    setSendingEstimateId(estimateId);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/${estimateId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Estimate #${data.estimate_number} sent successfully to ${data.buyer_emails?.join(', ')}`);
        // Refresh the estimates to show updated status
        if (selectedCompanyId) {
          fetchCompanyEstimates(selectedCompanyId);
        }
      } else {
        alert(`Failed to send estimate: ${data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      alert('Failed to send estimate. Please try again.');
    } finally {
      setSendingEstimateId(null);
    }
  };

  const handleCompanySelect = (companyId: number) => {
    setSelectedCompanyId(companyId);
    fetchCompanyEstimates(companyId);
  };

  const handleCreatePO = (estimate: Estimate) => {
    setPoEstimate(estimate);
  };

  const toggleEstimateExpansion = (estimateId: number) => {
    const newExpanded = new Set(expandedEstimateIds);
    if (newExpanded.has(estimateId)) {
      newExpanded.delete(estimateId);
    } else {
      newExpanded.add(estimateId);
    }
    setExpandedEstimateIds(newExpanded);
  };

  const groupEstimateItems = (items: EstimateItem[]) => {
    const itemsByGroup: Record<string, EstimateItem[]> = {};
    
    items?.forEach((item) => {
      const groupKey = `${item.fish_species_id}-${item.cut_id}-${item.grade_id}-${item.fish_size || 'no-size'}-${item.port_code}`;
      if (!itemsByGroup[groupKey]) {
        itemsByGroup[groupKey] = [];
      }
      itemsByGroup[groupKey].push(item);
    });

    // Sort groups alphabetically by fish name, then cut, grade, size, port
    const groupKeys = Object.keys(itemsByGroup).sort((a, b) => {
      const itemsA = itemsByGroup[a][0];
      const itemsB = itemsByGroup[b][0];
      const fishCompare = (itemsA?.common_name || '').localeCompare(itemsB?.common_name || '');
      if (fishCompare !== 0) return fishCompare;
      const cutCompare = (itemsA?.cut_name || '').localeCompare(itemsB?.cut_name || '');
      if (cutCompare !== 0) return cutCompare;
      const gradeCompare = (itemsA?.grade_name || '').localeCompare(itemsB?.grade_name || '');
      if (gradeCompare !== 0) return gradeCompare;
      const sizeCompare = (itemsA?.fish_size || '').localeCompare(itemsB?.fish_size || '');
      if (sizeCompare !== 0) return sizeCompare;
      return (itemsA?.port_code || '').localeCompare(itemsB?.port_code || '');
    });

    return { itemsByGroup, groupKeys };
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Company List */}
      <div className="col-span-3">
        <h3 className="text-lg font-semibold mb-4">Companies</h3>
        <div className="space-y-2">
          {companies.map((company) => (
            <button
              key={company.company_id}
              onClick={() => handleCompanySelect(company.company_id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedCompanyId === company.company_id
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {company.company_name}
            </button>
          ))}
        </div>
      </div>

      {/* Estimates Display */}
      <div className="col-span-9">
        {!selectedCompanyId && (
          <div className="text-center text-gray-500 py-12">
            Select a company to view recent estimates
          </div>
        )}

        {selectedCompanyId && loading && (
          <div className="text-center text-gray-500 py-12">
            Loading estimates...
          </div>
        )}

        {selectedCompanyId && !loading && estimates.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No estimates found for this company
          </div>
        )}

        {selectedCompanyId && !loading && estimates.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              Recent Estimates for {companies.find(c => c.company_id === selectedCompanyId)?.company_name}
            </h3>
            
            <div className="space-y-4">
              {estimates.map((estimate) => {
                const isExpanded = expandedEstimateIds.has(estimate.id);
                const { itemsByGroup, groupKeys } = groupEstimateItems(estimate.items || []);
                const groupCount = groupKeys.length;
                
                return (
                  <div key={estimate.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    {/* Estimate Header */}
                    <div className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-4 cursor-pointer"
                        onClick={() => toggleEstimateExpansion(estimate.id)}
                      >
                        <span className="text-lg font-semibold text-blue-600">
                          #{estimate.estimate_number}
                        </span>
                        <span className="text-sm text-gray-500">
                          {estimate.estimate_date ? new Date(estimate.estimate_date).toLocaleDateString() : '-'}
                        </span>
                        {estimate.delivery_date_from && estimate.delivery_date_to && (
                          <span className="text-sm text-gray-500">
                            Delivery: {new Date(estimate.delivery_date_from).toLocaleDateString()} - {new Date(estimate.delivery_date_to).toLocaleDateString()}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          estimate.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                          estimate.status === 'sent' ? 'bg-green-200 text-green-700' :
                          estimate.status === 'accepted' ? 'bg-green-200 text-green-700' :
                          estimate.status === 'rejected' ? 'bg-red-200 text-red-700' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {estimate.status || 'draft'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {groupCount} {groupCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 font-medium">
                          {estimate.all_buyers || estimate.buyer_name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendEstimate(estimate.id, estimate.estimate_number);
                          }}
                          disabled={sendingEstimateId === estimate.id || estimate.status !== 'draft'}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            estimate.status !== 'draft'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : sendingEstimateId === estimate.id
                              ? 'bg-blue-400 text-white cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {sendingEstimateId === estimate.id ? 'Sending...' : 'Send'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreatePO(estimate);
                          }}
                          disabled={estimate.status !== 'sent'}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            estimate.status !== 'sent'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : poSentEstimateIds.has(estimate.id)
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {poSentEstimateIds.has(estimate.id) ? '✓ PO Sent' : 'PO'}
                        </button>
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEstimateExpansion(estimate.id);
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Items - Grouped by Fish, Cut, Grade, Port */}
                    {isExpanded && estimate.items && estimate.items.length > 0 && (
                      <div className="p-4 space-y-6">
                        {groupKeys.map((groupKey) => {
                          const groupItems = itemsByGroup[groupKey];
                          const firstItem = groupItems[0];
                          
                          // Format fish_size with "lbs+" suffix
                          const formatSize = (size?: string) => {
                            if (!size) return '';
                            // If size ends with a number, add "lbs+"
                            // If size already has a range (contains "-"), add "lbs" to both numbers
                            if (size.includes('-')) {
                              const parts = size.split('-');
                              return `${parts[0]}lbs+ - ${parts[1]}lbs+`;
                            } else if (size.includes('+')) {
                              return `${size.replace('+', '')}lbs+`;
                            } else {
                              return `${size}lbs+`;
                            }
                          };
                          
                          const sizeLabel = firstItem.fish_size ? `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Size: ${formatSize(firstItem.fish_size)}` : '';
                          const groupLabel = `${firstItem.common_name} (${firstItem.scientific_name})\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Cut: ${firstItem.cut_name}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Grade: ${firstItem.grade_name}${sizeLabel}`;
                          
                          return (
                            <div key={groupKey} className="border-l-4 border-blue-400 pl-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-md font-semibold text-gray-700">{groupLabel}</h4>
                                <span className="text-sm text-gray-600 font-medium">Port: {firstItem.port_code}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Vendor</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Weight (lbs)</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Fish Price (incl. Tariff)</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Freight</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Clearing</th>
                                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Total Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {groupItems.map((item, idx) => {
                                      // Calculate Markup Fish Price + Tariff
                                      const markupFishPrice = (item.fish_price || 0) + (item.margin || 0);
                                      const tariffAmount = (markupFishPrice * (item.tariff_percent || 0)) / 100;
                                      const fishPriceTotal = markupFishPrice + tariffAmount;
                                      
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 text-gray-900">{item.vendor_name}</td>
                                          <td className="px-3 py-2 text-right text-gray-900 font-medium">
                                            {item.offer_quantity?.toLocaleString() || '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right text-gray-900">${fishPriceTotal.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-right text-gray-700">${item.freight_price?.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-right text-gray-700">${item.clearing_charges?.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-right font-semibold text-gray-900">${item.total_price?.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PO Dialog */}
      {poEstimate && (
        <PODialog
          estimate={poEstimate}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setPoEstimate(null)}
          onPOSent={() => {
            // Mark this estimate as having POs
            setPoSentEstimateIds((prev) => new Set([...prev, poEstimate.id]));
          }}
        />
      )}
    </div>
  );
};

export default SummaryTab;
