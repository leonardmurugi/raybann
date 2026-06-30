import React, { useState } from 'react';
import { 
  FileUp, 
  Table, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  Sheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { api } from '../lib/api';

const TARGET_PRESETS = [
  { value: 'sales_ledger', name: 'Sheet 1: Plot Sales & Installments' },
  { value: 'debts_payables', name: 'Sheet 2: Vendor Debts & Liabilities' },
  { value: 'payroll', name: 'Sheet 3: Staff Payroll & Deductions' },
  { value: 'petty_cash', name: 'Sheet 4: Petty Cash Ledger' },
  { value: 'lands', name: 'Properties / Subdivision Plots' },
  { value: 'customers', name: 'Client Directory' },
  { value: 'properties', name: 'Parent Land Properties' }
];

function isTitleRow(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
  if (filled <= 1) return true;
  const joined = row.filter(Boolean).join(' ').toLowerCase();
  if (joined.includes('properties ltd') || joined.includes('book template') || joined.includes('for the month')) return true;
  return false;
}

function findHeaderRow(rows: any[][]): { headerRowIndex: number; headerStrings: string[]; dataRows: any[][] } {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (filled.length >= 3 && !isTitleRow(row)) {
      const headers = row.map((h, idx) => h ? String(h).trim() : `Column_${idx}`);
      const dataRows = rows.slice(i + 1).filter(r => {
        if (!r || r.length === 0) return false;
        return r.some(c => c !== null && c !== undefined && String(c).trim() !== '');
      });
      return { headerRowIndex: i, headerStrings: headers, dataRows };
    }
  }
  return { headerRowIndex: -1, headerStrings: [], dataRows: [] };
}

function extractSheetTables(name: string, rows: any[][]): { entries: { subName: string; headers: string[]; data: any[][] }[] } {
  const entries: { subName: string; headers: string[]; data: any[][] }[] = [];

  // For Sheet3, detect the multi-section structure
  if (name === 'Sheet3') {
    // Section 1: Client investment/commission table
    let firstHeader = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (filled.length >= 4 && !isTitleRow(row) && String(row[0] || '').toLowerCase().includes('client')) {
        firstHeader = i;
        break;
      }
    }
    if (firstHeader >= 0) {
      const headers = rows[firstHeader].map((h, idx) => h ? String(h).trim() : `Column_${idx}`);
      const data = [];
      for (let j = firstHeader + 1; j < rows.length; j++) {
        const r = rows[j];
        if (!r || r.length === 0) break;
        const filled = r.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        if (filled.length === 0) break;
        if (String(r[0] || '').toLowerCase() === 'total') {
          data.push(r);
          break;
        }
        data.push(r);
      }
      entries.push({ subName: 'Commission', headers, data });
    }

    // Section 2: Payroll table (END OF AUGUST 2025 PAYMENT STRUCTURE)
    let payrollHeader = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (filled.length >= 4 && String(row[0] || '').toLowerCase() === 'name' && String(row[1] || '').toLowerCase() === 'basic') {
        payrollHeader = i;
        break;
      }
    }
    if (payrollHeader >= 0) {
      const headers = rows[payrollHeader].map((h, idx) => h ? String(h).trim() : `Column_${idx}`);
      const data = [];
      for (let j = payrollHeader + 1; j < rows.length; j++) {
        const r = rows[j];
        if (!r || r.length === 0) break;
        const filled = r.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        if (filled.length === 0) break;
        if (String(r[0] || '').toLowerCase() === 'total') continue;
        data.push(r);
      }
      entries.push({ subName: 'Payroll', headers, data });
    }
    return { entries };
  }

  // For other sheets, find the first real header row
  const result = findHeaderRow(rows);
  if (result.headerRowIndex >= 0) {
    entries.push({ subName: name, headers: result.headerStrings, data: result.dataRows });
  }
  return { entries };
}

function buildObjects(headers: string[], dataRows: any[][]): any[] {
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((hdr) => {
    if (!seen.has(hdr)) {
      seen.set(hdr, 0);
      return hdr;
    }
    const count = seen.get(hdr)! + 1;
    seen.set(hdr, count);
    return `${hdr}_${count}`;
  });

  return dataRows.map((r) => {
    const obj: any = {};
    uniqueHeaders.forEach((hdr, colIdx) => {
      obj[hdr] = r[colIdx] !== undefined ? r[colIdx] : '';
    });
    return obj;
  });
}

