import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Building2, Eye, EyeOff, LocateFixed, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { signupUser, clearAuthError } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';
import { UNSAFE_PINS } from '../utils/pin';

// Default values match the most common market-trader profile and keep the
// form controlled from its first render.
const initialForm = { name: '', phone: '+254', nationalId: '', email: '', kraPin: '', market: 'Wakulima Market (Marikiti)', stall: '', commodity: 'Vegetables & Fruits (Mama Mboga)', yearsOperating: '3', dailyTurnover: '', dailyProfit: '', chama: 'No Chama / Individual Borrower', nextOfKin: '', relationship: 'Spouse', nextOfKinPhone: '+254', pin: '', latitude: null, longitude: null };
// Shared input classes keep the large registration form visually consistent.
const input = 'app-field h-11 w-full px-3 text-sm';

// Reusable field wrapper that connects an input with its visible label.
function Field({ label, required, children }) { return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{required && ' *'}{children}{label === 'Market Location' && <button type="button" onClick={() => window.dispatchEvent(new Event('sokocredit:capture-location'))} className="app-field inline-flex h-11 items-center justify-center gap-2 px-3 text-sm text-brand-700 hover:bg-brand-50"><LocateFixed size={16} />Capture current location</button>}</label>; }
// Reusable form section with a numbered heading and responsive two-column grid.
function Section({ title, icon: Icon, children }) { return <section className="border-b border-brand-100 py-5 first:pt-0 last:border-0"><h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon size={16} className="text-brand-500" />{title}</h2><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>; }

