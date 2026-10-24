import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus } from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';

const INP = "w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium text-[#102A43] transition";
const ERR = "text-[10px] text-rose-600 font-semibold mt-1";

function validatePassword(pw: string) {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) errors.push('One uppercase letter');
  if (!/\d/.test(pw)) errors.push('One number');
  return errors;
}

export default function AdminRegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('HOSPITAL_ADMIN');
  const [inviteSecret, setInviteSecret] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      apiCall('/admin/stats').then(() => navigate('/admin_dashboard/admin', { replace: true })).catch(() => {});
    }
  }, [navigate]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email required.';
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) errs.phone = 'Phone must be exactly 10 digits.';
    const pwErrs = validatePassword(password);
    if (pwErrs.length > 0) errs.password = pwErrs.join(', ') + '.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!inviteSecret.trim()) errs.inviteSecret = 'Administrator invite secret is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await apiCall('/auth/register/admin', 'POST', {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, '') || undefined,
        password,
        role,
        invite_secret: inviteSecret.trim()
      });
      setAuthToken(data.access_token);
      setSuccess(true);
      setTimeout(() => navigate('/admin_dashboard/admin'), 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check your invite secret and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#102A43]">Admin Account Created</h2>
          <p className="text-xs text-slate-500">Redirecting to Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] flex flex-col font-sans">
      <header className="bg-[#102A43] text-white px-6 lg:px-16 py-4 shadow-md flex items-center justify-between">
        <Link to="/admin_dashboard" className="flex items-center gap-2 text-slate-300 hover:text-white transition text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
        <span className="font-extrabold text-white text-base tracking-tight">
          MEDORA <span className="text-[#14B8A6]">ADMIN PORTAL</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] text-[#0D9488] flex items-center justify-center mx-auto">
              <UserPlus className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#102A43] tracking-tight">Administrator Registration</h1>
            <p className="text-xs text-slate-500">Requires a valid administrator invite secret from the system owner.</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Full Name *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dr. Jane Smith" className={INP} />
              {fieldErrors.fullName && <p className={ERR}>{fieldErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hospital.org" className={INP} />
              {fieldErrors.email && <p className={ERR}>{fieldErrors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Phone Number <span className="text-slate-400 font-normal">(10 digits, optional)</span></label>
              <input
                type="tel" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210" maxLength={10} className={INP}
              />
              {fieldErrors.phone && <p className={ERR}>{fieldErrors.phone}</p>}
              {phone && phone.length !== 10 && <p className={ERR}>{phone.length}/10 digits</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Administrator Role *</label>
              <select value={role} onChange={e => setRole(e.target.value)} className={INP}>
                <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                <option value="SYSTEM_ADMIN">System Administrator</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Hospital Admin manages doctors and records. System Admin has full platform access.</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number" className={INP + ' pr-10'}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-2.5 text-slate-400 hover:text-[#0D9488]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className={ERR}>{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showCpw ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" className={INP + ' pr-10'}
                />
                <button type="button" onClick={() => setShowCpw(p => !p)} className="absolute right-3 top-2.5 text-slate-400 hover:text-[#0D9488]">
                  {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className={ERR}>{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Invite Secret */}
            <div>
              <label className="block text-xs font-bold text-[#102A43] mb-1.5">Administrator Invite Secret *</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'} value={inviteSecret}
                  onChange={e => setInviteSecret(e.target.value)}
                  placeholder="Provided by system owner" className={INP + ' pr-10 font-mono'}
                />
                <button type="button" onClick={() => setShowSecret(p => !p)} className="absolute right-3 top-2.5 text-slate-400 hover:text-[#0D9488]">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.inviteSecret && <p className={ERR}>{fieldErrors.inviteSecret}</p>}
              <p className="text-[10px] text-slate-400 mt-1">Contact your system administrator for the invite secret. This prevents unauthorized admin creation.</p>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Creating Account...' : 'Create Administrator Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/admin_dashboard" className="text-[#0D9488] font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Medora Healthcare Platform
      </footer>
    </div>
  );
}
