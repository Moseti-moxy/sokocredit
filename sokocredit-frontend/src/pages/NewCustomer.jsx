import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LocateFixed, ShieldCheck, UserRoundPlus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { registerCustomer } from '../features/customers/customersSlice';

const initialForm = { name: '', phone: '+254', nationalId: '', kraPin: '', market: 'Wakulima Market (Marikiti)', stall: '', commodity: 'Vegetables & Fruits (Mama Mboga)', yearsOperating: '3', dailyTurnover: '', dailyProfit: '', chama: 'No Chama / Individual Borrower', nextOfKin: '', relationship: 'Spouse', nextOfKinPhone: '+254', appraisalNotes: '', latitude: null, longitude: null };
const input = 'app-field h-11 w-full px-3 text-sm';

function Field({ label, required, children }) { return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{required && ' *'}{children}</label>; }
function Section({ title, icon: Icon, children }) { return <section className="border-b border-brand-100 py-5 first:pt-0 last:border-0"><h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon size={16} className="text-brand-500" />{title}</h3><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>; }

export default function NewCustomer() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const dispatch = useDispatch(); const navigate = useNavigate();
  const update = (key, value) => { setError(''); setForm((current) => ({ ...current, [key]: value })); };
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude }));
        setLocating(false);
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? 'Location access was denied. Enable it in your browser and try again.'
          : 'Could not determine your location. Check your signal and try again.';
        setError(message); setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10 || !form.nationalId.trim() || !form.market || !form.stall.trim() || Number(form.dailyTurnover) <= 0) return setError('Complete the required personal, market, stall, and daily-turnover details.');
    if (Number(form.dailyProfit || 0) > Number(form.dailyTurnover)) return setError('Estimated daily net profit cannot be higher than daily cash turnover.');
    setSubmitting(true); setError('');
    try {
      const customer = await dispatch(registerCustomer({
        fullName: form.name.trim(),
        phoneNumber: form.phone,
        nationalId: form.nationalId.trim(),
        businessName: form.commodity,
        market: form.market,
        stallNumber: form.stall.trim(),
        yearsInBusiness: form.yearsOperating ? Number(form.yearsOperating) : null,
        kraPin: form.kraPin.trim() || null,
        dailyTurnover: Number(form.dailyTurnover),
        dailyProfit: Number(form.dailyProfit || 0),
        chama: form.chama,
        nextOfKin: form.nextOfKin.trim() || null,
        relationship: form.relationship || null,
        nextOfKinPhone: form.nextOfKinPhone.replace(/\D/g, '').length >= 9 ? form.nextOfKinPhone : null,
        appraisalNotes: form.appraisalNotes.trim() || null,
        ...(form.latitude != null && form.longitude != null
          ? { latitude: form.latitude, longitude: form.longitude }
          : {}),
      })).unwrap();
      navigate(`/customers?customer=${encodeURIComponent(customer.id)}`);
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.response?.data?.error || err?.message || 'Could not register this trader. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  return <AppShell title="Register New Trader" subtitle="KYC onboarding and field biometric verification."><div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm"><div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white sm:px-7"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-white/15"><UserRoundPlus size={21} /></div><div><h2 className="font-display text-lg font-semibold">Register New Trader / Mama Mboga</h2><p className="text-xs text-brand-100">KYC onboarding &amp; field biometric verification</p></div></div><Link to="/customers" aria-label="Cancel customer registration" className="grid size-9 place-items-center rounded-full bg-brand-700/60 text-lg hover:bg-brand-700">×</Link></div><form onSubmit={submit} noValidate className="max-h-[calc(100vh-13rem)] overflow-y-auto p-5 sm:p-7"><Section title="1. Personal & contact information" icon={UserRoundPlus}><Field label="Full Legal Name" required><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} className={input} placeholder="e.g. Agnes Muthoni Kariuki" /></Field><Field label="M-Pesa Phone Number" required><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={input} placeholder="+2547..." /></Field><Field label="National ID Number" required><input inputMode="numeric" value={form.nationalId} onChange={(event) => update('nationalId', event.target.value)} className={input} placeholder="e.g. 29481029" /></Field><Field label="KRA PIN (Optional)"><input value={form.kraPin} onChange={(event) => update('kraPin', event.target.value)} className={input} placeholder="e.g. A008920194M" /></Field></Section><Section title="2. Market location & trading stall" icon={Building2}><Field label="Market Location" required><select value={form.market} onChange={(event) => update('market', event.target.value)} className={input}><option>Wakulima Market (Marikiti)</option><option>Gikomba Market</option><option>Muthurwa Market</option><option>City Park Market</option></select></Field><div className="grid gap-2 text-sm font-medium text-slate-700"><span>GPS location <span className="text-slate-400">(recommended)</span></span><button type="button" onClick={captureLocation} disabled={locating} className="app-field inline-flex h-11 items-center justify-center gap-2 px-3 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-60"><LocateFixed size={16} />{locating ? 'Getting location…' : form.latitude != null ? 'Location captured' : 'Capture current location'}</button>{form.latitude != null && <p className="text-xs font-normal text-slate-500">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</p>}</div><Field label="Stall / Kiosk Number" required><input value={form.stall} onChange={(event) => update('stall', event.target.value)} className={input} placeholder="e.g. Shed B-42, Fresh Produce Line" /></Field><Field label="Business Commodity Type"><select value={form.commodity} onChange={(event) => update('commodity', event.target.value)} className={input}><option>Vegetables & Fruits (Mama Mboga)</option><option>Grains & Cereals</option><option>Textiles & Fabrics</option><option>Hardware & Household Goods</option><option>Other Retail Trade</option></select></Field><Field label="Years Operating at this Market"><input type="number" min="0" max="70" value={form.yearsOperating} onChange={(event) => update('yearsOperating', event.target.value)} className={input} /></Field><Field label="Est. Daily Cash Turnover (KSh)" required><input type="number" min="1" value={form.dailyTurnover} onChange={(event) => update('dailyTurnover', event.target.value)} className={input} placeholder="12000" /></Field><Field label="Est. Daily Net Profit (KSh)"><input type="number" min="0" value={form.dailyProfit} onChange={(event) => update('dailyProfit', event.target.value)} className={input} placeholder="3200" /></Field></Section><Section title="3. Chama affiliation & next of kin" icon={ShieldCheck}><Field label="Market Chama Group (Joint Liability)"><select value={form.chama} onChange={(event) => update('chama', event.target.value)} className={input}><option>No Chama / Individual Borrower</option><option>Wakulima Traders Chama</option><option>Gikomba Market Chama</option><option>Muthurwa Women Traders Group</option></select></Field><Field label="Next of Kin Full Name"><input value={form.nextOfKin} onChange={(event) => update('nextOfKin', event.target.value)} className={input} placeholder="e.g. Samuel Kariuki" /></Field><Field label="Relationship"><select value={form.relationship} onChange={(event) => update('relationship', event.target.value)} className={input}><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option><option>Other relative</option></select></Field><Field label="Next of Kin Phone"><input type="tel" value={form.nextOfKinPhone} onChange={(event) => update('nextOfKinPhone', event.target.value)} className={input} placeholder="+2547..." /></Field><label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">Field Officer Appraisal Notes<textarea value={form.appraisalNotes} onChange={(event) => update('appraisalNotes', event.target.value)} className="app-field min-h-24 w-full px-3 py-2 text-sm" placeholder="Observed steady customer traffic at morning peak hours..." /></label></Section>{error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-3 border-t border-brand-100 pt-5 sm:flex-row sm:justify-end"><Link to="/customers" className="rounded-xl border border-brand-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-brand-50">Cancel</Link><button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"><ShieldCheck size={17} /> {submitting ? 'Saving…' : 'Save & Onboard Trader'}</button></div></form></div></AppShell>;
}
