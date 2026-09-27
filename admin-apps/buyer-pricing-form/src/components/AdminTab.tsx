import React, { useState, useEffect } from 'react';
import ClearingPricingForm from './ClearingPricingForm';

interface Props { apiBaseUrl: string; }

type AdminSection = 'vendors' | 'products' | 'destinations' | 'clearing';
type ProductTab = 'species' | 'cut' | 'grade' | 'size';

interface Vendor { id: number; code: string; name: string; contact_email: string; country: string; active: boolean; }
interface FishSpecies { id: number; common_name: string; scientific_name: string; }
interface FishCut { id: number; code: string; name: string; }
interface FishGrade { id: number; code: string; name: string; }
interface FishSize {
  id: number; fish_species_id: number; species_name: string;
  cut_id: number | null; cut_name: string | null;
  kg_label: number; kg_max: number | null;
  lbs_label: number; lbs_max: number | null;
  sort_order: number; active: boolean;
}
interface Destination { id: number; code: string; name: string; description?: string; }

const inp = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
const lbl = "block text-xs font-medium text-gray-600 mb-1";
const btnP = "px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed";
const btnS = "px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm border border-gray-300 hover:bg-gray-200";
const editBtn = "px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50";
const delBtn = "px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50";

const navItems: { key: AdminSection; label: string }[] = [
  { key: 'vendors', label: 'Vendors' },
  { key: 'products', label: 'Products' },
  { key: 'destinations', label: 'Destinations' },
  { key: 'clearing', label: 'Clearing Pricing' },
];

