import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Upload, 
  X, 
  Download, 
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Document {
  id: number;
  type: string;
  uploaded_at: string;
  file_name?: string;
}

const DOCUMENT_TYPES = [
  { value: 'idDocument', label: 'ID Document', description: 'National ID, Passport, etc.' },
  { value: 'officialDocs', label: 'Official Documents', description: 'Licenses, certificates, etc.' },
  { value: 'receipt', label: 'Receipt', description: 'Purchase receipts, invoices' },
  { value: 'agreement', label: 'Agreement', description: 'Contracts, agreements' },
  { value: 'proofOfAddress', label: 'Proof of Address', description: 'Utility bills, lease agreements' },
];

interface ClientDocumentsUploadProps {
  customerId: number;
  customerName: string;
  onClose: () => void;
}

export const ClientDocumentsUpload: React.FC<ClientDocumentsUploadProps> = ({
  customerId,
  customerName,
  onClose,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('idDocument');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  useEffect(() => {
    loadDocuments();
  }, [customerId]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const docs = await api.customers.getDocuments(customerId);
      setDocuments(docs || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File exceeds 10 MB limit');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);

      await api.customers.uploadDocument(customerId, formData);
      
      setSuccess('Document uploaded successfully');
      setSelectedFile(null);
      setSelectedType('idDocument');
      
      // Reload documents
      await loadDocuments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(docId: number) {
    try {
      await api.customers.downloadDocument(customerId, docId);
    } catch (err) {
      setError('Failed to download document');
    }
  }

  async function handleDelete(docId: number) {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.customers.deleteDocument(customerId, docId);
      setSuccess('Document deleted');
      await loadDocuments();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }

  const getDocTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl bg-white rounded-[3rem] p-10 overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <header className="mb-8 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold text-brand-orange tracking-widest mb-1">Client Documents</p>
              <h2 className="text-3xl font-display font-bold tracking-tighter text-brand-blue">
                {customerName}
              </h2>
              <p className="text-sm text-slate-500 mt-2">Manage IDs, official docs, receipts & agreements</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-slate-100 flex-shrink-0"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </header>

          {/* Alert Messages */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3"
            >
              <p className="text-sm text-emerald-700">✓ {success}</p>
            </motion.div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleUpload} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Upload New Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Document Type
                </label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 ring-brand-blue/10 transition-all outline-none text-slate-700"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  File (PDF, JPG, PNG - Max 10MB)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-blue file:text-white hover:border-brand-blue/50 transition-colors disabled:opacity-50"
                  />
                </div>
                {selectedFile && (
                  <p className="mt-2 text-xs text-slate-500">
                    Selected: <span className="font-semibold">{selectedFile.name}</span> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>

          {/* Documents List */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              Uploaded Documents ({documents.length})
            </h3>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {getDocTypeLabel(doc.type)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="p-2 hover:bg-brand-blue/10 text-brand-blue rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
