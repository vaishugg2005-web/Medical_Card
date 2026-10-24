import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ArrowLeft, ArrowRight, AlertCircle, HeartPulse, UserPlus } from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';

export default function PatientAuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPhoneError, setRegPhoneError] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('Female');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regEmergencyName, setRegEmergencyName] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regEmergencyPhoneError, setRegEmergencyPhoneError] = useState('');
  const [regEmergencyRel, setRegEmergencyRel] = useState('Spouse');
  const [regOrganDonor, setRegOrganDonor] = useState(false);
  const [regDnr, setRegDnr] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiCall('/patients/me')
        .then((p) => {
          const userName = p?.full_name ? p.full_name.toLowerCase().replace(/\s+/g, '_') : 'patient';
          navigate(`/patient_dashboard/${userName}`, { replace: true });
        })
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
      const patientData = await apiCall('/patients/me');
      const userName = patientData?.full_name
        ? patientData.full_name.toLowerCase().replace(/\s+/g, '_')
        : 'patient';
      navigate(`/patient_dashboard/${userName}`);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regPassword !== regConfirmPassword) { setError('Passwords do not match.'); return; }
    if (regPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!acceptTerms) { setError('You must accept the terms to continue.'); return; }
    if (regPhone && !/^\d{10}$/.test(regPhone.replace(/\D/g, ''))) { setError('Phone must be exactly 10 digits.'); return; }
    if (!/^\d{10}$/.test(regEmergencyPhone.replace(/\D/g, ''))) { setError('Emergency contact phone must be exactly 10 digits.'); return; }

    setLoading(true);
    try {
      const payload = {
        email: regEmail.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        phone: regPhone.replace(/\D/g, '') || undefined,
        address: regAddress.trim() || undefined,
        blood_group: regBloodGroup,
        date_of_birth: regDob || undefined,
        gender: regGender,
        emergency_contact_name: regEmergencyName.trim(),
        emergency_contact_phone: regEmergencyPhone.replace(/\D/g, ''),
        emergency_contact_relationship: regEmergencyRel,
        organ_donor: regOrganDonor,
        dnr_status: regDnr
      };
      const res = await apiCall('/auth/register/patient', 'POST', payload);
      setAuthToken(res.access_token);
      const userName = regFullName.trim().toLowerCase().replace(/\s+/g, '_');
      navigate(`/patient_dashboard/${userName}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check required fields.');
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
          MEDORA <span className="text-[#14B8A6]">PATIENT PORTAL</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-10">
        <div className={`w-full ${authMode === 'register' ? 'max-w-2xl' : 'max-w-md'} bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6`}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] text-[#0D9488] flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#102A43] tracking-tight">
              {authMode === 'login' ? 'Patient Sign In' : 'Create Patient Account'}
            </h1>
            <p className="text-xs text-slate-500">
              {authMode === 'login'
                ? 'Access your medical records, consents, and emergency QR card.'
                : 'Register to manage your emergency health profile.'}
            </p>
          </div>

          {/* Mode Switch */}
          <div className="flex bg-[#F4F7FA] p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg transition ${authMode === 'login' ? 'bg-white text-[#102A43] shadow-sm' : 'text-slate-500 hover:text-[#102A43]'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${authMode === 'register' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-[#102A43]'}`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Register
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#102A43] mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="your@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium text-[#102A43]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102A43] mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium text-[#102A43]" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Full Name *</label>
                  <input type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} required
                    placeholder="Your full legal name"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
                </div>
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Email Address *</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required
                    placeholder="your@email.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Password *</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required
                    placeholder="Min 8 characters"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
                </div>
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Confirm Password *</label>
                  <input type="password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} required
                    placeholder="Repeat password"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Phone (10 digits)</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setRegPhone(d);
                      setRegPhoneError(d.length > 0 && d.length !== 10 ? 'Must be exactly 10 digits' : '');
                    }}
                    placeholder="10-digit number"
                    maxLength={10}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium ${
                      regPhoneError ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-[#F4F7FA]'
                    }`} />
                  {regPhoneError && <p className="text-[10px] text-rose-600 mt-1">{regPhoneError}</p>}
                </div>
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Gender</label>
                  <select value={regGender} onChange={(e) => setRegGender(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Date of Birth</label>
                  <input type="date" value={regDob} onChange={(e) => setRegDob(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
                </div>
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Blood Group *</label>
                  <select value={regBloodGroup} onChange={(e) => setRegBloodGroup(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-bold text-rose-700">
                    {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#102A43] mb-1">Address</label>
                <input type="text" value={regAddress} onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium" />
              </div>

              <div className="p-4 bg-[#E8F5F2] rounded-xl border border-teal-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-[#0D9488] text-xs">
                  <HeartPulse className="w-4 h-4" /> Primary Emergency Contact
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">Name *</label>
                    <input type="text" value={regEmergencyName} onChange={(e) => setRegEmergencyName(e.target.value)} required
                      placeholder="Contact name"
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">Relationship *</label>
                    <select value={regEmergencyRel} onChange={(e) => setRegEmergencyRel(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs font-medium">
                      {['Spouse','Parent','Sibling','Child','Guardian','Friend'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 text-[11px] mb-1">Phone * (10 digits)</label>
                    <input
                      type="tel" required
                      value={regEmergencyPhone}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setRegEmergencyPhone(d);
                        setRegEmergencyPhoneError(d.length > 0 && d.length !== 10 ? 'Must be 10 digits' : '');
                      }}
                      placeholder="10-digit number"
                      maxLength={10}
                      className={`w-full p-2 rounded-lg border text-xs font-medium ${
                        regEmergencyPhoneError ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                      }`} />
                    {regEmergencyPhoneError && <p className="text-[10px] text-rose-600 mt-1">{regEmergencyPhoneError}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input type="checkbox" checked={regOrganDonor} onChange={(e) => setRegOrganDonor(e.target.checked)}
                    className="w-4 h-4 text-[#0D9488] rounded" />
                  Registered Organ Donor
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input type="checkbox" checked={regDnr} onChange={(e) => setRegDnr(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded" />
                  DNR (Do Not Resuscitate) Order
                </label>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required
                  className="w-4 h-4 text-[#0D9488] mt-0.5 rounded" />
                <span>
                  I accept Medora's <strong>Healthcare Privacy Directives</strong> and confirm my emergency contact information is accurate.
                </span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                {loading ? 'Creating account...' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; 2026 Medora Healthcare Platform
      </footer>
    </div>
  );
}
