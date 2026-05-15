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
    <div className="space-y-8 pb-10 font-sans">
      <header>
        <h1 className="text-4xl font-bold tracking-tighter">Data Migration</h1>
        <p className="text-black/50 text-sm font-medium">Transition from Excel and physical notebooks seamlessly</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Import Target</label>
              <div className="grid grid-cols-1 gap-2">
                {['properties', 'lands', 'customers'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTargetCollection(type as any)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold",
                      targetCollection === type 
                        ? "bg-black border-black text-white shadow-xl shadow-black/10" 
                        : "bg-white border-black/5 text-black/40 hover:border-black/20"
                    )}
                  >
                    <span className="capitalize">{type}</span>
                    {targetCollection === type && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Select Source File</label>
              <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-black/10 rounded-[2.5rem] bg-black/[0.01] hover:bg-black/[0.03] transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-black/20 group-hover:text-[#5A5A40] transition-colors">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold">Drop Excel/CSV here</p>
                  <p className="text-[10px] text-black/30 font-medium uppercase tracking-widest mt-1">or click to browse</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-900/60 leading-relaxed">
                  Ensure your file has headers in the first row. We'll attempt to auto-match common fields like 'Name', 'Plot', and 'Balance'.
                </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!isMapping ? (
            <div className="h-full min-h-[400px] bg-white/40 backdrop-blur-sm border-2 border-dashed border-black/5 rounded-[3rem] flex flex-col items-center justify-center text-black/20 text-center p-10">
               <Database className="w-20 h-20 mb-4 opacity-10" />
               <p className="text-xl font-bold tracking-tight">Stage your data</p>
               <p className="text-sm font-medium mt-2">Upload a file to see valid records and mapping options</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] border border-black/5 overflow-hidden flex flex-col h-full shadow-2xl shadow-black/5"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between bg-black/[0.01]">
                <div>
                   <h3 className="text-xl font-bold tracking-tight">Staged Preview</h3>
                   <p className="text-xs font-bold text-black/30 uppercase tracking-widest">{fileData.length} records found in file</p>
                </div>
                <button 
                  onClick={handleImport}
                  className="px-8 py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold text-xs hover:bg-[#5A5A40] transition-all flex items-center gap-2"
                >
                  Confirm Import <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-black/5">
                    <tr>
                      {fileData.length > 0 && Object.keys(fileData[0]).map(header => (
                        <th key={header} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 bg-white truncate max-w-[150px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-black/[0.02] hover:bg-black/[0.01]">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-6 py-4 text-xs font-medium text-black/60 truncate max-w-[150px]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fileData.length > 10 && (
                  <div className="p-10 text-center border-t border-black/5">
                    <p className="text-xs font-bold text-black/30 uppercase tracking-widest italic">Viewing first 10 records only...</p>
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
