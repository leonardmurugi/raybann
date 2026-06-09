import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Phone, 
  Mail, 
  Search, 
  Plus, 
  X,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClientDocumentsUpload } from './ClientDocumentsUpload';

export default function CustomerManagement() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaleOpen, setSaleOpen] = useState(false);
  const [isAddClientOpen, setAddClientOpen] = useState(false);
  const [isEditClientOpen, setEditClientOpen] = useState(false);
  const [isDocumentsOpen, setDocumentsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Client form
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    id_number: ''
  });

  // Sale form
  const [saleForm, setSaleForm] = useState<any>({
    land_id: '',
    total_price: 0,
    paid_amount: '',
    method: 'mpesa',
    transaction_ref: ''
  });

  function isSellableLand(land: any) {
    const status = String(land.status || '').trim().toLowerCase();
    return !['reserved', 'sold'].includes(status);
  }

  function formatLandOption(land: any) {
    const status = String(land.status || '').trim().toLowerCase();
    const parent = land.parent_name ? `${land.parent_name} / ` : '';
    const statusLabel = status && status !== 'available' ? ` (${status})` : '';
    return `${parent}${land.plot_number} - ${land.location}${statusLabel}`;
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [c, l] = await Promise.all([api.customers.list(), api.lands.list()]);
      setCustomers(c);
      setLands(l.filter(isSellableLand));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.customers.create(clientForm);
      setAddClientOpen(false);
      setClientForm({ name: '', email: '', phone: '', id_number: '' });
      load();
      alert('Client registered successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding client');
    }
  }

  function openEditClient(customer: any) {
    setSelectedCustomer(customer);
    setClientForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      id_number: customer.id_number || ''
    });
    setEditClientOpen(true);
  }

  async function handleEditClient(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.customers.update(selectedCustomer.id, clientForm);
      setEditClientOpen(false);
      setClientForm({ name: '', email: '', phone: '', id_number: '' });
      load();
      alert('Client updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating client');
    }
  }

  async function handleDeleteClient(customer: any) {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    try {
      await api.customers.delete(customer.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting client');
    }
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.sales.create({
        ...saleForm,
        customer_id: selectedCustomer.id
      });
      setSaleOpen(false);
      setSaleForm({ land_id: '', total_price: 0, paid_amount: '', method: 'mpesa', transaction_ref: '' });
      load();
      alert('Sale recorded! Awaiting admin approval for payment.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording sale');
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const q = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.phone.includes(q) ||
      customer.id_number.includes(q) ||
      (customer.email && customer.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-10 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-brand-blue">Clients</h1>
          <p className="text-slate-500 text-sm font-medium">Customer base and transaction staging</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 ring-brand-blue/20 transition-all font-sans"
            />
          </div>
          <button 
            onClick={() => setAddClientOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-brand-orange/20"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-sans">
                <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Client Info</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">ID / Passport</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse h-16 bg-slate-50/20" />)
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-sm font-bold text-slate-300">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs">
                          {customer.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm text-brand-blue">{customer.name}</p>
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Active • Since {new Date(customer.created_at).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-brand-orange" /> {customer.phone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] lowercase">
                          <Mail className="w-3 h-3 text-slate-300" /> {customer.email || 'no-email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-50 rounded-lg text-[11px] font-mono font-semibold text-slate-500 border border-slate-100">{customer.id_number}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2">
                         <button 
                           onClick={() => { setSelectedCustomer(customer); setSaleOpen(true); }}
                           className="px-4 py-2 border border-brand-blue/10 text-brand-blue rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-sm"
                         >
                           Record Sale
                         </button>
                         <button 
                           onClick={() => { setSelectedCustomer(customer); setDocumentsOpen(true); }}
                           className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-brand-blue transition-all" 
                           aria-label="Manage documents"
                           title="Manage Documents"
                         >
                           <FileText className="w-4 h-4" />
                         </button>
                         {user?.role === 'admin' && (
                           <>
                             <button onClick={() => openEditClient(customer)} className="p-2 bg-slate-50 text-brand-blue rounded-lg hover:bg-slate-100" aria-label="Edit client">
                               <Edit3 className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDeleteClient(customer)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" aria-label="Delete client">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </>
                         )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {isAddClientOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddClientOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">CRM Database</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Add New Client</h2>
                </div>
                <button onClick={() => setAddClientOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleAddClient} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={clientForm.name}
                    onChange={e => setClientForm({...clientForm, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID / Passport Number</label>
                  <input 
                    required
                    type="text"
                    value={clientForm.id_number}
                    onChange={e => setClientForm({...clientForm, id_number: e.target.value})}
                    placeholder="e.g. 12345678"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                    <input 
                      required
                      type="text"
                      value={clientForm.phone}
                      onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                      placeholder="e.g. 0700123456"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                    <input 
                      type="email"
                      value={clientForm.email}
                      onChange={e => setClientForm({...clientForm, email: e.target.value})}
                      placeholder="e.g. john@example.com"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddClientOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform">Register Client</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {isEditClientOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditClientOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">CRM Database</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Edit Client</h2>
                </div>
                <button onClick={() => setEditClientOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleEditClient} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input required type="text" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID / Passport Number</label>
                  <input required type="text" value={clientForm.id_number} onChange={e => setClientForm({...clientForm, id_number: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                    <input required type="text" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                    <input type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-brand-blue" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditClientOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20">Update Client</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaleOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSaleOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8">
                <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">New Sale for</p>
                <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">{selectedCustomer?.name}</h2>
              </header>
              
              <form onSubmit={handleSale} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Plot</label>
                    <select 
                      required
                      value={saleForm.land_id}
                      onChange={e => {
                        const land = lands.find(l => l.id === parseInt(e.target.value));
                        setSaleForm({...saleForm, land_id: e.target.value, total_price: land?.total_cost || 0});
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue focus:ring-2 ring-brand-blue/5 transition-all"
                    >
                      <option value="">Select a plot</option>
                      {lands.map(l => <option key={l.id} value={l.id}>{formatLandOption(l)}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sale Price (KES)</label>
                       <div className="px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-brand-blue/40">
                          {saleForm.total_price.toLocaleString()}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deposit Amount</label>
                       <input 
                         type="number"
                         value={saleForm.paid_amount}
                         onChange={e => setSaleForm({...saleForm, paid_amount: e.target.value})}
                         className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 ring-brand-orange/20 outline-none text-brand-orange"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
                      <select 
                        value={saleForm.method}
                        onChange={e => setSaleForm({...saleForm, method: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                      >
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transaction Ref</label>
                      <input 
                        value={saleForm.transaction_ref}
                        onChange={e => setSaleForm({...saleForm, transaction_ref: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                        placeholder="e.g. QWE123RTY"
                      />
                   </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setSaleOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Close</button>
                    <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform">Confirm Sale</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Documents Modal */}
      {isDocumentsOpen && selectedCustomer && (
        <ClientDocumentsUpload
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          onClose={() => setDocumentsOpen(false)}
        />
      )}
    </div>
  );
}
