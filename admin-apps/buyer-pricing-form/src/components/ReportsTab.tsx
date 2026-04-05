import React, { useState, useEffect } from 'react';

interface Company {
  company_id: number;
  company_name: string;
}

interface ReportItem {
  po_id: number;
  po_number: string;
  quote_id: number | null;
  estimate_id: number;
  estimate_number: string;
  company_id: number;
  company_name: string;
  vendor_code: string;
  fish_name: string;
  cut_name: string;
  grade_name: string;
  fish_size: string | null;
  port_code: string;
  vendor_price_per_kg: number | null;
  fulfilled_weight_kg: number | null;
  fulfilled_weight_lbs: number | null;
  buyer_price_per_lb: number | null;
  weight_pct: number | null;
  clearing_per_lb: number | null;
  total_clearing_price: number | null;
  margin_per_lb: number | null;
}

interface ReportsTabProps {
  companies: Company[];
  apiBaseUrl: string;
}

const fmt = (v: number | null | undefined, decimals = 2): string =>
  v != null ? Number(v).toFixed(decimals) : '—';

const num = (v: number | null | undefined, decimals = 2): string =>
  v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

// ─── Design tokens ──────────────────────────────────────────────────────────
const TOKEN = {
  // section accent colours (left border + header gradient)
  info:   { accent: '#6b7280', from: '#374151', to: '#4b5563', text: '#f9fafb', rowText: '#111827', rowBorder: '#f3f4f6' },
  vendor: { accent: '#3b82f6', from: '#1d4ed8', to: '#2563eb', text: '#fff',    rowText: '#1e3a5f', rowBorder: '#dbeafe', rowBg: '#f8faff' },
  buyer:  { accent: '#10b981', from: '#065f46', to: '#059669', text: '#fff',    rowText: '#064e3b', rowBorder: '#d1fae5', rowBg: '#f6fef9' },
  margin: { accent: '#8b5cf6', from: '#6d28d9', to: '#7c3aed', text: '#fff',    rowText: '#3b0764', rowBorder: '#ede9fe', rowBg: '#faf5ff' },
};

const SECTION_BORDER = '2px solid';

// Header cell shared style factory
const thGroup = (t: typeof TOKEN.info, isFirst = false): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
  color: t.text,
  padding: '8px 14px',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'center',
  borderBottom: `1px solid ${t.accent}33`,
  borderLeft: isFirst ? `${SECTION_BORDER} ${t.accent}` : undefined,
  whiteSpace: 'nowrap',
});

