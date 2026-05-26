import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { LandPlot, Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.auth.login({ email, password });
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-100">
        <div className="flex-1 p-10 md:p-20 relative overflow-hidden bg-brand-blue text-white flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange rounded-full blur-[120px] opacity-20 -mr-48 -mt-48" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <img src="/logo.png" alt="Raybann Properties" className="h-16 w-auto brightness-0 invert" />
            </div>
            <h2 className="text-5xl font-display font-bold tracking-tighter leading-tight mb-6">
              Modern solution<br/>for land management.
            </h2>
            <p className="text-white/60 font-medium max-w-sm">
              Directly manage our land inventory, acquire new properties, and track customer balances in one unified console.
            </p>
          </div>

          <div className="relative z-10 pt-10 border-t border-white/5 flex items-center justify-between">
            <div className="flex -space-x-4 text-white">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-blue bg-brand-orange flex items-center justify-center text-[10px] font-bold">
                  {i}
                </div>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mx-4">Property Management Console</p>
          </div>
        </div>

        <div className="flex-1 p-10 md:p-20 bg-white">
          <div className="max-w-sm mx-auto">
            <h1 className="text-3xl font-display font-extrabold tracking-tighter mb-2 text-brand-blue">Welcome Back</h1>
            <p className="text-slate-400 text-sm font-medium mb-10">Enter your credentials to access the console.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none" 
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                  <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-brand-blue hover:text-brand-orange hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full group mt-4 py-5 bg-brand-blue text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-orange transition-all disabled:opacity-50 shadow-xl shadow-brand-blue/10"
              >
                {loading ? 'Authenticating...' : 'Sign In to Console'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-black/5">
              <p className="text-[10px] text-center text-black/30 font-bold uppercase tracking-widest">
                Internal Property Management System v2.6.4
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
