import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  Wallet, 
  Menu, 
  X, 
  LogOut,
  ChevronRight,
  LandPlot,
  CheckCircle,
  Building2,
  FileSpreadsheet,
  PieChart,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/lands', icon: Map },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Financials', path: '/financials', icon: Wallet },
    { name: 'Reports', path: '/reports', icon: PieChart },
    { name: 'Migration', path: '/import', icon: FileSpreadsheet },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Approvals', path: '/approvals', icon: CheckCircle });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-slate-800 font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <LandPlot className="w-8 h-8 text-slate-900" />
          <span className="text-xl font-display font-medium tracking-tight">Raybann</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0">
        <div className="p-8 flex items-center gap-3">
          <LandPlot className="w-9 h-9 text-slate-900" />
          <div className="flex flex-col">
            <span className="text-2xl font-display font-medium tracking-tight leading-none text-slate-900">Raybann</span>
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold text-slate-500">Properties Kenya</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-semibold",
                    isActive 
                      ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "opacity-70 group-hover:opacity-100")} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="bg-black/5 p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-bold">
                {user?.name?.[0].toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">{user?.name}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-50">{user?.role}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] bg-white z-[70] lg:hidden p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <LandPlot className="w-8 h-8 text-[#5A5A40]" />
                  <span className="text-xl font-bold tracking-tight">Rayban Properties</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 bg-black/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all",
                      location.pathname === item.path ? "bg-[#5A5A40] text-white" : "bg-black/5 text-black/70"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-bold">{item.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-6 left-6 right-6">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl font-bold"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="lg:ml-64 pt-24 lg:pt-0 p-4 lg:p-12 transition-all duration-300">
        <div className="max-w-6xl mx-auto space-y-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
