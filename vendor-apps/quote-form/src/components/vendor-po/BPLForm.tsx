import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ─── Types ─────────────────────────────────────── */

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

interface Piece {
  key: string;
  piece_number: number;
  weight_kg: string; // string for form input
}

interface BoxEntry {
  key: string;
  po_item_id: number;
  box_number: number;
  pieces: Piece[];
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

interface BPLFormProps {
  poId: number;
  portCode: string;
  selectedItems: POItem[];
  existingBPL: ExistingBPL | null;
  onClose: () => void;
  onSaved: () => void;
}

/* ─── Styles (inline to avoid Tailwind v4 issues) ──── */

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', width: '90vw', maxWidth: '900px',
    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  },
  header: {
    padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0A3D5C', borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
  },
  headerTitle: { color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: 0 },
  headerSub: { color: '#93c5fd', fontSize: '12px', marginTop: '2px' },
  body: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  footer: {
    padding: '14px 24px', borderTop: '1px solid #e5e7eb',
    display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f9fafb',
    borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
    padding: '8px 10px', fontWeight: 600, textAlign: 'left', fontSize: '12px',
  },
  thRight: {
    backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
    padding: '8px 10px', fontWeight: 600, textAlign: 'right', fontSize: '12px',
  },
  thCenter: {
    backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
    padding: '8px 10px', fontWeight: 600, textAlign: 'center', fontSize: '12px',
  },
  td: {
    color: '#000', border: '1px solid #e2e8f0', padding: '6px 10px', verticalAlign: 'top',
  },
  tdRight: {
    color: '#000', border: '1px solid #e2e8f0', padding: '6px 10px', textAlign: 'right', verticalAlign: 'top',
  },
  tdCenter: {
    color: '#000', border: '1px solid #e2e8f0', padding: '6px 10px', textAlign: 'center', verticalAlign: 'top',
  },
  input: {
    width: '80px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px',
    fontSize: '13px', textAlign: 'right' as const, color: '#000',
  },
  inputSmall: {
    width: '55px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px',
    fontSize: '13px', textAlign: 'right' as const, color: '#000',
  },
  btnPrimary: {
    padding: '8px 20px', backgroundColor: '#0A3D5C', color: '#fff', border: 'none',
    borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  btnSuccess: {
    padding: '8px 20px', backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  btnCancel: {
    padding: '8px 20px', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  },
  btnDanger: {
    padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
    borderRadius: '4px', fontSize: '11px', cursor: 'pointer', lineHeight: '1',
  },
  btnAddBox: {
    padding: '5px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
    borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginTop: '6px',
  },
  sectionTitle: {
    fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', marginTop: '16px',
  },
  notes: {
    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '13px', color: '#000', resize: 'vertical' as const, minHeight: '50px',
  },
};

const badgeStyles = {
  draft: { backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
  completed: { backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
};


/* ─── Helpers ───────────────────────────────────── */

let _pcCounter = 0;
const makePiece = (num: number): Piece => ({
  key: `pc-${++_pcCounter}-${Math.random().toString(36).slice(2, 7)}`,
  piece_number: num,
  weight_kg: '',
});

const calcBoxTotal = (pieces: Piece[]): number =>
  pieces.reduce((s, p) => s + (parseFloat(p.weight_kg) || 0), 0);


/* ─── Component ─────────────────────────────────── */

const BPLForm: React.FC<BPLFormProps> = ({ poId, portCode, selectedItems, existingBPL, onClose, onSaved }) => {
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [airWayBill, setAirWayBill] = useState('');
  const [packedDate, setPackedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [boxEntries, setBoxEntries] = useState<BoxEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ── init from existing or defaults ── */
  useEffect(() => {
    if (existingBPL && existingBPL.boxes.length > 0) {
      setNotes(existingBPL.notes || '');
      setInvoiceNumber(existingBPL.invoice_number || '');
      setAirWayBill(existingBPL.air_way_bill || '');
      setPackedDate(existingBPL.packed_date || '');
      setExpiryDate(existingBPL.expiry_date || '');
      setBoxEntries(existingBPL.boxes.map((b, i) => ({
        key: `existing-${i}`,
        po_item_id: b.po_item_id,
        box_number: b.box_number,
        pieces: b.pieces && b.pieces.length > 0
          ? b.pieces.map((p, j) => ({
              key: `existing-pc-${i}-${j}`,
              piece_number: p.piece_number,
              weight_kg: String(p.weight_kg),
            }))
          : [makePiece(1)],
      })));
    } else {
      setBoxEntries(selectedItems.map((item, i) => ({
        key: `new-${item.id}-${i}`,
        po_item_id: item.id,
        box_number: i + 1,
        pieces: [makePiece(1)],
      })));
    }
  }, [existingBPL, selectedItems]);

  /* ── state helpers ── */

  const updatePieceWeight = (boxKey: string, pieceKey: string, value: string) => {
    setBoxEntries(prev => prev.map(box =>
      box.key !== boxKey ? box : {
        ...box,
        pieces: box.pieces.map(p => p.key !== pieceKey ? p : { ...p, weight_kg: value }),
      }
    ));
  };

  const setNumPieces = (boxKey: string, count: number) => {
    if (count < 1) count = 1;
    if (count > 50) count = 50;
    setBoxEntries(prev => prev.map(box => {
      if (box.key !== boxKey) return box;
      const current = box.pieces;
      if (count === current.length) return box;
      if (count > current.length) {
        const extras = Array.from({ length: count - current.length }, (_, i) =>
          makePiece(current.length + i + 1)
        );
        return { ...box, pieces: [...current, ...extras] };
      }
      return { ...box, pieces: current.slice(0, count) };
    }));
  };

  const updateBoxNumber = (boxKey: string, value: number) => {
    setBoxEntries(prev => prev.map(b => b.key !== boxKey ? b : { ...b, box_number: value }));
  };

  const addBox = (poItemId: number) => {
    const existing = boxEntries.filter(b => b.po_item_id === poItemId);
    const maxBox = existing.reduce((m, b) => Math.max(m, b.box_number), 0);
    setBoxEntries(prev => [...prev, {
      key: `add-${poItemId}-${Date.now()}`,
      po_item_id: poItemId,
      box_number: maxBox + 1,
      pieces: [makePiece(1)],
    }]);
  };

  const removeBox = (boxKey: string) => {
    setBoxEntries(prev => prev.filter(b => b.key !== boxKey));
  };

  /* ── validate ── */
  const validate = (): string | null => {
    if (boxEntries.length === 0) return 'Add at least one box entry';
    for (const box of boxEntries) {
      if (box.pieces.length === 0) return `Box #${box.box_number}: Must have at least 1 piece`;
      for (let i = 0; i < box.pieces.length; i++) {
        const w = parseFloat(box.pieces[i].weight_kg);
        if (isNaN(w) || w <= 0) return `Box #${box.box_number}, Pc ${i + 1}: Weight must be > 0`;
      }
    }
    return null;
  };

  /* ── save ── */
  const doSave = async (status: 'draft' | 'completed') => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);

    try {
      const resp = await fetch(`${API_BASE_URL}/vendors/purchase-orders/bpl/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId,
          port_code: portCode,
          status,
          notes: notes || null,
          invoice_number: invoiceNumber || null,
          air_way_bill: airWayBill || null,
          packed_date: packedDate || null,
          expiry_date: expiryDate || null,
          po_item_ids: selectedItems.map(i => i.id),
          boxes: boxEntries.map(box => ({
            po_item_id: box.po_item_id,
            box_number: box.box_number,
            num_pieces: box.pieces.length,
            pieces: box.pieces.map((p, idx) => ({
              piece_number: idx + 1,
              weight_kg: parseFloat(p.weight_kg),
            })),
          })),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.detail || 'Failed to save');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  /* ── group boxes by po_item_id ── */
  const groupedByItem: Map<number, BoxEntry[]> = new Map();
  for (const entry of boxEntries) {
    const arr = groupedByItem.get(entry.po_item_id) || [];
    arr.push(entry);
    groupedByItem.set(entry.po_item_id, arr);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.headerTitle}>Box Packaging List — Port {portCode}</div>
            <div style={S.headerSub}>
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              {existingBPL && (
                <span style={{ marginLeft: '12px', ...(existingBPL.status === 'completed' ? badgeStyles.completed : badgeStyles.draft) }}>
                  {existingBPL.status === 'completed' ? '✓ Completed' : 'Draft'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── Shipment header fields ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
            marginBottom: '18px', padding: '14px 16px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          }}>
            {/* Invoice # */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Invoice #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="INV-0001"
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', color: '#000' }}
              />
            </div>

            {/* Air Way Bill # */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Air Way Bill #
              </label>
              <input
                type="text"
                value={airWayBill}
                onChange={e => setAirWayBill(e.target.value)}
                placeholder="AWB-000-0000-0000"
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', color: '#000' }}
              />
            </div>

            {/* Total Boxes (read-only, auto-computed) */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Total Boxes
              </label>
              <div style={{
                padding: '6px 8px', backgroundColor: '#e2e8f0', borderRadius: '4px',
                fontSize: '14px', fontWeight: 700, color: '#0A3D5C', textAlign: 'center',
              }}>
                {boxEntries.length}
              </div>
            </div>

            {/* Packed Date */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Packed Date
              </label>
              <input
                type="date"
                value={packedDate}
                onChange={e => setPackedDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', color: '#000' }}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', color: '#000' }}
              />
            </div>
          </div>

          {/* Reference: selected PO items */}
          <div style={{ ...S.sectionTitle, marginTop: 0 }}>PO Items (reference)</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Fish</th>
                <th style={S.th}>Cut</th>
                <th style={S.th}>Grade</th>
                <th style={S.thRight}>Size</th>
                <th style={S.thRight}>Order (kg)</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item, idx) => (
                <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={S.td}>{item.fish_name}</td>
                  <td style={S.td}>{item.cut_name}</td>
                  <td style={S.td}>{item.grade_name}</td>
                  <td style={S.tdRight}>{item.fish_size || '-'}</td>
                  <td style={{ ...S.tdRight, fontWeight: 600 }}>{Number(item.order_weight_kg).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Box entries grouped by PO item */}
          <div style={S.sectionTitle}>Box Details</div>

          {selectedItems.map(item => {
            const boxes = groupedByItem.get(item.id) || [];
            const itemTotal = boxes.reduce((s, b) => s + calcBoxTotal(b.pieces), 0);

            return (
              <div key={item.id} style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Item sub-header */}
                <div style={{
                  padding: '8px 12px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {item.fish_name} · {item.cut_name} · {item.grade_name}
                    {item.fish_size && <span style={{ color: '#6b7280' }}> · {item.fish_size}</span>}
                  </span>
                  <span style={{ fontSize: '12px', color: itemTotal > 0 ? '#059669' : '#9ca3af' }}>
                    Packed: {itemTotal.toFixed(1)} / {Number(item.order_weight_kg).toLocaleString()} kg
                  </span>
                </div>

                {/* Boxes table */}
                <table style={{ ...S.table, margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...S.thCenter, width: '60px' }}>Box #</th>
                      <th style={{ ...S.thCenter, width: '70px' }}># Pieces</th>
                      <th style={S.th}>Individual Wt (KG)</th>
                      <th style={{ ...S.thRight, width: '100px' }}>Total Wt (KG)</th>
                      <th style={{ ...S.thCenter, width: '44px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map(box => {
                      const boxTotal = calcBoxTotal(box.pieces);
                      return (
                        <tr key={box.key}>
                          {/* Box # */}
                          <td style={S.tdCenter}>
                            <input
                              type="number"
                              min={1}
                              value={box.box_number}
                              onChange={e => updateBoxNumber(box.key, parseInt(e.target.value) || 1)}
                              style={{ ...S.inputSmall, textAlign: 'center' }}
                            />
                          </td>

                          {/* # Pieces */}
                          <td style={S.tdCenter}>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={box.pieces.length}
                              onChange={e => setNumPieces(box.key, parseInt(e.target.value) || 1)}
                              style={{ ...S.inputSmall, textAlign: 'center' }}
                            />
                          </td>

                          {/* Individual piece weights */}
                          <td style={S.td}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              {box.pieces.map((pc, idx) => (
                                <div key={pc.key} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontSize: '11px', color: '#6b7280', minWidth: '28px' }}>
                                    Pc{idx + 1}:
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={pc.weight_kg}
                                    onChange={e => updatePieceWeight(box.key, pc.key, e.target.value)}
                                    style={S.input}
                                    placeholder="0.00"
                                  />
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Total weight */}
                          <td style={{ ...S.tdRight, fontWeight: 600, color: boxTotal > 0 ? '#059669' : '#9ca3af', fontSize: '14px' }}>
                            {boxTotal > 0 ? boxTotal.toFixed(1) : '-'}
                          </td>

                          {/* Remove */}
                          <td style={S.tdCenter}>
                            {boxes.length > 1 && (
                              <button onClick={() => removeBox(box.key)} style={S.btnDanger} title="Remove box">×</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add box button */}
                <div style={{ padding: '6px 12px', borderTop: '1px solid #e2e8f0' }}>
                  <button onClick={() => addBox(item.id)} style={S.btnAddBox}>+ Add Box</button>
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div style={S.sectionTitle}>Notes (optional)</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={S.notes}
            placeholder="Any additional notes about this shipment…"
          />

          {error && (
            <div style={{
              marginTop: '10px', padding: '8px 12px',
              backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px',
              fontSize: '13px', border: '1px solid #fecaca',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button onClick={onClose} style={S.btnCancel}>Cancel</button>
          <button onClick={() => doSave('draft')} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '💾 Save Draft'}
          </button>
          <button onClick={() => doSave('completed')} disabled={saving} style={{ ...S.btnSuccess, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '✓ Save & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BPLForm;
