import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface UploadedFile {
  id: string;
  type: 'saleAgreement' | 'idDocument' | 'kraCert' | 'passportPhoto' | 'titleDeed';
  name: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB

export const ReceiptUploader: React.FC = () => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [receiptId, setReceiptId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    // Assume the first sheet is the main customer sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    setExcelData(json as any[]);
  };

  const handleFileUpload = async (type: UploadedFile['type'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert('File exceeds 10 MiB limit');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const resp = await axios.post('/api/receipts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setFiles(prev => [...prev, { id: resp.data.fileId, type, name: file.name }]);
  };

  const generateReceipt = async () => {
    setStatus('Generating…');
    const payload = { excelData, fileIds: files.map(f => f.id) };
    const resp = await axios.post('/api/receipts/generate', payload);
    setReceiptId(resp.data.receiptId);
    setStatus('Ready for download');
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Generate Receipt</h2>
      <div className="mb-3">
        <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Excel file (all sheets)</label>
        <input type="file" accept=".xlsx,.xls" onChange={handleExcel} className="border rounded w-full p-2" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {['saleAgreement', 'idDocument', 'kraCert', 'passportPhoto', 'titleDeed'].map(t => (
          <div key={t}>
            <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">{t.replace(/([A-Z])/g, ' $1')}</label>
            <input type="file" accept="application/pdf,image/*" onChange={e => handleFileUpload(t as any, e)} className="border rounded w-full p-2" />
          </div>
        ))}
      </div>
      <button onClick={generateReceipt} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Generate PDF
      </button>
      {status && <p className="mt-2 text-gray-600 dark:text-gray-400">{status}</p>}
      {receiptId && (
        <a href={`/api/receipts/${receiptId}/download`} className="mt-2 inline-block text-blue-500 underline">
          Download Receipt PDF
        </a>
      )}
    </div>
  );
};
