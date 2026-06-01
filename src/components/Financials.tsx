import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
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
  FileSpreadsheet,
  Edit3,
  Trash2,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseExcel } from '../lib/csvParser';
import { Buffer } from 'buffer';


export default function Financials() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'customer-payments' | 'office-expenses' | 'property-costs' | 'sales-invoices' | 'payroll' | 'debts-payables' | 'petty-cash'>('customer-payments');
  const [data, setData] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialSheets, setFinancialSheets] = useState([]);
  const [balanceOutstanding, setBalanceOutstanding] = useState(0);
  
  // Selected items for modals
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoiceSaleId, setSelectedInvoiceSaleId] = useState<number | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Recording modals
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddPropCostOpen, setAddPropCostOpen] = useState(false);
  const [isAddPayrollOpen, setAddPayrollOpen] = useState(false);
  const [isAddDebtOpen, setAddDebtOpen] = useState(false);
  const [isAddPettyOpen, setAddPettyOpen] = useState(false);
  const [isEditRecordOpen, setEditRecordOpen] = useState(false);
  const [isCustomDocOpen, setCustomDocOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

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

  const [payrollForm, setPayrollForm] = useState({
    staff_name: '',
    month_year: 'August 2025',
    basic: 0,
    commission: 0,
    transport: 0,
    deductions: 0,
    gross_amount: 0,
    net_amount: 0,
    reporting_date: ''
  });

  const [debtForm, setDebtForm] = useState({
    creditor_name: '',
    description: '',
    total_amount: 0,
    paid_amount: 0,
    balance: 0,
    date: '',
    payment_method: 'CASH',
    status: 'pending'
  });

  const [pettyForm, setPettyForm] = useState({
    date: '',
    type: 'credit',
    description: '',
    ref_number: '',
    amount: 0
  });

  const [customDocForm, setCustomDocForm] = useState({
    type: 'invoice',
    recipient: '',
    description: '',
    amount: 0,
    method: '',
    reference: '',
    status: 'pending',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
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

  useEffect(() => {
    async function loadFinancialData() {
      try {
        const response = await fetch('/financials.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sheets = parseExcel(buffer);
        setFinancialSheets(sheets);
      } catch (err) {
        console.error('Error loading financial data:', err);
      }
    }
    loadFinancialData();
  }, []);


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
      } else if (activeTab === 'payroll') {
        const list = await api.payroll.list();
        setData(list);
      } else if (activeTab === 'debts-payables') {
        const list = await api.debtsPayables.list();
        setData(list);
        const total = list.reduce((acc, item) => acc + (parseFloat(item.balance) || 0), 0);
        setBalanceOutstanding(total);
      } else if (activeTab === 'petty-cash') {
        const list = await api.pettyCash.list();
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

  function formatMoney(value: any) {
    return `KES ${Number(value || 0).toLocaleString()}`;
  }

  function readable(value: any) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function activeTabLabel() {
    if (activeTab === 'customer-payments') return 'Customer Payment';
    if (activeTab === 'office-expenses') return 'Office Expense';
    if (activeTab === 'property-costs') return 'Property Cost';
    if (activeTab === 'sales-invoices') return 'Sale';
    if (activeTab === 'payroll') return 'Payroll';
    if (activeTab === 'debts-payables') return 'Vendor Liability';
    return 'Petty Cash';
  }

  function openCustomDocument() {
    setCustomDocForm({
      type: 'invoice',
      recipient: '',
      description: '',
      amount: 0,
      method: '',
      reference: '',
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setCustomDocOpen(true);
  }

  function handleGenerateCustomDocument(e: React.FormEvent) {
    e.preventDefault();
    setSelectedDocument({
      ...customDocForm,
      source: 'Custom Charge',
      amount: Number(customDocForm.amount || 0),
      lines: [{ description: customDocForm.description, amount: Number(customDocForm.amount || 0) }]
    });
    setCustomDocOpen(false);
  }

  function openRecordDocument(item: any, type: 'invoice' | 'receipt') {
    const amount =
      item.amount ?? item.total_price ?? item.total_amount ?? item.net_amount ?? item.balance ?? item.paid_amount ?? 0;
    const recipient =
      item.customer_name || item.creditor_name || item.staff_name || item.property_name || item.description || 'Raybann Properties';
    const description =
      item.description ||
      item.category ||
      (item.plot_number ? `Plot ${item.plot_number}` : '') ||
      activeTabLabel();

    setSelectedDocument({
      type,
      recipient,
      description: readable(description),
      amount: Number(amount || 0),
      method: item.method || item.payment_method || (item.type ? readable(item.type) : ''),
      reference: item.receipt_number || item.transaction_ref || item.ref_number || `${activeTab.toUpperCase()}-${item.id}`,
      status: item.is_approved ? 'official' : item.status || 'pending',
      date: item.date || item.reporting_date || new Date().toISOString(),
      source: activeTabLabel(),
      notes: type === 'receipt' ? 'Payment received and recorded in the finance ledger.' : 'Charge raised from the finance ledger.',
      lines: [{ description: readable(description), amount: Number(amount || 0) }]
    });
  }

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

  async function handleRecordPayroll(e: React.FormEvent) {
    e.preventDefault();
    try {
      const gross = parseFloat(String(payrollForm.basic)) + parseFloat(String(payrollForm.commission)) + parseFloat(String(payrollForm.transport));
      const net = gross - parseFloat(String(payrollForm.deductions));
      await api.payroll.create({
        ...payrollForm,
        gross_amount: gross,
        net_amount: net
      });
      setAddPayrollOpen(false);
      setPayrollForm({ staff_name: '', month_year: 'August 2025', basic: 0, commission: 0, transport: 0, deductions: 0, gross_amount: 0, net_amount: 0, reporting_date: '' });
      loadData();
      alert('Payroll record recorded successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording payroll');
    }
  }

  async function handleRecordDebt(e: React.FormEvent) {
    e.preventDefault();
    try {
      const bal = parseFloat(String(debtForm.total_amount)) - parseFloat(String(debtForm.paid_amount));
      await api.debtsPayables.create({
        ...debtForm,
        balance: bal,
        status: bal <= 0 ? 'cleared' : 'pending'
      });
      setAddDebtOpen(false);
      setDebtForm({ creditor_name: '', description: '', total_amount: 0, paid_amount: 0, balance: 0, date: '', payment_method: 'CASH', status: 'pending' });
      loadData();
      alert('Vendor debt recorded successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording debt');
    }
  }

  async function handleRecordPetty(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.pettyCash.create(pettyForm);
      setAddPettyOpen(false);
      setPettyForm({ date: '', type: 'credit', description: '', ref_number: '', amount: 0 });
      loadData();
      alert('Petty cash ledger record added.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording petty cash row');
    }
  }

  function openEditRecord(item: any) {
    setEditingRecord(item);
    if (activeTab === 'customer-payments') {
      setEditForm({
        type: item.type || 'received',
        amount: Number(item.amount || 0),
        method: item.method || 'cash',
        category: item.category || 'plot_installment',
        description: item.description || '',
        reference_id: item.reference_id || '',
        reference_type: item.reference_type || '',
        transaction_ref: item.transaction_ref || '',
        is_approved: !!item.is_approved
      });
    } else if (activeTab === 'office-expenses') {
      setEditForm({ category: item.category || 'rent', amount: Number(item.amount || 0), description: item.description || '', is_approved: !!item.is_approved });
    } else if (activeTab === 'property-costs') {
      setEditForm({
        parent_property_id: item.parent_property_id || '',
        land_id: item.land_id || '',
        category: item.category || 'survey',
        amount: Number(item.amount || 0),
        description: item.description || '',
        is_approved: !!item.is_approved
      });
    } else if (activeTab === 'sales-invoices') {
      setEditForm({
        land_id: item.land_id || '',
        customer_id: item.customer_id || '',
        total_price: Number(item.total_price || 0),
        paid_amount: Number(item.paid_amount || 0),
        is_approved: !!item.is_approved
      });
    } else if (activeTab === 'payroll') {
      setEditForm({
        staff_name: item.staff_name || '',
        month_year: item.month_year || '',
        basic: Number(item.basic || 0),
        commission: Number(item.commission || 0),
        transport: Number(item.transport || 0),
        deductions: Number(item.deductions || 0),
        reporting_date: item.reporting_date ? new Date(item.reporting_date).toISOString().slice(0, 10) : ''
      });
    } else if (activeTab === 'debts-payables') {
      setEditForm({
        creditor_name: item.creditor_name || '',
        description: item.description || '',
        total_amount: Number(item.total_amount || 0),
        paid_amount: Number(item.paid_amount || 0),
        date: item.date ? new Date(item.date).toISOString().slice(0, 10) : '',
        payment_method: item.payment_method || 'CASH',
        status: item.status || 'pending'
      });
    } else if (activeTab === 'petty-cash') {
      setEditForm({
        date: item.date ? new Date(item.date).toISOString().slice(0, 10) : '',
        type: item.type || 'credit',
        description: item.description || '',
        ref_number: item.ref_number || '',
        amount: Number(item.amount || 0)
      });
    }
    setEditRecordOpen(true);
  }

  async function handleEditRecord(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updateApi = getCrudApi(activeTab);
      await updateApi.update(editingRecord.id, editForm);
      setEditRecordOpen(false);
      setEditingRecord(null);
      loadData();
      alert('Record updated successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating record');
    }
  }

  async function handleDeleteRecord(item: any) {
    if (!window.confirm('Delete this record?')) return;
    try {
      const deleteApi = getCrudApi(activeTab);
      await deleteApi.delete(item.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting record');
    }
  }

  function getCrudApi(tab: typeof activeTab): any {
    if (tab === 'customer-payments') return api.payments;
    if (tab === 'office-expenses') return api.expenses;
    if (tab === 'property-costs') return api.propertyCosts;
    if (tab === 'sales-invoices') return api.sales;
    if (tab === 'payroll') return api.payroll;
    if (tab === 'debts-payables') return api.debtsPayables;
    return api.pettyCash;
  }

  function AdminRecordActions({ item }: { item: any }) {
    if (user?.role !== 'admin') return null;
    return (
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={() => openEditRecord(item)} className="p-2 bg-slate-50 text-brand-blue rounded-lg hover:bg-slate-100" aria-label="Edit record">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => handleDeleteRecord(item)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" aria-label="Delete record">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  function RecordDocumentActions({ item, allowInvoice = true, allowReceipt = true }: { item: any, allowInvoice?: boolean, allowReceipt?: boolean }) {
    return (
      <div className="flex justify-end gap-2 mt-2 no-print">
        {allowInvoice && (
          <button onClick={() => openRecordDocument(item, 'invoice')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-blue hover:underline">
            Invoice
          </button>
        )}
        {allowReceipt && (
          <button onClick={() => openRecordDocument(item, 'receipt')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-orange hover:underline">
            Receipt
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 font-sans pt-4">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col space-y-4 w-full">
         <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-slate-900">Finance</h1>
          <p className="text-slate-500 text-sm font-medium">Ledger management and financial categorization</p>
        </div>
        <div className="flex flex-wrap justify-between gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'customer-payments', label: 'Payments', icon: Users },
            { id: 'office-expenses', label: 'Operations', icon: Building2 },
            { id: 'property-costs', label: 'Property Costs', icon: Wallet },
            { id: 'sales-invoices', label: 'Invoices', icon: FileSpreadsheet },
            { id: 'payroll', label: 'Payroll', icon: Users },
            { id: 'debts-payables', label: 'Vendor Debts', icon: Wallet },
            { id: 'petty-cash', label: 'Petty Cash', icon: FileSpreadsheet },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                activeTab === tab.id ? "bg-brand-blue text-white shadow-sm" : "text-slate-400 hover:text-brand-blue"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
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
                   activeTab === 'sales-invoices' ? 'Client Invoices Overview' :
                   activeTab === 'payroll' ? 'Staff Payroll Schedules & Salaries' :
                   activeTab === 'debts-payables' ? 'Company Vendor Debts & Liabilities' :
                   'Petty Cash Book Ledger'}
                </h3>
                <button 
                  onClick={openCustomDocument}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-blue/10 text-brand-blue rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-brand-blue hover:text-white transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Any Invoice / Receipt
                </button>
                
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
                {activeTab === 'payroll' && (
                  <button 
                    onClick={() => setAddPayrollOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Staff Salary
                  </button>
                )}
                {activeTab === 'debts-payables' && (
                  <button 
                    onClick={() => setAddDebtOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Vendor Liability
                  </button>
                )}
                {activeTab === 'petty-cash' && (
                  <button 
                    onClick={() => setAddPettyOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-brand-orange/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Ledger Entry
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
                        <RecordDocumentActions item={sale} allowInvoice={false} />
                        <AdminRecordActions item={sale} />
                      </div>
                    </div>
                  ))
                ) : activeTab === 'payroll' ? (
                  data.map((item) => (
                    <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-[13px] text-brand-blue">{item.staff_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Period: {item.month_year} • Basic: KES {parseFloat(item.basic || 0).toLocaleString()} • Comm: KES {parseFloat(item.commission || 0).toLocaleString()} • Trans: KES {parseFloat(item.transport || 0).toLocaleString()}
                          </p>
                          {item.reporting_date && (
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">
                              Date Filed: {new Date(item.reporting_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-[13px] text-slate-800">KES {parseFloat(item.net_amount || 0).toLocaleString()}</p>
                        <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">Deductions: -KES {parseFloat(item.deductions || 0).toLocaleString()}</p>
                        <RecordDocumentActions item={item} />
                        <AdminRecordActions item={item} />
                      </div>
                    </div>
                  ))
                ) : activeTab === 'debts-payables' ? (
                  data.map((item) => (
                    <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-[13px] text-slate-800">{item.creditor_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn(
                              "px-2 py-0.5 text-[9px] font-bold uppercase rounded",
                              item.status === 'cleared' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {item.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Date: {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'} • Method: {item.payment_method}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-extrabold text-[13px] text-red-600">Balance: KES {parseFloat(item.balance || 0).toLocaleString()}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          Total: KES {parseFloat(item.total_amount || 0).toLocaleString()} • Paid: KES {parseFloat(item.paid_amount || 0).toLocaleString()}
                        </p>
                        <RecordDocumentActions item={item} />
                        <AdminRecordActions item={item} />
                      </div>
                    </div>
                  ))
                ) : activeTab === 'petty-cash' ? (
                  data.map((item) => (
                    <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                          item.type === 'debit' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {item.type === 'debit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-[13px] text-slate-800">{item.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Voucher/Ref: {item.ref_number || 'N/A'} • Type: <span className={item.type === 'debit' ? "text-emerald-500" : "text-red-500 font-semibold"}>{item.type === 'debit' ? 'Receipt (Debit)' : 'Payout (Credit)'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-display font-bold text-[13px]",
                          item.type === 'debit' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {item.type === 'debit' ? '+' : '-'} KES {parseFloat(item.amount || 0).toLocaleString()}
                        </p>
                        {item.date && (
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        )}
                        <RecordDocumentActions item={item} />
                        <AdminRecordActions item={item} />
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
                        <RecordDocumentActions item={item} allowReceipt={item.type !== 'received'} />
                        <AdminRecordActions item={item} />
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

      {/* Record Staff Payroll Modal */}
      <AnimatePresence>
        {isAddPayrollOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPayrollOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <header className="mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Human Resources</p>
                  <h2 className="text-2xl font-display font-bold tracking-tighter text-brand-blue">Record Staff Salary</h2>
                </div>
                <button onClick={() => setAddPayrollOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordPayroll} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee Name</label>
                  <input 
                    type="text" required
                    value={payrollForm.staff_name}
                    onChange={e => setPayrollForm({...payrollForm, staff_name: e.target.value})}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Month / Year</label>
                    <input 
                      type="text" required
                      value={payrollForm.month_year}
                      onChange={e => setPayrollForm({...payrollForm, month_year: e.target.value})}
                      placeholder="e.g. August 2025"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Date</label>
                    <input 
                      type="date" required
                      value={payrollForm.reporting_date}
                      onChange={e => setPayrollForm({...payrollForm, reporting_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Basic Pay (KES)</label>
                    <input 
                      type="number" required
                      value={payrollForm.basic}
                      onChange={e => setPayrollForm({...payrollForm, basic: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Commission (KES)</label>
                    <input 
                      type="number"
                      value={payrollForm.commission}
                      onChange={e => setPayrollForm({...payrollForm, commission: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Transport Allowances (KES)</label>
                    <input 
                      type="number"
                      value={payrollForm.transport}
                      onChange={e => setPayrollForm({...payrollForm, transport: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deductions (KES)</label>
                    <input 
                      type="number"
                      value={payrollForm.deductions}
                      onChange={e => setPayrollForm({...payrollForm, deductions: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-rose-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs mt-2">
                  <span className="font-bold text-slate-500">Calculated Net Payable:</span>
                  <span className="text-sm font-black text-brand-blue">
                    KES {( (payrollForm.basic || 0) + (payrollForm.commission || 0) + (payrollForm.transport || 0) - (payrollForm.deductions || 0) ).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPayrollOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20">Log Payroll</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Vendor Debt Modal */}
      <AnimatePresence>
        {isAddDebtOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddDebtOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Liabilities & Debts</p>
                  <h2 className="text-2xl font-display font-bold tracking-tighter text-brand-blue">Record Vendor Debt</h2>
                </div>
                <button onClick={() => setAddDebtOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordDebt} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Creditor Name / Company</label>
                  <input 
                    type="text" required
                    value={debtForm.creditor_name}
                    onChange={e => setDebtForm({...debtForm, creditor_name: e.target.value})}
                    placeholder="e.g. Zenith Surveyors Ltd"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Debt Description / Plot Reference</label>
                  <input 
                    type="text" required
                    value={debtForm.description}
                    onChange={e => setDebtForm({...debtForm, description: e.target.value})}
                    placeholder="e.g. Survey subdivision outstanding payables"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Logged</label>
                    <input 
                      type="date" required
                      value={debtForm.date}
                      onChange={e => setDebtForm({...debtForm, date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</label>
                    <select 
                      value={debtForm.payment_method}
                      onChange={e => setDebtForm({...debtForm, payment_method: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    >
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="BANK">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Debt Amount (KES)</label>
                    <input 
                      type="number" required
                      value={debtForm.total_amount}
                      onChange={e => setDebtForm({...debtForm, total_amount: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-orange"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount Already Paid (KES)</label>
                    <input 
                      type="number" required
                      value={debtForm.paid_amount}
                      onChange={e => setDebtForm({...debtForm, paid_amount: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-emerald-600"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs mt-2">
                  <span className="font-bold text-slate-500">Balance Remaining:</span>
                  <span className="text-sm font-black text-rose-500">
                    KES {( (debtForm.total_amount || 0) - (debtForm.paid_amount || 0) ).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddDebtOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20">Log Debt Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Petty Cash Modal */}
      <AnimatePresence>
        {isAddPettyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddPettyOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Company Petty Cash Book</p>
                  <h2 className="text-2xl font-display font-bold tracking-tighter text-brand-blue">New Petty cash Entry</h2>
                </div>
                <button onClick={() => setAddPettyOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleRecordPetty} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entry Description</label>
                  <input 
                    type="text" required
                    value={pettyForm.description}
                    onChange={e => setPettyForm({...pettyForm, description: e.target.value})}
                    placeholder="e.g. Office tea, snacks & refreshments"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</label>
                    <input 
                      type="date" required
                      value={pettyForm.date}
                      onChange={e => setPettyForm({...pettyForm, date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Voucher / Ref Number</label>
                    <input 
                      type="text" required
                      value={pettyForm.ref_number}
                      onChange={e => setPettyForm({...pettyForm, ref_number: e.target.value})}
                      placeholder="e.g. VCH-1049"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entry Type</label>
                    <select 
                      value={pettyForm.type}
                      onChange={e => setPettyForm({...pettyForm, type: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    >
                      <option value="credit">payout (Credit Expense)</option>
                      <option value="debit">deposit (Debit Income)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount (KES)</label>
                    <input 
                      type="number" required
                      value={pettyForm.amount}
                      onChange={e => setPettyForm({...pettyForm, amount: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-orange"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAddPettyOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20">Record Entry</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Invoice / Receipt Modal */}
      <AnimatePresence>
        {isCustomDocOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCustomDocOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100">
              <header className="mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Document Generator</p>
                  <h2 className="text-2xl font-display font-bold tracking-tighter text-brand-blue">Invoice / Receipt</h2>
                </div>
                <button onClick={() => setCustomDocOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleGenerateCustomDocument} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Document Type</label>
                    <select
                      value={customDocForm.type}
                      onChange={e => setCustomDocForm({ ...customDocForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    >
                      <option value="invoice">Invoice</option>
                      <option value="receipt">Receipt</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</label>
                    <input
                      type="date"
                      required
                      value={customDocForm.date}
                      onChange={e => setCustomDocForm({ ...customDocForm, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer / Recipient</label>
                  <input
                    type="text"
                    required
                    value={customDocForm.recipient}
                    onChange={e => setCustomDocForm({ ...customDocForm, recipient: e.target.value })}
                    placeholder="Name or company"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Charge Description</label>
                  <input
                    type="text"
                    required
                    value={customDocForm.description}
                    onChange={e => setCustomDocForm({ ...customDocForm, description: e.target.value })}
                    placeholder="e.g. Title deed processing fee"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount (KES)</label>
                    <input
                      type="number"
                      required
                      value={customDocForm.amount}
                      onChange={e => setCustomDocForm({ ...customDocForm, amount: Number(e.target.value || 0) })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-orange"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
                    <select
                      value={customDocForm.status}
                      onChange={e => setCustomDocForm({ ...customDocForm, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    >
                      <option value="pending">Pending</option>
                      <option value="official">Official</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Method</label>
                    <input
                      type="text"
                      value={customDocForm.method}
                      onChange={e => setCustomDocForm({ ...customDocForm, method: e.target.value })}
                      placeholder="Cash, M-Pesa, Bank"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reference</label>
                    <input
                      type="text"
                      value={customDocForm.reference}
                      onChange={e => setCustomDocForm({ ...customDocForm, reference: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</label>
                  <input
                    type="text"
                    value={customDocForm.notes}
                    onChange={e => setCustomDocForm({ ...customDocForm, notes: e.target.value })}
                    placeholder="Optional note shown on the document"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setCustomDocOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20">Generate</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Edit Record Modal */}
      <AnimatePresence>
        {isEditRecordOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditRecordOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <header className="mb-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Admin Editor</p>
                  <h2 className="text-2xl font-display font-bold tracking-tighter text-brand-blue">Edit Record</h2>
                </div>
                <button onClick={() => setEditRecordOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </header>

              <form onSubmit={handleEditRecord} className="space-y-4">
                {Object.entries(editForm).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{key.replace(/_/g, ' ')}</label>
                    {typeof value === 'boolean' ? (
                      <select
                        value={value ? 'true' : 'false'}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value === 'true' })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    ) : key === 'type' && activeTab === 'petty-cash' ? (
                      <select
                        value={String(value)}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                      >
                        <option value="credit">Payout / Credit</option>
                        <option value="debit">Deposit / Debit</option>
                      </select>
                    ) : key === 'method' || key === 'payment_method' ? (
                      <select
                        value={String(value)}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank">Bank</option>
                        <option value="CASH">CASH</option>
                        <option value="MPESA">MPESA</option>
                        <option value="BANK">BANK</option>
                      </select>
                    ) : (
                      <input
                        type={key.includes('date') ? 'date' : typeof value === 'number' || key.endsWith('_id') || key.includes('amount') || key.includes('price') || ['basic', 'commission', 'transport', 'deductions'].includes(key) ? 'number' : 'text'}
                        value={String(value ?? '')}
                        onChange={e => setEditForm({
                          ...editForm,
                          [key]: e.target.type === 'number' ? Number(e.target.value || 0) : e.target.value
                        })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none text-brand-blue"
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditRecordOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-100">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Save
                  </button>
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

      {/* Generic printable invoice / receipt */}
      <AnimatePresence>
        {selectedDocument && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDocument(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-[640px] bg-white rounded-3xl p-10 flex flex-col print-container shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelectedDocument(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 no-print">
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="w-full flex items-start justify-between border-b border-slate-100 pb-6 mb-8">
                <div className="space-y-2">
                  <img src="/logo.png" alt="Raybann Properties" className="h-14 w-auto" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raybann Properties Kenya</p>
                  <p className="text-[9px] font-semibold text-slate-400">Property Acquisition & Management</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-brand-blue uppercase tracking-wider">{selectedDocument.type}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-1">
                    {selectedDocument.reference || `${String(selectedDocument.type).toUpperCase()}-${Date.now()}`}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-300 mt-0.5">
                    Date: {new Date(selectedDocument.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {selectedDocument.type === 'receipt' ? 'Received From' : 'Billed To'}
                  </h4>
                  <p className="font-bold text-brand-blue text-sm">{selectedDocument.recipient}</p>
                  <p className="text-slate-500 mt-1">{selectedDocument.source}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Document Status</h4>
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                    ['official', 'paid', 'cleared'].includes(String(selectedDocument.status).toLowerCase())
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {readable(selectedDocument.status)}
                  </span>
                  {selectedDocument.method && (
                    <p className="text-slate-500 mt-2">Method: {readable(selectedDocument.method)}</p>
                  )}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden mb-8">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-widest text-[9px] text-slate-400">
                      <th className="px-6 py-3">Charge Description</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedDocument.lines || [{ description: selectedDocument.description, amount: selectedDocument.amount }]).map((line: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 font-semibold text-slate-800">{line.description}</td>
                        <td className="px-6 py-4 text-right font-bold text-brand-blue">{formatMoney(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-start pt-6 border-t border-slate-100 mb-8 text-xs">
                <div className="max-w-[300px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
                  <p className="text-slate-500 leading-relaxed">
                    {selectedDocument.notes || 'This is a computer generated finance document.'}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <div className="flex justify-between gap-12">
                    <span className="font-medium text-slate-400">Subtotal:</span>
                    <span className="font-bold text-brand-blue">{formatMoney(selectedDocument.amount)}</span>
                  </div>
                  <div className="flex justify-between gap-12 border-t border-slate-100 pt-2 font-bold text-brand-orange text-sm">
                    <span>Total:</span>
                    <span>{formatMoney(selectedDocument.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 text-[10px] text-slate-400">
                <div className="border-t border-slate-200 pt-2">Prepared By</div>
                <div className="border-t border-slate-200 pt-2 text-right">Authorized Signature</div>
              </div>

              <div className="w-full flex gap-4 mt-10 no-print">
                <button onClick={handlePrint} className="flex-1 py-4 bg-brand-blue text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10 hover:bg-brand-orange transition-all">
                  <Printer className="w-4 h-4" /> Print {readable(selectedDocument.type)}
                </button>
                <button onClick={() => setSelectedDocument(null)} className="px-6 py-4 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50">
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
