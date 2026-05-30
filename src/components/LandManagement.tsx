import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  MapPin, 
  Maximize2, 
  LandPlot, 
  Edit3, 
  Building2,
  Upload,
  X,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LandManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lands, setLands] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tab, setTab] = useState<'properties' | 'plots'>('properties');
  const [isAddPropOpen, setAddPropOpen] = useState(false);
  const [isEditPropOpen, setEditPropOpen] = useState(false);
  const [isAddPlotOpen, setAddPlotOpen] = useState(false);
  const [isManageCostsOpen, setManageCostsOpen] = useState(false);
  const [isEditPlotOpen, setEditPlotOpen] = useState(false);
  
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPlot, setSelectedPlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Cost tracking logs associated with property
  const [propertyCosts, setPropertyCosts] = useState<any[]>([]);
  const [newCostForm, setNewCostForm] = useState({
    category: 'survey',
    amount: 0,
    description: ''
  });

  const [propForm, setPropForm] = useState({
    name: '',
    location: '',
    total_size: '',
    buying_price: 0,
    amount_paid_to_seller: 0,
    ownership_status: 'partial',
    notes: ''
  });

  const [plotForm, setPlotForm] = useState({
    parent_property_id: '',
    plot_number: '',
    location: '',
    size: '',
    acquisition_type: 'purchase',
    status: 'available',
    total_cost: 0,
    title_deed_status: 'pending'
  });

  const [editPlotForm, setEditPlotForm] = useState({
    parent_property_id: '',
    plot_number: '',
    location: '',
    size: '',
    acquisition_type: 'purchase',
    total_cost: 0,
    title_deed_status: 'pending',
    title_deed_url: '',
    status: 'available'
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

  async function loadPropertyCosts(propertyId: number) {
    try {
      const costs = await api.propertyCosts.list();
      setPropertyCosts(costs.filter((c: any) => c.parent_property_id === propertyId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePropSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.properties.create(propForm);
      setAddPropOpen(false);
      setPropForm({ name: '', location: '', total_size: '', buying_price: 0, amount_paid_to_seller: 0, ownership_status: 'partial', notes: '' });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating property');
    }
  }

  async function handleEditPropSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.properties.update(selectedProperty.id, propForm);
      setEditPropOpen(false);
      loadData();
      alert('Property updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating property');
    }
  }

  function openEditProperty(prop: any) {
    setSelectedProperty(prop);
    setPropForm({
      name: prop.name || '',
      location: prop.location || '',
      total_size: prop.total_size || '',
      buying_price: Number(prop.buying_price || 0),
      amount_paid_to_seller: Number(prop.amount_paid_to_seller || 0),
      ownership_status: prop.ownership_status || 'partial',
      notes: prop.notes || ''
    });
    setEditPropOpen(true);
  }

  function resetPropertyForm() {
    setPropForm({ name: '', location: '', total_size: '', buying_price: 0, amount_paid_to_seller: 0, ownership_status: 'partial', notes: '' });
  }

  async function handlePlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.lands.create(plotForm);
      setAddPlotOpen(false);
      setPlotForm({ parent_property_id: '', plot_number: '', location: '', size: '', acquisition_type: 'purchase', status: 'available', total_cost: 0, title_deed_status: 'pending' });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating plot');
    }
  }

  async function handleAddCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.propertyCosts.create({
        ...newCostForm,
        parent_property_id: selectedProperty.id
      });
      setNewCostForm({ category: 'survey', amount: 0, description: '' });
      loadPropertyCosts(selectedProperty.id);
      alert('Cost recorded and logged for admin verification.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording cost');
    }
  }

  async function handleEditPlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.lands.update(selectedPlot.id, editPlotForm);
      setEditPlotOpen(false);
      loadData();
      alert('Plot updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating plot');
    }
  }

  async function handleDeleteProperty(prop: any) {
    if (!window.confirm(`Delete ${prop.name}?`)) return;
    try {
      await api.properties.delete(prop.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting property');
    }
  }

  async function handleDeletePlot(plot: any) {
    if (!window.confirm(`Delete plot ${plot.plot_number}?`)) return;
    try {
      await api.lands.delete(plot.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting plot');
    }
  }

  // Filter properties and plots
  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlots = lands.filter(l => 
    l.plot_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.parent_name && l.parent_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm font-medium">Property lifecycle and subdivision control</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder={`Search ${tab}...`} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 ring-brand-blue/20 transition-all font-sans"
            />
          </div>
          <button 
            onClick={() => navigate('/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button 
            onClick={() => {
              if (tab === 'properties') {
                resetPropertyForm();
                setAddPropOpen(true);
              } else {
                setAddPlotOpen(true);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-brand-orange/20"
          >
            <Plus className="w-4 h-4" />
            {tab === 'properties' ? 'New Land' : 'New Plot'}
          </button>
        </div>
      </header>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
         <button 
           onClick={() => { setTab('properties'); setSearchQuery(''); }}
           className={cn(
             "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
             tab === 'properties' ? "bg-white shadow-sm text-brand-blue" : "text-slate-400 hover:text-brand-blue"
           )}
         >
           Main Properties
         </button>
         <button 
           onClick={() => { setTab('plots'); setSearchQuery(''); }}
           className={cn(
             "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
             tab === 'plots' ? "bg-white shadow-sm text-brand-blue" : "text-slate-400 hover:text-brand-blue"
           )}
         >
           Subdivisions (Plots)
         </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <span className="text-sm font-bold tracking-widest uppercase opacity-30">Loading...</span>
        </div>
      ) : tab === 'properties' ? (
        filteredProperties.length === 0 ? (
          <p className="text-center py-10 text-sm font-bold text-slate-300">No properties found</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProperties.map((prop) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={prop.id} 
                className="bg-white p-8 rounded-[3rem] border border-black/5 flex flex-col gap-8 group hover:shadow-2xl transition-all"
              >
                <div className="flex items-start justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-brand-blue/5 flex items-center justify-center text-brand-blue">
                         <Building2 className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-display font-bold tracking-tight text-brand-blue">{prop.name}</h3>
                         <div className="flex items-center gap-2 text-slate-400">
                           <MapPin className="w-3 h-3" />
                           <span className="text-[10px] uppercase font-bold tracking-widest">{prop.location}</span>
                         </div>
                      </div>
                   </div>
                   <div className={cn(
                     "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                     prop.ownership_status === 'fully_owned' ? "bg-emerald-50 text-emerald-600" : "bg-brand-orange/10 text-brand-orange"
                   )}>
                     {prop.ownership_status.replace('_', ' ')}
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-300 tracking-widest">Total Size</p>
                      <p className="font-bold text-sm text-brand-blue">{prop.total_size}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-300 tracking-widest">Buy Price</p>
                      <p className="font-bold text-sm text-brand-blue">K{Math.round(prop.buying_price/1000)}k</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border-b-2 border-brand-orange">
                      <p className="text-[9px] uppercase font-bold text-slate-300 tracking-widest">Outstanding</p>
                      <p className="font-bold text-sm text-brand-orange">K{Math.round((prop.buying_price - prop.amount_paid_to_seller)/1000)}k</p>
                   </div>
                </div>

                <div className="flex items-center gap-4 pt-4 mt-auto">
                   <button 
                     onClick={() => { setSelectedProperty(prop); loadPropertyCosts(prop.id); setManageCostsOpen(true); }}
                     className="flex-1 py-4 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all shadow-lg shadow-brand-blue/10"
                   >
                      Manage Costs
                   </button>
                   {user?.role === 'admin' && (
                     <div className="flex gap-2">
                       <button
                         onClick={() => openEditProperty(prop)}
                         className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors text-brand-blue"
                         aria-label="Edit property"
                       >
                         <Edit3 className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleDeleteProperty(prop)}
                         className="p-4 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-colors text-rose-600"
                         aria-label="Delete property"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   )}
                   <div className="text-[10px] font-semibold text-slate-400 italic">
                      Created: {new Date(prop.created_at).toLocaleDateString()}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        filteredPlots.length === 0 ? (
          <p className="text-center py-10 text-sm font-bold text-slate-300">No plots found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlots.map((land) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={land.id}
                className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col gap-6 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 flex items-center justify-center text-brand-blue">
                    <LandPlot className="w-6 h-6" />
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    land.status === 'sold' ? "bg-rose-50 text-rose-500" :
                    land.status === 'reserved' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {land.status}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-display font-bold text-slate-300 tracking-widest mb-1">{land.parent_name || 'Individual Plot'}</p>
                  <h3 className="text-xl font-display font-bold tracking-tight text-brand-blue">{land.plot_number}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-300 tracking-tighter">Size</p>
                      <p className="text-xs font-bold text-brand-blue">{land.size}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-300 tracking-tighter">Selling Price</p>
                      <p className="text-xs font-bold text-brand-orange">KES {parseInt(land.total_cost).toLocaleString()}</p>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                   <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Deed {land.title_deed_status}
                   </span>
                   {user?.role === 'admin' && (
                     <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           setSelectedPlot(land);
                           setEditPlotForm({
                             parent_property_id: land.parent_property_id ? String(land.parent_property_id) : '',
                             plot_number: land.plot_number,
                             location: land.location,
                             size: land.size,
                             acquisition_type: land.acquisition_type || 'purchase',
                             total_cost: parseInt(land.total_cost),
                             title_deed_status: land.title_deed_status,
                             title_deed_url: land.title_deed_url || '',
                             status: land.status
                           });
                           setEditPlotOpen(true);
                         }}
                         className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-brand-blue"
                         aria-label="Edit plot"
                       >
                          <Edit3 className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleDeletePlot(land)}
                         className="p-3 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors text-rose-600"
                         aria-label="Delete plot"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Add Parent Property Modal */}
      <AnimatePresence>
        {isAddPropOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPropOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tighter text-brand-blue">Acquire Land</h2>
                <button onClick={() => setAddPropOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-450" />
                </button>
              </div>
              <form onSubmit={handlePropSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Property Name" value={propForm.name} onChange={v => setPropForm({...propForm, name: v})} placeholder="e.g. Kitengela Phase 2" />
                  <Input label="Location" value={propForm.location} onChange={v => setPropForm({...propForm, location: v})} placeholder="e.g. Kajiado" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Total Size" value={propForm.total_size} onChange={v => setPropForm({...propForm, total_size: v})} placeholder="e.g. 50 Acres" />
                  <Input label="Buy Price (KES)" type="number" value={String(propForm.buying_price)} onChange={v => setPropForm({...propForm, buying_price: parseInt(v)})} placeholder="10000000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Paid To Seller (KES)" type="number" value={String(propForm.amount_paid_to_seller)} onChange={v => setPropForm({...propForm, amount_paid_to_seller: parseInt(v)})} placeholder="0" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ownership Status</label>
                    <select
                      value={propForm.ownership_status}
                      onChange={e => setPropForm({...propForm, ownership_status: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="partial">Partial</option>
                      <option value="fully_owned">Fully Owned</option>
                    </select>
                  </div>
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

      {/* Edit Parent Property Modal */}
      <AnimatePresence>
        {isEditPropOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditPropOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tighter text-brand-blue">Edit Land</h2>
                <button onClick={() => setEditPropOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-450" />
                </button>
              </div>
              <form onSubmit={handleEditPropSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Property Name" value={propForm.name} onChange={v => setPropForm({...propForm, name: v})} placeholder="e.g. Kitengela Phase 2" />
                  <Input label="Location" value={propForm.location} onChange={v => setPropForm({...propForm, location: v})} placeholder="e.g. Kajiado" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Total Size" value={propForm.total_size} onChange={v => setPropForm({...propForm, total_size: v})} placeholder="e.g. 50 Acres" />
                  <Input label="Buy Price (KES)" type="number" value={String(propForm.buying_price)} onChange={v => setPropForm({...propForm, buying_price: parseInt(v)})} placeholder="10000000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Paid To Seller (KES)" type="number" value={String(propForm.amount_paid_to_seller)} onChange={v => setPropForm({...propForm, amount_paid_to_seller: parseInt(v)})} placeholder="0" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ownership Status</label>
                    <select
                      value={propForm.ownership_status}
                      onChange={e => setPropForm({...propForm, ownership_status: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="partial">Partial</option>
                      <option value="fully_owned">Fully Owned</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditPropOpen(false)} className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-sm">Update Land</button>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold tracking-tighter text-brand-blue">Subdivide Land</h2>
                <button onClick={() => setAddPlotOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-450" />
                </button>
              </div>
              <form onSubmit={handlePlotSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Target Property</label>
                  <select 
                    value={plotForm.parent_property_id}
                    onChange={e => setPlotForm({...plotForm, parent_property_id: e.target.value})}
                    className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                  >
                    <option value="">Independent Plot</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Plot Number" value={plotForm.plot_number} onChange={v => setPlotForm({...plotForm, plot_number: v})} placeholder="e.g. A12" />
                  <Input label="Size" value={plotForm.size} onChange={v => setPlotForm({...plotForm, size: v})} placeholder="e.g. 50x100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Selling Price (KES)" type="number" value={String(plotForm.total_cost)} onChange={v => setPlotForm({...plotForm, total_cost: parseInt(v)})} placeholder="1500000" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location Override</label>
                    <input 
                      type="text" 
                      value={plotForm.location}
                      onChange={e => setPlotForm({...plotForm, location: e.target.value})}
                      placeholder="e.g. Kitengela"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPlotOpen(false)} className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm">Create Plot</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Property Subdivision Costs Management Modal */}
      <AnimatePresence>
        {isManageCostsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManageCostsOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <header className="mb-6 flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Operational Cost Management</p>
                  <h2 className="text-2xl font-display font-bold tracking-tight text-brand-blue">{selectedProperty?.name} Ledger</h2>
                </div>
                <button onClick={() => setManageCostsOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Cost Recording Form */}
                <form onSubmit={handleAddCost} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Record Additional Subdivision Cost</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                      <select 
                        value={newCostForm.category}
                        onChange={e => setNewCostForm({...newCostForm, category: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none text-brand-blue focus:ring-1 ring-brand-blue/20"
                      >
                        <option value="survey">Survey Fees</option>
                        <option value="legal">Legal & Conveyancing</option>
                        <option value="subdivision">Subdivision Costs</option>
                        <option value="title_processing">Title Deed Production</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount (KES)</label>
                      <input 
                        type="number"
                        required
                        value={newCostForm.amount}
                        onChange={e => setNewCostForm({...newCostForm, amount: parseInt(e.target.value)})}
                        placeholder="e.g. 50000"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none text-brand-blue focus:ring-1 ring-brand-blue/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                    <input 
                      type="text"
                      required
                      value={newCostForm.description}
                      onChange={e => setNewCostForm({...newCostForm, description: e.target.value})}
                      placeholder="e.g. Boundary beacon survey for 20 plots"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none text-brand-blue focus:ring-1 ring-brand-blue/20"
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md hover:scale-[1.01] transition-transform">
                    Log Subdivision Expense
                  </button>
                </form>

                {/* Costs History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Expenses Log</h4>
                  {propertyCosts.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400 italic">No logged subdivision expenses for this property.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      {propertyCosts.map((cost) => (
                        <div key={cost.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50">
                          <div>
                            <p className="font-bold text-slate-800 capitalize">{cost.category.replace('_', ' ')}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{cost.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">KES {parseFloat(cost.amount).toLocaleString()}</p>
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                              cost.is_approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {cost.is_approved ? 'Verified' : 'Pending Verification'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end mt-4">
                <button onClick={() => setManageCostsOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Subdivision Plot Details Modal */}
      <AnimatePresence>
        {isEditPlotOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditPlotOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Plot Editor</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Edit {selectedPlot?.plot_number}</h2>
                </div>
                <button onClick={() => setEditPlotOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleEditPlotSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plot Number</label>
                    <input 
                      required
                      type="text"
                      value={editPlotForm.plot_number}
                      onChange={e => setEditPlotForm({...editPlotForm, plot_number: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Size</label>
                    <input 
                      required
                      type="text"
                      value={editPlotForm.size}
                      onChange={e => setEditPlotForm({...editPlotForm, size: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selling Price (KES)</label>
                    <input 
                      required
                      type="number"
                      value={editPlotForm.total_cost}
                      onChange={e => setEditPlotForm({...editPlotForm, total_cost: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title Deed Status</label>
                    <select 
                      value={editPlotForm.title_deed_status}
                      onChange={e => setEditPlotForm({...editPlotForm, title_deed_status: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="pending">Awaiting Survey / Pending</option>
                      <option value="processed">Processed</option>
                      <option value="issued">Issued / Ready</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Property</label>
                    <select 
                      value={editPlotForm.parent_property_id}
                      onChange={e => setEditPlotForm({...editPlotForm, parent_property_id: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="">Independent Plot</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plot Status</label>
                    <select 
                      value={editPlotForm.status}
                      onChange={e => setEditPlotForm({...editPlotForm, status: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location Override</label>
                    <input 
                      type="text"
                      value={editPlotForm.location}
                      onChange={e => setEditPlotForm({...editPlotForm, location: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditPlotOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform">Update Plot</button>
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
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input 
        required
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue" 
        placeholder={placeholder}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
