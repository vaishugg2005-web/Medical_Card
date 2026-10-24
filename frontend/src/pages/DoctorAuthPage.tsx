import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Award, FileCheck2, UserCheck } from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';

export default function DoctorAuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPhoneError, setRegPhoneError] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regAuthority, setRegAuthority] = useState('');
  const [regState, setRegState] = useState('');
  const [regQualification, setRegQualification] = useState('MBBS');
  const [regSpecialization, setRegSpecialization] = useState('General Medicine');
  const [regOccupation, setRegOccupation] = useState('General Physician');
  const [regOccupationOther, setRegOccupationOther] = useState('');
  const [regHospital, setRegHospital] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regExperience, setRegExperience] = useState(0);
  const [regTermsAccepted, setRegTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredAppRef, setRegisteredAppRef] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiCall('/doctors/me')
        .then((d) => {
          const docName = d?.full_name ? d.full_name.toLowerCase().replace(/\s+/g, '_') : 'doctor';
          navigate(`/Doctor_dashboard/${docName}`, { replace: true });
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
      const docData = await apiCall('/doctors/me');
      const docName = docData?.full_name ? docData.full_name.toLowerCase().replace(/\s+/g, '_') : 'doctor';
      navigate(`/Doctor_dashboard/${docName}`);
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
    if (regPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!regTermsAccepted) { setError('You must accept the verification terms to continue.'); return; }
    if (!/^\d{10}$/.test(regPhone.replace(/\D/g, ''))) { setError('Phone must be exactly 10 digits.'); return; }
    const finalOccupation = regOccupation === 'Other' ? regOccupationOther.trim() : regOccupation;

    setLoading(true);
    try {
      const payload = {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        full_name: regFullName.trim(),
        phone: regPhone.replace(/\D/g, ''),
        medical_license_number: regLicense.trim().toUpperCase(),
        registration_authority: regAuthority.trim(),
        state_jurisdiction: regState.trim(),
        medical_qualification: regQualification.trim(),
        specialization: finalOccupation || regSpecialization.trim(),
        hospital_name: regHospital.trim(),
        professional_address: regAddress.trim(),
        years_of_experience: Number(regExperience) || 0
      };
      const res = await apiCall('/auth/register/doctor', 'POST', payload);
      setRegisteredAppRef(res.application_reference || 'SUBMITTED');

      const loginData = await apiCall('/auth/login', 'POST', { email: regEmail.trim().toLowerCase(), password: regPassword });
      setAuthToken(loginData.access_token);
      const docData = await apiCall('/doctors/me');
      const docName = docData?.full_name ? docData.full_name.toLowerCase().replace(/\s+/g, '_') : 'doctor';
      setTimeout(() => { navigate(`/Doctor_dashboard/${docName}`); }, 2500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. License number or email may already exist.');
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
          MEDORA <span className="text-[#14B8A6]">DOCTOR PORTAL</span>
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-10">
        <div className={`w-full ${authMode === 'register' ? 'max-w-2xl' : 'max-w-md'} bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6`}>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] text-[#0D9488] flex items-center justify-center mx-auto">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#102A43] tracking-tight">
              {authMode === 'login' ? 'Doctor Sign In' : 'Doctor Registration'}
            </h1>
            <p className="text-xs text-slate-500">
              {authMode === 'login'
                ? 'Access the clinical desk, patient scanner, and emergency override.'
                : 'Submit your credentials for administrative verification.'}
            </p>
          </div>

          <div className="flex rounded-xl bg-[#F4F7FA] p-1 border border-slate-200">
            <button type="button" onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authMode === 'login' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-500 hover:text-[#102A43]'}`}>
              Sign In
            </button>
            <button type="button" onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${authMode === 'register' ? 'bg-[#0D9488] text-white shadow-sm' : 'text-slate-500 hover:text-[#102A43]'}`}>
              Register (Application)
            </button>
          </div>

          {registeredAppRef && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                Verification Application Submitted
              </div>
              <p className="text-xs text-teal-700">
                Reference: <strong className="font-mono">{registeredAppRef}</strong> — Status: <strong>PENDING</strong>
              </p>
              <p className="text-[11px] text-teal-600">Redirecting to your portal...</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#102A43] mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="your@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102A43] mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FA] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-xs font-medium" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                {loading ? 'Signing in...' : 'Sign In to Doctor Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="p-3 bg-[#E8F5F2] rounded-xl text-xs text-[#0D9488] font-medium flex items-start gap-2">
                <FileCheck2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Your account will be <strong>PENDING</strong> until an administrator verifies your credentials. You cannot access patient records until verified.
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#102A43] flex items-center gap-1.5 border-b pb-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" /> Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Full Name *', value: regFullName, onChange: setRegFullName, placeholder: 'Dr. Full Name', type: 'text', required: true },
                    { label: 'Email *', value: regEmail, onChange: setRegEmail, placeholder: 'your@email.com', type: 'email', required: true },
                    { label: 'Years of Experience', value: String(regExperience), onChange: (v: string) => setRegExperience(Number(v)), placeholder: '5', type: 'number', required: false },
                    { label: 'Password *', value: regPassword, onChange: setRegPassword, placeholder: '••••••••', type: 'password', required: true },
                    { label: 'Confirm Password *', value: regConfirmPassword, onChange: setRegConfirmPassword, placeholder: '••••••••', type: 'password', required: true },
                  ].map(({ label, value, onChange, placeholder, type, required }) => (
                    <div key={label}>
                      <label className="block text-[11px] font-bold text-[#102A43] mb-1">{label}</label>
                      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                        required={required} placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                    </div>
                  ))}
                  {/* Phone with 10-digit validation */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Phone * (10 digits)</label>
                    <input
                      type="tel" required
                      value={regPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setRegPhone(digits);
                        setRegPhoneError(digits.length > 0 && digits.length !== 10 ? 'Must be exactly 10 digits' : '');
                      }}
                      placeholder="10-digit number"
                      maxLength={10}
                      className={`w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none ${
                        regPhoneError ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                      }`} />
                    {regPhoneError && <p className="text-[10px] text-rose-600 mt-1">{regPhoneError}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#102A43] flex items-center gap-1.5 border-b pb-1.5">
                  <Award className="w-3.5 h-3.5 text-[#0D9488]" /> Professional Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Medical License Number *</label>
                    <input type="text" required value={regLicense} onChange={(e) => setRegLicense(e.target.value)}
                      placeholder="MCI-XXXX-XXXXX" className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Registration Authority *</label>
                    <input type="text" required value={regAuthority} onChange={(e) => setRegAuthority(e.target.value)}
                      placeholder="NMC / State Medical Council" className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">State / Jurisdiction *</label>
                    <input type="text" required value={regState} onChange={(e) => setRegState(e.target.value)}
                      placeholder="e.g. Delhi" className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Qualification *</label>
                    <input type="text" required value={regQualification} onChange={(e) => setRegQualification(e.target.value)}
                      placeholder="MBBS, MD, MS..." className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Occupation / Role *</label>
                    <select
                      value={regOccupation}
                      onChange={(e) => { setRegOccupation(e.target.value); setRegOccupationOther(''); }}
                      className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                    >
                      {[
                        'General Physician', 'Emergency Medicine Physician', 'Cardiologist',
                        'Neurologist', 'Surgeon', 'Pediatrician', 'Orthopedic Surgeon',
                        'Pulmonologist', 'Radiologist', 'Anesthesiologist', 'Psychiatrist',
                        'Gynecologist', 'Oncologist', 'Dermatologist', 'Other'
                      ].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {regOccupation === 'Other' && (
                      <input
                        type="text" required
                        value={regOccupationOther}
                        onChange={(e) => setRegOccupationOther(e.target.value)}
                        placeholder="Please specify your role"
                        className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Specialization *</label>
                    <select value={regSpecialization} onChange={(e) => setRegSpecialization(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none">
                      {['General Medicine','Cardiology','Emergency Medicine','Critical Care / ICU','Pediatrics','Neurology','Orthopedic Surgery','Pulmonology'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Hospital / Clinic *</label>
                    <input type="text" required value={regHospital} onChange={(e) => setRegHospital(e.target.value)}
                      placeholder="Hospital or clinic name" className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#102A43] mb-1">Professional Address *</label>
                    <input type="text" required value={regAddress} onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Suite/Room, Hospital, City, State" className="w-full px-3 py-2 rounded-xl bg-[#F4F7FA] border border-slate-300 text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none" />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={regTermsAccepted} onChange={(e) => setRegTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-[#0D9488] focus:ring-[#0D9488]" />
                <span className="text-[11px] text-slate-600">
                  I declare that the medical credentials provided above are genuine and currently valid. I understand these will be verified by administrators before my account is approved.
                </span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                {loading ? 'Submitting...' : 'Submit Verification Application'}
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
