import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  TrendingUp, 
  Users, 
  LandPlot, 
  FileText,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api.dashboard.stats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const chartData = [
    { name: 'Jan', sales: 4000, collections: 2400 },
    { name: 'Feb', sales: 3000, collections: 1398 },
    { name: 'Mar', sales: 2000, collections: 9800 },
    { name: 'Apr', sales: 2780, collections: 3908 },
    { name: 'May', sales: 1890, collections: 4800 },
  ];

  return (
    <div className="space-y-10 font-sans max-w-6xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Business Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Consolidated operational and financial performance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Export All
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Plot Sales', value: stats?.salesCount || 0, icon: LandPlot, trend: '+12%', color: 'text-blue-600' },
          { label: 'Total Collections', value: `K ${((stats?.received || 0) / 1000).toFixed(0)}k`, icon: TrendingUp, trend: '+8%', color: 'text-emerald-600' },
          { label: 'Pending Debts', value: `K ${((stats?.propertyDebt || 0) / 1000).toFixed(0)}k`, icon: DollarSign, trend: '-2%', color: 'text-rose-600' },
          { label: 'New Leads', value: stats?.customerCount || 0, icon: Users, trend: '+5%', color: 'text-amber-600' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{item.trend}</span>
            </div>
            <p className="text-2xl font-display font-semibold text-slate-900">{item.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Collection Trends</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Sales</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Payments</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={10} fontWeight={600} stroke="#94A3B8" />
                <YAxis fontSize={10} fontWeight={600} stroke="#94A3B8" />
                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-sm font-semibold text-slate-900">Performance Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Collection Rate', value: '72%', sub: 'Target: 85%' },
              { label: 'Plot Inventory', value: '45/80', sub: 'Sold: 35' },
              { label: 'Avg Sale Cycle', value: '42d', sub: 'Target: 30d' },
            ].map((metric, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{metric.label}</span>
                    <span className="text-sm font-bold text-slate-900">{metric.value}</span>
                 </div>
                 <p className="text-[10px] text-slate-400">{metric.sub}</p>
              </div>
            ))}
          </div>
          <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors">
            Generate Detailed P&L
          </button>
        </div>
      </div>
    </div>
  );
}
