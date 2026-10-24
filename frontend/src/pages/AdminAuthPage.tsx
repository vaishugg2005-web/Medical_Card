import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiCall('/admin/stats')
        .then(() => { navigate('/admin_dashboard/admin', { replace: true }); })
        .catch(() => {});
    }
  }, [navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/auth/login', 'POST', { email, password });
      setAuthToken(data.access_token);
      navigate('/admin_dashboard/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] flex flex-col font-sans">
      <header className="bg-[#102A43] text-white px-6 lg:px-16 py-4 shadow-md flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-extrabold text-white text-base tracking-tight">
          MEDORA <span className="text-[#14B8A6]">ADMIN PORTAL</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] text-[#0D9488] flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#102A43] tracking-tight">Administrator Sign In</h1>
            <p className="text-xs text-slate-500">
              Access doctor verification, audit logs, and system management.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@yourdomain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium text-[#102A43]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium text-[#102A43]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Admin Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Need an admin account?{' '}
            <Link to="/admin_dashboard/register" className="text-[#0D9488] font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Medora Healthcare Platform
      </footer>
    </div>
  );
}
