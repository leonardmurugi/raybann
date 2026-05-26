import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Wallet,
  Building2,
  Users,
  FileText,
  Clock,
  Plus,
  Printer,
  X,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Financials() {
  const [activeTab, setActiveTab] = useState<'customer-payments' | 'office-expenses' | 'property-costs' | 'sales-invoices'>('customer-payments');
  const [data, setData] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected items for modals
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoiceSaleId, setSelectedInvoiceSaleId] = useState<number | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Recording modals
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddPropCostOpen, setAddPropCostOpen] = useState(false);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    sale_id: '',
    amount: 0,
    method: 'mpesa',
    transaction_ref: '',
    description: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    category: 'rent',
    amount: 0,
    description: ''
  });

  const [propCostForm, setPropCostForm] = useState({
    parent_property_id: '',
    land_id: '',
    category: 'survey',
    amount: 0,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    // Load metadata for forms
    async function loadFormMetadata() {
      try {
        const [s, p, l] = await Promise.all([
          api.sales.list(),
          api.properties.list(),
          api.lands.list()
        ]);
        setSales(s);
        setProperties(p);
        setLands(l);
      } catch (err) {
        console.error('Error loading form metadata:', err);
      }
    }
    loadFormMetadata();
  }, [isAddPaymentOpen, isAddPropCostOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const params = startDate || endDate ? { startDate, endDate } : undefined;
      
      if (activeTab === 'customer-payments') {
        const list = await api.payments.list(params);
        setData(list);
      } else if (activeTab === 'office-expenses') {
        const list = await api.expenses.list(params);
        setData(list);
      } else if (activeTab === 'property-costs') {
        const list = await api.propertyCosts.list(params);
        setData(list);
      } else if (activeTab === 'sales-invoices') {
        const list = await api.sales.list();
        setData(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvoiceDetails(saleId: number) {
    try {
      const details = await api.sales.get(saleId);
      setInvoiceData(details);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.payments.create({
        type: 'received',
        amount: paymentForm.amount,
        method: paymentForm.method,
        category: 'plot_installment',
        description: paymentForm.description || `Installment payment for sale #${paymentForm.sale_id}`,
        reference_id: parseInt(paymentForm.sale_id),
        reference_type: 'sale',
        transaction_ref: paymentForm.transaction_ref
      });
      setAddPaymentOpen(false);
      setPaymentForm({ sale_id: '', amount: 0, method: 'mpesa', transaction_ref: '', description: '' });
      loadData();
      alert('Installment payment recorded and awaiting admin approval.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording payment');
    }
  }

  async function handleRecordExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.expenses.create(expenseForm);
      setAddExpenseOpen(false);
      setExpenseForm({ category: 'rent', amount: 0, description: '' });
      loadData();
      alert('Operational expense logged for approval.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording expense');
    }
  }

  async function handleRecordPropCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.propertyCosts.create({
        parent_property_id: propCostForm.parent_property_id ? parseInt(propCostForm.parent_property_id) : null,
        land_id: propCostForm.land_id ? parseInt(propCostForm.land_id) : null,
        category: propCostForm.category,
        amount: propCostForm.amount,
        description: propCostForm.description
      });
      setAddPropCostOpen(false);
      setPropCostForm({ parent_property_id: '', land_id: '', category: 'survey', amount: 0, description: '' });
      loadData();
      alert('Property cost logged and awaiting validation.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording property cost');
    }
  }

  // Calculate totals for quick overview cards
  const balanceOutstanding = sales.reduce((acc, sale) => acc + (parseFloat(sale.total_price) - parseFloat(sale.paid_amount)), 0);
  const totalCollections = data.filter(d => d.type === 'received' && d.is_approved).reduce((acc, d) => acc + parseFloat(d.amount), 0);

  return (
    <div className="space-y-6 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Finance</h1>
          <p className="text-slate-500 text-sm font-medium">Ledger management and financial categorization</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-wrap">
          {[
            { id: 'customer-payments', label: 'Payments', icon: Users },
            { id: 'office-expenses', label: 'Operations', icon: Building2 },
            { id: 'property-costs', label: 'Property Costs', icon: Wallet },
            { id: 'sales-invoices', label: 'Invoices', icon: FileSpreadsheet },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                activeTab === tab.id ? "bg-brand-blue text-white shadow-sm" : "text-slate-400 hover:text-brand-blue"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Date Range Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Filters:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">From</span>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 ring-brand-blue/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">To</span>
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
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-xs font-display font-bold uppercase tracking-widest text-brand-blue">
                  {activeTab === 'customer-payments' ? 'Customer Payments Ledger' :
                   activeTab === 'office-expenses' ? 'Office Expenses Ledger' :
                   activeTab === 'property-costs' ? 'Property Costs (Survey, Subdivisions, Deeds)' :
                   'Client Invoices Overview'}
                </h3>
                
                {/* Dynamic Logging Buttons based on active tab */}
                {activeTab === 'customer-payments' && (
                  <button 
                    onClick={() => setAddPaymentOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Installment
                  </button>
                )}
                {activeTab === 'office-expenses' && (
                  <button 
                    onClick={() => setAddExpenseOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Expense
                  </button>
                )}
                {activeTab === 'property-costs' && (
                  <button 
                    onClick={() => setAddPropCostOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Property Cost
                  </button>
                )}
             </div>
             
             <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-wider text-xs animate-pulse">Loading Ledger Records...</div>
                ) : data.length === 0 ? (
                  <div className="p-10 text-center text-slate-300 font-bold uppercase tracking-wider text-xs">No records logged in selected date range.</div>
                ) : activeTab === 'sales-invoices' ? (
                  data.map((sale) => (
                    <div key={sale.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-brand-blue flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-[13px] text-brand-blue">{sale.customer_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Plot: {sale.plot_number} ({sale.size}) • {sale.location}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-[13px] text-slate-800">KES {parseFloat(sale.total_price).toLocaleString()}</p>
                        <button 
                          onClick={() => { setSelectedInvoiceSaleId(sale.id); fetchInvoiceDetails(sale.id); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-orange flex items-center gap-1 justify-end mt-0.5 hover:underline"
                        >
                          Generate Invoice
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  data.map((item) => (
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
                             <p className="font-display font-semibold text-[13px] text-brand-blue capitalize">{item.category.replace('_', ' ')}</p>
                             {item.property_name && <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/5 px-2 py-0.5 rounded italic">{item.property_name}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.date).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className={item.is_approved ? "text-emerald-500" : "text-amber-500"}>
                              {item.is_approved ? 'Approved' : 'Pending Approval'}
                            </span>
                            {item.customer_name && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-slate-400">Client: {item.customer_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-display font-semibold text-[13px]",
                          item.type === 'received' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {item.type === 'received' ? '+' : '-'} KES {parseFloat(item.amount).toLocaleString()}
                        </p>
                        {item.type === 'received' && (
                          <button 
                            onClick={() => setSelectedReceipt({
                              ref: item.receipt_number || `RCP-${item.id}`,
                              date: new Date(item.date).toLocaleDateString(),
                              amount: parseFloat(item.amount),
                              category: item.category,
                              customer: item.customer_name,
                              method: item.method,
                              status: item.is_approved ? 'official' : 'pending'
                            })}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-60 hover:opacity-100 hover:text-brand-blue flex items-center gap-1 justify-end mt-0.5 hover:underline"
                          >
                            <FileText className="w-3 h-3" /> View Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-blue p-8 rounded-3xl text-white space-y-6 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-brand-orange blur-3xl opacity-20" />
            <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Dynamic Ledger Aggregation</p>
              <h4 className="text-3xl font-display font-semibold mt-2">Outstanding Balances</h4>
            </div>
            <div className="text-xs font-semibold space-y-2">
              <div className="flex justify-between">
                <span className="opacity-60">Client Debts:</span>
                <span className="font-bold text-brand-orange">KES {balanceOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Operations Metrics</h4>
             <div className="space-y-4">
                {[
                  { label: 'Pending Collections', value: `KES ${sales.reduce((acc, s) => acc + (!s.is_approved ? parseFloat(s.total_price) : 0), 0).toLocaleString()}` },
                  { label: 'Number of Properties', value: properties.length },
                  { label: 'Plots Subdivided', value: lands.length },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-semibold text-slate-600">{stat.label}</span>
                    <span className="text-xs font-bold text-slate-900">{stat.value}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Record Installment Payment Modal */}
      <AnimatePresence>
        {isAddPaymentOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPaymentOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Receipting Log</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Record Installment</h2>
                </div>
                <button onClick={() => setAddPaymentOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordPayment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Sale Agreement</label>
                  <select 
                    required
                    value={paymentForm.sale_id}
                    onChange={e => setPaymentForm({...paymentForm, sale_id: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                  >
                    <option value="">Select plot purchase</option>
                    {sales.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.customer_name} - Plot {s.plot_number} (Bal: KES {(parseFloat(s.total_price) - parseFloat(s.paid_amount)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount Received (KES)</label>
                    <input 
                      type="number"
                      required
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({...paymentForm, amount: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-orange"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
                    <select 
                      value={paymentForm.method}
                      onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transaction Reference Code</label>
                  <input 
                    type="text"
                    required
                    value={paymentForm.transaction_ref}
                    onChange={e => setPaymentForm({...paymentForm, transaction_ref: e.target.value})}
                    placeholder="M-Pesa Ref or Bank Code"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPaymentOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform">Log Installment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Expense Modal */}
      <AnimatePresence>
        {isAddExpenseOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddExpenseOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Company Operations</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Record Expense</h2>
                </div>
                <button onClick={() => setAddExpenseOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordExpense} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expense Category</label>
                    <select 
                      value={expenseForm.category}
                      onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="rent">Office Rent</option>
                      <option value="salary">Staff Salaries</option>
                      <option value="transport">Transport / Fuel</option>
                      <option value="utilities">Utilities & Office expenses</option>
                      <option value="field_costs">Field Workers / Survey</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount (KES)</label>
                    <input 
                      type="number"
                      required
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({...expenseForm, amount: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-orange"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expense Description</label>
                  <input 
                    type="text"
                    required
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                    placeholder="e.g. Field worker daily allowances"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none text-brand-blue"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddExpenseOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-[#1B315F] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] transition-transform">Log Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Property Cost Modal */}
      <AnimatePresence>
        {isAddPropCostOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPropCostOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Property Acquisition</p>
                  <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">Record Cost</h2>
                </div>
                <button onClick={() => setAddPropCostOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordPropCost} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Parent Property</label>
                  <select 
                    required
                    value={propCostForm.parent_property_id}
                    onChange={e => setPropCostForm({...propCostForm, parent_property_id: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                  >
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cost Category</label>
                    <select 
                      value={propCostForm.category}
                      onChange={e => setPropCostForm({...propCostForm, category: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-blue"
                    >
                      <option value="survey">Survey Fees</option>
                      <option value="legal">Legal Fees / Conveyance</option>
                      <option value="subdivision">Subdivision Costs</option>
                      <option value="title_processing">Title Deed Processing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount (KES)</label>
                    <input 
                      type="number"
                      required
                      value={propCostForm.amount}
                      onChange={e => setPropCostForm({...propCostForm, amount: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none text-brand-orange"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                  <input 
                    type="text"
                    required
                    value={propCostForm.description}
                    onChange={e => setPropCostForm({...propCostForm, description: e.target.value})}
                    placeholder="e.g. Survey beacons installation"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none text-brand-blue"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPropCostOpen(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-brand-orange text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 hover:scale-[1.02] transition-transform">Log Property Cost</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipts view Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReceipt(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-[480px] bg-white rounded-3xl p-10 flex flex-col items-center print-container shadow-2xl border border-slate-100"
            >
               <button onClick={() => setSelectedReceipt(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 no-print">
                 <X className="w-5 h-5 text-slate-400" />
               </button>

               <div className="w-full text-center space-y-2 mb-10 pb-8 border-b border-dashed border-slate-100">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <img src="/logo.png" alt="Raybann Properties" className="h-12 w-auto" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Acquisition & Management</p>
                  <p className="text-[8px] font-semibold text-slate-300">Nairobi, Kenya • 0700 000 000</p>
               </div>

               <div className="w-full space-y-6 text-slate-600">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Receipt ID</p>
                        <p className="text-xs font-black text-brand-blue">#{selectedReceipt.ref}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
                        <p className="text-xs font-bold text-brand-blue">{selectedReceipt.date}</p>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount Received</p>
                     <p className="text-3xl font-display font-semibold text-brand-blue tracking-tight">KES {selectedReceipt.amount.toLocaleString()}</p>
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

               <div className="w-full flex gap-4 mt-10 no-print">
                  <button onClick={handlePrint} className="flex-1 py-4 bg-brand-blue text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10 hover:bg-brand-orange transition-all">
                     <Printer className="w-4 h-4" /> Print Document
                  </button>
                  <button onClick={() => setSelectedReceipt(null)} className="px-6 py-4 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50">
                     Done
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice modal */}
      <AnimatePresence>
        {selectedInvoiceSaleId && invoiceData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedInvoiceSaleId(null); setInvoiceData(null); }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-[640px] bg-white rounded-3xl p-10 flex flex-col print-container shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
               <button onClick={() => { setSelectedInvoiceSaleId(null); setInvoiceData(null); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 no-print">
                 <X className="w-5 h-5 text-slate-400" />
               </button>

               <div className="w-full flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
                  <div className="space-y-2">
                    <img src="/logo.png" alt="Raybann Properties" className="h-12 w-auto" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raybann Properties Kenya</p>
                    <p className="text-[8px] font-semibold text-slate-350">Nairobi HQ • info@raybann.co.ke</p>
                  </div>
                  <div className="text-right">
                     <h2 className="text-2xl font-black text-brand-blue uppercase tracking-wider">INVOICE</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase mt-1">Sale Agreement #{invoiceData.sale.id}</p>
                     <p className="text-[10px] font-semibold text-slate-300 mt-0.5">Date: {new Date(invoiceData.sale.date).toLocaleDateString()}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                  <div>
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Billed To:</h4>
                     <p className="font-bold text-brand-blue text-sm">{invoiceData.sale.customer_name}</p>
                     <p className="text-slate-500 mt-1">ID: {invoiceData.sale.customer_id_number}</p>
                     <p className="text-slate-500">Phone: {invoiceData.sale.customer_phone}</p>
                     {invoiceData.sale.customer_email && <p className="text-slate-500">Email: {invoiceData.sale.customer_email}</p>}
                  </div>
                  <div className="text-right">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Property Purchased:</h4>
                     <p className="font-bold text-brand-blue text-sm">{invoiceData.sale.parent_name || 'Individual Subdivision'}</p>
                     <p className="text-slate-500 mt-1">Plot Number: {invoiceData.sale.plot_number}</p>
                     <p className="text-slate-500">Size: {invoiceData.sale.size} • Location: {invoiceData.sale.location}</p>
                  </div>
               </div>

               {/* Statement Table */}
               <div className="border border-slate-100 rounded-2xl overflow-hidden mb-8">
                  <table className="w-full text-left text-xs">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                           <th className="px-6 py-3">Description</th>
                           <th className="px-6 py-3 text-right">Price (KES)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        <tr>
                           <td className="px-6 py-4 font-semibold text-slate-800">
                              Direct Acquisition of Plot {invoiceData.sale.plot_number} ({invoiceData.sale.size})
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-brand-blue">
                              {parseFloat(invoiceData.sale.total_price).toLocaleString()}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>

               {/* Payments Ledger breakdown */}
               <div className="space-y-3 mb-8">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Installments Statement</h4>
                  {invoiceData.payments.length === 0 ? (
                     <p className="text-xs text-slate-400 italic">No payments recorded towards this sale.</p>
                  ) : (
                     <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs bg-slate-50/50">
                        <div className="grid grid-cols-4 font-bold uppercase tracking-wider text-[9px] text-slate-400 bg-slate-50 p-3 border-b border-slate-100">
                           <span>Date</span>
                           <span>Ref Code</span>
                           <span>Method</span>
                           <span className="text-right">Amount (KES)</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                           {invoiceData.payments.map((p: any) => (
                              <div key={p.id} className="grid grid-cols-4 p-3 hover:bg-slate-50">
                                 <span className="text-slate-500">{new Date(p.date).toLocaleDateString()}</span>
                                 <span className="font-bold text-slate-700">{p.transaction_ref || 'N/A'}</span>
                                 <span className="uppercase text-slate-500">{p.method}</span>
                                 <span className={cn(
                                    "text-right font-bold",
                                    p.is_approved ? "text-emerald-600" : "text-amber-500"
                                 )}>
                                    {parseFloat(p.amount).toLocaleString()} {!p.is_approved && '(Pending)'}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               <div className="flex justify-between items-start pt-6 border-t border-slate-100 mb-8 text-xs">
                  <div>
                     <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                        parseFloat(invoiceData.sale.paid_amount) >= parseFloat(invoiceData.sale.total_price) 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                     )}>
                        {parseFloat(invoiceData.sale.paid_amount) >= parseFloat(invoiceData.sale.total_price) ? 'FULLY PAID' : 'PARTIALLY PAID'}
                     </span>
                  </div>
                  <div className="space-y-2 text-right">
                     <div className="flex justify-between gap-12">
                        <span className="font-medium text-slate-400">Total Price:</span>
                        <span className="font-bold text-brand-blue">KES {parseFloat(invoiceData.sale.total_price).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between gap-12 text-emerald-600 font-semibold">
                        <span>Total Paid (Approved):</span>
                        <span>- KES {parseFloat(invoiceData.sale.paid_amount).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between gap-12 border-t border-slate-100 pt-2 font-bold text-brand-orange text-sm">
                        <span>Balance Outstanding:</span>
                        <span>KES {(parseFloat(invoiceData.sale.total_price) - parseFloat(invoiceData.sale.paid_amount)).toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               <div className="w-full flex gap-4 mt-auto no-print">
                  <button onClick={handlePrint} className="flex-1 py-4 bg-brand-blue text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10 hover:bg-brand-orange transition-all">
                     <Printer className="w-4 h-4" /> Print Invoice
                  </button>
                  <button onClick={() => { setSelectedInvoiceSaleId(null); setInvoiceData(null); }} className="px-6 py-4 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50">
                     Close
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