export default function Signup() {
  // Local state stores customer-entered values and immediate validation feedback.
  const [form, setForm] = useState(initialForm); const [showPin, setShowPin] = useState(false); const [formError, setFormError] = useState(''); const [locating, setLocating] = useState(false);
  // Redux submits the account request; router navigation redirects signed-in users.
  const dispatch = useDispatch(); const navigate = useNavigate(); const { isAuthenticated, status, error } = useAuth(); const isLoading = status === 'loading';

  // Do not leave an authenticated customer on the registration screen.
  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);
  // Clear a previous server error when this page is unmounted.
  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);
  // Page-specific body class allows the stylesheet to target this full-screen view.
  useEffect(() => {
    document.body.classList.add('signup-page');
    return () => document.body.classList.remove('signup-page');
  }, []);
  // Update one controlled form field and remove an outdated validation message.
  const update = (key, value) => { setFormError(''); setForm((current) => ({ ...current, [key]: value })); };
  const captureLocation = () => {
    if (!navigator.geolocation) return setFormError('Geolocation is not available in this browser.');
    setLocating(true); setFormError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setForm((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude })); setLocating(false); },
      (locationError) => { setFormError(locationError.code === locationError.PERMISSION_DENIED ? 'Location access was denied. Enable it in your browser and try again.' : 'Could not determine your location. Check your signal and try again.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };
  useEffect(() => {
    window.addEventListener('sokocredit:capture-location', captureLocation);
    return () => window.removeEventListener('sokocredit:capture-location', captureLocation);
  });
  const submit = (event) => {
    event.preventDefault();
    // Normalize the National ID first so spaces and punctuation cannot bypass validation.
    const nationalId = form.nationalId.replace(/\D/g, '');
    const email = form.email.trim();
    // Name each invalid field so an agent can correct the form without having
    // to guess which part of the broad onboarding validation failed.
    const invalidFields = [];
    if (!form.name.trim()) invalidFields.push('full legal name');
    if (form.phone.replace(/\D/g, '').length < 10) invalidFields.push('M-Pesa phone number');
    if (!/^(\d{7,8}|\d{14})$/.test(nationalId)) invalidFields.push('Kenyan National ID (7–8 digits or a 14-digit Maisha Namba)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalidFields.push('email address');
    if (!form.stall.trim()) invalidFields.push('stall / kiosk number');
    if (Number(form.dailyTurnover) <= 0) invalidFields.push('daily cash turnover');
    if (!/^\d{4,8}$/.test(form.pin)) invalidFields.push('PIN (4–8 digits)');
    if (invalidFields.length) return setFormError(`Please correct: ${invalidFields.join(', ')}.`);
    // Prevent common, easily guessed PINs even when their length is valid.
    if (UNSAFE_PINS.has(form.pin)) return setFormError('Choose a less predictable PIN. Common PINs such as 1234 can be reported as compromised by your browser.');
    // Keep sign-in credentials separate from the wider customer/business profile.
    dispatch(signupUser({ fullName: form.name.trim(), email, customerId: nationalId, pin: form.pin, profile: { phone: form.phone, nationalId, kraPin: form.kraPin.trim(), market: form.market, location: form.stall.trim(), business: form.commodity, yearsOperating: Number(form.yearsOperating), dailyTurnover: Number(form.dailyTurnover), dailyProfit: Number(form.dailyProfit || 0), chama: form.chama, nextOfKin: form.nextOfKin.trim(), relationship: form.relationship, nextOfKinPhone: form.nextOfKinPhone, latitude: form.latitude, longitude: form.longitude } }));
  };
  return <div className="min-h-screen bg-brand-50/40 py-6 sm:py-10"><main className="mx-auto max-w-5xl px-4 sm:px-6"><div className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm"><div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white sm:px-7"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-white/15"><UserRoundPlus size={21} /></div><div><h1 className="font-display text-lg font-semibold">Register New Trader / Mama Mboga</h1><p className="text-xs text-brand-100">Create your SokoCredit customer account</p></div></div><Link to="/login" aria-label="Return to customer login" className="grid size-9 place-items-center rounded-full bg-brand-700/60 text-lg hover:bg-brand-700">×</Link></div><form onSubmit={submit} noValidate className="p-5 sm:p-7"><Section title="1. Personal & contact information" icon={UserRoundPlus}><Field label="Full Legal Name" required><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} className={input} placeholder="e.g. Agnes Muthoni Kariuki" /></Field><Field label="M-Pesa Phone Number" required><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={input} placeholder="+2547..." /></Field><Field label="Kenyan National ID Number" required><input inputMode="numeric" autoComplete="off" maxLength="14" value={form.nationalId} onChange={(event) => update('nationalId', event.target.value.replace(/\D/g, ''))} className={input} placeholder="e.g. 29481029 or 14-digit Maisha Namba" /></Field><Field label="Email Address" required><input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={input} placeholder="e.g. agnes@example.com" /></Field><Field label="KRA PIN (Optional)"><input value={form.kraPin} onChange={(event) => update('kraPin', event.target.value)} className={input} placeholder="e.g. A008920194M" /></Field></Section><Section title="2. Market location & trading stall" icon={Building2}><Field label="Market Location" required><select value={form.market} onChange={(event) => update('market', event.target.value)} className={input}><option>Wakulima Market (Marikiti)</option><option>Gikomba Market</option><option>Muthurwa Market</option><option>City Park Market</option></select></Field><Field label="Stall / Kiosk Number" required><input value={form.stall} onChange={(event) => update('stall', event.target.value)} className={input} placeholder="e.g. Shed B-42, Fresh Produce Line" /></Field><Field label="Business Commodity Type"><select value={form.commodity} onChange={(event) => update('commodity', event.target.value)} className={input}><option>Vegetables & Fruits (Mama Mboga)</option><option>Grains & Cereals</option><option>Textiles & Fabrics</option><option>Hardware & Household Goods</option><option>Other Retail Trade</option></select></Field><Field label="Years Operating at this Market"><input type="number" min="0" max="70" value={form.yearsOperating} onChange={(event) => update('yearsOperating', event.target.value)} className={input} /></Field><Field label="Est. Daily Cash Turnover (KSh)" required><input type="number" min="1" value={form.dailyTurnover} onChange={(event) => update('dailyTurnover', event.target.value)} className={input} placeholder="12000" /></Field><Field label="Est. Daily Net Profit (KSh)"><input type="number" min="0" value={form.dailyProfit} onChange={(event) => update('dailyProfit', event.target.value)} className={input} placeholder="3200" /></Field></Section><Section title="3. Chama affiliation & next of kin" icon={ShieldCheck}><Field label="Market Chama Group (Joint Liability)"><select value={form.chama} onChange={(event) => update('chama', event.target.value)} className={input}><option>No Chama / Individual Borrower</option><option>Wakulima Traders Chama</option><option>Gikomba Market Chama</option></select></Field><Field label="Next of Kin Full Name"><input value={form.nextOfKin} onChange={(event) => update('nextOfKin', event.target.value)} className={input} placeholder="e.g. Samuel Kariuki" /></Field><Field label="Relationship"><select value={form.relationship} onChange={(event) => update('relationship', event.target.value)} className={input}><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Child</option></select></Field><Field label="Next of Kin Phone"><input type="tel" value={form.nextOfKinPhone} onChange={(event) => update('nextOfKinPhone', event.target.value)} className={input} placeholder="+2547..." /></Field></Section><Section title="4. Create your sign-in details" icon={ShieldCheck}><p className="sm:col-span-2 -mt-1 text-sm text-slate-500">Your National ID and email are used to sign in. We create a separate permanent customer reference (for example, CUS-0001) for support and account records.</p><Field label="Create PIN" required><div className="relative"><input type={showPin ? 'text' : 'password'} inputMode="numeric" value={form.pin} onChange={(event) => update('pin', event.target.value)} className={`${input} pr-10`} placeholder="4–8 digits" maxLength="8" /><button type="button" onClick={() => setShowPin((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPin ? 'Hide PIN' : 'Show PIN'}>{showPin ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field></Section>{(formError || error) && <p role="alert" className="mt-5 text-sm text-red-600">{formError || error}</p>}<div className="mt-6 flex flex-col-reverse gap-3 border-t border-brand-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link></p><button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"><ShieldCheck size={17} /> {isLoading ? 'Creating account…' : 'Save & Onboard Trader'}</button></div></form></div></main></div>;
}
