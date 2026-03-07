import React, { useState, useEffect, useCallback, useRef } from 'react';
import BPLForm from './BPLForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ─── Types ─────────────────────────────────────── */

interface PurchaseOrder {
  id: number;
  po_number: string;
  quote_id: number;
  estimate_id: number;
  vendor_id: number;
  status: string;
  created_at: string;
  estimate_number: string;
  item_count: number;
}

interface POItem {
  id: number;
  fish_name: string;
  cut_name: string;
  grade_name: string;
  fish_size: string | null;
  port_code: string;
  destination_name: string | null;
  price_per_kg: number;
  airfreight_per_kg: number;
  total_per_kg: number;
  order_weight_lbs: number;
  order_weight_kg: number;
}

interface PODetail extends PurchaseOrder {
  items: POItem[];
}

interface ExistingBPL {
  id: number;
  po_id: number;
  port_code: string;
  status: string;
  notes: string | null;
  invoice_number: string | null;
  air_way_bill: string | null;
  packed_date: string | null;
  expiry_date: string | null;
  boxes: {
    id: number;
    po_item_id: number;
    box_number: number;
    num_pieces: number;
    net_weight_kg: number;
    gross_weight_kg: number;
    fish_name: string;
    cut_name: string;
    grade_name: string;
    fish_size: string | null;
    pieces: { id: number; piece_number: number; weight_kg: number }[];
  }[];
}

interface VendorPOTabProps {
  vendorId: number;
  vendorName: string;
}

/* ─── Helpers ───────────────────────────────────── */

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

/** Group items by port_code, preserving order of first appearance */
function groupByPort(items: POItem[]): Map<string, POItem[]> {
  const map = new Map<string, POItem[]>();
  for (const item of items) {
    const arr = map.get(item.port_code) || [];
    arr.push(item);
    map.set(item.port_code, arr);
  }
  return map;
}

/* ─── Inline styles (bypass Tailwind v4 issues) ── */

const S = {
  th: (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
    color: '#ffffff', border: '1px solid #6b7280', padding: '8px 10px',
    fontSize: '12px', fontWeight: 600, textAlign: align,
  }),
  td: (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
    color: '#000000', border: '1px solid #e5e7eb', padding: '7px 10px', textAlign: align,
  }),
  portHeader: {
    backgroundColor: '#f0f9ff', borderTop: '2px solid #0A3D5C',
    padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap' as const, gap: '8px',
  } as React.CSSProperties,
  checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0A3D5C' },
  bplBtnActive: {
    padding: '6px 14px', backgroundColor: '#0A3D5C', color: '#fff', border: 'none',
    borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
  bplBtnDisabled: {
    padding: '6px 14px', backgroundColor: '#e5e7eb', color: '#9ca3af', border: 'none',
    borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'not-allowed',
  } as React.CSSProperties,
  bplBtnEdit: {
    padding: '6px 14px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
    borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  } as React.CSSProperties,
  bplBtnSend: {
    padding: '6px 14px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
    borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties,
  bplBtnSending: {
    padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb',
    borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'wait',
  } as React.CSSProperties,
  statusDot: (status: string): React.CSSProperties => ({
    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '6px',
    backgroundColor: status === 'sent' ? '#2563eb' : status === 'completed' ? '#059669' : status === 'draft' ? '#f59e0b' : '#d1d5db',
  }),
  bplBadge: (status: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, marginLeft: '8px',
    backgroundColor: status === 'sent' ? '#dbeafe' : status === 'completed' ? '#d1fae5' : '#fef3c7',
    color: status === 'sent' ? '#1e40af' : status === 'completed' ? '#065f46' : '#92400e',
  }),
};


