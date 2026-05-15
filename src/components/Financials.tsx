import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Filter,
  FileText,
  Clock,
  PieChart as PieChartIcon,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'expenses'>('transactions');

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Finance</h1>
          <p className="text-black/50 text-sm font-medium">Ledger, receipts, and petty cash</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-black/10 shadow-sm">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'transactions' ? "bg-[#1A1A1A] text-white shadow-lg shadow-black/20" : "text-black/40 hover:text-black"
            )}
          >
            Ledger
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'expenses' ? "bg-[#1A1A1A] text-white shadow-lg shadow-black/20" : "text-black/40 hover:text-black"
            )}
          >
            Expenses
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-black/5 overflow-hidden shadow-sm">
             <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <h3 className="font-bold tracking-tight uppercase text-[10px] text-black/40 letter tracking-widest">Recent Activity</h3>
                <button className="text-xs font-bold text-[#5A5A40] flex items-center gap-2 hover:underline">
                  <Filter className="w-3 h-3" /> Filter Log
                </button>
             </div>
             
             <div className="divide-y divide-black/5">
                {[1,2,3,4,5].map((item) => (
                  <div key={item} className="p-6 flex items-center justify-between group hover:bg-black/[0.01] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        item % 2 === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {item % 2 === 0 ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item % 2 === 0 ? 'Plot Installment Receipt' : 'Office Petty Cash'}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 2h ago</span>
                          <span className="w-1 h-1 rounded-full bg-black/10" />
                          <span>Ref: #TRX-99{item}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-sm",
                        item % 2 === 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {item % 2 === 0 ? '+' : '-'} KES {(item * 25000).toLocaleString()}
                      </p>
                      <button className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-40 transition-opacity flex items-center gap-1 justify-end mt-1 active:opacity-100 underline decoration-2">
                        <FileText className="w-3 h-3" /> Receipt
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#5A5A40] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-white/5 rounded-full blur-[60px]" />
            <Wallet className="w-12 h-12 mb-10 opacity-40" />
            <h3 className="text-black/40 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">Petty Cash Balance</h3>
            <p className="text-5xl font-bold tracking-tighter mb-10">KES 42,900</p>
            <button className="w-full py-5 bg-white text-[#5A5A40] rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus className="w-5 h-5" /> Issue Funds
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
            <h3 className="font-bold tracking-tight mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-black/20" /> Expense Distribution
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Field Work', val: 65, color: 'bg-amber-500' },
                { label: 'Office Supplies', val: 20, color: 'bg-emerald-500' },
                { label: 'Utilities', val: 15, color: 'bg-rose-500' }
              ].map(cat => (
                <div key={cat.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-black/40">
                    <span>{cat.label}</span>
                    <span>{cat.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.val}%` }}
                      className={cn("h-full", cat.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
