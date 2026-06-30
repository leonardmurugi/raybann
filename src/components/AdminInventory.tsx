import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Package, Plus, Search, Edit3, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const emptyForm = {
  item_name: '',
  quantity: '',
  unit_price: '',
  category: ''
};

export default function AdminInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      const data = await api.inventory.list();
      setItems(data || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error loading inventory');
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingItem(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditForm(item: any) {
    setEditingItem(item);
    setForm({
      item_name: item.item_name || '',
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      category: item.category || ''
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.inventory.update(editingItem.id, form);
      } else {
        await api.inventory.create(form);
      }
      setFormOpen(false);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving inventory item');
    }
  }

  async function handleDelete(item: any) {
    if (!window.confirm(`Delete ${item.item_name} from inventory?`)) return;
    try {
      await api.inventory.delete(item.id);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting inventory item');
    }
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.item_name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const inventoryValue = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unit_price || 0);
  }, 0);

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Admin Inventory</h1>
          <p className="text-slate-500 text-sm font-medium">Create, update, and remove company inventory items</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search inventory..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 ring-brand-blue/20"
            />
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-brand-orange/20"
          >
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Summary label="Items" value={items.length.toLocaleString()} />
        <Summary label="Units" value={items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString()} />
        <Summary label="Stock Value" value={`KES ${inventoryValue.toLocaleString()}`} highlight />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <th className="text-left px-6 py-4">Item</th>
              <th className="text-left px-6 py-4">Category</th>
              <th className="text-right px-6 py-4">Quantity</th>
              <th className="text-right px-6 py-4">Unit Price</th>
              <th className="text-right px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="h-48 text-center text-sm font-bold tracking-widest uppercase text-slate-300">Loading...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-48 text-center text-sm font-bold text-slate-300">No inventory items found</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-blue/5 text-brand-blue flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{item.item_name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">Updated {new Date(item.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{item.category || 'Uncategorized'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-brand-blue text-right">{Number(item.quantity || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-brand-orange text-right">KES {Number(item.unit_price || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEditForm(item)} className="p-2 bg-slate-100 rounded-lg text-brand-blue hover:bg-slate-200" aria-label="Edit item">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 bg-rose-50 rounded-lg text-rose-600 hover:bg-rose-100" aria-label="Delete item">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFormOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Inventory Editor</p>
                  <h2 className="text-2xl font-display font-bold tracking-tight text-brand-blue">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                </div>
                <button onClick={() => setFormOpen(false)} className="p-2 rounded-full hover:bg-slate-100" aria-label="Close">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input label="Item Name" value={form.item_name} onChange={v => setForm({ ...form, item_name: v })} placeholder="e.g. Office printer" />
                <Input label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="e.g. Office equipment" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Quantity" type="number" value={form.quantity} onChange={(v: string) => setForm({ ...form, quantity: v })} placeholder="0" />
                  <Input label="Unit Price" type="number" value={form.unit_price} onChange={(v: string) => setForm({ ...form, unit_price: v })} placeholder="0" />
                </div>
                <div className="flex gap-4 pt-3">
                  <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Summary({ label, value, highlight = false }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("text-xl font-display font-bold mt-1", highlight ? "text-brand-orange" : "text-brand-blue")}>{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input
        required={label === 'Item Name'}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 outline-none text-brand-blue"
        placeholder={placeholder}
      />
    </div>
  );
}
