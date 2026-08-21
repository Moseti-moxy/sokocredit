import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Landmark, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { signupUser, clearAuthError } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [pin, setPin] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, status, error } = useAuth();
  const isLoading = status === 'loading';

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => dispatch(clearAuthError());
  }, [dispatch]);

  function handleSubmit(e) {
    e.preventDefault();
    dispatch(signupUser({ fullName, customerId, pin }));
  }

  return (
    <div className="min-h-screen bg-brand-50/40 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
            <Landmark size={18} />
          </div>
          <span className="font-display font-semibold text-lg text-brand-700">SokoCredit</span>
        </div>
        <a href="#" className="text-sm text-slate-500 hover:text-brand-700">Help</a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Form card */}
          <div className="bg-white rounded-2xl border border-brand-100 p-6 sm:p-8">
            <h1 className="font-display text-xl font-semibold text-slate-900 mb-1">Create customer account</h1>
            <p className="text-sm text-slate-500 mb-5">Use your customer ID and PIN to access your loan information.</p>

            <div className="h-1.5 rounded-full bg-brand-50 mb-6 overflow-hidden">
              <div className="h-full w-1/3 bg-brand-500 rounded-full" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2.5">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full px-3 py-3 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label htmlFor="customerId" className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Customer ID</label>
                <input
                  id="customerId"
                  name="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="e.g. SC-2026-1001"
                  required
                  className="w-full px-3 py-3 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label htmlFor="pin" className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Create PIN</label>
                <div className="relative">
                  <input
                    id="pin"
                    name="pin"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="4–8 digits"
                    required
                    minLength={4}
                    maxLength={8}
                    pattern="[0-9]{4,8}"
                    className="w-full px-3 py-3 pr-10 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Link
                  to="/login"
                  className="flex-1 sm:flex-none flex items-center justify-center px-5 py-3 rounded-xl border border-brand-200 text-slate-600 font-medium text-sm"
                >
                  ← Back
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating…
                    </>
                  ) : (
                    'Continue →'
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              Already have an account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
            </p>
          </div>

          {/* Info panel - stacks below the form on mobile/tablet */}
          <div className="relative overflow-hidden bg-brand-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col justify-between order-first lg:order-last">
            <img
              src="/market-growth.jpg"
              alt="Market trader carrying bananas"
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-brand-900/75" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-full px-3 py-1.5 mb-5">
                <ShieldCheck size={13} /> Trusted by 500+ institutions
              </span>
              <h2 className="font-display text-2xl font-semibold mb-2">Empowering Local Markets</h2>
              <p className="text-brand-100 text-sm">
                Secure, transparent, and built for the field. Manage your portfolio with confidence.
              </p>
            </div>

            <div className="relative mt-6 bg-white/10 rounded-xl p-4">
              <p className="text-xs text-brand-100 mb-1">Portfolio Growth</p>
              <p className="font-display text-lg font-semibold mb-2">+12.5% this month</p>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-3/4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
