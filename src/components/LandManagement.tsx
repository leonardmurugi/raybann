import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { 
  Plus, 
  Search, 
  MapPin, 
  Maximize2, 
  LandPlot, 
  Edit3, 
  Building2,
  FileDown,
  Upload,
  ArrowRight,
  CheckCircle2,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LandManagement() {
  const navigate = useNavigate();
  const [lands, setLands] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tab, setTab] = useState<'properties' | 'plots'>('properties');
  const [isAddPropOpen, setAddPropOpen] = useState(false);
  const [isAddPlotOpen, setAddPlotOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [propForm, setPropForm] = useState({
    name: '',
    location: '',
    total_size: '',
    buying_price: 0,
    amount_paid_to_seller: 0,
    ownership_status: 'partial'
  });

  const [plotForm, setPlotForm] = useState({
    parent_property_id: '',
    plot_number: '',
    location: '',
    size: '',
    acquisition_type: 'purchase',
    status: 'available',
    total_cost: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, l] = await Promise.all([api.properties.list(), api.lands.list()]);
      setProperties(p);
      setLands(l);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePropSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.properties.create(propForm);
      setAddPropOpen(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handlePlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.lands.create(plotForm);
      setAddPlotOpen(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     // Mocking CSV import for now
     alert('Data migration tool initiated. Processing CSV matches...');
  };

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm font-medium">Property lifecycle and subdivision control</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button 
            onClick={() => tab === 'properties' ? setAddPropOpen(true) : setAddPlotOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-xs transition-all hover:bg-slate-800 shadow-lg shadow-slate-100"
          >
            <Plus className="w-4 h-4" />
            {tab === 'properties' ? 'New Land' : 'New Plot'}
          </button>
        </div>
      </header>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-black/5 rounded-2xl w-fit">
         <button 
           onClick={() => setTab('properties')}
           className={cn(
             "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
             tab === 'properties' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black"
           )}
         >
           Main Properties
         </button>
         <button 
           onClick={() => setTab('plots')}
           className={cn(
             "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
             tab === 'plots' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black"
           )}
         >
           Subdivisions (Plots)
         </button>
      </div>

      {tab === 'properties' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {properties.map((prop) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={prop.id} 
              className="bg-white p-8 rounded-[3rem] border border-black/5 flex flex-col gap-8 group hover:shadow-2xl transition-all"
            >
              <div className="flex items-start justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
                       <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold tracking-tight">{prop.name}</h3>
                       <div className="flex items-center gap-2 text-black/40">
                         <MapPin className="w-3 h-3" />
                         <span className="text-[10px] uppercase font-bold tracking-widest">{prop.location}</span>
                       </div>
                    </div>
                 </div>
                 <div className={cn(
                   "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                   prop.ownership_status === 'fully_owned' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                 )}>
                   {prop.ownership_status.replace('_', ' ')}
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                 <div className="p-4 bg-black/[0.02] rounded-2xl space-y-1">
                    <p className="text-[9px] uppercase font-bold text-black/30 tracking-widest">Total Size</p>
                    <p className="font-bold text-sm">{prop.total_size}</p>
                 </div>
                 <div className="p-4 bg-black/[0.02] rounded-2xl space-y-1">
                    <p className="text-[9px] uppercase font-bold text-black/30 tracking-widest">Buy Price</p>
                    <p className="font-bold text-sm text-[#5A5A40]">K{Math.round(prop.buying_price/1000)}k</p>
                 </div>
                 <div className="p-4 bg-black/[0.02] rounded-2xl space-y-1">
                    <p className="text-[9px] uppercase font-bold text-black/30 tracking-widest">Outstanding</p>
                    <p className="font-bold text-sm text-rose-600">K{Math.round((prop.buying_price - prop.amount_paid_to_seller)/1000)}k</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 pt-4 mt-auto">
                 <button className="flex-1 py-4 bg-black text-white rounded-2xl font-bold text-xs hover:bg-[#5A5A40] transition-colors">
                    Manage Costs
                 </button>
                 <button className="px-6 py-4 border border-black/10 rounded-2xl font-bold text-xs hover:bg-black/5">
                    History
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lands.map((land) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={land.id}
              className="bg-white rounded-[2.5rem] border border-black/5 p-8 flex flex-col gap-6 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
                  <LandPlot className="w-6 h-6" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                  land.status === 'sold' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {land.status}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-black/30 tracking-widest mb-1">{land.parent_name || 'Individual Plot'}</p>
                <h3 className="text-xl font-bold tracking-tight">{land.plot_number}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-black/20 tracking-tighter">Size</p>
                    <p className="text-xs font-bold">{land.size}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-black/20 tracking-tighter">Selling Price</p>
                    <p className="text-xs font-bold text-[#5A5A40]">KES {parseInt(land.total_cost).toLocaleString()}</p>
                 </div>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-black/40 flex items-center gap-1 uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Deed {land.title_deed_status}
                 </span>
                 <button className="p-3 bg-black/5 rounded-xl hover:bg-black/10 transition-colors">
                    <Edit3 className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Parent Property Modal */}
      <AnimatePresence>
        {isAddPropOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPropOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <h2 className="text-3xl font-bold tracking-tighter mb-8">Acquire Land</h2>
              <form onSubmit={handlePropSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Property Name" value={propForm.name} onChange={v => setPropForm({...propForm, name: v})} placeholder="e.g. Kitengela Phase 2" />
                  <Input label="Location" value={propForm.location} onChange={v => setPropForm({...propForm, location: v})} placeholder="e.g. Kajiado" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Total Size" value={propForm.total_size} onChange={v => setPropForm({...propForm, total_size: v})} placeholder="e.g. 50 Acres" />
                  <Input label="Buy Price (KES)" type="number" value={String(propForm.buying_price)} onChange={v => setPropForm({...propForm, buying_price: parseInt(v)})} placeholder="10000000" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPropOpen(false)} className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm">Record Acquisition</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Plot Modal */}
      <AnimatePresence>
        {isAddPlotOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPlotOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <h2 className="text-3xl font-bold tracking-tighter mb-8">Subdivide Land</h2>
              <form onSubmit={handlePlotSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Target Property</label>
                  <select 
                    value={plotForm.parent_property_id}
                    onChange={e => setPlotForm({...plotForm, parent_property_id: e.target.value})}
                    className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Independent Plot</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Plot Number" value={plotForm.plot_number} onChange={v => setPlotForm({...plotForm, plot_number: v})} placeholder="e.g. A12" />
                  <Input label="Size" value={plotForm.size} onChange={v => setPlotForm({...plotForm, size: v})} placeholder="e.g. 50x100" />
                </div>
                <Input label="Selling Price (KES)" type="number" value={String(plotForm.total_cost)} onChange={v => setPlotForm({...plotForm, total_cost: parseInt(v)})} placeholder="1500000" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPlotOpen(false)} className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm">Create Plot</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{label}</label>
      <input 
        required
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-[#5A5A40]/20 transition-all outline-none" 
        placeholder={placeholder}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
