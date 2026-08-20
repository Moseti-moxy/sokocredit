import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Landmark, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { loginUser, clearAuthError } from '../features/auth/authSlice';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, status, error } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const isLoading = status === 'loading';

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
    dispatch(loginUser({ identifier, password, remember }));
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Hero image - hidden on mobile to keep the form the priority there */}
      <div className="hidden lg:block relative bg-brand-900">
        <img
          src="https://images.unsplash.com/photo-1607013407627-6ea62c04b6f9?q=80&w=1200&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/20 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-10 text-white">
          <h2 className="font-display text-2xl font-semibold mb-2">Empowering Market Traders</h2>
          <p className="text-brand-100 text-sm max-w-sm">
            Reliable microfinance solutions designed for the rhythm of the modern market. Secure, fast, and transparent.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
              <Landmark size={18} />
            </div>
            <span className="font-display font-semibold text-lg text-brand-700">SokoCredit</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-slate-900 mb-1">Sign in to your account</h1>
          <p className="text-sm text-slate-500 mb-8">Welcome back. Please enter your credentials to access the agent portal.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-3 py-2.5">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="identifier" className="block text-xs font-medium text-slate-500 mb-1.5">Agent ID or Email</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. AGT-8492"
                  required
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              <a href="#" className="text-brand-600 font-medium hover:underline">Forgot password?</a>
            </div>
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

          <p className="text-center text-sm text-slate-500 mt-6">
            Need help? <a href="#" className="text-brand-600 font-medium hover:underline">Contact Support</a>
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            No account? <Link to="/signup" className="text-brand-600 font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
