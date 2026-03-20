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
  vendorCode: string;
}

interface AuditEntry {
  id: number;
  po_id: number;
  from_status: string | null;
  to_status: string;
  actor_role: string;
  actor_name: string | null;
  actor_code: string | null;
  notes: string | null;
  created_at: string;
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
    backgroundColor: status === 'sent' ? '#059669' : status === 'completed' ? '#2563eb' : status === 'draft' ? '#f59e0b' : '#d1d5db',
  }),
  bplBadge: (status: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, marginLeft: '8px',
    backgroundColor: status === 'sent' ? '#d1fae5' : status === 'completed' ? '#dbeafe' : '#fef3c7',
    color: status === 'sent' ? '#065f46' : status === 'completed' ? '#1e40af' : '#92400e',
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
    .port-toggle-track { transition: background-color 0.2s ease; }
    .port-toggle-thumb { transition: transform 0.2s ease; }
  `;
  document.head.appendChild(style);
}

/* ─── Component ─────────────────────────────────── */

const VendorPOTab: React.FC<VendorPOTabProps> = ({ vendorId, vendorName, vendorCode }) => {
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

  // Port-level acceptance
  const [acceptedPorts, setAcceptedPorts] = useState<string[]>([]);
  const [rejectedPorts, setRejectedPorts] = useState<string[]>([]);
  const [togglingPort, setTogglingPort] = useState<string | null>(null);

  // PO action state (reject only — accept is now per-port)
  const [confirmAction, setConfirmAction] = useState<'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Manual fulfill state
  const [confirmFulfill, setConfirmFulfill] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);

  // Timeline state
  const [timeline, setTimeline] = useState<{ created_at: string; accepted_at: string | null; fulfilled_at: string | null } | null>(null);

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

  /* ── Fetch PO detail + BPL status + audit log ── */
  const fetchPODetail = async (poId: number) => {
    setLoadingDetail(true);
    setCheckedItems(new Set());
    setAuditLog([]);
    setTimeline(null);
    try {
      const [poResp, bplResp, auditResp, timelineResp] = await Promise.all([
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/items`),
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/bpl`),
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/audit`),
        fetch(`${API_BASE_URL}/vendors/purchase-orders/${poId}/timeline`),
      ]);
      const poData = await poResp.json();
      const bplData = await bplResp.json();
      const auditData = await auditResp.json();
      const timelineData = await timelineResp.json();

      if (poData.success) {
        setSelectedPO(poData.purchase_order);
        setAcceptedPorts(poData.purchase_order.accepted_ports || []);
        setRejectedPorts(poData.purchase_order.rejected_ports || []);
      }
      if (bplData.success) {
        setCoveredItemIds(new Set(bplData.covered_po_item_ids || []));
        const map = new Map<string, ExistingBPL>();
        for (const bpl of (bplData.bpls || [])) {
          map.set(bpl.port_code, bpl);
        }
        setBplsByPort(map);
        const preChecked = new Set<number>(bplData.covered_po_item_ids || []);
        setCheckedItems(preChecked);
      }
      if (auditData.success) {
        setAuditLog(auditData.audit || []);
      }
      if (timelineData.success) {
        setTimeline({
          created_at: timelineData.created_at,
          accepted_at: timelineData.accepted_at,
          fulfilled_at: timelineData.fulfilled_at,
        });
      }
    } catch (err) {
      console.error('Error fetching PO details:', err);
    } finally {
      setLoadingDetail(false);
      if (window.innerWidth < 768) setPanelOpen(false);
    }
  };

  /* ── Toggle port accept/reject ── */
  const handleTogglePort = async (portCode: string, action: 'accept' | 'reject') => {
    if (!selectedPO) return;
    setTogglingPort(portCode);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/vendors/purchase-orders/${selectedPO.id}/ports/${encodeURIComponent(portCode)}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor_name: vendorName, actor_code: vendorCode }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        setAcceptedPorts(data.accepted_ports || []);
        setRejectedPorts(data.rejected_ports || []);
        // On reject: clear checkboxes for this port's items
        if (action === 'reject') {
          const portItemIds = selectedPO.items.filter(i => i.port_code === portCode).map(i => i.id);
          setCheckedItems(prev => {
            const next = new Set(prev);
            portItemIds.forEach(id => next.delete(id));
            return next;
          });
        }
        showToast('success', action === 'accept' ? `Port ${portCode} accepted.` : `Port ${portCode} rejected.`);
        await fetchPOs();
        await fetchPODetail(selectedPO.id);
      } else {
        showToast('error', data.detail || `Failed to ${action} port ${portCode}.`);
      }
    } catch (err) {
      console.error(`Error ${action}ing port:`, err);
      showToast('error', 'Network error — could not reach the server.');
    } finally {
      setTogglingPort(null);
    }
  };

  /* ── Reject PO ── */
  const handlePOAction = async (action: 'reject') => {
    if (!selectedPO) return;
    setActionLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/vendors/purchase-orders/${selectedPO.id}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actor_role: 'vendor',
            actor_name: vendorName,
            actor_code: vendorCode,
            notes: actionNote || null,
          }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        showToast('success', 'PO rejected.');
        setConfirmAction(null);
        setActionNote('');
        await fetchPOs();
        await fetchPODetail(selectedPO.id);
      } else {
        showToast('error', data.detail || 'Failed to reject PO.');
      }
    } catch (err) {
      console.error('Error rejecting PO:', err);
      showToast('error', 'Network error — could not reach the server.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Manual fulfill ── */
  const handleFulfill = async () => {
    if (!selectedPO) return;
    setConfirmFulfill(false);
    setFulfilling(true);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/vendors/purchase-orders/${selectedPO.id}/fulfill`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor_name: vendorName, actor_code: vendorCode }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        showToast('success', 'PO marked as fulfilled.');
        await fetchPOs();
        await fetchPODetail(selectedPO.id);
      } else {
        showToast('error', data.detail || 'Failed to mark as fulfilled.');
      }
    } catch (err) {
      console.error('Error fulfilling PO:', err);
      showToast('error', 'Network error — could not reach the server.');
    } finally {
      setFulfilling(false);
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
        // Re-fetch PO detail to pick up any auto-fulfilled status change
        await fetchPODetail(selectedPO.id);
        await fetchPOs();
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
      sent:      'bg-blue-100 text-blue-700',
      accepted:  'bg-green-100 text-green-700',
      rejected:  'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
      fulfilled: 'bg-emerald-100 text-emerald-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      sent:      'Received',
      accepted:  'Accepted',
      rejected:  'Rejected',
      cancelled: 'Cancelled',
      fulfilled: 'Fulfilled',
    };
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
          <input type="date" value={formatDate(weekStart)} onChange={handleWeekInput} style={{ minWidth: '130px', boxSizing: 'border-box' }} className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
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
              <div style={{ padding: '12px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ color: '#1f2937', fontSize: '17px', fontWeight: 700, margin: 0 }}>{selectedPO.po_number}</h3>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                    Estimate #{selectedPO.estimate_number} · Created {new Date(selectedPO.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedPO.status === 'sent' && (
                    <button
                      onClick={() => { setActionNote(''); setConfirmAction('reject'); }}
                      style={{ padding: '7px 18px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✕ Reject PO
                    </button>
                  )}
                  {selectedPO.status === 'accepted' && (
                    <button
                      onClick={() => setConfirmFulfill(true)}
                      disabled={fulfilling}
                      title="Mark this PO as fulfilled without a BPL (for vendors managing shipping outside the portal)"
                      style={{
                        padding: '7px 18px', backgroundColor: '#f9fafb', color: '#6b7280',
                        border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px',
                        fontWeight: 500, cursor: fulfilling ? 'wait' : 'pointer',
                        opacity: fulfilling ? 0.6 : 1,
                      }}
                    >
                      {fulfilling ? 'Marking…' : '✓ Mark as Fulfilled'}
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(selectedPO.status)}`}>
                    {statusLabel(selectedPO.status)}
                  </span>
                </div>
              </div>

              {/* PO Timeline */}
              {timeline && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    {/* Created */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#059669', flexShrink: 0 }} />
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', marginTop: '4px', textAlign: 'center' }}>Created</div>
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>{new Date(timeline.created_at).toLocaleDateString()}</div>
                    </div>
                    {/* Connector */}
                    <div style={{ flex: 1, height: '2px', backgroundColor: timeline.accepted_at ? '#059669' : '#e5e7eb', marginBottom: '20px' }} />
                    {/* Accepted */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: timeline.accepted_at ? '#059669' : '#d1d5db', flexShrink: 0 }} />
                      <div style={{ fontSize: '10px', fontWeight: 700, color: timeline.accepted_at ? '#059669' : '#9ca3af', marginTop: '4px', textAlign: 'center' }}>Accepted</div>
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>{timeline.accepted_at ? new Date(timeline.accepted_at).toLocaleDateString() : '—'}</div>
                    </div>
                    {/* Connector */}
                    <div style={{ flex: 1, height: '2px', backgroundColor: timeline.fulfilled_at ? '#059669' : '#e5e7eb', marginBottom: '20px' }} />
                    {/* Fulfilled */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: timeline.fulfilled_at ? '#059669' : '#d1d5db', flexShrink: 0 }} />
                      <div style={{ fontSize: '10px', fontWeight: 700, color: timeline.fulfilled_at ? '#059669' : '#9ca3af', marginTop: '4px', textAlign: 'center' }}>Fulfilled</div>
                      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>{timeline.fulfilled_at ? new Date(timeline.fulfilled_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instruction bar — context-sensitive */}
              {selectedPO.status === 'sent' && (
                <div style={{ padding: '10px 20px', backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '12px', color: '#1d4ed8' }}>
                  📋 Review each port below. Click <strong>Accept Port</strong> for ports you can fulfill, or <strong>Reject PO</strong> to decline entirely.
                </div>
              )}
              {selectedPO.status === 'accepted' && (
                <div style={{ padding: '10px 20px', backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                  💡 Select items you can fulfill, then click <strong>Create BPL</strong> per port to fill the box packaging list.
                </div>
              )}
              {(selectedPO.status === 'rejected' || selectedPO.status === 'cancelled') && (
                <div style={{ padding: '10px 20px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: '12px', color: '#dc2626' }}>
                  ⚠️ This purchase order is <strong>{statusLabel(selectedPO.status)}</strong>. No further actions are available.
                </div>
              )}
              {selectedPO.status === 'fulfilled' && (
                <div style={{ padding: '10px 20px', backgroundColor: '#ecfdf5', borderBottom: '1px solid #a7f3d0', fontSize: '12px', color: '#065f46' }}>
                  ✅ This purchase order has been <strong>Fulfilled</strong>. All shipments have been sent.
                </div>
              )}

              {/* PO Items — grouped by port */}
              <div style={{ padding: '16px' }}>
                {Array.from(portGroups.entries()).map(([port, items]) => {
                  const portBPL = bplsByPort.get(port);
                  const allPortIds = items.map(i => i.id);
                  const allChecked = allPortIds.every(id => checkedItems.has(id));
                  const someChecked = allPortIds.some(id => checkedItems.has(id));
                  const checkedPortItems = items.filter(i => checkedItems.has(i.id));
                  const hasCheckedItems = checkedPortItems.length > 0;
                  const isPortAccepted = acceptedPorts.includes(port);
                  const isPortRejected = rejectedPorts.includes(port);
                  const canCreateBPL = isPortAccepted;
                  const poTerminated = ['rejected', 'cancelled'].includes(selectedPO.status);
                  const isToggling = togglingPort === port;
                  const bplSent = portBPL?.status === 'sent';
                  const toggleLocked = bplSent; // cannot change after BPL is sent

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
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {/* Port accept/reject toggle slider — hidden after BPL sent, locked only when BPL sent */}
                          {!bplSent && <div
                            onClick={() => !isToggling && !toggleLocked && handleTogglePort(port, isPortAccepted ? 'reject' : 'accept')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: toggleLocked ? 'not-allowed' : isToggling ? 'wait' : 'pointer', opacity: isToggling ? 0.6 : 1, userSelect: 'none' }}
                            title={toggleLocked ? 'Cannot change — BPL already sent' : isPortAccepted ? 'Click to reject this port' : 'Click to accept this port'}
                          >
                            {/* Track */}
                            <div
                              className="port-toggle-track"
                              style={{
                                width: '40px', height: '22px', borderRadius: '11px', position: 'relative', flexShrink: 0,
                                backgroundColor: isPortAccepted ? '#059669' : isPortRejected ? '#ef4444' : '#d1d5db',
                              }}
                            >
                              {/* Thumb */}
                              <div
                                className="port-toggle-thumb"
                                style={{
                                  position: 'absolute', top: '3px', width: '16px', height: '16px',
                                  borderRadius: '50%', backgroundColor: '#fff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                  transform: isPortAccepted ? 'translateX(21px)' : 'translateX(3px)',
                                }}
                              />
                            </div>
                            {/* Label */}
                            <span style={{
                              fontSize: '11px', fontWeight: 600, minWidth: '52px',
                              color: isPortAccepted ? '#059669' : isPortRejected ? '#ef4444' : '#9ca3af',
                            }}>
                              {isPortAccepted ? 'Accepted' : isPortRejected ? 'Rejected' : 'Pending'}
                            </span>
                          </div>}
                          {(selectedPO.status === 'rejected' || selectedPO.status === 'cancelled') && (
                            <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>PO not active</span>
                          )}
                          {!bplSent && (canCreateBPL && portBPL ? (
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
                          ) : (
                            <button
                              style={canCreateBPL && hasCheckedItems ? S.bplBtnActive : S.bplBtnDisabled}
                              disabled={!canCreateBPL || !hasCheckedItems}
                              onClick={() => canCreateBPL && setBplFormOpen({ portCode: port, items: checkedPortItems, existing: null })}
                              title={!canCreateBPL ? 'Accept this port to create a BPL' : hasCheckedItems ? `Create BPL for ${checkedPortItems.length} selected items` : 'Select items first'}
                            >
                              📦 Create BPL
                            </button>
                          ))}
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

                {/* Audit Log */}
                {auditLog.length > 0 && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>Activity</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditLog.map(entry => (
                        <div key={entry.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '12px' }}>
                          <div style={{ width: '130px', flexShrink: 0, color: '#9ca3af' }}>
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                          <div style={{ color: '#6b7280', width: '60px', flexShrink: 0, textTransform: 'capitalize' }}>
                            {entry.actor_role}
                          </div>
                          <div style={{ flex: 1, color: '#1f2937' }}>
                            <span style={{ fontWeight: 600 }}>{entry.actor_name || entry.actor_code}</span>
                            {' — '}
                            <span style={{ color: '#6b7280' }}>
                              {entry.from_status ? `${statusLabel(entry.from_status)} → ` : ''}{statusLabel(entry.to_status)}
                            </span>
                            {entry.notes && (
                              <span style={{ color: '#92400e', marginLeft: '8px', fontStyle: 'italic' }}>"{entry.notes}"</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* ── Reject Confirmation Dialog ── */}
      {confirmAction && selectedPO && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
        }} onClick={() => setConfirmAction(null)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '28px 32px',
            maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'poToastIn 0.2s ease-out',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              ✕ Reject Purchase Order?
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 16px' }}>
              You are rejecting {selectedPO.po_number}. Please provide a reason (optional).
            </p>
            <textarea
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
                fontSize: '13px', resize: 'vertical', outline: 'none', marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => handlePOAction('reject')}
                disabled={actionLoading}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                  cursor: actionLoading ? 'wait' : 'pointer', backgroundColor: '#dc2626',
                  color: '#fff', opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? 'Processing…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fulfill Confirmation Dialog ── */}
      {confirmFulfill && selectedPO && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
        }} onClick={() => setConfirmFulfill(false)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '28px 32px',
            maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'poToastIn 0.2s ease-out',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              ✓ Mark PO as Fulfilled?
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 20px' }}>
              This will mark <strong>{selectedPO.po_number}</strong> as fulfilled for all accepted ports at once — without requiring a Box Packaging List.
              <br /><br />
              Only use this if you are managing shipping details <strong>outside the portal</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmFulfill(false)}
                style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleFulfill}
                style={{ padding: '8px 20px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >Yes, Mark Fulfilled</button>
            </div>
          </div>
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
