import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { loginUser, clearAuthError } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';

export default function Login({ portal = 'customer' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, status, error } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  const isLoading = status === 'loading';
  const isCustomer = portal === 'customer';

  // Already signed in (or just signed in) -> send them where they were
  // headed, or the dashboard by default.
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  useEffect(() => {
    return () => dispatch(clearAuthError());
  }, [dispatch]);

  function handleSubmit(e) {
    e.preventDefault();
    dispatch(loginUser({ 
      identifier, 
      password, 
      remember, 
      portal
    }));
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Hero image - hidden on mobile to keep the form the priority there */}
      <div className="hidden lg:block relative bg-brand-900">
        <img
          src="/signup-market-trader.png"
          alt="SokoCredit customer at her fresh-produce market stall"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '42% center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/75 via-brand-900/10 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-10 text-white">
          <h2 className="font-display text-2xl font-semibold mb-2">Empowering Market Traders</h2>
          <p className="text-brand-100 text-sm max-w-sm">
            Reliable microfinance solutions designed for the rhythm of the modern market. Secure, fast, and transparent.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-16">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo.svg" alt="SokoCredit logo" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <span className="font-display font-semibold text-lg text-brand-700">SokoCredit</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-slate-900 mb-1">{portal === 'staff' ? 'Staff sign in' : 'Customer sign in'}</h1>
          <p className="text-sm text-slate-500 mb-8">{portal === 'staff' ? 'Agents sign in with their email and PIN. Administrators use the same secure staff portal.' : 'Sign in with your registered email or National ID number and your PIN.'}</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2.5">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="identifier" className="block text-xs font-medium text-slate-500 mb-1.5">
                {portal === 'staff' ? 'Email' : 'Email or National ID Number'}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    portal === 'staff' 
                      ? 'name@sokocredit.co.ke' 
                      : 'your@email.com or 29481029'
                  }
                  required
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-500 mb-1.5">PIN</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  inputMode="numeric"
                  placeholder="••••"
                  required
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-brand-200 text-brand-500 focus:ring-brand-300"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setSupportMessage(isCustomer && loginMethod === 'email' ? 'To reset your PIN, please visit our website or contact SokoCredit Support.' : 'To reset your PIN, please contact SokoCredit Support.')}
                className="text-brand-600 font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Helpful info about login methods */}
            {isCustomer && (
              <div className="text-xs text-slate-500 bg-brand-50 rounded-lg p-3 mt-4">
                <p className="font-medium text-slate-600 mb-1">Login Tips:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Use your registered email or 8-digit National ID—whichever you prefer</li>
                  <li>Both identifiers access the same account</li>
                  <li>Keep your credentials secure</li>
                </ul>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3.5 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {supportMessage && (
            <p role="status" className="mt-5 rounded-xl bg-brand-50 px-3 py-2 text-center text-sm text-brand-700">
              {supportMessage}
            </p>
          )}
          <p className="text-center text-sm text-slate-500 mt-6">
            Need help?{' '}
            <button
              type="button"
              onClick={() => setSupportMessage('Please contact SokoCredit Support for assistance with your account.')}
              className="text-brand-600 font-medium hover:underline"
            >
              Contact Support
            </button>
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            {portal === 'staff' ? <>Customer? <Link to="/login" className="text-brand-600 font-medium hover:underline">Go to customer login</Link></> : <>New customer? <Link to="/signup" className="text-brand-600 font-medium hover:underline">Create your account</Link></>}
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            {portal === 'staff' ? 'Agent accounts are created by an administrator.' : <Link to="/staff/login" className="text-brand-600 font-medium hover:underline">Agent or administrator? Use staff login</Link>}
          </p>
        </div>
      </div>
    </div>
  );
}
