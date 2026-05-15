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
  TrendingUp,
  LandPlot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Land Inventory', path: '/lands', icon: Map },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Financials', path: '/financials', icon: Wallet },
];

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-black/10 fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <LandPlot className="w-8 h-8 text-[#5A5A40]" />
          <span className="text-xl font-bold tracking-tight">Rayban Properties</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-black/10 h-screen fixed left-0 top-0">
        <div className="p-8 flex items-center gap-3">
          <LandPlot className="w-10 h-10 text-[#5A5A40]" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tighter leading-none">Rayban</span>
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Properties Kenya</span>
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" 
                      : "text-black/60 hover:bg-black/5 hover:text-black"
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
      <main className="lg:ml-64 pt-20 lg:pt-0 p-4 lg:p-10 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
