import { useState, useEffect } from 'react';
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
  LandPlot
} from 'lucide-react';
import { motion } from 'motion/react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.customers.list();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Clients</h1>
          <p className="text-black/50 text-sm font-medium">CRM and sales history</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-black/10 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-[#5A5A40]/20 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#5A5A40]/20 transition-all">
            <Plus className="w-4 h-4" />
            New Client
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-black/[0.02] border-b border-black/5">
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-black/40">Client Info</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-black/40">Contact</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-black/40">ID / Passport</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-black/40">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                [1,2,3].map(i => <tr key={i} className="animate-pulse h-20 bg-black/[0.01]" />)
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-black/[0.01] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40] font-bold">
                          {customer.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{customer.name}</p>
                          <p className="text-[10px] font-bold tracking-widest text-black/30 uppercase">Member since {new Date(customer.created_at).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-black/50">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </div>
                        <div className="flex items-center gap-2 text-black/50 lowercase">
                          <Mail className="w-3 h-3" /> {customer.email || 'no email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-black/5 rounded-lg text-xs font-mono font-bold">{customer.id_number}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase w-fit tracking-wider">
                        Active Client
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 bg-[#1A1A1A] text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-black/10">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