/* ─── Animations ────────────────────────────────── */
const PO_ANIM_ID = 'po-tab-animations';
if (typeof document !== 'undefined' && !document.getElementById(PO_ANIM_ID)) {
  const style = document.createElement('style');
  style.id = PO_ANIM_ID;
  style.textContent = `
    @keyframes poToastIn  { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes poToastOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
    @keyframes poSpin     { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

/* ─── Component ─────────────────────────────────── */

const VendorPOTab: React.FC<VendorPOTabProps> = ({ vendorId, vendorName }) => {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PODetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // BPL state
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [coveredItemIds, setCoveredItemIds] = useState<Set<number>>(new Set());
  const [bplsByPort, setBplsByPort] = useState<Map<string, ExistingBPL>>(new Map());
  const [bplFormOpen, setBplFormOpen] = useState<{ portCode: string; items: POItem[]; existing: ExistingBPL | null } | null>(null);
  const [sendingBPL, setSendingBPL] = useState<string | null>(null);

  // Toast + confirmation state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmSend, setConfirmSend] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapsible left panel
  const [panelOpen, setPanelOpen] = useState(true);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Fetch PO list ── */
  const fetchPOs = useCallback(async () => {
    setLoadingList(true);
    setSelectedPO(null);
    setCheckedItems(new Set());
    setCoveredItemIds(new Set());
    setBplsByPort(new Map());
    try {
      const ws = formatDate(weekStart);
      const resp = await fetch(`${API_BASE_URL}/vendors/${vendorId}/purchase-orders?week_start=${ws}`);
      const data = await resp.json();
      if (data.success) setPurchaseOrders(data.purchase_orders || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
      setPurchaseOrders([]);
    } finally {
      setLoadingList(false);
    }
  }, [vendorId, weekStart]);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);

  /* ── Fetch PO detail + BPL status ── */
  const fetchPODetail = async (poId: number) => {
    setLoadingDetail(true);
    setCheckedItems(new Set());
    try {
      const [poResp, bplResp] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/items`),
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/bpl`),
      ]);
      const poData = await poResp.json();
      const bplData = await bplResp.json();

      if (poData.success) {
        setSelectedPO(poData.purchase_order);
      }
      if (bplData.success) {
        setCoveredItemIds(new Set(bplData.covered_po_item_ids || []));
        const map = new Map<string, ExistingBPL>();
        for (const bpl of (bplData.bpls || [])) {
          map.set(bpl.port_code, bpl);
        }
        setBplsByPort(map);
        // Pre-check items that already have BPL entries
        const preChecked = new Set<number>(bplData.covered_po_item_ids || []);
        setCheckedItems(preChecked);
      }
    } catch (err) {
      console.error('Error fetching PO details:', err);
    } finally {
      setLoadingDetail(false);
      // Auto-collapse panel on small screens after selecting a PO
      if (window.innerWidth < 768) setPanelOpen(false);
    }
  };

  /* ── Refresh BPL data after save ── */
  const refreshBPL = async () => {
    if (!selectedPO) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/vendors/purchase-orders/${selectedPO.id}/bpl`);
      const data = await resp.json();
      if (data.success) {
        setCoveredItemIds(new Set(data.covered_po_item_ids || []));
        const map = new Map<string, ExistingBPL>();
        for (const bpl of (data.bpls || [])) map.set(bpl.port_code, bpl);
        setBplsByPort(map);
        setCheckedItems(new Set(data.covered_po_item_ids || []));
      }
    } catch (err) {
      console.error('Error refreshing BPL:', err);
    }
    setBplFormOpen(null);
  };

  /* ── Send BPL emails ── */
  const handleSendBPL = async (portCode: string) => {
    if (!selectedPO) return;
    setConfirmSend(null); // close confirmation
    setSendingBPL(portCode);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/vendors/purchase-orders/${selectedPO.id}/bpl/${encodeURIComponent(portCode)}/send-email`,
        { method: 'POST' },
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        showToast('success', `BPL emails sent for port ${portCode}!`);
        await refreshBPL();
      } else {
        showToast('error', `Failed to send: ${data.detail || data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error sending BPL emails:', err);
      showToast('error', 'Network error — could not reach the server.');
    } finally {
      setSendingBPL(null);
    }
  };

  /* ── Week navigation ── */
  const goToPrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const goToNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const goToCurrentWeek = () => setWeekStart(getMonday(new Date()));
  const handleWeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = new Date(e.target.value + 'T00:00:00');
    if (!isNaN(picked.getTime())) setWeekStart(getMonday(picked));
  };

  /* ── Checkbox helpers ── */
  const toggleItem = (id: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePort = (portItems: POItem[]) => {
    const ids = portItems.map(i => i.id);
    const allChecked = ids.every(id => checkedItems.has(id));
    setCheckedItems(prev => {
      const next = new Set(prev);
      ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
      return next;
    });
  };

  /* ── Status helpers ── */
  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-700',
      acknowledged: 'bg-green-100 text-green-700',
      fulfilled: 'bg-emerald-100 text-emerald-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = { sent: 'Received', acknowledged: 'Acknowledged', fulfilled: 'Fulfilled' };
    return labels[status] || status;
  };

  /* ── Derived: items grouped by port ── */
  const portGroups = selectedPO ? groupByPort(selectedPO.items) : new Map<string, POItem[]>();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">

      {/* Week Navigation */}
      <div className="flex flex-wrap items-center gap-2 sm:space-x-3 mb-6 bg-white rounded-lg border border-gray-200 px-3 sm:px-4 py-3">
        <button onClick={goToPrevWeek} className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600" title="Previous week">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">{formatWeekLabel(weekStart)}</span>
          <input type="date" value={formatDate(weekStart)} onChange={handleWeekInput} className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <button onClick={goToNextWeek} className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600" title="Next week">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={goToCurrentWeek} className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">This Week</button>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Left Panel — PO List (collapsible) */}
        <div style={{
          width: panelOpen ? '300px' : '0px',
          minWidth: panelOpen ? '300px' : '0px',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          flexShrink: 0,
        }}>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loadingList && <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading…</div>}
            {!loadingList && purchaseOrders.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">No purchase orders this week</div>}
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {purchaseOrders.map(po => (
                <div
                  key={po.id}
                  onClick={() => fetchPODetail(po.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedPO?.id === po.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{po.po_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(po.status)}`}>{statusLabel(po.status)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Estimate #{po.estimate_number} · {po.item_count} item{po.item_count !== 1 ? 's' : ''}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">{new Date(po.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — PO Detail with BPL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toggle button row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => setPanelOpen(prev => !prev)}
              title={panelOpen ? 'Hide PO list' : 'Show PO list'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {panelOpen
                  ? <><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></>
                  : <><path d="M13 7l5 5-5 5"/><path d="M6 7l5 5-5 5"/></>
                }
              </svg>
              {panelOpen ? 'Hide List' : `PO List (${purchaseOrders.length})`}
            </button>
            {!panelOpen && selectedPO && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                {selectedPO.po_number}
              </span>
            )}
          </div>

          {!selectedPO && !loadingDetail && (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-16 text-center text-gray-400">
              {panelOpen ? 'Select a purchase order to view details' : 'Click "PO List" to select a purchase order'}
            </div>
          )}

          {loadingDetail && (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-16 text-center text-gray-500">
              Loading PO details…
            </div>
          )}

          {selectedPO && !loadingDetail && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* PO Header */}
              <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ color: '#1f2937', fontSize: '17px', fontWeight: 700, margin: 0 }}>{selectedPO.po_number}</h3>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                    Estimate #{selectedPO.estimate_number} · Created {new Date(selectedPO.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(selectedPO.status)}`}>
                  {statusLabel(selectedPO.status)}
                </span>
              </div>

              {/* Instruction bar */}
              <div style={{ padding: '10px 20px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                💡 Select items you can fulfill, then click <strong>Create BPL</strong> per port to fill the box packaging list.
              </div>

              {/* PO Items — grouped by port */}
              <div style={{ padding: '16px' }}>
                {Array.from(portGroups.entries()).map(([port, items]) => {
                  const portBPL = bplsByPort.get(port);
                  const allPortIds = items.map(i => i.id);
                  const allChecked = allPortIds.every(id => checkedItems.has(id));
                  const someChecked = allPortIds.some(id => checkedItems.has(id));
                  const checkedPortItems = items.filter(i => checkedItems.has(i.id));
                  const hasCheckedItems = checkedPortItems.length > 0;

                  return (
                    <div key={port} style={{ marginBottom: '20px', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* Port header row */}
                      <div style={S.portHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={() => togglePort(items)}
                            style={S.checkbox}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0A3D5C' }}>
                            Port: {port}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            ({items.length} item{items.length !== 1 ? 's' : ''})
                          </span>
                          {portBPL && (
                            <span style={S.bplBadge(portBPL.status)}>
                              <span style={S.statusDot(portBPL.status)} />
                              BPL {portBPL.status === 'sent' ? 'Sent' : portBPL.status === 'completed' ? 'Completed' : 'Draft'}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {portBPL ? (
                            portBPL.status === 'sent' ? (
                              /* Sent — read-only, no edit, no send */
                              <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>✅ Sent</span>
                            ) : (
                              <>
                                <button
                                  style={S.bplBtnEdit}
                                  onClick={() => {
                                    const existingPoItemIds = new Set(portBPL.boxes.map(b => b.po_item_id));
                                    const editItems = items.filter(i => existingPoItemIds.has(i.id) || checkedItems.has(i.id));
                                    setBplFormOpen({ portCode: port, items: editItems, existing: portBPL });
                                  }}
                                >
                                  ✏️ Edit BPL
                                </button>
                                {portBPL.status === 'completed' && (
                                  <button
                                    style={sendingBPL === port ? S.bplBtnSending : S.bplBtnSend}
                                    disabled={sendingBPL === port}
                                    onClick={() => setConfirmSend(port)}
                                  >
                                    {sendingBPL === port ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #d1d5db', borderTopColor: '#059669', borderRadius: '50%', animation: 'poSpin 0.6s linear infinite' }} />
                                        Sending…
                                      </span>
                                    ) : '📧 Send BPL'}
                                  </button>
                                )}
                              </>
                            )
                          ) : (
                            <button
                              style={hasCheckedItems ? S.bplBtnActive : S.bplBtnDisabled}
                              disabled={!hasCheckedItems}
                              onClick={() => setBplFormOpen({ portCode: port, items: checkedPortItems, existing: null })}
                              title={hasCheckedItems ? `Create BPL for ${checkedPortItems.length} selected items` : 'Select items first'}
                            >
                              📦 Create BPL
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items table */}
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                        <thead style={{ backgroundColor: '#0A3D5C' }}>
                          <tr>
                            <th style={{ ...S.th('left'), width: '36px' }}></th>
                            <th style={S.th('left')}>Fish</th>
                            <th style={S.th('left')}>Cut</th>
                            <th style={S.th('left')}>Grade</th>
                            <th style={S.th('right')}>Size</th>
                            <th style={S.th('right')}>Price/kg</th>
                            <th style={S.th('right')}>Freight/kg</th>
                            <th style={S.th('right')}>Total/kg</th>
                            <th style={S.th('right')}>Wt (lbs)</th>
                            <th style={S.th('right')}>Wt (kg)</th>
                            <th style={{ ...S.th('left'), width: '50px', textAlign: 'center' }}>BPL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => {
                            const isCovered = coveredItemIds.has(item.id);
                            const isChecked = checkedItems.has(item.id);
                            const rowBg = isCovered
                              ? (idx % 2 === 0 ? '#ecfdf5' : '#d1fae5')
                              : (idx % 2 === 0 ? '#ffffff' : '#f9fafb');
                            return (
                              <tr key={item.id} style={{ backgroundColor: rowBg }}>
                                <td style={{ ...S.td('left'), textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleItem(item.id)}
                                    style={S.checkbox}
                                  />
                                </td>
                                <td style={S.td('left')}>{item.fish_name}</td>
                                <td style={S.td('left')}>{item.cut_name}</td>
                                <td style={S.td('left')}>{item.grade_name}</td>
                                <td style={S.td('right')}>{item.fish_size || '-'}</td>
                                <td style={{ ...S.td('right'), fontWeight: 500 }}>${Number(item.price_per_kg).toFixed(2)}</td>
                                <td style={S.td('right')}>${Number(item.airfreight_per_kg).toFixed(2)}</td>
                                <td style={{ ...S.td('right'), fontWeight: 600 }}>${Number(item.total_per_kg).toFixed(2)}</td>
                                <td style={S.td('right')}>{Number(item.order_weight_lbs).toLocaleString()}</td>
                                <td style={{ ...S.td('right'), color: '#065f46', fontWeight: 600 }}>{Number(item.order_weight_kg).toLocaleString()}</td>
                                <td style={{ ...S.td('left'), textAlign: 'center' }}>
                                  {isCovered && (
                                    <span title="BPL exists for this item" style={{ color: '#059669', fontSize: '16px', fontWeight: 700 }}>✓</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  );
                })}

                {/* Grand totals */}
                {selectedPO.items.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '13px', fontWeight: 700, color: '#000' }}>
                    <span>
                      Total: {selectedPO.items.reduce((s, i) => s + Number(i.order_weight_lbs), 0).toLocaleString()} lbs
                    </span>
                    <span style={{ color: '#065f46' }}>
                      {selectedPO.items.reduce((s, i) => s + Number(i.order_weight_kg), 0).toLocaleString()} kg
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BPL Form Modal */}
      {bplFormOpen && selectedPO && (
        <BPLForm
          poId={selectedPO.id}
          portCode={bplFormOpen.portCode}
          selectedItems={bplFormOpen.items}
          existingBPL={bplFormOpen.existing}
          onClose={() => setBplFormOpen(null)}
          onSaved={refreshBPL}
        />
      )}

      {/* ── Inline Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 100,
          padding: '14px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'poToastIn 0.3s ease-out',
          backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: toast.type === 'success' ? '#065f46' : '#dc2626',
          border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
        }}>
          <span style={{ fontSize: '18px' }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: '8px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'inherit', lineHeight: 1 }}
          >×</button>
        </div>
      )}

      {/* ── Send Confirmation Dialog ── */}
      {confirmSend && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
        }} onClick={() => setConfirmSend(null)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '28px 32px',
            maxWidth: '400px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'poToastIn 0.2s ease-out',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              📧 Send BPL Emails?
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 20px' }}>
              This will email the Box Packaging List for port <strong>{confirmSend}</strong> to both the owner and vendor.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmSend(null)}
                style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => handleSendBPL(confirmSend)}
                style={{ padding: '8px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >Yes, Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPOTab;
