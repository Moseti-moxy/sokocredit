import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, MapPin, ArrowDownLeft, ArrowUpRight, FileText, Upload } from 'lucide-react';
import { formatKES } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { uploadCustomerDocument } from '../features/customers/customersSlice';

const DOCUMENT_TYPES = [
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'BUSINESS_PERMIT', label: 'Business Permit' },
  { value: 'PASSPORT_PHOTO', label: 'Passport Photo' },
  { value: 'OTHER', label: 'Other' },
];

function DocumentUpload({ customerId }) {
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const [documentType, setDocumentType] = useState('NATIONAL_ID');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError('');
    try {
      await dispatch(uploadCustomerDocument({ customerId, file, documentType })).unwrap();
    } catch (err) {
      setUploadError(err?.response?.data?.error || 'Upload failed. Use a PDF, JPG, or PNG under 5MB.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
      <select
        aria-label="Document type"
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        className="text-sm rounded-lg border border-brand-100 px-2.5 py-2 bg-white text-slate-600"
      >
        {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        className="flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg border border-brand-200 px-3 py-2 text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload document'}
      </button>
      <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
    </div>
  );
}

export default function CustomerDetail({ customer }) {
  const navigate = useNavigate();
  const detailStatus = useSelector((state) => state.customers.detailStatus);
  if (!customer) {
    return (
      <div className="bg-white rounded-2xl border border-brand-100 p-8 text-center text-slate-400 text-sm">
        Select a customer to view their profile.
      </div>
    );
  }

  const scoreLabel =
    customer.creditScore >= 80 ? 'Excellent' : customer.creditScore >= 60 ? 'Good' : customer.creditScore >= 40 ? 'Fair' : 'Poor';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-display font-semibold text-lg shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-lg text-slate-900 truncate">{customer.name}</h3>
              <p className="text-sm text-slate-500 truncate">{customer.business}</p>
            </div>
          </div>
          <a
            href="tel:+254700000000"
            aria-label="Call customer"
            className="p-2.5 rounded-full bg-brand-50 text-brand-600 shrink-0"
          >
            <Phone size={16} />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Client ID</p>
            <p className="font-medium text-slate-800">{customer.id}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Joined</p>
            <p className="font-medium text-slate-800">{customer.joined}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total Loans</p>
            <p className="font-medium text-slate-800">{customer.totalLoans}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Default Rate</p>
            <p className="font-medium text-brand-600">{customer.defaultRate}%</p>
          </div>
        </div>

        <button onClick={() => navigate(`/loans?customer=${encodeURIComponent(customer.id)}`)} className="mt-5 w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl px-5 py-2.5 transition-colors">
          Issue Loan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-brand-100 p-5 flex flex-col items-center text-center">
          <p className="text-xs uppercase text-slate-400 mb-2 self-start">
            Credit Trust Score {detailStatus === 'loading' && <span className="normal-case text-slate-300">· updating…</span>}
          </p>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#dcecd6" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#3f7d2e" strokeWidth="10"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - customer.creditScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-2xl font-semibold text-slate-900">{customer.creditScore}</span>
              <span className="text-[11px] font-medium text-brand-600">{scoreLabel}</span>
            </div>
          </div>
          <div className="flex justify-between w-full text-[11px] text-slate-400 mt-3">
            <span>Poor</span><span>Fair</span><span>Good</span><span className="text-brand-600 font-medium">Excellent</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <div className="flex items-center gap-1 text-xs uppercase text-slate-400 mb-2">
            <MapPin size={13} /> Business Location
          </div>
          <p className="text-sm font-medium text-slate-800 mb-3">{customer.location}</p>
          <div className="h-28 rounded-xl bg-brand-50 flex items-center justify-center text-brand-300">
            <MapPin size={28} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-slate-900 text-sm">Payment History</h4>
          <button type="button" onClick={() => navigate(`/analytics?customer=${encodeURIComponent(customer.id)}`)} className="text-xs font-medium text-brand-600 hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {customer.paymentHistory.length === 0 && (
            <p className="text-sm text-slate-400">No payment history yet.</p>
          )}
          {customer.paymentHistory.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  p.direction === 'in' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.direction === 'in' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{p.type}</p>
                <p className="text-xs text-slate-400 truncate">{p.date} · {p.method}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${p.direction === 'in' ? 'text-brand-600' : 'text-slate-900'}`}>
                  {p.direction === 'in' ? '+' : '-'}{formatKES(p.amount)}
                </p>
                {p.balanceAfter !== null && (
                  <p className="text-[11px] text-slate-400">Bal: {formatKES(p.balanceAfter)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <h4 className="font-display font-semibold text-slate-900 text-sm mb-1">Documents</h4>
        <p className="text-xs text-slate-400 mb-2">National ID, business permit, or a passport photo — PDF, JPG, or PNG, up to 5MB.</p>
        <div className="space-y-2">
          {(customer.documents || []).length === 0 && (
            <p className="text-sm text-slate-400">No documents uploaded yet.</p>
          )}
          {(customer.documents || []).map((doc) => (
            <div key={doc.id} className="flex items-center gap-2.5 text-sm">
              <FileText size={15} className="text-brand-500 shrink-0" />
              <span className="text-slate-700 truncate flex-1">{doc.filename}</span>
              <span className="text-xs text-slate-400 shrink-0">{doc.type.replace('_', ' ')} · {doc.uploadedAt}</span>
            </div>
          ))}
        </div>
        <DocumentUpload customerId={customer.id} />
      </div>
    </div>
  );
}
