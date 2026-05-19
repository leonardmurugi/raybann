import React, { useState } from 'react';
import { 
  FileUp, 
  Table, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  ArrowRight,
  Database,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function DataMigration() {
  const [fileData, setFileData] = useState<any[]>([]);
  const [targetCollection, setTargetCollection] = useState<'lands' | 'customers' | 'properties'>('lands');
  const [isMapping, setIsMapping] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setFileData(results.data);
          setIsMapping(true);
          setLoading(false);
        }
      });
    } else {
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Convert array of arrays to array of objects using first row as header
        const headers: any = data[0];
        const rows = data.slice(1).map((row: any) => {
          const obj: any = {};
          headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj;
        });

        setFileData(rows);
        setIsMapping(true);
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleImport = async () => {
    alert('This will process ' + fileData.length + ' records into ' + targetCollection + '. Backend mapping will be refined as per fields provided.');
  };

  return (
    <div className="space-y-8 pb-10 font-sans pt-4">
      <header>
        <h1 className="text-4xl font-display font-medium tracking-tighter text-brand-blue">Data Migration</h1>
        <p className="text-slate-400 text-sm font-medium">Transition from Excel and physical notebooks seamlessly</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Import Target</label>
              <div className="grid grid-cols-1 gap-2">
                {['properties', 'lands', 'customers'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTargetCollection(type as any)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold",
                      targetCollection === type 
                        ? "bg-brand-blue border-brand-blue text-white shadow-xl shadow-brand-blue/10" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-brand-blue/20"
                    )}
                  >
                    <span className="capitalize">{type}</span>
                    {targetCollection === type && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Select Source File</label>
              <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-200 group-hover:text-brand-orange transition-colors">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-brand-blue">Drop Excel/CSV here</p>
                  <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mt-1">or click to browse</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-xs font-medium text-amber-900/60 leading-relaxed">
                  Ensure your file has headers in the first row. We'll attempt to auto-match common fields like 'Name', 'Plot', and 'Balance'.
                </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!isMapping ? (
            <div className="h-full min-h-[400px] bg-slate-50/50 backdrop-blur-sm border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-200 text-center p-10">
               <Database className="w-20 h-20 mb-4 opacity-10" />
               <p className="text-xl font-bold tracking-tight text-slate-300">Stage your data</p>
               <p className="text-sm font-medium mt-2 text-slate-300">Upload a file to see valid records and mapping options</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden flex flex-col h-full shadow-2xl shadow-brand-blue/5"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div>
                   <h3 className="text-xl font-display font-bold tracking-tight text-brand-blue">Staged Preview</h3>
                   <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{fileData.length} records found in file</p>
                </div>
                <button 
                  onClick={handleImport}
                  className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-brand-orange transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/10"
                >
                  Confirm Import <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-slate-100">
                    <tr>
                      {fileData.length > 0 && Object.keys(fileData[0]).map(header => (
                        <th key={header} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-white truncate max-w-[150px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fileData.slice(0, 10).map((row, i) => (
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
                {fileData.length > 10 && (
                  <div className="p-10 text-center border-t border-slate-100 bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Viewing first 10 records only...</p>
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