const thCol = (t: typeof TOKEN.info, align: 'left' | 'right' = 'right', isFirst = false): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${t.from}ee, ${t.from}cc)`,
  color: t.text,
  padding: '7px 12px',
  fontSize: '11px',
  fontWeight: 600,
  textAlign: align,
  whiteSpace: 'nowrap',
  borderBottom: `2px solid ${t.accent}`,
  borderLeft: isFirst ? `${SECTION_BORDER} ${t.accent}` : undefined,
  letterSpacing: '0.02em',
});

// Data cell factory
const td = (
  t: typeof TOKEN.info,
  align: 'left' | 'right' = 'right',
  isFirst = false,
  extra: React.CSSProperties = {}
): React.CSSProperties => ({
  padding: '8px 12px',
  fontSize: '12.5px',
  color: t.rowText,
  backgroundColor: (t as any).rowBg ?? 'transparent',
  borderBottom: `1px solid ${t.rowBorder}`,
  textAlign: align,
  borderLeft: isFirst ? `${SECTION_BORDER} ${t.accent}` : undefined,
  fontVariantNumeric: 'tabular-nums',
  ...extra,
});

const ReportsTab: React.FC<ReportsTabProps> = ({ companies, apiBaseUrl }) => {
  const [allItems, setAllItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companyPanelOpen, setCompanyPanelOpen] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/buyer-pricing/buyer-estimates/reports/fulfilled-pos`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setAllItems(data.items);
        else setError('Failed to load report data.');
      })
      .catch(() => setError('Network error — could not load report.'))
      .finally(() => setLoading(false));
  }, [apiBaseUrl]);

  const companyItems = selectedCompanyId
    ? allItems.filter(i => i.company_id === selectedCompanyId)
    : [];

  const poGroups = companyItems.reduce<Map<number, ReportItem[]>>((map, item) => {
    const arr = map.get(item.po_id) ?? [];
    arr.push(item);
    map.set(item.po_id, arr);
    return map;
  }, new Map());

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

      {/* ── Company sidebar ── */}
      <div style={{
        width: companyPanelOpen ? '220px' : '0px',
        minWidth: companyPanelOpen ? '220px' : '0px',
        overflow: 'hidden', transition: 'all 0.2s ease', flexShrink: 0,
      }}>
        <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Companies
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {companies.map(company => {
              const active = selectedCompanyId === company.company_id;
              return (
                <button
                  key={company.company_id}
                  onClick={() => setSelectedCompanyId(company.company_id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: active ? '1px solid #bfdbfe' : '1px solid transparent',
                    background: active ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'transparent',
                    color: active ? '#1d4ed8' : '#374151',
                    fontWeight: active ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {company.company_name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Toggle bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => setCompanyPanelOpen(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '6px', fontSize: '11.5px', fontWeight: 600,
              color: '#64748b', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {companyPanelOpen
                ? <><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></>
                : <><path d="M13 7l5 5-5 5"/><path d="M6 7l5 5-5 5"/></>
              }
            </svg>
            {companyPanelOpen ? 'Hide' : `Companies (${companies.length})`}
          </button>
          {selectedCompanyId && !companyPanelOpen && (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              {companies.find(c => c.company_id === selectedCompanyId)?.company_name}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '64px 0', fontSize: '13px' }}>
            Loading report…
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', color: '#ef4444', padding: '64px 0', fontSize: '13px' }}>
            {error}
          </div>
        )}
        {!loading && !error && !selectedCompanyId && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '64px 0', fontSize: '13px' }}>
            {companyPanelOpen ? 'Select a company to view fulfilled POs' : 'Click "Companies" to show the list'}
          </div>
        )}
        {!loading && !error && selectedCompanyId && companyItems.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '64px 0', fontSize: '13px' }}>
            No fulfilled purchase orders for this company.
          </div>
        )}

        {!loading && !error && selectedCompanyId && companyItems.length > 0 && (
          <div>
            {/* Title + legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
                Fulfilled POs —{' '}
                <span style={{ color: '#1d4ed8' }}>
                  {companies.find(c => c.company_id === selectedCompanyId)?.company_name}
                </span>
              </h3>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {([
                  { label: 'Vendor', t: TOKEN.vendor },
                  { label: 'Buyer',  t: TOKEN.buyer  },
                  { label: 'Margin', t: TOKEN.margin },
                ] as const).map(({ label, t }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '3px',
                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                      display: 'inline-block',
                    }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{
              overflowX: 'auto',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
            }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '1340px', width: '100%' }}>
                <thead>
                  {/* ── Group header row ── */}
                  <tr>
                    <th colSpan={5} style={thGroup(TOKEN.info)}>Item Details</th>
                    <th colSpan={5} style={thGroup(TOKEN.vendor, true)}>Vendor</th>
                    <th colSpan={6} style={thGroup(TOKEN.buyer, true)}>Buyer</th>
                    <th colSpan={1} style={thGroup(TOKEN.margin, true)}>Margin</th>
                  </tr>
                  {/* ── Column header row ── */}
                  <tr>
                    {(['Fish','Cut','Grade','Size','Port'] as const).map((h, i) => (
                      <th key={h} style={thCol(TOKEN.info, 'left')}>{h}</th>
                    ))}
                    {(['Vendor','Price/kg','Wt (kg)','Wt (lbs)','Invoice'] as const).map((h, i) => (
                      <th key={h} style={thCol(TOKEN.vendor, i === 0 ? 'left' : 'right', i === 0)}>{h}</th>
                    ))}
                    {(['Price/lb','Wt %','Clearing/lb','Clearing Total','Total/lb','Invoice'] as const).map((h, i) => (
                      <th key={h} style={thCol(TOKEN.buyer, 'right', i === 0)}>{h}</th>
                    ))}
                    <th style={thCol(TOKEN.margin, 'right', true)}>Margin/lb</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(poGroups.entries()).map(([poId, items], groupIdx) => {
                    const first = items[0];
                    return (
                      <React.Fragment key={poId}>
                        {/* ── PO group separator (not before first group) ── */}
                        {groupIdx > 0 && (
                          <tr>
                            <td colSpan={17} style={{ padding: 0, height: '6px', background: '#f1f5f9', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }} />
                          </tr>
                        )}
                        {/* ── PO banner row ── */}
                        {(() => {
                          const ports   = [...new Set(items.map(i => i.port_code))];
                          const vendors = [...new Set(items.map(i => i.vendor_code))];
                          const totalVendorInvoice = items.reduce((s, i) =>
                            i.vendor_price_per_kg != null && i.fulfilled_weight_kg != null
                              ? s + i.vendor_price_per_kg * i.fulfilled_weight_kg : s, 0);
                          const totalBuyerInvoice = items.reduce((s, i) =>
                            i.buyer_price_per_lb != null && i.clearing_per_lb != null && i.fulfilled_weight_lbs != null
                              ? s + (i.buyer_price_per_lb + i.clearing_per_lb) * i.fulfilled_weight_lbs : s, 0);

                          const chip = (label: string, bg: string, color: string) => (
                            <span style={{
                              display: 'inline-block', padding: '1px 8px', borderRadius: '999px',
                              fontSize: '11px', fontWeight: 600, background: bg, color,
                            }}>{label}</span>
                          );

                          return (
                            <tr>
                              <td colSpan={17} style={{
                                padding: '7px 14px',
                                background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)',
                                borderBottom: '1px solid #e2e8f0',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                  {/* PO identifier */}
                                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                                    {first.po_number}
                                  </span>
                                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Est: <strong style={{ color: '#334155' }}>{first.estimate_number}</strong>
                                  </span>
                                  {first.quote_id && (
                                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                      Q: <strong style={{ color: '#334155' }}>#{first.quote_id}</strong>
                                    </span>
                                  )}

                                  {/* Divider */}
                                  <span style={{ width: 1, height: 14, background: '#cbd5e1', flexShrink: 0 }} />

                                  {/* Ports */}
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {ports.map(p => chip(p, '#eff6ff', '#1d4ed8'))}
                                  </span>

                                  {/* Vendors */}
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {vendors.map(v => chip(v, '#f0fdf4', '#065f46'))}
                                  </span>

                                  {/* Divider */}
                                  <span style={{ width: 1, height: 14, background: '#cbd5e1', flexShrink: 0 }} />

                                  {/* Vendor invoice total */}
                                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Vendor:{' '}
                                    <strong style={{ color: '#1e3a5f', fontVariantNumeric: 'tabular-nums' }}>
                                      ${num(totalVendorInvoice)}
                                    </strong>
                                  </span>

                                  {/* Buyer invoice total */}
                                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    Buyer:{' '}
                                    <strong style={{ color: '#064e3b', fontVariantNumeric: 'tabular-nums' }}>
                                      ${num(totalBuyerInvoice)}
                                    </strong>
                                  </span>

                                  {/* Item count */}
                                  <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
                                    {items.length} {items.length === 1 ? 'item' : 'items'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}

                        {/* ── Item rows ── */}
                        {items.map((item, idx) => {
                          const rowKey = `${poId}-${idx}`;
                          const isHovered = hoveredRow === rowKey;
                          const isAlt = idx % 2 === 1;

                          const vendorInvoice =
                            item.vendor_price_per_kg != null && item.fulfilled_weight_kg != null
                              ? item.vendor_price_per_kg * item.fulfilled_weight_kg
                              : null;
                          const buyerInvoice =
                            item.buyer_price_per_lb != null && item.clearing_per_lb != null && item.fulfilled_weight_lbs != null
                              ? (item.buyer_price_per_lb + item.clearing_per_lb) * item.fulfilled_weight_lbs
                              : null;

                          const infoBg   = isHovered ? '#f0f9ff' : isAlt ? '#fafafa' : '#fff';
                          const vendorBg = isHovered ? '#e8f0fe' : TOKEN.vendor.rowBg;
                          const buyerBg  = isHovered ? '#e8faf3' : TOKEN.buyer.rowBg;
                          const marginBg = isHovered ? '#f0ebff' : TOKEN.margin.rowBg;

                          return (
                            <tr
                              key={rowKey}
                              style={{ transition: 'background 0.1s' }}
                              onMouseEnter={() => setHoveredRow(rowKey)}
                              onMouseLeave={() => setHoveredRow(null)}
                            >
                              {/* Info — Fish/Cut/Grade/Size/Port only */}
                              <td style={{ ...td(TOKEN.info, 'left'), backgroundColor: infoBg, fontWeight: 600 }}>
                                {item.fish_name}
                              </td>
                              <td style={{ ...td(TOKEN.info, 'left'), backgroundColor: infoBg }}>{item.cut_name}</td>
                              <td style={{ ...td(TOKEN.info, 'left'), backgroundColor: infoBg }}>{item.grade_name}</td>
                              <td style={{ ...td(TOKEN.info, 'left'), backgroundColor: infoBg, color: '#6b7280' }}>
                                {item.fish_size || '—'}
                              </td>
                              <td style={{ ...td(TOKEN.info, 'left'), backgroundColor: infoBg }}>
                                <span style={{
                                  display: 'inline-block', padding: '1px 8px',
                                  borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                                  background: '#f3f4f6', color: '#374151',
                                }}>
                                  {item.port_code}
                                </span>
                              </td>

                              {/* Vendor */}
                              <td style={{ ...td(TOKEN.vendor, 'left', true), backgroundColor: vendorBg, fontWeight: 600 }}>
                                {item.vendor_code}
                              </td>
                              <td style={{ ...td(TOKEN.vendor, 'right'), backgroundColor: vendorBg }}>
                                ${num(item.vendor_price_per_kg)}
                              </td>
                              <td style={{ ...td(TOKEN.vendor, 'right'), backgroundColor: vendorBg, fontWeight: 600 }}>
                                {num(item.fulfilled_weight_kg)}
                              </td>
                              <td style={{ ...td(TOKEN.vendor, 'right'), backgroundColor: vendorBg }}>
                                {num(item.fulfilled_weight_lbs)}
                              </td>
                              <td style={{ ...td(TOKEN.vendor, 'right'), backgroundColor: vendorBg }}>
                                {vendorInvoice != null
                                  ? <span style={{ fontWeight: 700 }}>${num(vendorInvoice)}</span>
                                  : '—'}
                              </td>

                              {/* Buyer */}
                              <td style={{ ...td(TOKEN.buyer, 'right', true), backgroundColor: buyerBg }}>
                                ${num(item.buyer_price_per_lb)}
                              </td>
                              <td style={{ ...td(TOKEN.buyer, 'right'), backgroundColor: buyerBg, fontWeight: 600, color: '#065f46' }}>
                                {item.weight_pct != null ? `${fmt(item.weight_pct, 1)}%` : '—'}
                              </td>
                              <td style={{ ...td(TOKEN.buyer, 'right'), backgroundColor: buyerBg, fontFamily: 'monospace', fontSize: '11.5px' }}>
                                {item.clearing_per_lb != null ? `$${fmt(item.clearing_per_lb, 4)}` : '—'}
                              </td>
                              <td style={{ ...td(TOKEN.buyer, 'right'), backgroundColor: buyerBg }}>
                                {item.total_clearing_price != null ? `$${num(item.total_clearing_price)}` : '—'}
                              </td>
                              <td style={{ ...td(TOKEN.buyer, 'right'), backgroundColor: buyerBg, fontWeight: 600 }}>
                                {item.buyer_price_per_lb != null && item.clearing_per_lb != null
                                  ? `$${fmt(item.buyer_price_per_lb + item.clearing_per_lb)}`
                                  : '—'}
                              </td>
                              <td style={{ ...td(TOKEN.buyer, 'right'), backgroundColor: buyerBg }}>
                                {buyerInvoice != null
                                  ? <span style={{ fontWeight: 700 }}>${num(buyerInvoice)}</span>
                                  : '—'}
                              </td>

                              {/* Margin */}
                              <td style={{ ...td(TOKEN.margin, 'right', true), backgroundColor: marginBg, fontWeight: 700 }}>
                                {item.margin_per_lb != null ? `$${fmt(item.margin_per_lb)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
