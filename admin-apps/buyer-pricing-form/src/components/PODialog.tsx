import React, { useEffect, useState } from 'react';

interface EstimateItem {
  vendor_id: number;
  quote_id?: number;
  vendor_name: string;
  common_name: string;
  scientific_name?: string;
  cut_name: string;
  grade_name: string;
  fish_size?: string;
  port_code: string;
  offer_quantity: number;
  fish_price: number;
  margin: number;
  freight_price: number;
  tariff_percent: number;
  clearing_charges: number;
  total_price: number;
}

interface Estimate {
  id: number;
  estimate_number: string;
  estimate_date: string;
  delivery_date_from?: string;
  delivery_date_to?: string;
  status: string;
  items?: EstimateItem[];
}

interface QuoteProduct {
  fish_type: string;
  cut_name: string;
  grade_name: string;
  weight_range: number | null;
  price_per_kg: number;
  quantity: number;
}

interface QuoteDestination {
  destination: string;
  destination_code: string;
  airfreight_per_kg: number;
  arrival_date: string;
  min_weight: number;
  max_weight: number;
}

interface VendorQuote {
  quote_id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  vendor_email: string;
  country_of_origin: string;
  quote_valid_till: string;
  notes: string;
  price_negotiable: boolean;
  exclusive_offer: boolean;
  quote_date: string;
  products: QuoteProduct[];
  destinations: QuoteDestination[];
}

interface PODialogProps {
  estimate: Estimate;
  apiBaseUrl: string;
  onClose: () => void;
  onPOSent?: () => void;
}

interface SentPOItem {
  fish_name: string;
  cut_name: string;
  grade_name: string;
  fish_size: string | null;
  port_code: string;
  order_weight_lbs: number;
}

interface SentPO {
  po_id: number;
  po_number: string;
  status: string;
  vendor_id: number;
  items: SentPOItem[];
}

