import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Plus, 
  Search, 
  MapPin, 
  Maximize2, 
  Tag, 
  LandPlot, 
  Filter, 
  Edit3, 
  History,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LandManagement() {
  const [lands, setLands] = useState<any[]>([]);
  const [isAddOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    plot_number: '',
    location: '',
    size: '',
    acquisition_type: 'purchase',
    status: 'available',
    total_cost: 0
  });

  useEffect(() => {
    loadLands();
  }, []);

  async function loadLands() {
    try {
      const data = await api.lands.list();
      setLands(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.lands.create(formData);
      setAddOpen(false);
      loadLands();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding land');
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Inventory</h1>
          <p className="text-black/50 text-sm font-medium">Manage and track land plots</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
            <input 
              type="text" 
              placeholder="Search plot # or location..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-black/10 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-[#5A5A40]/20 transition-all"
            />
          </div>
          <button 
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Plot
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white h-64 rounded-[2.5rem] animate-pulse border border-black/5" />
          ))
        ) : (
          lands.map((land, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={land.id}
              className="group bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
            >
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
                    <LandPlot className="w-8 h-8" />
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    land.status === 'sold' ? "bg-rose-100 text-rose-600" : 
                    land.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {land.status}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{land.plot_number}</h3>
                  <div className="flex items-center gap-2 text-black/40 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs font-bold uppercase tracking-wider">{land.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/[0.02] rounded-2xl border border-black/5">
                    <p className="text-[10px] uppercase font-bold text-black/30 tracking-widest mb-1">Size</p>
                    <p className="text-sm font-bold flex items-center gap-2">
                       <Maximize2 className="w-3 h-3 opacity-30" /> {land.size}
                    </p>
                  </div>
                  <div className="p-4 bg-black/[0.02] rounded-2xl border border-black/5">
                    <p className="text-[10px] uppercase font-bold text-black/30 tracking-widest mb-1">Price</p>
                    <p className="text-sm font-bold text-[#5A5A40]">
                       KES {parseInt(land.total_cost).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/[0.02] border-t border-black/5 flex items-center gap-2">
                <button className="flex-1 py-3 bg-white border border-black/10 rounded-xl text-xs font-bold hover:bg-black/5 transition-colors">
                  Details
                </button>
                <button className="p-3 bg-[#5A5A40] text-white rounded-xl hover:shadow-lg transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Add New Land */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5A5A40] opacity-5 rounded-full -mr-16 -mt-16" />
              
              <div className="relative mb-8">
                <h2 className="text-3xl font-bold tracking-tighter">Add Land Unit</h2>
                <p className="text-black/40 text-sm font-medium">Create a new entry in the inventory</p>
              </div>

              <form onSubmit={handleSubmit} className="relative space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Plot Number</label>
                    <input 
                      required
                      value={formData.plot_number}
                      onChange={e => setFormData({...formData, plot_number: e.target.value})}
                      className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-[#5A5A40]/20 transition-all" 
                      placeholder="e.g. 123/A"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Location</label>
                    <input 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-[#5A5A40]/20 transition-all" 
                      placeholder="e.g. Syokimau"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Size</label>
                    <input 
                      required
                      value={formData.size}
                      onChange={e => setFormData({...formData, size: e.target.value})}
                      className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-[#5A5A40]/20 transition-all" 
                      placeholder="e.g. 50x100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Price (KES)</label>
                    <input 
                      required
                      type="number"
                      value={formData.total_cost}
                      onChange={e => setFormData({...formData, total_cost: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-[#5A5A40]/20 transition-all" 
                      placeholder="e.g. 1500000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Acquisition</label>
                  <select 
                    value={formData.acquisition_type}
                    onChange={e => setFormData({...formData, acquisition_type: e.target.value})}
                    className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold focus:ring-2 ring-[#5A5A40]/20 transition-all outline-none"
                  >
                    <option value="purchase">Purchase</option>
                    <option value="owned">Company Owned</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setAddOpen(false)}
                    className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm hover:shadow-xl shadow-[#5A5A40]/20 transition-all"
                  >
                    Confirm Unit
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