export default function DataMigration() {
  const [sheetsData, setSheetsData] = useState<{[sheetName: string]: any[]}>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [sheetMappings, setSheetMappings] = useState<{[sheetName: string]: string}>({});
  
  const [isMapping, setIsMapping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMigrationStatus([]);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const sName = file.name.replace('.csv', '');
          const dataRows = results.data;
          
          setSheetsData({ [sName]: dataRows });
          setSheetNames([sName]);
          setActiveSheetName(sName);
          
          const detected = detectTarget(sName, dataRows.length > 0 ? Object.keys(dataRows[0]) : []);
          setSheetMappings({ [sName]: detected });
          
          setIsMapping(true);
          setLoading(false);
        }
      });
    } else {
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const allSheets: {[name: string]: any[]} = {};
          const allMappings: {[name: string]: string} = {};
          const names: string[] = [];

          wb.SheetNames.forEach((name) => {
            const ws = wb.Sheets[name];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (!rawRows || rawRows.length === 0) return;

            const { entries } = extractSheetTables(name, rawRows);
            for (const entry of entries) {
              const key = name === 'Sheet3' ? `${name} - ${entry.subName}` : name;
              const objectsList = buildObjects(entry.headers, entry.data);
              allSheets[key] = objectsList;
              allMappings[key] = detectTarget(entry.subName, entry.headers);
              if (!names.includes(key)) names.push(key);
            }
          });

          if (names.length === 0) {
            alert('No recognizable data tables found in the workbook.');
            setLoading(false);
            return;
          }

          setSheetsData(allSheets);
          setSheetNames(names);
          setActiveSheetName(names[0] || '');
          setSheetMappings(allMappings);
          setIsMapping(true);
        } catch (err: any) {
          alert("Error parsing Excel: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const detectTarget = (sheetName: string, headers: string[]): string => {
    const name = sheetName.toLowerCase();
    const headersLower = headers.map(h => String(h).toLowerCase());

    // Payroll
    if (name.includes('payroll') || name.includes('deduction') || headersLower.includes('basic') || headersLower.includes('commission') || headersLower.includes('net ')) {
      return 'payroll';
    }

    // Petty cash (split debit/credit columns)
    if (name.includes('petty') || name.includes('cash') || headersLower.includes('cbn') || headersLower.includes('vn') || headersLower.includes('debit')) {
      return 'petty_cash';
    }

    // Debts / payables
    if (name.includes('debt') || name.includes('payable') || name.includes('creditor') || headersLower.includes('debt') || headersLower.includes('creditor') || headersLower.includes('decscriptn')) {
      return 'debts_payables';
    }

    // Sales ledger (customer name + plot description pattern)
    if ((headersLower.includes('customer name') || headersLower.includes('client name')) && headersLower.includes('plot')) {
      return 'sales_ledger';
    }
    if (headersLower.includes('actual payment') || headersLower.includes('balance(c-f)') || headersLower.includes('status/total paid')) {
      return 'sales_ledger';
    }

    // Commission / investment sheet
    if (name.includes('commission') || (headersLower.includes('client name') && headersLower.includes('amt. invested'))) {
      return 'sales_ledger';
    }

    // Lands / plots
    if (headersLower.includes('plot_number') || headersLower.includes('plot description') || (headersLower.includes('plot') && headersLower.includes('size'))) {
      return 'lands';
    }

    // Customers
    if (headersLower.includes('phone') || headersLower.includes('id_number') || headersLower.includes('passport')) {
      return 'customers';
    }

    return 'lands';
  };

  const handleImportSheet = async (sheetName: string) => {
    const target = sheetMappings[sheetName];
    const data = sheetsData[sheetName];
    if (!data || data.length === 0) {
      alert(`No records to import in sheet ${sheetName}`);
      return;
    }

    setLoading(true);
    try {
      const targetLabel = TARGET_PRESETS.find(p => p.value === target)?.name || target;
      const res = await api.migrations.import(target, data);
      setMigrationStatus(prev => [
        ...prev,
        `✓ [${sheetName}] imported successfully into [${targetLabel}] (${res.count} records processed)`
      ]);
      alert(`Successfully imported ${res.count} records from "${sheetName}" to "${targetLabel}".`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error importing data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async () => {
    setLoading(true);
    setMigrationStatus([]);
    try {
      for (const name of sheetNames) {
        const target = sheetMappings[name];
        const data = sheetsData[name];
        if (!data || data.length === 0) continue;

        const targetLabel = TARGET_PRESETS.find(p => p.value === target)?.name || target;
        try {
          const res = await api.migrations.import(target, data);
          setMigrationStatus(prev => [
            ...prev,
            `✓ [${name}] merged to [${targetLabel}] (${res.count} records)`
          ]);
        } catch (e: any) {
          setMigrationStatus(prev => [
            ...prev,
            `✗ Fail [${name}] -> [${targetLabel}]: ${e.message}`
          ]);
        }
      }
      alert("All sheets migration run finished! Review logs in preview dashboard.");
    } catch (err: any) {
      alert("Error on workbook merge: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeRows = sheetsData[activeSheetName] || [];

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tighter text-brand-blue flex items-center gap-3">
            <FileSpreadsheet className="w-10 h-10 text-brand-orange" />
            Excel Ledger Migration
          </h1>
          <p className="text-slate-400 text-sm font-medium">Auto-classify and inject physical notebook structures directly into Postgres</p>
        </div>
        {isMapping && (
          <button
            onClick={handleImportAll}
            disabled={loading}
            className="px-6 py-4 bg-brand-orange text-white rounded-3xl font-bold text-xs uppercase tracking-wider hover:bg-brand-blue hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Migrate All Book Sheets ({sheetNames.length})
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Select Ledger Workbook</label>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-200 group-hover:text-brand-orange transition-colors">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-brand-blue">Drop Workbook here</p>
                  <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mt-1">or click to browse</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>
            </div>

            {isMapping && (
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Automated AI Mapping Matrix</label>
                <div className="space-y-3">
                  {sheetNames.map((name) => {
                    const currentMap = sheetMappings[name] || 'lands';
                    return (
                      <div key={name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] flex items-center gap-1.5">
                            <Sheet className="w-3.5 h-3.5 text-slate-400" />
                            {name}
                          </span>
                          <span className="text-[10px] font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                            {sheetsData[name]?.length || 0} rows
                          </span>
                        </div>
                        <select
                          value={currentMap}
                          onChange={(e) => setSheetMappings({ ...sheetMappings, [name]: e.target.value })}
                          className="w-full text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                        >
                          {TARGET_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {migrationStatus.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Migration Run Audit Logs</span>
                <div className="font-mono text-[10px] text-slate-600 space-y-1">
                  {migrationStatus.map((log, i) => (
                    <div key={i} className="leading-relaxed">{log}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
              <p className="text-xs font-medium text-amber-900/60 leading-relaxed">
                Sheets are parsed cell-by-cell. For installments & double-entry Ledgers (e.g. Petty Cash, Debts), our algorithms automatically track and reconstruct balance offsets dynamically.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="h-full min-h-[400px] bg-white border border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10 shadow-sm">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-orange mb-4"></div>
               <p className="text-lg font-bold tracking-tight text-brand-blue">Executing Postgres DB Migrations...</p>
               <p className="text-xs text-slate-400 mt-1">Applying ACID properties, inserting master rows & references</p>
            </div>
          ) : !isMapping ? (
            <div className="h-full min-h-[400px] bg-slate-50/50 backdrop-blur-sm border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200 text-center p-10">
               <Database className="w-20 h-20 mb-4 opacity-10 text-slate-400" />
               <p className="text-xl font-bold tracking-tight text-slate-300">Stage your accounting data</p>
               <p className="text-sm font-medium mt-2 text-slate-300">Upload a single Excel with sheets. The system automatically classifies Petty Cash, Payroll, Debts, and Plot Sales on arrival!</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col h-full shadow-md shadow-brand-blue/5"
            >
              {/* Tabs for Sheet Selection */}
              <div className="flex bg-slate-50/50 overflow-x-auto border-b border-slate-100 p-2 gap-2">
                {sheetNames.map((name) => {
                  const isActive = name === activeSheetName;
                  return (
                    <button
                      key={name}
                      onClick={() => setActiveSheetName(name)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                        isActive 
                          ? "bg-brand-blue text-white shadow-md shadow-brand-blue/10" 
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white flex-wrap gap-4">
                <div>
                   <h3 className="text-lg font-display font-bold tracking-tight text-brand-blue flex items-center gap-2">
                     <Table className="w-5 h-5 text-brand-orange" />
                     {activeSheetName} Properties Preview
                   </h3>
                   <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                     MAPPED TO: <span className="text-brand-orange font-bold font-mono">{sheetMappings[activeSheetName]?.toUpperCase()}</span> ({activeRows.length} total rows)
                   </p>
                </div>
                <button 
                  onClick={() => handleImportSheet(activeSheetName)}
                  className="px-6 py-3.5 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/10"
                >
                  Import {activeSheetName} Only <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      {activeRows.length > 0 && Object.keys(activeRows[0]).map(header => (
                        <th key={header} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 truncate max-w-[150px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[150px]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activeRows.length > 10 && (
                  <div className="p-8 text-center border-t border-slate-100 bg-slate-50/10">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Viewing first 10 rows only in preview grid...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
