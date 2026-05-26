import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  TrendingUp, 
  Users, 
  LandPlot, 
  DollarSign,
  Download,
  Filter,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  async function loadReports() {
    setLoading(true);
    try {
      const params = startDate || endDate ? { startDate, endDate } : undefined;
      const [sData, aData] = await Promise.all([
        api.dashboard.stats(params),
        api.reports.analytics(params)
      ]);
      setStats(sData);
      setAnalytics(aData);
    } catch (err) {
      console.error('Error loading report analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    if (!stats || !analytics) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Subdivided Plots,${stats.landCount}\n`
      + `Approved Collections,KES ${stats.received}\n`
      + `Outstanding Balances,KES ${stats.landDebt}\n`
      + `Operating Expenses,KES ${stats.expenses}\n`
      + `Properties Acquired,${stats.propertyCount}\n`
      + `Properties Debts,KES ${stats.propertyDebt}\n`
      + `Total Clients,${analytics.customerCount}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `raybann_financial_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) {
    return (
      <div className="h-96 flex items-center justify-center">
        <span className="text-sm font-bold tracking-widest uppercase opacity-30 animate-pulse">Generating Reports...</span>
      </div>
    );
  }

  const collectionRate = stats?.revenue > 0 ? Math.round((stats.received / stats.revenue) * 100) : 0;
  const soldPlotsRatio = stats?.landCount > 0 ? `${stats.landCount - (stats.availablePlotsCount || 0)}/${stats.landCount}` : '0/0';

  return (
    <div className="space-y-10 font-sans max-w-6xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-brand-blue">Business Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Consolidated operational and financial performance</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-blue hover:bg-slate-50 transition-colors shadow-sm self-start md:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </header>

      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Report Range:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Start Date</span>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 ring-brand-blue/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">End Date</span>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 ring-brand-blue/20"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-red-500 font-semibold hover:underline"
            >
              Reset Range
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Plots Subdivided', value: stats?.landCount || 0, icon: LandPlot, trend: 'All-time total', color: 'text-brand-blue' },
          { label: 'Total Collections', value: `KES ${((stats?.received || 0)).toLocaleString()}`, icon: TrendingUp, trend: 'Approved payments', color: 'text-emerald-600' },
          { label: 'Outstanding Debts', value: `KES ${((stats?.landDebt || 0)).toLocaleString()}`, icon: DollarSign, trend: 'Plot balances', color: 'text-brand-orange' },
          { label: 'Registered Clients', value: analytics?.customerCount || 0, icon: Users, trend: 'Active portfolio', color: 'text-brand-blue' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-slate-50 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{item.trend}</span>
            </div>
            <p className="text-xl font-display font-bold text-slate-900 truncate">{item.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-brand-blue uppercase tracking-wider">Business Activity Breakdown</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-blue" /> Collections</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-orange" /> Expenses</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={10} fontWeight={600} stroke="#94A3B8" />
                <YAxis fontSize={10} fontWeight={600} stroke="#94A3B8" />
                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="collections" fill="#1B315F" radius={[4, 4, 0, 0]} name="Collections" />
                <Bar dataKey="expenses" fill="#F4811F" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-sm font-display font-semibold text-brand-blue uppercase tracking-wider">Performance Indicators</h3>
            <div className="space-y-4">
              {[
                { label: 'Collection Rate', value: `${collectionRate}%`, sub: 'Ratio of payments to total sales' },
                { label: 'Subdivided Inventory', value: `${stats?.landCount || 0} Units`, sub: 'Total plots on file' },
                { label: 'Total Company Costs', value: `KES ${(stats?.expenses || 0).toLocaleString()}`, sub: 'Approved operating + property costs' },
              ].map((metric, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{metric.label}</span>
                      <span className="text-sm font-bold text-brand-blue">{metric.value}</span>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-normal">{metric.sub}</p>
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
