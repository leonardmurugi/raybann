import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Map as MapIcon, 
  Users as UsersIcon, 
  DollarSign, 
  AlertCircle,
  ArrowUpRight,
  LandPlot,
  Building2,
  ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion } from 'motion/react';

const mockData = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 2000, expenses: 9800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
  { name: 'May', revenue: 1890, expenses: 4800 },
  { name: 'Jun', revenue: 2390, expenses: 3800 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    loadStats();
  }, []);

  const cards = [
    { 
      title: 'Gross Collection', 
      value: `KES ${stats?.received?.toLocaleString() || '0'}`, 
      icon: TrendingUp, 
      color: 'bg-emerald-500', 
      desc: 'All-time approved payments' 
    },
    { 
      title: 'Customer Debt', 
      value: `KES ${stats?.landDebt?.toLocaleString() || '0'}`, 
      icon: AlertCircle, 
      color: 'bg-rose-500', 
      desc: 'Total balances from plot sales' 
    },
    { 
      title: 'Portfolio Size', 
      value: stats?.propertyCount?.toString() || '0', 
      icon: Building2, 
      color: 'bg-amber-500', 
      desc: 'Main properties acquired' 
    },
    { 
      title: 'Plot Inventory', 
      value: `${stats?.landCount || 0}`, 
      icon: LandPlot, 
      color: 'bg-blue-500', 
      desc: 'Total subdivided units' 
    },
  ];

  const secondaryStats = [
    { label: 'Unpaid Land Balances', value: `KES ${stats?.propertyDebt?.toLocaleString() || '0'}`, desc: 'Owed to original sellers' },
    { label: 'Operating Expenses', value: `KES ${stats?.expenses?.toLocaleString() || '0'}`, desc: 'Approved company costs' },
    { label: 'Available Plots', value: stats?.landCount || 0, desc: 'Ready for sale' },
  ];

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <LandPlot className="w-12 h-12 text-[#5A5A40] opacity-20" />
        <span className="text-sm font-bold tracking-widest uppercase opacity-30">Loading Insights...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Overview</h1>
          <p className="text-black/50 text-sm font-medium">Raybann Properties Management System — Nairobi HQ</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Live System Status</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={card.title}
            className="group bg-white p-6 rounded-[2rem] border border-black/5 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-500", card.color)} />
            <div className="relative z-10 space-y-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", card.color)}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-black/40 font-bold text-xs uppercase tracking-widest">{card.title}</h3>
                <p className="text-2xl font-bold tracking-tighter mt-1">{card.value}</p>
                <p className="text-[10px] text-black/50 font-medium mt-2">{card.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        {secondaryStats.map((stat) => (
          <div key={stat.label} className="bg-white/40 backdrop-blur-sm border border-black/5 px-6 py-4 rounded-2xl flex flex-col min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">{stat.label}</span>
            <span className="text-lg font-bold tracking-tight">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold tracking-tight">Revenue Analytics</h3>
            <select className="bg-black/5 border-none rounded-xl text-xs font-bold px-4 py-2 outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#5A5A40" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#5A5A40] rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold tracking-tight mb-2">Expiring Payments</h3>
            <p className="text-white/40 text-xs font-medium mb-8">Follow up required for these plots</p>
            
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Plot 44-B</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Overdue: 12 Days</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <button className="relative z-10 w-full mt-10 py-5 bg-[#5A5A40] text-white rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
