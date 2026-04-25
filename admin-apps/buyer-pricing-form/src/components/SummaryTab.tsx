import React, { useState, useEffect } from 'react';
import PODialog from './PODialog';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}, ${monday.getFullYear()}`;
}

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
  fish_size_id?: number;
}

interface POInfo { po_id: number; po_number: string; status: string; }

interface SummaryTabProps {
  companies: Company[];
  apiBaseUrl: string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ companies, apiBaseUrl }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));

  const goToPrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const goToNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const goToCurrentWeek = () => setWeekStart(getMonday(new Date()));
  const handleWeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value + 'T00:00:00');
    if (!isNaN(d.getTime())) setWeekStart(getMonday(d));
  };
  const [expandedEstimateIds, setExpandedEstimateIds] = useState<Set<number>>(new Set());
  const [sendingEstimateId, setSendingEstimateId] = useState<number | null>(null);
  const [sendConfirm, setSendConfirm] = useState<{ id: number; number: string } | null>(null);
  const [notifyBuyer, setNotifyBuyer] = useState(true);
  const [poEstimate, setPoEstimate] = useState<Estimate | null>(null);
  const [poStatusByEstimate, setPoStatusByEstimate] = useState<Map<number, POInfo[]>>(new Map());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Collapsible sidebar
  const [companyPanelOpen, setCompanyPanelOpen] = useState(true);

  const checkEstimatePOStatus = async (estimateId: number) => {
    try {
      const resp = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/purchase-orders/by-estimate/${estimateId}`);
      const data = await resp.json();
      if (data.success && data.purchase_orders) {
        const poList: any[] = Array.isArray(data.purchase_orders)
          ? data.purchase_orders
          : Object.values(data.purchase_orders);
        const pos: POInfo[] = poList.map((po: any) => ({
          po_id: po.po_id,
          po_number: po.po_number,
          status: po.status,
        }));
        if (pos.length > 0) {
          setPoStatusByEstimate(prev => new Map(prev).set(estimateId, pos));
        }
      }
    } catch {
      // ignore
    }
  };

  const getEstimatePOAggregate = (estimateId: number): { label: string; className: string } | null => {
    const pos = poStatusByEstimate.get(estimateId);
    if (!pos || pos.length === 0) return null;
    const statuses = pos.map(p => p.status);
    if (statuses.every(s => s === 'fulfilled')) return { label: '✓ Fulfilled', className: 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200' };
    if (statuses.every(s => s === 'accepted' || s === 'fulfilled')) return { label: '✓ Accepted', className: 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' };
    if (statuses.every(s => s === 'cancelled' || s === 'rejected')) return { label: 'PO Inactive', className: 'bg-gray-200 text-gray-500 border border-gray-300' };
    if (statuses.some(s => s === 'accepted')) return { label: 'PO (partial)', className: 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200' };
    return { label: '✓ PO Sent', className: 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200' };
  };

  const fetchCompanyEstimates = async (companyId: number, ws: Date = weekStart) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/company/${companyId}?week_start=${formatDate(ws)}`);
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

  const handleSendEstimate = async () => {
    if (!sendConfirm) return;
    const { id: estimateId, number: estimateNumber } = sendConfirm;
    setSendConfirm(null);
    setSendingEstimateId(estimateId);
    try {
      const response = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/${estimateId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_buyer: notifyBuyer }),
      });
      const data = await response.json();
      if (data.success) {
        const msg = notifyBuyer && data.buyer_emails?.length
          ? `Estimate #${estimateNumber} sent. Buyer notified: ${data.buyer_emails.join(', ')}`
          : `Estimate #${estimateNumber} sent. Owner notified only.`;
        setToast({ type: 'success', message: msg });
        if (selectedCompanyId) fetchCompanyEstimates(selectedCompanyId);
      } else {
        setToast({ type: 'error', message: `Failed to send estimate: ${data.detail || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      setToast({ type: 'error', message: 'Failed to send estimate. Please try again.' });
    } finally {
      setSendingEstimateId(null);
      setNotifyBuyer(true);
    }
  };

  useEffect(() => {
    if (toast?.type === 'success') {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleCompanySelect = (companyId: number) => {
    setSelectedCompanyId(companyId);
    fetchCompanyEstimates(companyId, weekStart);
  };

  // Re-fetch when week changes if a company is already selected
  useEffect(() => {
    if (selectedCompanyId) fetchCompanyEstimates(selectedCompanyId, weekStart);
  }, [weekStart]);

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

  type EstimateCategory = 'pending' | 'sent' | 'po_created' | 'po_accepted' | 'po_rejected';

  const getEstimateCategory = (estimate: Estimate): EstimateCategory => {
    if (estimate.status === 'draft') return 'pending';
    const pos = poStatusByEstimate.get(estimate.id);
    if (!pos || pos.length === 0) return 'sent';
    const statuses = pos.map(p => p.status);
    if (statuses.every(s => s === 'cancelled' || s === 'rejected')) return 'po_rejected';
    if (statuses.some(s => s === 'accepted' || s === 'fulfilled')) return 'po_accepted';
    return 'po_created';
  };

  const CATEGORIES: { key: EstimateCategory; label: string; headerStyle: React.CSSProperties; dotColor: string }[] = [
    { key: 'pending',     label: 'Pending Estimate',       headerStyle: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }, dotColor: '#9ca3af' },
    { key: 'sent',        label: 'Sent Estimate',           headerStyle: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }, dotColor: '#3b82f6' },
    { key: 'po_created',  label: 'Created PO',              headerStyle: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }, dotColor: '#10b981' },
    { key: 'po_accepted', label: 'Accepted PO',             headerStyle: { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' }, dotColor: '#22c55e' },
    { key: 'po_rejected', label: 'Rejected / Cancelled PO', headerStyle: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }, dotColor: '#ef4444' },
  ];

  const groupEstimateItems = (items: EstimateItem[]) => {
    // Step 1: bucket by species/cut/grade/size/vendor/port
    const byPortKey: Record<string, EstimateItem[]> = {};
    items?.forEach(item => {
      const k = `${item.fish_species_id}|${item.cut_id}|${item.grade_id}|${item.fish_size || ''}|${item.vendor_id}|${item.port_code}`;
      if (!byPortKey[k]) byPortKey[k] = [];
      byPortKey[k].push(item);
    });

    // Step 2: merge ports whose tier prices are identical into one display group
    const itemsByGroup: Record<string, { items: EstimateItem[]; ports: string[] }> = {};
    Object.entries(byPortKey).forEach(([, portItems]) => {
      const first = portItems[0];
      const speciesKey = `${first.fish_species_id}|${first.cut_id}|${first.grade_id}|${first.fish_size || ''}|${first.vendor_id}`;
      const priceFP = portItems
        .map(i => `${i.fish_price.toFixed(4)}|${i.margin.toFixed(4)}|${i.freight_price.toFixed(4)}|${i.tariff_percent.toFixed(4)}|${i.clearing_charges.toFixed(4)}|${i.total_price.toFixed(4)}`)
        .sort()
        .join('~');
      const groupKey = `${speciesKey}~~${priceFP}`;
      if (!itemsByGroup[groupKey]) {
        itemsByGroup[groupKey] = { items: portItems, ports: [first.port_code] };
      } else {
        itemsByGroup[groupKey].ports.push(first.port_code);
      }
    });

    // Sort ports within each group alphabetically
    Object.values(itemsByGroup).forEach(g => g.ports.sort());

    // Sort: multi-port groups first, then by port string, then fish → cut → grade → size
    const groupKeys = Object.keys(itemsByGroup).sort((a, b) => {
      const ga = itemsByGroup[a];
      const gb = itemsByGroup[b];
      const ia = ga.items[0];
      const ib = gb.items[0];
      // Multi-port groups before single-port
      const multiDiff = gb.ports.length - ga.ports.length;
      if (multiDiff !== 0) return multiDiff;
      // Within same port count, sort by port string so same-port groups are together
      const portCompare = ga.ports.join(',').localeCompare(gb.ports.join(','));
      if (portCompare !== 0) return portCompare;
      return (ia?.common_name || '').localeCompare(ib?.common_name || '')
          || (ia?.cut_name || '').localeCompare(ib?.cut_name || '')
          || (ia?.grade_name || '').localeCompare(ib?.grade_name || '')
          || (ia?.fish_size || '').localeCompare(ib?.fish_size || '')
          || (ia?.total_price || 0) - (ib?.total_price || 0);
    });

    return { itemsByGroup, groupKeys };
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {/* Company List (collapsible) */}
      <div style={{
        width: companyPanelOpen ? '220px' : '0px',
        minWidth: companyPanelOpen ? '220px' : '0px',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        flexShrink: 0,
      }}>
        <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
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
      </div>

      {/* Estimates Display */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Toast */}
        {toast && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderRadius: '8px', marginBottom: '10px',
            backgroundColor: toast.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '13px', fontWeight: 500,
          }}>
            <span>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</span>
            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'inherit', marginLeft: '12px' }}>×</button>
          </div>
        )}

        {/* Toggle button + Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCompanyPanelOpen(prev => !prev)}
            title={companyPanelOpen ? 'Hide company list' : 'Show company list'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {companyPanelOpen
                ? <><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></>
                : <><path d="M13 7l5 5-5 5"/><path d="M6 7l5 5-5 5"/></>
              }
            </svg>
            {companyPanelOpen ? 'Hide Companies' : `Companies (${companies.length})`}
          </button>

          {/* Week navigation */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <button onClick={goToPrevWeek} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600" title="Previous week">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{formatWeekLabel(weekStart)}</span>
              <input
                type="date"
                value={formatDate(weekStart)}
                onChange={handleWeekInput}
                style={{ minWidth: '130px', boxSizing: 'border-box' }}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <button onClick={goToNextWeek} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-600" title="Next week">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={goToCurrentWeek} className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">This Week</button>
          </div>
        </div>

        {!selectedCompanyId && (
          <div className="text-center text-gray-500 py-12">
            {companyPanelOpen ? 'Select a company to view recent estimates' : 'Click "Companies" to show company list'}
          </div>
        )}

        {selectedCompanyId && loading && (
          <div className="text-center text-gray-500 py-12">
            Loading estimates...
          </div>
        )}

        {selectedCompanyId && !loading && estimates.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No estimates found for this week
          </div>
        )}

        {selectedCompanyId && !loading && estimates.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              Estimates for {companies.find(c => c.company_id === selectedCompanyId)?.company_name} — {formatWeekLabel(weekStart)}
            </h3>

            {CATEGORIES.map(({ key, label, headerStyle, dotColor }) => {
              const categoryEstimates = estimates.filter(e => getEstimateCategory(e) === key);
              if (categoryEstimates.length === 0) return null;
              return (
                <div key={key} className="space-y-3 mb-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid', ...headerStyle }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: 4, opacity: 0.7 }}>({categoryEstimates.length})</span>
                  </div>
                  <div className="space-y-3 pl-3">
                    {categoryEstimates.map((estimate) => {
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
                            setNotifyBuyer(true);
                            setSendConfirm({ id: estimate.id, number: estimate.estimate_number });
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
                        {(() => {
                          const agg = getEstimatePOAggregate(estimate.id);
                          return (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCreatePO(estimate); }}
                              disabled={estimate.status !== 'sent'}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                estimate.status !== 'sent'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : agg
                                  ? agg.className
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {agg ? agg.label : 'PO'}
                            </button>
                          );
                        })()}
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
                          const { items: groupItems, ports: groupPorts } = itemsByGroup[groupKey];
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
                                <span className="text-sm text-gray-600 font-medium">
                                  Port: {groupPorts.join(', ')}
                                  {firstItem.margin > 0 && (
                                    <span className="ml-2 font-semibold" style={{ color: '#16a34a' }}>+${firstItem.margin.toFixed(2)}/lb</span>
                                  )}
                                </span>
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
                                      // Tariff on fish price only; margin added after
                                      const tariffAmount = ((item.fish_price || 0) * (item.tariff_percent || 0)) / 100;
                                      const fishPriceTotal = (item.fish_price || 0) + tariffAmount + (item.margin || 0);
                                      
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
              );
            })}
          </div>
        )}
      </div>

      {/* Send confirm modal */}
      {sendConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSendConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">Send Estimate #{sendConfirm.number}</h3>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyBuyer}
                onChange={(e) => setNotifyBuyer(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Send email to buyer</span>
            </label>
            <p className="text-xs text-gray-400">Owner notification is always sent.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setSendConfirm(null)}
                className="px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEstimate}
                className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Dialog */}
      {poEstimate && (
        <PODialog
          estimate={poEstimate}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setPoEstimate(null)}
          onPOSent={() => {
            checkEstimatePOStatus(poEstimate.id);
          }}
        />
      )}
    </div>
  );
};

export default SummaryTab;
