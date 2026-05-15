import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  FileText,
  AlertCircle,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Approvals() {
  const [pending, setPending] = useState<{ payments: any[], expenses: any[] }>({ payments: [], expenses: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    try {
      const data = await api.approvals.list();
      setPending(data);
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving payment');
    }
  }

  async function handleApproveExpense(id: number) {
    try {
      await api.approvals.approveExpense(id);
      loadPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving expense');
    }
  }

  return (
    <div className="space-y-8 pb-10 font-sans">
      <header>
        <h1 className="text-4xl font-bold tracking-tighter">Approvals</h1>
        <p className="text-black/50 text-sm font-medium">Review and validate financial records</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payments Approval Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight uppercase text-xs tracking-widest text-[#5A5A40]">Pending Payments ({pending.payments.length})</h2>
          </div>

          <div className="space-y-4">
            {pending.payments.length === 0 ? (
              <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 text-center space-y-4">
                 <ThumbsUp className="w-12 h-12 text-emerald-500 mx-auto opacity-20" />
                 <p className="text-sm font-bold text-black/30">All payments up to date</p>
              </div>
            ) : (
              pending.payments.map((payment) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={payment.id} 
                  className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">KES {parseFloat(payment.amount).toLocaleString()}</p>
                        <p className="text-[10px] uppercase font-bold text-black/30 tracking-widest">{payment.category.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest bg-black/5 px-3 py-1 rounded-full">{payment.method}</p>
                    </div>
                  </div>

                  <div className="bg-black/[0.02] p-4 rounded-2xl border border-black/5 space-y-3 mb-6">
                    <div className="flex items-center justify-between text-xs font-medium">
                       <span className="text-black/40">Reference</span>
                       <span className="font-bold">{payment.transaction_ref || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                       <span className="text-black/40">Temp Receipt</span>
                       <span className="font-bold text-[#5A5A40]">{payment.receipt_number}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleApprovePayment(payment.id)}
                    className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold text-xs hover:bg-[#5A5A40] transition-all flex items-center justify-center gap-2"
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
            <h2 className="text-xl font-bold tracking-tight uppercase text-xs tracking-widest text-[#5A5A40]">Pending Expenses ({pending.expenses.length})</h2>
          </div>

          <div className="space-y-4">
             {pending.expenses.length === 0 ? (
              <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 text-center space-y-4">
                 <ThumbsUp className="w-12 h-12 text-emerald-500 mx-auto opacity-20" />
                 <p className="text-sm font-bold text-black/30">All expenses cleared</p>
              </div>
            ) : (
              pending.expenses.map((expense) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={expense.id} 
                  className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">KES {parseFloat(expense.amount).toLocaleString()}</p>
                        <p className="text-[10px] uppercase font-bold text-black/30 tracking-widest">{expense.category}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/[0.02] p-4 rounded-2xl border border-black/5 mb-6 text-xs font-medium text-black/60 italic">
                    "{expense.description || 'No description provided'}"
                  </div>

                  <button 
                    onClick={() => handleApproveExpense(expense.id)}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold text-xs hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-100"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Validate Expense
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
