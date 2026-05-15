import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Download, 
  Wallet,
  Building2,
  Users,
  FileText,
  Clock,
  PieChart as PieChartIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Printer,
  X,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'customer-payments' | 'office-expenses' | 'property-costs'>('customer-payments');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      // Logic for different financial segments
      if (activeTab === 'customer-payments') {
        setData([
          { id: 1, type: 'received', amount: 1200000, category: 'land_sale', method: 'mpesa', status: 'official', ref: 'RF992K', customer: 'Leonard G.', date: 'Today, 10:15' },
          { id: 2, type: 'received', amount: 450000, category: 'plot_installment', method: 'bank', status: 'pending', ref: 'BK223X', customer: 'Alice W.', date: 'Yesterday' },
        ]);
      } else if (activeTab === 'office-expenses') {
        setData([
          { id: 10, type: 'made', amount: 65000, category: 'office_rent', method: 'bank', status: 'official', ref: 'EXP-101', date: 'May 1st' },
          { id: 11, type: 'made', amount: 12000, category: 'utilities', method: 'cash', status: 'official', ref: 'EXP-104', date: 'May 4th' },
        ]);
      } else {
        setData([
          { id: 20, type: 'made', amount: 25000, category: 'survey_fees', method: 'cash', status: 'official', ref: 'PRP-99', property: 'Kitengela Phase 2', date: 'May 2nd' },
          { id: 21, type: 'made', amount: 15000, category: 'legal_docs', method: 'bank', status: 'official', ref: 'PRP-102', property: 'Syokimau Gardens', date: 'May 5th' },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Finance</h1>
          <p className="text-slate-500 text-sm font-medium">Ledger management and financial categorization</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'customer-payments', label: 'Payments', icon: Users },
            { id: 'office-expenses', label: 'Operations', icon: Building2 },
            { id: 'property-costs', label: 'Property Costs', icon: Wallet },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                activeTab === tab.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Transaction Log</h3>
                <div className="flex items-center gap-2">
                  <button className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 hover:text-slate-900">
                    <Filter className="w-3 h-3" /> Filter
                  </button>
                </div>
             </div>
             
             <div className="divide-y divide-slate-100">
                {data.map((item) => (
                  <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        item.type === 'received' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {item.type === 'received' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-semibold text-[13px] text-slate-900 capitalize">{item.category.replace('_', ' ')}</p>
                           {item.property && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded italic">{item.property}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.date}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className={item.status === 'official' ? "text-emerald-500" : "text-amber-500"}>{item.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold text-[13px]",
                        item.type === 'received' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {item.type === 'received' ? '+' : '-'} KES {item.amount.toLocaleString()}
                      </p>
                      <button 
                        onClick={() => setSelectedReceipt(item)}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-60 hover:opacity-100 flex items-center gap-1 justify-end mt-0.5 hover:underline"
                      >
                        <FileText className="w-3 h-3" /> View Receipt
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6 relative overflow-hidden">
            <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Cash Balance</p>
              <h4 className="text-3xl font-display font-semibold mt-2">KES 4.2M</h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
               <TrendingUp className="w-4 h-4" /> +15.2% from last month
            </div>
            <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all">
               Withdraw Funds
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Approval Stats</h4>
             <div className="space-y-4">
                {[
                  { label: 'Pending Approval', count: 12, value: '2.1M', color: 'bg-amber-500' },
                  { label: 'This Week', count: 45, value: '5.4M', color: 'bg-emerald-500' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                      <span className="text-xs font-semibold text-slate-600">{stat.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{stat.value}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReceipt(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-[480px] bg-white rounded-3xl p-10 flex flex-col items-center print:shadow-none print:p-0 print:m-0"
            >
               <button onClick={() => setSelectedReceipt(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 print:hidden">
                 <X className="w-5 h-5 text-slate-400" />
               </button>

               <div className="w-full text-center space-y-2 mb-10 pb-8 border-b border-dashed border-slate-100">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <LandPlot className="w-8 h-8 text-slate-800" />
                    <span className="text-2xl font-display font-semibold tracking-tight text-slate-900">Raybann Properties</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Acquisition & Management</p>
                  <p className="text-[8px] font-semibold text-slate-300">Nairobi, Kenya • 0700 000 000</p>
               </div>

               <div className="w-full space-y-6 text-slate-600">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Receipt ID</p>
                        <p className="text-xs font-black text-slate-800">#{selectedReceipt.ref}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
                        <p className="text-xs font-bold text-slate-800">{selectedReceipt.date}</p>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center gap-2">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount Received</p>
                     <p className="text-3xl font-display font-semibold text-slate-900 tracking-tight">KES {selectedReceipt.amount.toLocaleString()}</p>
                  </div>

                  <div className="space-y-3 pb-8 border-b border-dashed border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-medium text-slate-400">Payment For</span>
                       <span className="font-bold text-slate-800 capitalize">{selectedReceipt.category.replace('_', ' ')}</span>
                    </div>
                    {selectedReceipt.customer && (
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-400">Customer</span>
                          <span className="font-bold text-slate-800">{selectedReceipt.customer}</span>
                       </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-medium text-slate-400">Method</span>
                       <span className="font-bold text-slate-800 uppercase tracking-widest">{selectedReceipt.method}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col items-center gap-4">
                     <div className={cn(
                        "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]",
                        selectedReceipt.status === 'official' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                     )}>
                        {selectedReceipt.status} Receipt
                     </div>
                     <p className="text-[9px] text-slate-400 text-center max-w-[200px] italic leading-relaxed">
                        This is a computer generated document. Valid only as evidence of a recorded transaction.
                     </p>
                  </div>
               </div>

               <div className="w-full flex gap-4 mt-10 print:hidden">
                  <button onClick={handlePrint} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all">
                     <Printer className="w-4 h-4" /> Print Document
                  </button>
                  <button onClick={() => setSelectedReceipt(null)} className="px-6 py-4 border border-slate-200 rounded-2xl text-xs font-semibold hover:bg-slate-50">
                     Done
                  </button>
               </div>
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