function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const isErr = msg.startsWith('Error');
  return (
    <div className={`px-4 py-2 rounded text-sm mb-4 ${isErr ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
      {msg}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  return { toast, show };
}

// ─── Vendors ──────────────────────────────────────────────────

function VendorsSection({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '', contact_email: '', country: '' });
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  const load = async () => {
    const res = await fetch(`${apiBaseUrl}/vendors/`);
    if (res.ok) setVendors(await res.json());
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditId(null); setForm({ code: '', name: '', contact_email: '', country: '' }); };

  const startEdit = (v: Vendor) => {
    setEditId(v.id);
    setForm({ code: v.code, name: v.name, contact_email: v.contact_email, country: v.country });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const url = editId ? `${apiBaseUrl}/vendors/${editId}` : `${apiBaseUrl}/vendors/`;
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      show(editId ? 'Vendor updated' : 'Vendor added');
      reset(); load();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (v: Vendor) => {
    if (!window.confirm(`Deactivate vendor "${v.name}"? They will no longer appear in forms.`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/vendors/${v.id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      show('Vendor deactivated');
      load();
    } catch (err: any) { show(`Error: ${err.message}`); }
  };

  return (
    <div className="space-y-6">
      <Toast msg={toast} />
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Vendor' : 'Add Vendor'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Code *</label>
            <input className={inp} required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. JSF" /></div>
          <div><label className={lbl}>Name *</label>
            <input className={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor name" /></div>
          <div><label className={lbl}>Contact Email *</label>
            <input className={inp} required type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="vendor@example.com" /></div>
          <div><label className={lbl}>Country *</label>
            <input className={inp} required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. India" /></div>
          <div className="col-span-2 flex justify-end gap-2">
            {editId && <button type="button" className={btnS} onClick={reset}>Cancel</button>}
            <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Vendor' : 'Add Vendor'}</button>
          </div>
        </form>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">Vendors ({vendors.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              {['Code', 'Name', 'Email', 'Country', 'Active', ''].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vendors.map(v => (
                <tr key={v.id} className={`border-t border-gray-100 hover:bg-gray-50 ${editId === v.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{v.code}</td>
                  <td className="px-4 py-2">{v.name}</td>
                  <td className="px-4 py-2 text-gray-600">{v.contact_email}</td>
                  <td className="px-4 py-2">{v.country}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button className={editBtn} onClick={() => startEdit(v)}>Edit</button>
                      {v.active && <button className={delBtn} onClick={() => handleDelete(v)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">No vendors</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────

function ProductsSection({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [tab, setTab] = useState<ProductTab>('species');
  const [species, setSpecies] = useState<FishSpecies[]>([]);
  const [cuts, setCuts] = useState<FishCut[]>([]);
  const [grades, setGrades] = useState<FishGrade[]>([]);
  const [sizes, setSizes] = useState<FishSize[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [speciesForm, setSpeciesForm] = useState({ common_name: '', scientific_name: '' });
  const [cutForm, setCutForm] = useState({ code: '', name: '' });
  const [gradeForm, setGradeForm] = useState({ code: '', name: '' });
  const [sizeForm, setSizeForm] = useState({ fish_species_id: '', cut_id: '', kg_label: '', kg_max: '', lbs_label: '', lbs_max: '', sort_order: '0' });
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  const loadAll = async () => {
    const [s, c, g, sz] = await Promise.all([
      fetch(`${apiBaseUrl}/fish/types`).then(r => r.ok ? r.json() : []),
      fetch(`${apiBaseUrl}/fish/cut`).then(r => r.ok ? r.json() : []),
      fetch(`${apiBaseUrl}/fish/grade`).then(r => r.ok ? r.json() : []),
      fetch(`${apiBaseUrl}/dictionary/fish-sizes`).then(r => r.ok ? r.json() : []),
    ]);
    setSpecies(s); setCuts(c); setGrades(g); setSizes(sz);
  };
  useEffect(() => { loadAll(); }, []);

  const resetEdit = () => {
    setEditId(null);
    setSpeciesForm({ common_name: '', scientific_name: '' });
    setCutForm({ code: '', name: '' });
    setGradeForm({ code: '', name: '' });
    setSizeForm({ fish_species_id: '', cut_id: '', kg_label: '', kg_max: '', lbs_label: '', lbs_max: '', sort_order: '0' });
  };

  const post = async (url: string, method: string, body: object) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed'); }
    return res.json();
  };

  const handleSpecies = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editId ? `${apiBaseUrl}/fish/types/${editId}` : `${apiBaseUrl}/fish/types`;
      await post(url, editId ? 'PUT' : 'POST', speciesForm);
      show(editId ? 'Species updated' : 'Species added');
      resetEdit(); loadAll();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleCut = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editId ? `${apiBaseUrl}/fish/cut/${editId}` : `${apiBaseUrl}/fish/cut`;
      await post(url, editId ? 'PUT' : 'POST', cutForm);
      show(editId ? 'Cut updated' : 'Cut added');
      resetEdit(); loadAll();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editId ? `${apiBaseUrl}/fish/grade/${editId}` : `${apiBaseUrl}/fish/grade`;
      await post(url, editId ? 'PUT' : 'POST', gradeForm);
      show(editId ? 'Grade updated' : 'Grade added');
      resetEdit(); loadAll();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleSize = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body = {
      fish_species_id: parseInt(sizeForm.fish_species_id),
      cut_id: sizeForm.cut_id ? parseInt(sizeForm.cut_id) : null,
      kg_label: parseFloat(sizeForm.kg_label),
      kg_max: sizeForm.kg_max ? parseFloat(sizeForm.kg_max) : null,
      lbs_label: parseFloat(sizeForm.lbs_label),
      lbs_max: sizeForm.lbs_max ? parseFloat(sizeForm.lbs_max) : null,
      sort_order: parseInt(sizeForm.sort_order) || 0,
    };
    try {
      const url = editId ? `${apiBaseUrl}/dictionary/fish-sizes/${editId}` : `${apiBaseUrl}/dictionary/fish-sizes`;
      await post(url, editId ? 'PUT' : 'POST', body);
      show(editId ? 'Size updated' : 'Size added');
      resetEdit(); loadAll();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  const doDelete = async (url: string, confirm_msg: string, success_msg: string) => {
    if (!window.confirm(confirm_msg)) return;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed'); }
      show(success_msg); loadAll();
    } catch (err: any) { show(`Error: ${err.message}`); }
  };

  const subTabs: { key: ProductTab; label: string }[] = [
    { key: 'species', label: 'Fish Species' },
    { key: 'cut', label: 'Cut' },
    { key: 'grade', label: 'Grade' },
    { key: 'size', label: 'Fish Size' },
  ];

  const speciesId = sizeForm.fish_species_id ? parseInt(sizeForm.fish_species_id) : null;
  const existingForSpecies = speciesId ? sizes.filter(s => s.fish_species_id === speciesId) : [];
  const filteredSizes = speciesId ? existingForSpecies : sizes;

  return (
    <div className="space-y-4">
      <Toast msg={toast} />
      <div className="flex space-x-1 border-b border-gray-200">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); resetEdit(); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-b-2 border-blue-500 text-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Species */}
      {tab === 'species' && (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Species' : 'Add Fish Species'}</h3>
            <form onSubmit={handleSpecies} className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Common Name *</label>
                <input className={inp} required value={speciesForm.common_name}
                  onChange={e => setSpeciesForm(f => ({ ...f, common_name: e.target.value }))} placeholder="e.g. Anchovy" /></div>
              <div><label className={lbl}>Scientific Name *</label>
                <input className={inp} required value={speciesForm.scientific_name}
                  onChange={e => setSpeciesForm(f => ({ ...f, scientific_name: e.target.value }))} placeholder="e.g. Engraulis encrasicolus" /></div>
              <div className="col-span-2 flex justify-end gap-2">
                {editId && <button type="button" className={btnS} onClick={resetEdit}>Cancel</button>}
                <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add Species'}</button>
              </div>
            </form>
          </div>
          <EditableTable headers={['Common Name', 'Scientific Name']}
            rows={species.map(s => ({
              id: s.id,
              cells: [s.common_name, <i className="text-gray-500">{s.scientific_name}</i>],
              onEdit: () => { setEditId(s.id); setSpeciesForm({ common_name: s.common_name, scientific_name: s.scientific_name }); window.scrollTo({ top: 0, behavior: 'smooth' }); },
              onDelete: () => doDelete(`${apiBaseUrl}/fish/types/${s.id}`, `Deactivate species "${s.common_name}"?`, 'Species deactivated'),
              isEditing: editId === s.id,
            }))} />
        </div>
      )}

      {/* Cut */}
      {tab === 'cut' && (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Cut' : 'Add Fish Cut'}</h3>
            <form onSubmit={handleCut} className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Code *</label>
                <input className={inp} required value={cutForm.code}
                  onChange={e => setCutForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. WR" /></div>
              <div><label className={lbl}>Name *</label>
                <input className={inp} required value={cutForm.name}
                  onChange={e => setCutForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Whole Round" /></div>
              <div className="col-span-2 flex justify-end gap-2">
                {editId && <button type="button" className={btnS} onClick={resetEdit}>Cancel</button>}
                <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add Cut'}</button>
              </div>
            </form>
          </div>
          <EditableTable headers={['Code', 'Name']}
            rows={cuts.map(c => ({
              id: c.id,
              cells: [<span className="font-mono text-xs">{c.code}</span>, c.name],
              onEdit: () => { setEditId(c.id); setCutForm({ code: c.code, name: c.name }); window.scrollTo({ top: 0, behavior: 'smooth' }); },
              onDelete: () => doDelete(`${apiBaseUrl}/fish/cut/${c.id}`, `Delete cut "${c.name}"? This will fail if it's used in existing quotes.`, 'Cut deleted'),
              isEditing: editId === c.id,
            }))} />
        </div>
      )}

      {/* Grade */}
      {tab === 'grade' && (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Grade' : 'Add Fish Grade'}</h3>
            <form onSubmit={handleGrade} className="grid grid-cols-2 gap-4">
              <div><label className={lbl}>Code *</label>
                <input className={inp} required value={gradeForm.code}
                  onChange={e => setGradeForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. A" /></div>
              <div><label className={lbl}>Name *</label>
                <input className={inp} required value={gradeForm.name}
                  onChange={e => setGradeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Grade A" /></div>
              <div className="col-span-2 flex justify-end gap-2">
                {editId && <button type="button" className={btnS} onClick={resetEdit}>Cancel</button>}
                <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add Grade'}</button>
              </div>
            </form>
          </div>
          <EditableTable headers={['Code', 'Name']}
            rows={grades.map(g => ({
              id: g.id,
              cells: [<span className="font-mono text-xs">{g.code}</span>, g.name],
              onEdit: () => { setEditId(g.id); setGradeForm({ code: g.code, name: g.name }); window.scrollTo({ top: 0, behavior: 'smooth' }); },
              onDelete: () => doDelete(`${apiBaseUrl}/fish/grade/${g.id}`, `Delete grade "${g.name}"? This will fail if it's used in existing quotes.`, 'Grade deleted'),
              isEditing: editId === g.id,
            }))} />
        </div>
      )}

      {/* Size */}
      {tab === 'size' && (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-1">{editId ? 'Edit Fish Size' : 'Add Fish Size'}</h3>
            <p className="text-xs text-gray-500 mb-4">
              Single value: fill Kg + Lbs only. Range: also fill the Max fields.<br/>
              Cut is optional — leave blank if the size applies to all cuts for this species.
            </p>
            <form onSubmit={handleSize} className="grid grid-cols-3 gap-4">
              <div><label className={lbl}>Species *</label>
                <select className={inp} required value={sizeForm.fish_species_id}
                  onChange={e => setSizeForm(f => ({ ...f, fish_species_id: e.target.value, kg_label: '', kg_max: '', lbs_label: '', lbs_max: '' }))}>
                  <option value="">Select species…</option>
                  {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Cut (optional)</label>
                <select className={inp} value={sizeForm.cut_id}
                  onChange={e => setSizeForm(f => ({ ...f, cut_id: e.target.value }))}>
                  <option value="">Any cut</option>
                  {cuts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Sort Order</label>
                <input className={inp} type="number" value={sizeForm.sort_order}
                  onChange={e => setSizeForm(f => ({ ...f, sort_order: e.target.value }))} placeholder="0" /></div>

              {/* Existing sizes chips — only when adding (not editing) */}
              {!editId && existingForSpecies.length > 0 && (
                <div className="col-span-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Already entered — click to pre-fill:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingForSpecies.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => setSizeForm(f => ({
                          ...f, cut_id: s.cut_id ? String(s.cut_id) : '',
                          kg_label: String(s.kg_label), kg_max: s.kg_max ? String(s.kg_max) : '',
                          lbs_label: String(s.lbs_label), lbs_max: s.lbs_max ? String(s.lbs_max) : '',
                          sort_order: String(s.sort_order),
                        }))}
                        style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' }}>
                        {s.kg_max ? `${s.kg_label}–${s.kg_max} kg` : `${s.kg_label} kg`} / {s.lbs_max ? `${s.lbs_label}–${s.lbs_max} lbs` : `${s.lbs_label} lbs`}
                        {s.cut_name ? ` · ${s.cut_name}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div><label className={lbl}>Kg *</label>
                <input className={inp} required type="number" step="0.001" value={sizeForm.kg_label}
                  onChange={e => setSizeForm(f => ({ ...f, kg_label: e.target.value }))} placeholder="e.g. 35" /></div>
              <div><label className={lbl}>Kg Max (range)</label>
                <input className={inp} type="number" step="0.001" value={sizeForm.kg_max}
                  onChange={e => setSizeForm(f => ({ ...f, kg_max: e.target.value }))} placeholder="optional" /></div>
              <div></div>
              <div><label className={lbl}>Lbs *</label>
                <input className={inp} required type="number" step="0.001" value={sizeForm.lbs_label}
                  onChange={e => setSizeForm(f => ({ ...f, lbs_label: e.target.value }))} placeholder="e.g. 75" /></div>
              <div><label className={lbl}>Lbs Max (range)</label>
                <input className={inp} type="number" step="0.001" value={sizeForm.lbs_max}
                  onChange={e => setSizeForm(f => ({ ...f, lbs_max: e.target.value }))} placeholder="optional" /></div>
              <div></div>
              <div className="col-span-3 flex justify-end gap-2">
                {editId && <button type="button" className={btnS} onClick={resetEdit}>Cancel</button>}
                <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Size' : 'Add Size'}</button>
              </div>
            </form>
          </div>

          <EditableTable headers={['Species', 'Cut', 'Kg', 'Lbs', 'Order']}
            rows={filteredSizes.map(s => ({
              id: s.id,
              cells: [
                s.species_name,
                <span className="text-gray-500">{s.cut_name || '—'}</span>,
                s.kg_max ? `${s.kg_label}–${s.kg_max}` : `${s.kg_label}`,
                s.lbs_max ? `${s.lbs_label}–${s.lbs_max}` : `${s.lbs_label}`,
                s.sort_order,
              ],
              onEdit: () => {
                setEditId(s.id);
                setSizeForm({
                  fish_species_id: String(s.fish_species_id),
                  cut_id: s.cut_id ? String(s.cut_id) : '',
                  kg_label: String(s.kg_label), kg_max: s.kg_max ? String(s.kg_max) : '',
                  lbs_label: String(s.lbs_label), lbs_max: s.lbs_max ? String(s.lbs_max) : '',
                  sort_order: String(s.sort_order),
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
              onDelete: () => doDelete(`${apiBaseUrl}/dictionary/fish-sizes/${s.id}`, `Deactivate size "${s.species_name} ${s.kg_label}kg"?`, 'Size deactivated'),
              isEditing: editId === s.id,
            }))} />
        </div>
      )}
    </div>
  );
}

// ─── Destinations ─────────────────────────────────────────────

function DestinationsSection({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  const load = async () => {
    const res = await fetch(`${apiBaseUrl}/dictionary/DESTINATION`);
    if (res.ok) setDestinations(await res.json());
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditId(null); setForm({ code: '', name: '', description: '' }); };

  const startEdit = (d: Destination) => {
    setEditId(d.id);
    setForm({ code: d.code, name: d.name, description: d.description || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (d: Destination) => {
    if (!window.confirm(`Deactivate destination "${d.name}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/dictionary/${d.id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      show('Destination deactivated'); load();
    } catch (err: any) { show(`Error: ${err.message}`); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const url = editId ? `${apiBaseUrl}/dictionary/${editId}` : `${apiBaseUrl}/dictionary/`;
    const method = editId ? 'PUT' : 'POST';
    const body = editId ? form : { category: 'DESTINATION', ...form };
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      show(editId ? 'Destination updated' : 'Destination added');
      reset(); load();
    } catch (err: any) { show(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Toast msg={toast} />
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Edit Destination' : 'Add Destination'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Code *</label>
            <input className={inp} required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. JFK" /></div>
          <div><label className={lbl}>Name *</label>
            <input className={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. New York JFK" /></div>
          <div className="col-span-2"><label className={lbl}>Description</label>
            <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
          <div className="col-span-2 flex justify-end gap-2">
            {editId && <button type="button" className={btnS} onClick={reset}>Cancel</button>}
            <button type="submit" className={btnP} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Destination' : 'Add Destination'}</button>
          </div>
        </form>
      </div>

      <EditableTable headers={['Code', 'Name', 'Description']}
        rows={destinations.map(d => ({
          id: d.id,
          cells: [
            <span className="font-mono text-xs font-medium">{d.code}</span>,
            d.name,
            <span className="text-gray-500">{d.description || '—'}</span>,
          ],
          onEdit: () => startEdit(d),
          onDelete: () => handleDelete(d),
          isEditing: editId === d.id,
        }))} />
    </div>
  );
}

// ─── Shared editable table ────────────────────────────────────

interface TableRow { id: number; cells: React.ReactNode[]; onEdit: () => void; onDelete: () => void; isEditing: boolean; }

function EditableTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
        Existing ({rows.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            {[...headers, ''].map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`border-t border-gray-100 hover:bg-gray-50 ${row.isEditing ? 'bg-blue-50' : ''}`}>
                {row.cells.map((cell, i) => <td key={i} className="px-4 py-2">{cell}</td>)}
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button className={editBtn} onClick={row.onEdit}>{row.isEditing ? 'Editing…' : 'Edit'}</button>
                    <button className={delBtn} onClick={row.onDelete}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={headers.length + 1} className="px-4 py-6 text-center text-gray-400 text-sm">No records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AdminTab root ────────────────────────────────────────────

const AdminTab = ({ apiBaseUrl }: Props) => {
  const [section, setSection] = useState<AdminSection>('vendors');

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '600px' }}>
      <div style={{ width: '180px', minWidth: '180px', borderRight: '1px solid #e5e7eb', paddingTop: '8px' }}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => setSection(item.key)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '10px 16px', fontSize: '14px',
            fontWeight: section === item.key ? 600 : 400,
            color: section === item.key ? '#2563eb' : '#374151',
            backgroundColor: section === item.key ? '#eff6ff' : 'transparent',
            borderLeft: section === item.key ? '3px solid #2563eb' : '3px solid transparent',
            border: 'none', cursor: 'pointer',
          }}>
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: '20px', minWidth: 0 }}>
        {section === 'vendors' && <VendorsSection apiBaseUrl={apiBaseUrl} />}
        {section === 'products' && <ProductsSection apiBaseUrl={apiBaseUrl} />}
        {section === 'destinations' && <DestinationsSection apiBaseUrl={apiBaseUrl} />}
        {section === 'clearing' && <ClearingPricingForm apiBaseUrl={apiBaseUrl} />}
      </div>
    </div>
  );
};

export default AdminTab;
