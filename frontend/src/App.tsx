import React, { useState, useEffect } from 'react';

export default function App() {
  const [role, setRole] = useState<'landing' | 'patient' | 'doctor' | 'admin' | 'public'>('landing');
  const [token, setToken] = useState<string | null>(localStorage.getItem('emq_token'));
  const [patientData, setPatientData] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [triageData, setTriageData] = useState<any>(null);
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [scannedPatient, setScannedPatient] = useState<any>(null);
  const [scanInput, setScanInput] = useState('demo-emergency-token-9812');
  const [justification, setJustification] = useState('');
  const [reasonCategory, setReasonCategory] = useState('Unconscious Trauma');
  const [certify, setCertify] = useState(true);

  const apiCall = async (endpoint: string, method = 'GET', body: any = null) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/v1${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed' }));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  };

  const handleDemoLogin = async (userRole: 'patient' | 'doctor' | 'admin') => {
    const creds = {
      patient: { email: 'patient@example.com', password: 'PatientDemo123!' },
      doctor: { email: 'doctor@example.com', password: 'DoctorDemo123!' },
      admin: { email: 'admin@example.com', password: 'AdminSecure123!' }
    }[userRole];

    try {
      const data = await apiCall('/auth/login', 'POST', creds);
      setToken(data.access_token);
      localStorage.setItem('emq_token', data.access_token);
      if (userRole === 'patient') {
        const p = await apiCall('/patients/me');
        setPatientData(p);
        setRole('patient');
      } else if (userRole === 'doctor') {
        const d = await apiCall('/doctors/me');
        setDoctorData(d);
        setRole('doctor');
      } else if (userRole === 'admin') {
        const s = await apiCall('/admin/stats');
        setAdminStats(s);
        setRole('admin');
      }
    } catch (e: any) {
      alert('Login error: ' + e.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('emq_token');
    setRole('landing');
  };

  const handleDoctorScan = async () => {
    try {
      const res = await apiCall(`/qr/doctor-scan/${scanInput}`, 'POST');
      setScannedPatient(res);
      setTriageData(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBreakGlassSubmit = async () => {
    if (!justification.trim()) {
      alert('Clinical emergency justification is mandatory.');
      return;
    }
    try {
      const triage = await apiCall('/access/emergency', 'POST', {
        qr_token: scannedPatient.token,
        hospital_name: 'Memorial Trauma Center',
        reason_category: reasonCategory,
        free_text_justification: justification,
        patient_consent_incapacitated: certify
      });
      setTriageData(triage);
      setBreakGlassOpen(false);
    } catch (e: any) {
      alert('Break-Glass Failed: ' + e.message);
    }
  };

  const openCard = async () => {
    try {
      const card = await apiCall('/qr/card');
      setCardData(card);
      setCardModalOpen(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRole('landing')}>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-lg">
            🏥
          </div>
          <div>
            <h1 className="font-bold text-white text-base">EMQ-HS Healthcare System</h1>
            <p className="text-[11px] text-slate-400">Zero-Trust AI Emergency Medical Access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800 text-xs font-semibold">
              Logout
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleDemoLogin('patient')} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold">Patient</button>
              <button onClick={() => handleDemoLogin('doctor')} className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">Doctor</button>
              <button onClick={() => handleDemoLogin('admin')} className="px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-400 border border-purple-500/30 text-xs font-semibold">Admin</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Landing */}
        {role === 'landing' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-6 max-w-4xl mx-auto shadow-2xl">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
              B.Tech Capstone Prototype &bull; Zero-Trust Medical QR
            </span>
            <h2 className="text-4xl font-black text-white">
              Fast Access to Critical Medical History <br />
              <span className="text-cyan-400">Without Unrestricted Complete Records Exposure</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Scanned QR codes contain an opaque secure token. Access is strictly compartmentalized: Level 1 Public, Level 2 Consented Doctor, and Level 3 Break-Glass Emergency Triage.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">👤</div>
                  <h3 className="font-bold text-white text-sm">Patient Portal</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">View profile, manage allergies and emergency contacts, download QR medical card.</p>
                </div>
                <button onClick={() => handleDemoLogin('patient')} className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white">
                  Demo Patient Login &rarr;
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">🩺</div>
                  <h3 className="font-bold text-white text-sm">Doctor Triage</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Scan QR, verify identity, and trigger audited Break-Glass emergency triage access.</p>
                </div>
                <button onClick={() => handleDemoLogin('doctor')} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white">
                  Demo Doctor Login &rarr;
                </button>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-2">🔐</div>
                  <h3 className="font-bold text-white text-sm">System Admin</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Approve physician licenses and inspect the tamper-evident compliance audit trail.</p>
                </div>
                <button onClick={() => handleDemoLogin('admin')} className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white">
                  Demo Admin Login &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patient View */}
        {role === 'patient' && patientData && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-cyan-400">PATIENT PROFILE</span>
                <h2 className="text-2xl font-bold text-white">{patientData.full_name}</h2>
                <p className="text-xs text-slate-400">ID: {patientData.unique_patient_id} &bull; Blood Group: <strong className="text-rose-400">{patientData.blood_group}</strong></p>
              </div>
              <button onClick={openCard} className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white">
                🪪 View QR Medical Card
              </button>
            </div>
          </div>
        )}

        {/* Doctor View */}
        {role === 'doctor' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-400">ATTENDING PHYSICIAN</span>
                <h2 className="text-2xl font-bold text-white">{doctorData?.full_name || 'Dr. Demo Doctor'}</h2>
                <p className="text-xs text-slate-400">Status: <strong className="text-emerald-400">VERIFIED</strong></p>
              </div>
            </div>

            {/* Scanner Lookup */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm">Emergency QR Patient Scan</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-cyan-300 font-mono"
                  placeholder="Enter token..."
                />
                <button onClick={handleDoctorScan} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white">
                  Scan / Lookup
                </button>
              </div>
            </div>

            {/* Scanned Card */}
            {scannedPatient && !triageData && (
              <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-bold text-white">{scannedPatient.patient_name}</h4>
                    <p className="text-xs text-slate-400">{scannedPatient.unique_patient_id}</p>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                    Protected Record
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button onClick={() => alert('Consent request sent to patient.')} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left">
                    <div className="font-bold text-sm text-white">Level 2: Normal Care Access</div>
                    <p className="text-xs text-slate-400">Requests patient consent for outpatient clinical review.</p>
                  </button>
                  <button onClick={() => setBreakGlassOpen(true)} className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-left">
                    <div className="font-bold text-sm text-rose-300">Level 3: Break-Glass Emergency</div>
                    <p className="text-xs text-rose-200/70">Unconscious patient. Unlocks life-saving triage dataset instantly.</p>
                  </button>
                </div>
              </div>
            )}

            {/* Triage Display */}
            {triageData && (
              <div className="bg-gradient-to-r from-rose-950 to-slate-900 border-2 border-rose-500 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-rose-400 uppercase">BREAK-GLASS EMERGENCY TRIAGE ACTIVE</span>
                    <h3 className="text-3xl font-black text-white">{triageData.full_name}</h3>
                    <p className="text-xs text-slate-300">Blood Group: <strong className="text-rose-400 text-lg">{triageData.blood_group}</strong></p>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-cyan-400 text-xs">🤖 AI CLINICAL EMERGENCY SYNTHESIS (GROUNDED)</h4>
                  <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap">{triageData.ai_summary}</pre>
                </div>

                {/* Allergies & Meds */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h5 className="font-bold text-rose-400 text-xs mb-2">Severe Allergies</h5>
                    {triageData.severe_allergies.map((a: any) => (
                      <div key={a.id} className="text-xs text-slate-200">&bull; {a.allergen} ({a.reaction})</div>
                    ))}
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h5 className="font-bold text-sky-400 text-xs mb-2">Critical Medications</h5>
                    {triageData.critical_medications.map((m: any) => (
                      <div key={m.id} className="text-xs text-slate-200">&bull; {m.medicine_name} ({m.dosage})</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin View */}
        {role === 'admin' && adminStats && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Admin Oversight Dashboard</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                <div className="text-2xl font-black text-cyan-400">{adminStats.total_patients}</div>
                <div className="text-xs text-slate-400">Patients</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                <div className="text-2xl font-black text-emerald-400">{adminStats.verified_doctors}</div>
                <div className="text-xs text-slate-400">Verified Doctors</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                <div className="text-2xl font-black text-rose-400">{adminStats.emergency_access_events_count}</div>
                <div className="text-xs text-slate-400">Emergency Accesses</div>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl text-center border border-slate-800">
                <div className="text-2xl font-black text-purple-400">{adminStats.total_audit_events}</div>
                <div className="text-xs text-slate-400">Audit Logs</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Break-Glass Modal */}
      {breakGlassOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-rose-400">🚨 Confirm Break-Glass Emergency Access</h3>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Mandatory clinical justification (e.g., Unconscious trauma victim)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBreakGlassOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">Cancel</button>
              <button onClick={handleBreakGlassSubmit} className="px-5 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white">Unlock Triage</button>
            </div>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {cardModalOpen && cardData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center">
            <h3 className="font-bold text-white text-base">Medical QR Card</h3>
            <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/40 text-left space-y-2">
              <div className="text-sm font-bold text-white">{cardData.patient_name}</div>
              <div className="text-xs font-mono text-cyan-400">{cardData.unique_patient_id}</div>
              <div className="text-xs text-rose-400">Blood: {cardData.blood_group_masked}</div>
              <img src={cardData.qr_image_base64} alt="QR" className="w-32 h-32 mx-auto my-2 rounded-lg bg-white p-2" />
            </div>
            <button onClick={() => setCardModalOpen(false)} className="px-4 py-2 rounded-xl bg-cyan-600 text-xs font-bold text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
