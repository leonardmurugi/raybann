import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Users, 
  Phone, 
  Mail, 
  Search, 
  Plus, 
  History, 
  ExternalLink,
  ChevronRight,
  LandPlot,
  CreditCard,
  Building2,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaleOpen, setSaleOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [saleForm, setSaleForm] = useState({
    land_id: '',
    total_price: 0,
    paid_amount: 0,
    method: 'mpesa',
    transaction_ref: ''
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [c, l] = await Promise.all([api.customers.list(), api.lands.list()]);
      setCustomers(c);
      setLands(l.filter((land: any) => land.status === 'available'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      load();
      alert('Sale recorded! Awaiting admin approval for payment.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div className="space-y-10 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm font-medium">Customer base and transaction staging</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 ring-slate-400 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-xs transition-all hover:bg-slate-800 shadow-lg shadow-slate-100">
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
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {customer.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{customer.name}</p>
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Active • Since {new Date(customer.created_at).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-slate-300" /> {customer.phone}
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
                       <button 
                         onClick={() => { setSelectedCustomer(customer); setSaleOpen(true); }}
                         className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                       >
                         Record Sale
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isSaleOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSaleOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl">
              <header className="mb-8">
                <p className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-widest mb-1">New Sale for</p>
                <h2 className="text-3xl font-bold tracking-tighter">{selectedCustomer?.name}</h2>
              </header>
              
              <form onSubmit={handleSale} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Select Plot</label>
                    <select 
                      required
                      value={saleForm.land_id}
                      onChange={e => {
                        const land = lands.find(l => l.id === parseInt(e.target.value));
                        setSaleForm({...saleForm, land_id: e.target.value, total_price: land?.total_cost || 0});
                      }}
                      className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Select an available plot</option>
                      {lands.map(l => <option key={l.id} value={l.id}>{l.plot_number} - {l.location}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Sale Price (KES)</label>
                       <div className="px-5 py-4 bg-black/5 rounded-2xl text-sm font-bold text-black/40">
                          {saleForm.total_price.toLocaleString()}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Deposit Amount</label>
                       <input 
                         type="number"
                         value={saleForm.paid_amount}
                         onChange={e => setSaleForm({...saleForm, paid_amount: parseInt(e.target.value)})}
                         className="w-full px-5 py-4 bg-[#F5F2ED] border-none rounded-2xl text-sm font-bold focus:ring-2 ring-emerald-500/20 outline-none"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Payment Method</label>
                      <select 
                        value={saleForm.method}
                        onChange={e => setSaleForm({...saleForm, method: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold outline-none"
                      >
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Transaction Ref</label>
                      <input 
                        value={saleForm.transaction_ref}
                        onChange={e => setSaleForm({...saleForm, transaction_ref: e.target.value})}
                        className="w-full px-5 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold outline-none"
                        placeholder="e.g. QWE123RTY"
                      />
                   </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setSaleOpen(false)} className="flex-1 py-5 bg-black/5 text-black/60 rounded-2xl font-bold text-sm">Close</button>
                    <button type="submit" className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#5A5A40]/20">Confirm Sale</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
