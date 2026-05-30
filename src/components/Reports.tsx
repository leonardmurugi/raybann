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
  TrendingDown,
  Printer,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  ChevronRight,
  FileSpreadsheet,
  Activity,
  CheckSquare,
  ShieldAlert,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ReportType = 'financial-cashflow' | 'collections-payments' | 'office-expenses' | 'inventory-subdivisions' | 'client-sales-statements' | 'pending-approvals-trail' | 'payroll-hr' | 'vendor-debts' | 'petty-cash-ledger';

export default function Reports() {
  // Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'builder'>('dashboard');

  // Executive Dashboard Stats (original view state)
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Builder State
  const [selectedReport, setSelectedReport] = useState<ReportType>('financial-cashflow');
  const [builderStartDate, setBuilderStartDate] = useState('');
  const [builderEndDate, setBuilderEndDate] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>('all');

  // Datasets for Report Builder
  const [parentProperties, setParentProperties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [propertyCostsList, setPropertyCostsList] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any>({ payments: [], expenses: [], propertyCosts: [] });
  const [payrollListState, setPayrollListState ] = useState<any[]>([]);
  const [debtsListState, setDebtsListState ] = useState<any[]>([]);
  const [pettyCashListState, setPettyCashListState ] = useState<any[]>([]);

  const [builderLoading, setBuilderLoading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  // Load Executive Dashboard on load
  useEffect(() => {
    loadDashboard();
  }, [startDate, endDate]);

  // Load supporting builder database options once
  useEffect(() => {
    if (activeSubTab === 'builder') {
      loadBuilderDatabase();
    }
  }, [activeSubTab]);

  async function loadDashboard() {
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
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBuilderDatabase() {
    setBuilderLoading(true);
    try {
      const [propsData, custData, landsData, salesData, paymentsData, expensesData, propCostsData, approvalsData, payrollData, debtsData, pettyData] = await Promise.all([
        api.properties.list().catch(() => []),
        api.customers.list().catch(() => []),
        api.lands.list().catch(() => []),
        api.sales.list().catch(() => []),
        api.payments.list().catch(() => []),
        api.expenses.list().catch(() => []),
        api.propertyCosts.list().catch(() => []),
        api.approvals.list().catch(() => ({ payments: [], expenses: [], propertyCosts: [] })),
        api.payroll.list().catch(() => []),
        api.debtsPayables.list().catch(() => []),
        api.pettyCash.list().catch(() => [])
      ]);

      setParentProperties(propsData || []);
      setCustomers(custData || []);
      setLands(landsData || []);
      setSales(salesData || []);
      setPaymentsList(paymentsData || []);
      setExpensesList(expensesData || []);
      setPropertyCostsList(propCostsData || []);
      setPendingApprovals(approvalsData || { payments: [], expenses: [], propertyCosts: [] });
      setPayrollListState(payrollData || []);
      setDebtsListState(debtsData || []);
      setPettyCashListState(pettyData || []);

      // Generate initial default report after data load
      calculateReport(
        selectedReport,
        builderStartDate,
        builderEndDate,
        selectedPropertyId,
        selectedStatus,
        selectedApprovalStatus,
        {
          props: propsData,
          cust: custData,
          lands: landsData,
          s: salesData,
          p: paymentsData,
          ex: expensesData,
          pc: propCostsData,
          app: approvalsData,
          payroll: payrollData,
          debts: debtsData,
          pettyCash: pettyData
        }
      );
    } catch (err) {
      console.error('Error loading database for reports:', err);
    } finally {
      setBuilderLoading(false);
    }
  }

  // Trigger manual simulation of the selected report with current filters
  const handleTriggerGenerate = () => {
    calculateReport(
      selectedReport,
      builderStartDate,
      builderEndDate,
      selectedPropertyId,
      selectedStatus,
      selectedApprovalStatus,
      {
        props: parentProperties,
        cust: customers,
        lands: lands,
        s: sales,
        p: paymentsList,
        ex: expensesList,
        pc: propertyCostsList,
        app: pendingApprovals,
        payroll: payrollListState,
        debts: debtsListState,
        pettyCash: pettyCashListState
      }
    );
  };

  // Heavy lifting calculations for offline-first custom reporting
  const calculateReport = (
    type: ReportType,
    start: string,
    end: string,
    propertyId: string,
    status: string,
    approvalStatus: string,
    datasets: { props: any[], cust: any[], lands: any[], s: any[], p: any[], ex: any[], pc: any[], app: any, payroll?: any[], debts?: any[], pettyCash?: any[] }
  ) => {
    const { props, cust, lands: plotList, s: salesList, p: pList, ex: eList, pc: pcList, app, payroll = [], debts = [], pettyCash = [] } = datasets;
    
    // Date Helpers
    const money = (value: any) => {
      if (value === null || value === undefined || value === '') return 0;
      const normalized = String(value).replace(/[^0-9.-]/g, '');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const parseDateTime = (dateStr: string) => {
      const parsed = new Date(dateStr).getTime();
      return Number.isFinite(parsed) ? parsed : null;
    };

    const isWithinDates = (dateStr: string) => {
      if (!dateStr) return true;
      const d = parseDateTime(dateStr);
      if (d === null) return true;
      const s = start ? new Date(start).getTime() : -Infinity;
      const e = end ? new Date(`${end}T23:59:59.999`).getTime() : Infinity;
      return d >= s && d <= e;
    };

    let result: any = {
      generatedAt: new Date().toLocaleString(),
      reportTitle: '',
      metrics: [],
      headers: [],
      rows: [],
      totals: null
    };

    if (type === 'financial-cashflow') {
      result.reportTitle = 'FINANCIAL CASHFLOW & PROFITABILITY STATEMENT';
      
      // Filter payments, operating expenses and plot subdivision costs
      const filteredPayments = pList.filter(item => 
        item.type === 'received' && 
        isWithinDates(item.date) &&
        (approvalStatus === 'all' ? true : (approvalStatus === 'approved' ? item.is_approved : !item.is_approved))
      );

      const filteredExpenses = eList.filter(item => 
        isWithinDates(item.date) &&
        (approvalStatus === 'all' ? true : (approvalStatus === 'approved' ? item.is_approved : !item.is_approved))
      );

      const filteredPropertyCosts = pcList.filter(item => 
        isWithinDates(item.date) &&
        (approvalStatus === 'all' ? true : (approvalStatus === 'approved' ? item.is_approved : !item.is_approved))
      );

      // Totals
      const totalRevenue = filteredPayments.reduce((acc, p) => acc + money(p.amount), 0);
      const totalOpEx = filteredExpenses.reduce((acc, e) => acc + money(e.amount), 0);
      const totalPropEx = filteredPropertyCosts.reduce((acc, pc) => acc + money(pc.amount), 0);
      const netProfit = totalRevenue - (totalOpEx + totalPropEx);

      result.metrics = [
        { label: 'Total Collections (Revenue)', value: `KES ${totalRevenue.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Operating Costs (OpEx)', value: `KES ${totalOpEx.toLocaleString()}`, color: 'text-rose-600' },
        { label: 'Subdivision & Title Costs', value: `KES ${totalPropEx.toLocaleString()}`, color: 'text-amber-600' },
        { label: 'Net Operating Profit', value: `KES ${netProfit.toLocaleString()}`, color: netProfit >= 0 ? 'text-brand-blue' : 'text-red-500' }
      ];

      result.headers = ['Date', 'Transaction Ref', 'Category', 'Type', 'Status', 'Debit/Credit (KES)'];
      
      const combinedRows: any[] = [];
      filteredPayments.forEach(p => combinedRows.push({
        date: p.date,
        ref: p.transaction_ref || `TX-${p.id}`,
        category: p.category.replace('_', ' '),
        type: 'Collection (IN)',
        status: p.is_approved ? 'Approved' : 'Pending',
        amount: money(p.amount),
        isCredit: true
      }));

      filteredExpenses.forEach(e => combinedRows.push({
        date: e.date,
        ref: `OP-${e.id}`,
        category: e.category.replace('_', ' '),
        type: 'Operational Cost (OUT)',
        status: e.is_approved ? 'Approved' : 'Pending',
        amount: -money(e.amount),
        isCredit: false
      }));

      filteredPropertyCosts.forEach(pc => combinedRows.push({
        date: pc.date,
        ref: `SUB-${pc.id}`,
        category: pc.category.replace('_', ' '),
        type: 'Property Addition (OUT)',
        status: pc.is_approved ? 'Approved' : 'Pending',
        amount: -money(pc.amount),
        isCredit: false
      }));

      // Sort by date newest first
      combinedRows.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      result.rows = combinedRows.map(row => [
        new Date(row.date).toLocaleDateString(),
        row.ref,
        <span className="capitalize">{row.category}</span>,
        <span className={`text-[10px] font-bold uppercase tracking-wider ${row.isCredit ? 'text-emerald-500':'text-rose-500'}`}>{row.type}</span>,
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${row.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{row.status}</span>,
        <span className={`font-mono font-bold ${row.isCredit ? 'text-emerald-600':'text-rose-600'}`}>{row.amount.toLocaleString()}</span>
      ]);

      result.totals = {
        label: 'Net Balance',
        value: `KES ${netProfit.toLocaleString()}`
      };

    } else if (type === 'collections-payments') {
      result.reportTitle = 'RECEPTING LOGS & INCOMING INSTALLMENTS STATEMENT';
      
      let filtered = pList.filter(item => 
        item.type === 'received' && 
        isWithinDates(item.date) &&
        (approvalStatus === 'all' ? true : (approvalStatus === 'approved' ? item.is_approved : !item.is_approved))
      );

      if (propertyId !== 'all') {
        const targetPropId = parseInt(propertyId);
        filtered = filtered.filter(p => {
          const sale = salesList.find(s => s.id === p.reference_id);
          if (!sale) return false;
          const plot = plotList.find(l => l.id === sale.land_id);
          return plot && plot.parent_property_id === targetPropId;
        });
      }

      const totalValue = filtered.reduce((acc, p) => acc + money(p.amount), 0);
      const approvedVal = filtered.filter(p => p.is_approved).reduce((acc, p) => acc + money(p.amount), 0);
      const pendingVal = totalValue - approvedVal;

      result.metrics = [
        { label: 'Total Logged Collections', value: `KES ${totalValue.toLocaleString()}`, color: 'text-brand-blue' },
        { label: 'Approved & Verified Collections', value: `KES ${approvedVal.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Pending Admin Approvals', value: `KES ${pendingVal.toLocaleString()}`, color: 'text-brand-orange' },
        { label: 'Transaction Count', value: filtered.length, color: 'text-slate-500' }
      ];

      result.headers = ['Date', 'Receipt Number', 'Client Name', 'M-Pesa/Ref Code', 'Method', 'Status', 'Amount (KES)'];
      result.rows = filtered.map(p => [
        new Date(p.date).toLocaleDateString(),
        p.receipt_number || `RCP-${p.id}`,
        p.customer_name || 'Walk-In Customer',
        p.transaction_ref || 'N/A',
        <span className="capitalize font-medium">{p.method}</span>,
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{p.is_approved ? 'Approved':'Pending'}</span>,
        <span className="font-mono font-bold text-emerald-600">{money(p.amount).toLocaleString()}</span>
      ]);

      result.totals = {
        label: 'Total Collections Sum',
        value: `KES ${totalValue.toLocaleString()}`
      };

    } else if (type === 'office-expenses') {
      result.reportTitle = 'COMPANY OPERATIONS & OVERHEAD COSTS REPORT';
      
      const filtered = eList.filter(item => 
        isWithinDates(item.date) &&
        (approvalStatus === 'all' ? true : (approvalStatus === 'approved' ? item.is_approved : !item.is_approved))
      );

      const totalValue = filtered.reduce((acc, e) => acc + money(e.amount), 0);
      const salariesTotal = filtered.filter(e => e.category === 'salary').reduce((acc, e) => acc + money(e.amount), 0);
      const rentTotal = filtered.filter(e => e.category === 'rent').reduce((acc, e) => acc + money(e.amount), 0);

      result.metrics = [
        { label: 'Total Operating Expenses', value: `KES ${totalValue.toLocaleString()}`, color: 'text-rose-600' },
        { label: 'Approved Salaries', value: `KES ${salariesTotal.toLocaleString()}`, color: 'text-brand-blue' },
        { label: 'Approved Rental Overhead', value: `KES ${rentTotal.toLocaleString()}`, color: 'text-amber-600' },
        { label: 'Logged Entries', value: filtered.length, color: 'text-slate-500' }
      ];

      result.headers = ['Date', 'Expense Category', 'Logged By', 'Description', 'Status', 'Amount (KES)'];
      result.rows = filtered.map(e => [
        new Date(e.date).toLocaleDateString(),
        <span className="capitalize font-semibold">{e.category.replace('_', ' ')}</span>,
        e.operator_name || 'System Operator',
        <p className="max-w-xs truncate text-xs text-slate-500 italic">"{e.description || 'N/A'}"</p>,
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${e.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{e.is_approved ? 'Approved':'Pending'}</span>,
        <span className="font-mono font-bold text-rose-600">{money(e.amount).toLocaleString()}</span>
      ]);

      result.totals = {
        label: 'Total Operating Costs',
        value: `KES ${totalValue.toLocaleString()}`
      };

    } else if (type === 'inventory-subdivisions') {
      result.reportTitle = 'PLOT SUBDIVISIONS & INVENTORY VALUATION REPORT';
      
      let filteredPlots = plotList;
      if (propertyId !== 'all') {
        const targetPropId = parseInt(propertyId);
        filteredPlots = filteredPlots.filter(l => l.parent_property_id === targetPropId);
      }
      if (status !== 'all') {
        filteredPlots = filteredPlots.filter(l => l.status === status);
      }

      // Calculations
      const totalCount = filteredPlots.length;
      const soldCount = filteredPlots.filter(l => l.status === 'sold').length;
      const reservedCount = filteredPlots.filter(l => l.status === 'reserved').length;
      const availableCount = filteredPlots.filter(l => l.status === 'available').length;

      const totalValuation = filteredPlots.reduce((acc, l) => acc + money(l.total_cost), 0);
      const realizedSales = filteredPlots.reduce((acc, l) => acc + money(l.paid_amount), 0);
      const outstandingDebts = totalValuation - realizedSales;

      result.metrics = [
        { label: 'Total Plots Tracked', value: `${totalCount} subdivided blocks`, color: 'text-brand-blue' },
        { label: 'Total Books Valuation', value: `KES ${totalValuation.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Total Actual Received', value: `KES ${realizedSales.toLocaleString()}`, color: 'text-brand-orange' },
        { label: 'Availability Ratio', value: `${availableCount} available / ${soldCount} sold`, color: 'text-teal-600' }
      ];

      result.headers = ['Plot Ref', 'Size Dimensions', 'Acquisition Mode', 'Deed Status', 'Plot Status', 'Unit Pricing (KES)', 'Amount Received (KES)', 'Balance (KES)'];
      result.rows = filteredPlots.map(l => {
        const balance = money(l.total_cost) - money(l.paid_amount);
        return [
          l.plot_number,
          l.size,
          <span className="capitalize">{l.acquisition_type}</span>,
          <span className="capitalize text-[10px] font-medium text-slate-500">{l.title_deed_status.replace('_', ' ')}</span>,
          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
            l.status === 'sold' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
            l.status === 'reserved' ? 'bg-brand-orange/5 text-brand-orange border border-brand-orange/10' :
            'bg-sky-50 text-sky-600 border border-sky-100'
          }`}>{l.status}</span>,
          <span className="font-mono font-medium">{money(l.total_cost).toLocaleString()}</span>,
          <span className="font-mono font-bold text-emerald-600">{money(l.paid_amount).toLocaleString()}</span>,
          <span className={`font-mono font-bold ${balance > 0 ? 'text-brand-orange':'text-slate-300'}`}>{balance.toLocaleString()}</span>
        ];
      });

      result.totals = {
        label: 'Total Asset valuation',
        value: `KES ${totalValuation.toLocaleString()}`
      };

    } else if (type === 'client-sales-statements') {
      result.reportTitle = 'CLIENT DIRECTORY & OUTSTANDING AGENT STATEMENTS';
      
      let filteredSales = salesList.filter(s => isWithinDates(s.date));
      if (propertyId !== 'all') {
        const targetPropId = parseInt(propertyId);
        filteredSales = filteredSales.filter(s => {
          const plot = plotList.find(l => l.id === s.land_id);
          return plot && plot.parent_property_id === targetPropId;
        });
      }

      const totalContracts = filteredSales.reduce((acc, s) => acc + money(s.total_price), 0);
      const totalPaidSales = filteredSales.reduce((acc, s) => acc + money(s.paid_amount), 0);
      const outstandingBalance = totalContracts - totalPaidSales;

      result.metrics = [
        { label: 'Active Contracts', value: filteredSales.length, color: 'text-brand-blue' },
        { label: 'Contracted Revenue (Pledged)', value: `KES ${totalContracts.toLocaleString()}`, color: 'text-brand-orange' },
        { label: 'Actual Cash Collected', value: `KES ${totalPaidSales.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Remaining Customer Balance', value: `KES ${outstandingBalance.toLocaleString()}`, color: 'text-red-500' }
      ];

      result.headers = ['Date Signed', 'Customer Name', 'Plot Purchased', 'Agreement Status', 'Contract Price', 'Paid-to-date (KES)', 'Net Balance (KES)'];
      result.rows = filteredSales.map(s => {
        const balance = money(s.total_price) - money(s.paid_amount);
        return [
          new Date(s.date).toLocaleDateString(),
          <p className="font-semibold text-brand-blue">{s.customer_name}</p>,
          `Plot ${s.plot_number || 'N/A'}`,
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${s.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100':'bg-amber-50 text-amber-600 border border-amber-100'}`}>{s.is_approved ? 'Approved':'Pending Review'}</span>,
          <span className="font-mono font-medium">{money(s.total_price).toLocaleString()}</span>,
          <span className="font-mono font-bold text-emerald-600">{money(s.paid_amount).toLocaleString()}</span>,
          <span className="font-mono font-bold text-brand-orange">{balance.toLocaleString()}</span>
        ];
      });

      result.totals = {
        label: 'Total Customers Balance',
        value: `KES ${outstandingBalance.toLocaleString()}`
      };

    } else if (type === 'pending-approvals-trail') {
      result.reportTitle = 'PENDING ADMIN APPROVALS & COMPLIANCE STATEMENTS';
      
      const { payments = [], expenses = [], propertyCosts = [] } = app;

      const totalValue = 
        payments.reduce((acc: number, p: any) => acc + money(p.amount), 0) +
        expenses.reduce((acc: number, e: any) => acc + money(e.amount), 0) +
        propertyCosts.reduce((acc: number, pc: any) => acc + money(pc.amount), 0);

      result.metrics = [
        { label: 'Payments Pending Verification', value: payments.length, color: 'text-brand-orange' },
        { label: 'Expenses Awaiting Signoff', value: expenses.length, color: 'text-rose-500' },
        { label: 'Subdivision Costs Awaiting Validation', value: propertyCosts.length, color: 'text-amber-500' },
        { label: 'Accumulated Cash Blocked', value: `KES ${totalValue.toLocaleString()}`, color: 'text-red-500' }
      ];

      result.headers = ['Category', 'Date Logged', 'Identifier Reference', 'Source Description', 'Volume (KES)'];
      
      const approvalRows: any[] = [];
      payments.forEach((p: any) => {
        approvalRows.push([
          <span className="font-bold text-brand-orange uppercase text-[9px]">Customer Payment</span>,
          new Date(p.date || new Date()).toLocaleDateString(),
          p.receipt_number || `RCP-${p.id}`,
          `Deposit/Installment by Client: ${p.customer_name || 'Walk-In'} (via ${p.method})`,
          <span className="font-mono font-bold text-amber-600">{money(p.amount).toLocaleString()}</span>
        ]);
      });

      expenses.forEach((e: any) => {
        approvalRows.push([
          <span className="font-bold text-rose-500 uppercase text-[9px]">Operating Expense</span>,
          new Date(e.date || new Date()).toLocaleDateString(),
          `OP-${e.id}`,
          `Company operational cost: ${e.category} | "${e.description || 'N/A'}"`,
          <span className="font-mono font-bold text-rose-500">{money(e.amount).toLocaleString()}</span>
        ]);
      });

      propertyCosts.forEach((pc: any) => {
        approvalRows.push([
          <span className="font-bold text-amber-500 uppercase text-[9px]">Subdivision Cost</span>,
          new Date(pc.date || new Date()).toLocaleDateString(),
          `SUB-${pc.id}`,
          `Capital project add cost: ${pc.category} | Property: ${pc.property_name || 'N/A'}`,
          <span className="font-mono font-bold text-amber-600">{money(pc.amount).toLocaleString()}</span>
        ]);
      });

      result.rows = approvalRows;
      result.totals = {
        label: 'Total Blocked Volume Awaiting Signoff',
        value: `KES ${totalValue.toLocaleString()}`
      };
    } else if (type === 'payroll-hr') {
      result.reportTitle = 'EMPLOYEE PAYROLL AND HUMAN RESOURCES STATEMENT';
      const filtered = payroll.filter(item => isWithinDates(item.reporting_date || item.date));
      const totalBasic = filtered.reduce((acc, p) => acc + (money(p.basic) || 0), 0);
      const totalCommissions = filtered.reduce((acc, p) => acc + (money(p.commission) || 0), 0);
      const totalDeductions = filtered.reduce((acc, p) => acc + (money(p.deductions) || 0), 0);
      const totalNet = filtered.reduce((acc, p) => {
        const basic = money(p.basic) || 0;
        const comm = money(p.commission) || 0;
        const trans = money(p.transport) || 0;
        const ded = money(p.deductions) || 0;
        return acc + (basic + comm + trans - ded);
      }, 0);

      result.metrics = [
        { label: 'Total Employed Personnel', value: Array.from(new Set(filtered.map(p => p.staff_name))).length, color: 'text-brand-blue' },
        { label: 'Total Basic Payroll', value: `KES ${totalBasic.toLocaleString()}`, color: 'text-slate-700' },
        { label: 'Total Performance Commissions', value: `KES ${totalCommissions.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Net Disbursed Funds', value: `KES ${totalNet.toLocaleString()}`, color: 'text-brand-orange' }
      ];

      result.headers = ['Date Paid', 'Employee Name', 'Month / Year Period', 'Basic Pay (KES)', 'Commission (KES)', 'Deductions (KES)', 'Net Direct Payout (KES)'];
      result.rows = filtered.map(p => {
        const basic = money(p.basic) || 0;
        const comm = money(p.commission) || 0;
        const trans = money(p.transport) || 0;
        const ded = money(p.deductions) || 0;
        const net = basic + comm + trans - ded;
        return [
          new Date(p.reporting_date || p.date || new Date()).toLocaleDateString(),
          <p className="font-bold text-brand-blue">{p.staff_name}</p>,
          <span className="font-medium text-slate-500">{p.month_year || 'N/A'}</span>,
          basic.toLocaleString(),
          comm.toLocaleString(),
          <span className="text-rose-500">-{ded.toLocaleString()}</span>,
          <span className="font-mono font-bold text-emerald-600">{net.toLocaleString()}</span>
        ];
      });

      result.totals = {
        label: 'Net Salaries Disbursed',
        value: `KES ${totalNet.toLocaleString()}`
      };

    } else if (type === 'vendor-debts') {
      result.reportTitle = 'VENDOR LIABILITIES & OUTSTANDING ACCOUNTS PALYABLE STATEMENT';
      const filtered = debts.filter(item => isWithinDates(item.date));
      const totalLiabilities = filtered.reduce((acc, d) => acc + (money(d.total_amount) || 0), 0);
      const totalPaid = filtered.reduce((acc, d) => acc + (money(d.paid_amount) || 0), 0);
      const remainingBalance = totalLiabilities - totalPaid;

      result.metrics = [
        { label: 'Tracked Creditors Count', value: filtered.length, color: 'text-brand-blue' },
        { label: 'Total Contract Value', value: `KES ${totalLiabilities.toLocaleString()}`, color: 'text-slate-800' },
        { label: 'Total Settled Claims', value: `KES ${totalPaid.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Outstanding Liabilities', value: `KES ${remainingBalance.toLocaleString()}`, color: 'text-rose-600' }
      ];

      result.headers = ['Log Date', 'Vendor / Creditor Name', 'Task Reference', 'Billing Amount (KES)', 'Amount Settled (KES)', 'Payment Method', 'Balance Due (KES)'];
      result.rows = filtered.map(d => {
        const total = money(d.total_amount) || 0;
        const paid = money(d.paid_amount) || 0;
        const balance = total - paid;
        return [
          new Date(d.date || new Date()).toLocaleDateString(),
          <p className="font-bold text-brand-blue">{d.creditor_name}</p>,
          <p className="max-w-xs text-xs text-slate-500 truncate">{d.description || 'N/A'}</p>,
          total.toLocaleString(),
          paid.toLocaleString(),
          <span className="uppercase text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{d.payment_method || 'CASH'}</span>,
          <span className={`font-mono font-bold ${balance > 0 ? 'text-rose-500':'text-slate-300'}`}>{balance.toLocaleString()}</span>
        ];
      });

      result.totals = {
        label: 'Total Outstanding Vendor Liabilities',
        value: `KES ${remainingBalance.toLocaleString()}`
      };

    } else if (type === 'petty-cash-ledger') {
      result.reportTitle = 'OFFICE PETTY CASH GENERAL LEDGER ACCOUNT BOOK';
      const filtered = pettyCash.filter(item => isWithinDates(item.date));
      const totalDebits = filtered.filter(p => p.type === 'debit').reduce((acc, p) => acc + (money(p.amount) || 0), 0);
      const totalCredits = filtered.filter(p => p.type === 'credit').reduce((acc, p) => acc + (money(p.amount) || 0), 0);
      const netCashBalance = totalDebits - totalCredits;

      result.metrics = [
        { label: 'Petty Cash Entries', value: filtered.length, color: 'text-brand-blue' },
        { label: 'Total Funds Received (Debits)', value: `KES ${totalDebits.toLocaleString()}`, color: 'text-emerald-600' },
        { label: 'Total Payments (Credits)', value: `KES ${totalCredits.toLocaleString()}`, color: 'text-rose-600' },
        { label: 'Available Cash On Hand', value: `KES ${netCashBalance.toLocaleString()}`, color: netCashBalance >= 0 ? 'text-teal-600' : 'text-red-500' }
      ];

      result.headers = ['Entry Date', 'Voucher / Ref No', 'Description Item', 'Type', 'Debit (Deposit KES)', 'Credit (Payout KES)'];
      result.rows = filtered.map(p => {
        const amt = money(p.amount) || 0;
        const isDebit = p.type === 'debit';
        return [
          new Date(p.date || new Date()).toLocaleDateString(),
          <span className="font-mono text-xs font-semibold text-slate-500">{p.ref_number || 'N/A'}</span>,
          <p className="max-w-xs text-xs text-slate-700 italic">"{p.description || 'N/A'}"</p>,
          <span className={`text-[9px] font-black uppercase tracking-wider ${isDebit ? 'text-emerald-500':'text-rose-500'}`}>{p.type}</span>,
          isDebit ? <span className="font-mono font-bold text-emerald-600">+{amt.toLocaleString()}</span> : '-',
          !isDebit ? <span className="font-mono font-bold text-rose-500">-{amt.toLocaleString()}</span> : '-'
        ];
      });

      result.totals = {
        label: 'Net Petty Cash Balance',
        value: `KES ${netCashBalance.toLocaleString()}`
      };
    }

    setGeneratedReport(result);
  };

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

  // Triggers print view on PDF generator page
  const handlePrint = () => {
    window.print();
  };

  if (loading && !stats) {
    return (
      <div className="h-96 flex items-center justify-center">
        <span className="text-sm font-bold tracking-widest uppercase opacity-30 animate-pulse">Generating Reports...</span>
      </div>
    );
  }

  const collectionRate = stats?.revenue > 0 ? Math.round((stats.received / stats.revenue) * 100) : 0;

  return (
    <div className="space-y-10 font-sans max-w-6xl">
      
      {/* Dynamic Tab Switcher */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-1 flex-wrap gap-4 no-print">
        <header>
          <h1 className="text-3xl font-display font-medium tracking-tight text-brand-blue">Raybann Enterprise Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Consolidated operational and financial performance dashboards</p>
        </header>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              activeSubTab === 'dashboard' ? "bg-white text-brand-blue shadow" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveSubTab('builder')}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              activeSubTab === 'builder' ? "bg-white text-brand-blue shadow" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Custom PDF Report Builder
          </button>
        </div>
      </div>

      {activeSubTab === 'dashboard' ? (
        // DASHBOARD MODE (ORIGINAL STATS VIEW)
        <div className="space-y-10 no-print">
          
          {/* Controls */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dashboard Date Range:</span>
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
              <button 
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider text-brand-blue hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export Overview CSV
              </button>
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
      ) : (
        // CUSTOM REPORT BUILDER & PRINT-TO-PDF SUITE
        <div className="space-y-8">
          
          {/* Controls Panel */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 no-print">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="p-2.5 rounded-2xl bg-brand-orange/10 text-brand-orange">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold uppercase text-[11px] tracking-wider text-brand-blue">Interactive Controls Directory</h3>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Select columns, filters and ranges to configure any report context</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Select Report Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">1. Report Category</label>
                <select
                  value={selectedReport}
                  onChange={e => setSelectedReport(e.target.value as ReportType)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold outline-none text-brand-blue focus:ring-2 ring-brand-blue/10"
                >
                  <option value="financial-cashflow">Full Cashflow & Income Statement</option>
                  <option value="collections-payments">Collections & Installment Receipt Logs</option>
                  <option value="office-expenses">Operational Expenses & Overheads</option>
                  <option value="inventory-subdivisions">Subdivided Plot Inventory & Valuation</option>
                  <option value="client-sales-statements">Client Contract Statements & Debts</option>
                  <option value="pending-approvals-trail">Pending Approvals Audit Ledger</option>
                  <option value="payroll-hr">Human Resources & Staff Payroll Registry</option>
                  <option value="vendor-debts">Vendor Debts & Outstanding Liabilities</option>
                  <option value="petty-cash-ledger">Petty Cash Ledger Book Accounts</option>
                </select>
              </div>

              {/* Select Property Range */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">2. Filter parent Land Block</label>
                <select
                  value={selectedPropertyId}
                  disabled={['office-expenses', 'pending-approvals-trail', 'payroll-hr', 'vendor-debts', 'petty-cash-ledger'].includes(selectedReport)}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold outline-none text-brand-blue focus:ring-2 ring-brand-blue/10 disabled:opacity-40"
                >
                  <option value="all">All Properties / Locations</option>
                  {parentProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>

              {/* Status Filters */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">3. Filter Status Block</label>
                <select
                  value={selectedReport === 'inventory-subdivisions' ? selectedStatus : selectedApprovalStatus}
                  onChange={e => {
                    if (selectedReport === 'inventory-subdivisions') {
                      setSelectedStatus(e.target.value);
                    } else {
                      setSelectedApprovalStatus(e.target.value);
                    }
                  }}
                  disabled={['pending-approvals-trail', 'payroll-hr', 'vendor-debts', 'petty-cash-ledger'].includes(selectedReport)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold outline-none text-brand-blue focus:ring-2 ring-brand-blue/10 disabled:opacity-40"
                >
                  {selectedReport === 'inventory-subdivisions' ? (
                    <>
                      <option value="all">All Plot Statuses</option>
                      <option value="available">Available Plot Inventory</option>
                      <option value="reserved">Reserved / Installment Sales</option>
                      <option value="sold">Fully Sold Out</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All Approval States</option>
                      <option value="approved">Approved Registers Only</option>
                      <option value="pending">Pending Admin Approvals</option>
                    </>
                  )}
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start Range</label>
                <input
                  type="date"
                  value={builderStartDate}
                  onChange={e => setBuilderStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs outline-none focus:ring-2 ring-brand-blue/10 text-slate-600 font-medium"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> End Range</label>
                <input
                  type="date"
                  value={builderEndDate}
                  onChange={e => setBuilderEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs outline-none focus:ring-2 ring-brand-blue/10 text-slate-600 font-medium"
                />
              </div>

              {/* Action */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleTriggerGenerate}
                  className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10"
                >
                  <Activity className="w-4 h-4" /> Filter & Generate Report
                </button>
              </div>

            </div>
          </div>

          {/* Builder Loading */}
          {builderLoading ? (
            <div className="h-48 flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold tracking-widest uppercase opacity-30 animate-pulse">Running Calculations...</span>
            </div>
          ) : generatedReport ? (
            // PRINT CONTAINER
            <div className="print-container bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative space-y-8">
              
              {/* Professional Printed Report Header Banner */}
              <div className="flex justify-between items-start border-b border-double border-slate-200 pb-8 flex-wrap gap-6 text-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white font-extrabold uppercase text-xs tracking-wider">RH</div>
                    <span className="font-display font-extrabold text-lg uppercase tracking-wider text-brand-blue">Raybann Land Holdings</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Official Land Subdivision & Financial Reporting Services
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Nairobi Head Office • Ground Floor Block C, Real Towers • +254 (0) 700 000 000
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="inline-block bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-[#1E6B3E] no-print">
                    System Autocertified
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">DATE GENERATED</p>
                  <p className="text-xs font-mono font-bold text-brand-blue">{generatedReport.generatedAt}</p>
                </div>
              </div>

              {/* PDF Print & Export Controls */}
              <div className="flex items-center justify-between no-print bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span className="w-2 h-2 bg-[#1E6B3E] rounded-full animate-ping" />
                  Report Compiled successfully. Click Print to export as a pristine PDF structure.
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-orange/20 hover:bg-brand-blue transition-all"
                >
                  <Printer className="w-4 h-4" /> Save as PDF / Print
                </button>
              </div>

              {/* Report Subject and Filters Overview */}
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-black tracking-tight text-brand-blue block">
                  {generatedReport.reportTitle}
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span>Scope: <b className="text-slate-700">{selectedReport.replace('-', ' ')}</b></span>
                  <span>Property Block: <b className="text-slate-700">{parentProperties.find(p => p.id === parseInt(selectedPropertyId))?.name || 'All Blocks'}</b></span>
                  <span>Date Range: <b className="text-slate-700">{builderStartDate || 'All time'} — {builderEndDate || 'Present'}</b></span>
                  <span>Approval State: <b className="text-slate-700">{selectedApprovalStatus === 'all' ? 'All Ledger Items' : selectApprovalString(selectedApprovalStatus)}</b></span>
                </div>
              </div>

              {/* Dynamic computed metric total cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {generatedReport.metrics.map((m: any, idx: number) => (
                  <div key={idx} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                    <p className="text-lg font-display font-bold text-slate-900 truncate tracking-tight">{m.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* High Fidelity Records Table Grid */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-500 border-collapse">
                    <thead className="bg-slate-50/80 font-bold uppercase tracking-widest text-[9px] text-brand-blue border-b border-slate-200">
                      <tr>
                        {generatedReport.headers.map((h: string, key: number) => (
                          <th key={key} className="p-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generatedReport.rows.length === 0 ? (
                        <tr>
                          <td colSpan={generatedReport.headers.length} className="p-10 text-center text-slate-400 tracking-wider font-semibold">
                            No ledger registries align with the active selections.
                          </td>
                        </tr>
                      ) : (
                        generatedReport.rows.map((row: any[], i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            {row.map((cell: any, key: number) => (
                              <td key={key} className="p-4 align-middle text-slate-700 font-medium">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Print Valuation Total Summary Row */}
                {generatedReport.totals && (
                  <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center px-6">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{generatedReport.totals.label}</span>
                    <span className="font-display font-black text-brand-blue text-sm">{generatedReport.totals.value}</span>
                  </div>
                )}
              </div>

              {/* Signature and Verification fields for Print Verification */}
              <div className="grid grid-cols-2 gap-10 pt-16 border-t border-dotted border-slate-200 text-slate-500">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black tracking-widest">PREPARED BY</p>
                  <div className="h-10 border-b border-slate-200 max-w-xs" />
                  <p className="text-[10px] font-medium">Accounts Department Officer Signature</p>
                </div>
                <div className="space-y-4 text-right">
                  <p className="text-[10px] uppercase font-black tracking-widest">APPROVED BY CO-FOUNDER / CEO</p>
                  <div className="h-10 border-b border-slate-200 max-w-xs ml-auto" />
                  <p className="text-[10px] font-medium">Board of Directors Authorization Stamp</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold tracking-widest uppercase opacity-30">No Report Context Configured</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

function selectApprovalString(status: string) {
  if (status === 'approved') return 'Approved Records Only';
  return 'Pending Admin Signoff';
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
