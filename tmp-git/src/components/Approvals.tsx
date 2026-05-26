import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  ThumbsUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Approvals() {
  const [pending, setPending] = useState<{ payments: any[], expenses: any[], propertyCosts: any[] }>({ payments: [], expenses: [], propertyCosts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    try {
      const data = await api.approvals.list();
      setPending({
        payments: data.payments || [],
        expenses: data.expenses || [],
        propertyCosts: data.propertyCosts || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovePayment(id: number) {
    try {
      await api.approvals.approvePayment(id);
      loadPending();
      alert('Payment approved. Sale ledger and plot status updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving payment');
    }
  }

  async function handleApproveExpense(id: number) {
    try {
      await api.approvals.approveExpense(id);
      loadPending();
      alert('Operational expense approved.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving expense');
    }
  }

  async function handleApprovePropertyCost(id: number) {
    try {
      await api.approvals.approvePropertyCost(id);
      loadPending();
      alert('Subdivision property cost approved and verified.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving property cost');
    }
  }

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header>
        <h1 className="text-4xl font-display font-medium tracking-tighter text-brand-blue">Approvals</h1>
        <p className="text-slate-400 text-sm font-medium">Review and validate financial records</p>
      </header>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <span className="text-sm font-bold tracking-widest uppercase opacity-30">Loading Pending Approvals...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payments Approval Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold uppercase text-[10px] tracking-widest text-brand-orange">Pending Payments ({pending.payments.length})</h2>
            </div>

            <div className="space-y-4">
              {pending.payments.length === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 text-center space-y-4 shadow-sm">
                   <ThumbsUp className="w-12 h-12 text-brand-orange mx-auto opacity-20" />
                   <p className="text-sm font-bold text-slate-300">All payments up to date</p>
                </div>
              ) : (
                pending.payments.map((payment) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={payment.id} 
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-orange/5 flex items-center justify-center text-brand-orange">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-blue">KES {parseFloat(payment.amount).toLocaleString()}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest">{payment.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-slate-400 px-3 py-1 rounded-full border border-slate-100">{payment.method}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mb-6">
                      <div className="flex items-center justify-between text-xs font-medium">
                         <span className="text-slate-400">Reference Code</span>
                         <span className="font-bold text-brand-blue">{payment.transaction_ref || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                         <span className="text-slate-400">Client Name</span>
                         <span className="font-bold text-slate-700">{payment.customer_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                         <span className="text-slate-400">Temp Receipt</span>
                         <span className="font-bold text-brand-orange tracking-wider">{payment.receipt_number}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleApprovePayment(payment.id)}
                      className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Payment
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Expenses Approval Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold uppercase text-[10px] tracking-widest text-brand-orange">Pending Expenses ({pending.expenses.length})</h2>
            </div>

            <div className="space-y-4">
               {pending.expenses.length === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 text-center space-y-4 shadow-sm">
                   <ThumbsUp className="w-12 h-12 text-brand-orange mx-auto opacity-20" />
                   <p className="text-sm font-bold text-slate-300">All expenses cleared</p>
                </div>
              ) : (
                pending.expenses.map((expense) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={expense.id} 
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-blue">KES {parseFloat(expense.amount).toLocaleString()}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest">{expense.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 text-xs font-medium text-slate-500 italic">
                      "{expense.description || 'No description provided'}"
                      {expense.operator_name && <p className="text-[10px] font-bold text-brand-blue mt-2 uppercase tracking-wide">Logged by {expense.operator_name}</p>}
                    </div>

                    <button 
                      onClick={() => handleApproveExpense(expense.id)}
                      className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Validate Expense
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Property Costs Approval Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold uppercase text-[10px] tracking-widest text-brand-orange">Subdivision Costs ({pending.propertyCosts.length})</h2>
            </div>

            <div className="space-y-4">
               {pending.propertyCosts.length === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 text-center space-y-4 shadow-sm">
                   <ThumbsUp className="w-12 h-12 text-brand-orange mx-auto opacity-20" />
                   <p className="text-sm font-bold text-slate-300">All property costs approved</p>
                </div>
              ) : (
                pending.propertyCosts.map((cost) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={cost.id} 
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-brand-blue">KES {parseFloat(cost.amount).toLocaleString()}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest">{cost.category.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 text-xs font-medium text-slate-500">
                      <p className="italic">"{cost.description || 'No description provided'}"</p>
                      {cost.property_name && <p className="text-[10px] font-bold text-brand-orange mt-2 uppercase tracking-widest">Property: {cost.property_name}</p>}
                    </div>

                    <button 
                      onClick={() => handleApprovePropertyCost(cost.id)}
                      className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify Property Cost
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