const PO_STATUS_BADGE: Record<string, string> = {
  sent:      'bg-blue-100 text-blue-700 border-blue-300',
  accepted:  'bg-green-100 text-green-700 border-green-300',
  rejected:  'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
  fulfilled: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const PO_STATUS_LABEL: Record<string, string> = {
  sent:      'Received',
  accepted:  'Accepted',
  rejected:  'Rejected',
  cancelled: 'Cancelled',
  fulfilled: 'Fulfilled',
};

const PO_TOGGLE_CSS_ID = 'po-dialog-toggle-animations';
if (typeof document !== 'undefined' && !document.getElementById(PO_TOGGLE_CSS_ID)) {
  const s = document.createElement('style');
  s.id = PO_TOGGLE_CSS_ID;
  s.textContent = `.po-toggle-track { transition: background-color 0.2s; } .po-toggle-thumb { transition: transform 0.2s; }`;
  document.head.appendChild(s);
}

interface VendorGroup {
  vendor_id: number;
  vendor_name: string;
  quote_id: number | null;
  estimateItems: EstimateItem[];
  vendorQuote: VendorQuote | null;
}

// A single PO line = one estimate product+port combination, enriched with vendor quote data
interface POLine {
  fish_name: string;
  cut_name: string;
  grade_name: string;
  fish_size: string;
  port_code: string;
  destination_name: string;
  price_per_kg: number;
  airfreight_per_kg: number;
  arrival_date: string;
}

// Editable weight per PO line, keyed by "vendorId-lineIndex"
type OrderWeights = Record<string, string>;

const PODialog: React.FC<PODialogProps> = ({ estimate, apiBaseUrl, onClose, onPOSent }) => {
  const [vendorGroups, setVendorGroups] = useState<VendorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingVendorId, setSendingVendorId] = useState<number | null>(null);
  const [expandedVendors, setExpandedVendors] = useState<Set<number>>(new Set());
  const [orderWeights, setOrderWeights] = useState<OrderWeights>({});
  // Track which vendors already have POs (keyed by vendor_id)
  const [sentPOs, setSentPOs] = useState<Record<number, SentPO>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<SentPO | null>(null);
  // Timeline data per po_id
  const [poTimelines, setPoTimelines] = useState<Record<number, { created_at: string; accepted_at: string | null; fulfilled_at: string | null }>>({});
  // Editable delivery date range — defaults from estimate, or today+3 / today+5
  const defaultFrom = (() => {
    if (estimate.delivery_date_from) return estimate.delivery_date_from;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  })();
  const defaultTo = (() => {
    if (estimate.delivery_date_to) return estimate.delivery_date_to;
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  })();
  const [deliveryDateFrom, setDeliveryDateFrom] = useState<string>(defaultFrom);
  const [deliveryDateTo, setDeliveryDateTo] = useState<string>(defaultTo);

  useEffect(() => {
    fetchVendorQuotes();
  }, []);

  useEffect(() => {
    if (toast?.type === 'success') {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Pre-populate order weights from existing PO items when dialog reopens for a sent PO
  useEffect(() => {
    if (vendorGroups.length === 0) return;
    const initialWeights: OrderWeights = {};
    vendorGroups.forEach(group => {
      const po = sentPOs[group.vendor_id];
      if (!po?.items?.length) return;
      const poLines = buildPOLines(group);
      poLines.forEach((line, idx) => {
        const match = po.items.find(
          item =>
            item.fish_name === line.fish_name &&
            item.cut_name === line.cut_name &&
            item.grade_name === line.grade_name &&
            (item.fish_size || null) === (line.fish_size || null) &&
            item.port_code === line.port_code
        );
        if (match) {
          initialWeights[`${group.vendor_id}-${idx}`] = String(match.order_weight_lbs);
        }
      });
    });
    if (Object.keys(initialWeights).length > 0) {
      setOrderWeights(prev => ({ ...prev, ...initialWeights }));
    }
  }, [vendorGroups, sentPOs]);

  const fetchVendorQuotes = async () => {
    setLoading(true);

    // Group estimate items by vendor
    const grouped: Record<number, { vendor_id: number; vendor_name: string; quote_id: number | null; items: EstimateItem[] }> = {};
    (estimate.items || []).forEach((item) => {
      const vid = item.vendor_id;
      if (!grouped[vid]) {
        grouped[vid] = {
          vendor_id: vid,
          vendor_name: item.vendor_name,
          quote_id: item.quote_id || null,
          items: [],
        };
      }
      grouped[vid].items.push(item);
      // Use the first non-null quote_id found
      if (!grouped[vid].quote_id && item.quote_id) {
        grouped[vid].quote_id = item.quote_id;
      }
    });

    // Collect unique quote_ids
    const quoteIds = Object.values(grouped)
      .map((g) => g.quote_id)
      .filter((id): id is number => id !== null);

    let quotesMap: Record<number, VendorQuote> = {};

    if (quoteIds.length > 0) {
      try {
        const resp = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/vendor-quotes-lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote_ids: quoteIds }),
        });
        const data = await resp.json();
        if (data.success) {
          quotesMap = data.quotes || {};
        }
      } catch (err) {
        console.error('Error fetching vendor quotes:', err);
      }
    }

    // Build vendor groups
    const groups: VendorGroup[] = Object.values(grouped).map((g) => ({
      vendor_id: g.vendor_id,
      vendor_name: g.vendor_name,
      quote_id: g.quote_id,
      estimateItems: g.items,
      vendorQuote: g.quote_id && quotesMap[g.quote_id] ? quotesMap[g.quote_id] : null,
    }));

    // Sort by vendor name
    groups.sort((a, b) => a.vendor_name.localeCompare(b.vendor_name));

    setVendorGroups(groups);
    // Expand all vendors by default
    setExpandedVendors(new Set(groups.map((g) => g.vendor_id)));

    // Fetch existing POs for this estimate to know which vendors already have POs
    try {
      const poResp = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/purchase-orders/by-estimate/${estimate.id}`);
      const poData = await poResp.json();
      if (poData.success && poData.purchase_orders) {
        const existing: Record<number, SentPO> = {};
        for (const [vid, po] of Object.entries(poData.purchase_orders)) {
          const poObj = po as { id: number; po_number: string; status: string; vendor_id: number; items?: SentPOItem[] };
          existing[Number(vid)] = {
            po_id: poObj.id,
            po_number: poObj.po_number,
            status: poObj.status,
            vendor_id: poObj.vendor_id,
            items: (poObj as any).items || [],
          };
        }
        setSentPOs(existing);

        // Fetch timelines for all found POs in parallel
        const poList = Object.values(existing);
        if (poList.length > 0) {
          const timelineResults = await Promise.all(
            poList.map(po =>
              fetch(`${apiBaseUrl}/vendors/purchase-orders/${po.po_id}/timeline`)
                .then(r => r.json())
                .then(d => ({ po_id: po.po_id, data: d }))
                .catch(() => ({ po_id: po.po_id, data: null }))
            )
          );
          const timelines: Record<number, { created_at: string; accepted_at: string | null; fulfilled_at: string | null }> = {};
          for (const { po_id, data } of timelineResults) {
            if (data?.success) {
              timelines[po_id] = { created_at: data.created_at, accepted_at: data.accepted_at, fulfilled_at: data.fulfilled_at };
            }
          }
          setPoTimelines(timelines);
        }
      }
    } catch (err) {
      console.error('Error fetching existing POs:', err);
    }

    setLoading(false);
  };

  const toggleVendor = (vendorId: number) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const getWeightKey = (vendorId: number, lineIdx: number) => `${vendorId}-${lineIdx}`;

  const handleWeightChange = (vendorId: number, lineIdx: number, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setOrderWeights((prev) => ({
      ...prev,
      [getWeightKey(vendorId, lineIdx)]: value,
    }));
  };

  /**
   * Build PO lines from estimate items only (not all vendor quote products).
   * Deduplicate by fish+cut+grade+port so the 3 clearing tiers collapse into one PO line.
   * Pull original price/kg and available qty from the vendor quote product match.
   * Pull freight from the vendor quote destination match.
   */
  const buildPOLines = (group: VendorGroup): POLine[] => {
    const quote = group.vendorQuote;

    // Build lookups from vendor quote
    const destByCode: Record<string, QuoteDestination> = {};
    const productLookup: Record<string, QuoteProduct> = {};

    if (quote) {
      quote.destinations.forEach((d) => {
        destByCode[d.destination_code] = d;
      });
      // Key products by fish+cut+grade (lowercase for safe matching)
      quote.products.forEach((p) => {
        const key = `${p.fish_type.toLowerCase()}|${p.cut_name.toLowerCase()}|${p.grade_name.toLowerCase()}`;
        productLookup[key] = p;
      });
    }

    // Deduplicate estimate items by fish+cut+grade+port (collapse the 3 clearing tiers)
    const seen = new Set<string>();
    const lines: POLine[] = [];

    group.estimateItems.forEach((item) => {
      const dedupeKey = `${item.common_name}|${item.cut_name}|${item.grade_name}|${item.port_code}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      // Match to vendor quote product
      const matchKey = `${item.common_name.toLowerCase()}|${item.cut_name.toLowerCase()}|${item.grade_name.toLowerCase()}`;
      const matchedProduct = productLookup[matchKey] || null;

      // Match to vendor quote destination
      const dest = destByCode[item.port_code] || null;

      lines.push({
        fish_name: item.common_name,
        cut_name: item.cut_name,
        grade_name: item.grade_name,
        fish_size: item.fish_size || (matchedProduct?.weight_range != null ? String(matchedProduct.weight_range) : ''),
        port_code: item.port_code,
        destination_name: dest ? dest.destination : item.port_code,
        price_per_kg: matchedProduct ? Number(matchedProduct.price_per_kg) : 0,
        airfreight_per_kg: dest ? Number(dest.airfreight_per_kg) : 0,
        arrival_date: dest ? dest.arrival_date : '',
      });
    });

    // Sort by port_code then fish_name for grouped display
    lines.sort((a, b) => {
      const portCmp = a.port_code.localeCompare(b.port_code);
      if (portCmp !== 0) return portCmp;
      return a.fish_name.localeCompare(b.fish_name);
    });

    return lines;
  };

  const handleSendPO = async (group: VendorGroup) => {
    const quote = group.vendorQuote;
    if (!quote) {
      setToast({ type: 'error', message: 'No linked vendor quote found.' });
      return;
    }

    const poLines = buildPOLines(group);
    const linesWithWeights = poLines.map((line, idx) => {
      const key = getWeightKey(group.vendor_id, idx);
      const lbs = parseFloat(orderWeights[key] || '0');
      const kg = Math.round((lbs / 2.20462) / 100) * 100;
      return {
        fish_name: line.fish_name,
        cut_name: line.cut_name,
        grade_name: line.grade_name,
        fish_size: line.fish_size || null,
        port_code: line.port_code,
        destination_name: line.destination_name,
        price_per_kg: line.price_per_kg,
        airfreight_per_kg: line.airfreight_per_kg,
        total_per_kg: line.price_per_kg + line.airfreight_per_kg,
        order_weight_lbs: lbs,
        order_weight_kg: kg,
      };
    }).filter((l) => l.order_weight_lbs > 0);

    if (linesWithWeights.length === 0) {
      setToast({ type: 'error', message: 'Please enter weight (lbs) for at least one line.' });
      return;
    }

    if (!deliveryDateFrom || !deliveryDateTo) {
      setToast({ type: 'error', message: 'Please set both delivery From and To dates before sending the PO.' });
      return;
    }

    setSendingVendorId(group.vendor_id);
    try {
      const resp = await fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/purchase-orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: group.quote_id,
          estimate_id: estimate.id,
          vendor_id: group.vendor_id,
          items: linesWithWeights,
          delivery_date_from: deliveryDateFrom || null,
          delivery_date_to: deliveryDateTo || null,
        }),
      });
      const data = await resp.json();

      if (data.success) {
        setSentPOs((prev) => ({
          ...prev,
          [group.vendor_id]: { po_id: data.po_id, po_number: data.po_number, status: 'sent', vendor_id: group.vendor_id, items: [] },
        }));
        setToast({ type: 'success', message: `${data.po_number} sent — ${data.item_count} item(s)` });
        onPOSent?.();
      } else {
        if (data.po_number && data.po_id) {
          setSentPOs((prev) => ({
            ...prev,
            [group.vendor_id]: { po_id: data.po_id, po_number: data.po_number, status: 'sent', vendor_id: group.vendor_id, items: [] },
          }));
        }
        setToast({ type: 'error', message: data.detail || 'Failed to create PO' });
      }
    } catch (err) {
      console.error('Error creating PO:', err);
      setToast({ type: 'error', message: 'Failed to create PO. Please try again.' });
    } finally {
      setSendingVendorId(null);
    }
  };

  const handleCancelPO = (sentPO: SentPO) => {
    setCancelConfirm(sentPO);
  };

  const confirmCancelPO = async () => {
    const sentPO = cancelConfirm;
    if (!sentPO) return;
    setCancelConfirm(null);
    try {
      const resp = await fetch(
        `${apiBaseUrl}/buyer-pricing/buyer-estimates/purchase-orders/${sentPO.po_id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actor_name: estimate.estimate_number,
            actor_code: `estimate_${estimate.id}`,
          }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSentPOs((prev) => ({
          ...prev,
          [sentPO.vendor_id]: { ...sentPO, status: 'cancelled' },
        }));
        onPOSent?.();
      } else {
        setToast({ type: 'error', message: data.detail || 'Failed to cancel PO' });
      }
    } catch (err) {
      console.error('Error cancelling PO:', err);
      setToast({ type: 'error', message: 'Failed to cancel PO. Please try again.' });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Purchase Order — Estimate #{estimate.estimate_number}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(estimate.estimate_date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Toast */}
          {toast && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: '8px',
              backgroundColor: toast.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: toast.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '13px', fontWeight: 500,
            }}>
              <span>{toast.type === 'success' ? '✅' : '❌'} {toast.message}</span>
              <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'inherit', marginLeft: '12px' }}>×</button>
            </div>
          )}

          {/* Cancel confirmation banner */}
          {cancelConfirm && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: '8px',
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa',
              color: '#9a3412', fontSize: '13px', fontWeight: 500,
            }}>
              <span>Cancel <strong>{cancelConfirm.po_number}</strong>? This cannot be undone.</span>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                <button
                  onClick={confirmCancelPO}
                  style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
                >
                  Yes, Cancel PO
                </button>
                <button
                  onClick={() => setCancelConfirm(null)}
                  style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
                >
                  Keep
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center text-gray-500 py-12">Loading vendor quotes…</div>
          )}

          {!loading && vendorGroups.length === 0 && (
            <div className="text-center text-gray-500 py-12">No items found on this estimate.</div>
          )}

          {!loading &&
            vendorGroups.map((group) => {
              const isExpanded = expandedVendors.has(group.vendor_id);
              const quote = group.vendorQuote;

              return (
                <div
                  key={group.vendor_id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Vendor header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleVendor(group.vendor_id)}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-gray-800">{group.vendor_name}</span>
                      {quote && (
                        <>
                          <span className="text-xs text-gray-500">
                            Quote #{group.quote_id}
                          </span>
                          <span className="text-xs text-gray-500">
                            Valid till {formatDate(quote.quote_valid_till)}
                          </span>
                          {quote.country_of_origin && (
                            <span className="text-xs text-gray-400">{quote.country_of_origin}</span>
                          )}
                        </>
                      )}
                      {!quote && (
                        <span className="text-xs text-amber-600">No linked quote</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {sentPOs[group.vendor_id] ? (
                        <>
                          <span className={`px-3 py-1 text-xs font-medium rounded border ${PO_STATUS_BADGE[sentPOs[group.vendor_id].status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                            {PO_STATUS_LABEL[sentPOs[group.vendor_id].status] || sentPOs[group.vendor_id].status} · {sentPOs[group.vendor_id].po_number}
                          </span>
                          {/* Cancel toggle — always visible when PO exists, locked once vendor accepts/rejects */}
                          {(() => {
                            const po = sentPOs[group.vendor_id];
                            const isActive = ['sent', 'accepted', 'fulfilled'].includes(po.status);
                            const canCancel = po.status === 'sent';
                            const trackColor = po.status === 'fulfilled' ? '#059669'
                              : po.status === 'accepted' ? '#16a34a'
                              : po.status === 'sent'     ? '#16a34a'
                              : po.status === 'rejected' ? '#ef4444'
                              : '#9ca3af';
                            const tooltipText = po.status === 'accepted'  ? 'Cannot cancel — vendor has accepted'
                              : po.status === 'fulfilled' ? 'Cannot cancel — PO fulfilled'
                              : po.status === 'rejected'  ? 'PO rejected by vendor'
                              : po.status === 'sent'      ? 'Click to cancel this PO'
                              : '';
                            const label = po.status === 'sent' ? 'Active'
                              : po.status === 'accepted'  ? 'Accepted'
                              : po.status === 'fulfilled' ? 'Fulfilled'
                              : po.status === 'rejected'  ? 'Rejected'
                              : 'Cancelled';
                            return (
                              <div
                                onClick={(e) => { e.stopPropagation(); if (canCancel) handleCancelPO(po); }}
                                title={tooltipText}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px',
                                         cursor: canCancel ? 'pointer' : 'not-allowed', userSelect: 'none' }}
                              >
                                <div className="po-toggle-track" style={{
                                  width: '40px', height: '22px', borderRadius: '11px',
                                  position: 'relative', flexShrink: 0, backgroundColor: trackColor,
                                }}>
                                  <div className="po-toggle-thumb" style={{
                                    position: 'absolute', top: '3px', width: '16px', height: '16px',
                                    borderRadius: '50%', backgroundColor: '#fff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    transform: isActive ? 'translateX(21px)' : 'translateX(3px)',
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '56px',
                                               color: isActive ? trackColor : '#9ca3af' }}>
                                  {label}
                                </span>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendPO(group);
                          }}
                          disabled={sendingVendorId === group.vendor_id || !quote}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            !quote
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : sendingVendorId === group.vendor_id
                              ? 'bg-emerald-400 text-white cursor-wait'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {sendingVendorId === group.vendor_id ? 'Sending…' : 'Send PO'}
                        </button>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* PO Timeline */}
                      {(() => {
                        const po = sentPOs[group.vendor_id];
                        if (!po) return null;
                        const tl = poTimelines[po.po_id];
                        if (!tl) return null;
                        const milestones = [
                          { label: 'Created', date: tl.created_at },
                          { label: 'Accepted', date: tl.accepted_at },
                          { label: 'Fulfilled', date: tl.fulfilled_at },
                        ];
                        return (
                          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 0 4px', gap: 0 }}>
                            {milestones.map((m, i) => {
                              const done = !!m.date;
                              const dotColor = done ? '#059669' : '#d1d5db';
                              const labelColor = done ? '#065f46' : '#9ca3af';
                              return (
                                <React.Fragment key={m.label}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                                    <div style={{
                                      width: '14px', height: '14px', borderRadius: '50%',
                                      backgroundColor: dotColor, border: `2px solid ${done ? '#059669' : '#d1d5db'}`,
                                      flexShrink: 0,
                                    }} />
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: labelColor, marginTop: '4px', textAlign: 'center' }}>
                                      {m.label}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                                      {m.date ? new Date(m.date).toLocaleDateString() : '—'}
                                    </span>
                                  </div>
                                  {i < milestones.length - 1 && (
                                    <div style={{
                                      flex: 1, height: '2px', backgroundColor: milestones[i + 1].date ? '#059669' : '#e5e7eb',
                                      alignSelf: 'flex-start', marginTop: '6px',
                                    }} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* No linked quote message */}
                      {!quote && (
                        <div className="text-center text-amber-600 text-sm py-4">
                          No original vendor quote linked to this estimate.
                        </div>
                      )}

                      {/* PO lines: product × port with freight and editable weight */}
                      {quote && (() => {
                        const poLines = buildPOLines(group);
                        if (poLines.length === 0) return (
                          <div className="text-center text-gray-500 text-sm py-4">
                            No matching products/destinations found.
                          </div>
                        );
                        return (
                          <div>
                            <table className="min-w-full text-sm border border-gray-100">
                              <thead className="bg-blue-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Fish</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Cut</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Grade</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Size (kg)</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Price/kg</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Freight/kg</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Total/kg</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-emerald-700 bg-emerald-50">
                                    Order Wt (lbs) <span className="text-red-500">*</span>
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-emerald-700 bg-emerald-50">
                                    Order Wt (kg)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {poLines.map((line, idx) => {
                                  const key = getWeightKey(group.vendor_id, idx);
                                  const orderLbs = parseFloat(orderWeights[key] || '0') || 0;
                                  const orderKg = orderLbs / 2.20462;
                                  const totalPerKg = line.price_per_kg + line.airfreight_per_kg;
                                  const prevPort = idx > 0 ? poLines[idx - 1].port_code : null;
                                  const showPortHeader = line.port_code !== prevPort;
                                  return (
                                    <React.Fragment key={idx}>
                                      {showPortHeader && (
                                        <tr>
                                          <td
                                            colSpan={9}
                                            className="px-3 py-2"
                                            style={{ backgroundColor: '#0A3D5C' }}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold tracking-wide text-white uppercase">
                                                📍 {line.destination_name || line.port_code}
                                                <span className="ml-2 font-normal opacity-80">({line.port_code})</span>
                                              </span>
                                              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-xs text-white/70">Delivery <span className="text-red-400">*</span></span>
                                                <input
                                                  type="date"
                                                  value={deliveryDateFrom}
                                                  onChange={(e) => {
                                                    setDeliveryDateFrom(e.target.value);
                                                    // Auto-advance To date to From + 2 if To is unset or behind From
                                                    if (e.target.value) {
                                                      const to = new Date(e.target.value);
                                                      to.setDate(to.getDate() + 2);
                                                      const toStr = to.toISOString().split('T')[0];
                                                      if (!deliveryDateTo || deliveryDateTo < e.target.value) {
                                                        setDeliveryDateTo(toStr);
                                                      }
                                                    }
                                                  }}
                                                  className={`px-1.5 py-0.5 text-xs border rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/50 [color-scheme:dark] ${!deliveryDateFrom ? 'border-yellow-400' : 'border-white/30'}`}
                                                />
                                                <span className="text-xs text-white/50">–</span>
                                                <input
                                                  type="date"
                                                  value={deliveryDateTo}
                                                  onChange={(e) => setDeliveryDateTo(e.target.value)}
                                                  className={`px-1.5 py-0.5 text-xs border rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/50 [color-scheme:dark] ${!deliveryDateTo ? 'border-yellow-400' : 'border-white/30'}`}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                      <tr className="hover:bg-gray-50 border-b border-gray-100">
                                        <td className="px-3 py-2 text-gray-900">{line.fish_name}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.cut_name}</td>
                                        <td className="px-3 py-2 text-gray-700">{line.grade_name}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">
                                          {line.fish_size || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                                          ${line.price_per_kg.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900">
                                          ${line.airfreight_per_kg.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                                          ${totalPerKg.toFixed(2)}
                                        </td>
                                        <td className="px-2 py-1 bg-emerald-50">
                                          {(() => {
                                            const isSent = !!sentPOs[group.vendor_id];
                                            return (
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                value={orderWeights[key] || ''}
                                                onChange={(e) => handleWeightChange(group.vendor_id, idx, e.target.value)}
                                                placeholder="0"
                                                disabled={isSent}
                                                className={`w-24 px-2 py-1 text-right text-sm border rounded focus:outline-none ${
                                                  isSent
                                                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                                    : 'border-emerald-300 focus:ring-1 focus:ring-emerald-500 bg-white'
                                                }`}
                                              />
                                            );
                                          })()}
                                        </td>
                                        <td className="px-3 py-2 text-right text-emerald-700 font-medium bg-emerald-50">
                                          {orderLbs > 0 ? Math.round(orderKg / 100) * 100 : '-'}
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}

                      {/* Vendor notes */}
                      {quote && quote.notes && (
                        <div className="text-sm text-gray-500 italic">
                          <span className="font-medium text-gray-600">Vendor Notes:</span> {quote.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PODialog;
