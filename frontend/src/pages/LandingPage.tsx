import { Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  Stethoscope,
  User,
  QrCode,
  ArrowRight,
  Lock,
  HeartPulse,
  CheckCircle2,
  FileText,
  Bell,
  Eye,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Fingerprint,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] flex flex-col font-sans">

      {/* ── Navigation ── */}
      <header className="bg-[#102A43] text-white px-6 lg:px-20 py-4 shadow-md sticky top-0 z-40 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D9488] flex items-center justify-center shadow">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              MEDORA <span className="text-[#14B8A6]">SYSTEM</span>
            </span>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium leading-none mt-0.5">
              Emergency Medical Access Platform
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/patient_dashboard" className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition">
            <User className="w-4 h-4" /> Patient
          </Link>
          <Link to="/doctor_dashboard" className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition">
            <Stethoscope className="w-4 h-4" /> Doctor
          </Link>
          <Link to="/admin_dashboard" className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition">
            <Shield className="w-4 h-4" /> Admin
          </Link>
          <Link to="/patient_dashboard" className="ml-2 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-sm font-bold transition shadow">
            Get Started
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#102A43] via-[#1a3a56] to-[#0D9488]/80 text-white px-6 lg:px-20 py-24 lg:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-[#14B8A6] border border-[#14B8A6]/40 text-xs font-bold tracking-wide backdrop-blur-sm">
            <HeartPulse className="w-4 h-4" />
            Consent-Controlled Emergency Medical Access
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
            Your Medical History.{' '}
            <span className="text-[#14B8A6]">Securely Accessible</span>
            <br />When It Matters.
          </h1>

          <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Medora gives patients full control over their medical records while enabling
            verified clinicians to request access through a secure QR gateway —
            with every action audited and patient consent enforced.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/patient_dashboard"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-base transition shadow-lg"
            >
              Patient Portal <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/doctor_dashboard"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base transition border border-white/20"
            >
              Doctor Portal <Stethoscope className="w-5 h-5" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 pt-4 text-sm text-slate-300">
            {[
              { icon: Lock, text: 'Patient-Controlled Consent' },
              { icon: QrCode, text: 'Secure QR Gateway' },
              { icon: Eye, text: 'Complete Audit Trail' },
              { icon: ShieldCheck, text: 'Role-Based Access' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 px-4 py-2 bg-white/8 rounded-full border border-white/15">
                <Icon className="w-4 h-4 text-[#14B8A6]" />
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 lg:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#0D9488]">How It Works</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#102A43]">Three simple steps</h2>
            <p className="mt-3 text-slate-500 text-base max-w-xl mx-auto">
              From profile creation to authorised clinical review — all within a consent-first framework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: ClipboardList,
                title: 'Patient Creates Profile',
                desc: 'Register and build your secure medical profile — allergies, medications, conditions, surgeries, and an emergency QR card that identifies you without exposing clinical data.',
                color: 'bg-[#E8F5F2] text-[#0D9488]',
              },
              {
                step: '02',
                icon: QrCode,
                title: 'Doctor Requests Access',
                desc: 'A verified physician scans your QR token or searches the directory and submits a formal consent request with a documented clinical justification.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                step: '03',
                icon: UserCheck,
                title: 'Patient Controls Access',
                desc: 'You approve or reject each request from your dashboard. Approved access is time-limited and can be revoked instantly. Every decision is logged permanently.',
                color: 'bg-violet-50 text-violet-600',
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative flex flex-col gap-5 p-7 rounded-2xl bg-[#F4F7FA] border border-slate-200 hover:border-[#0D9488]/40 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-black text-slate-100 select-none leading-none">{step}</span>
                </div>
                <div>
                  <h3 className="font-black text-[#102A43] text-lg">{title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portal Cards ── */}
      <section className="py-20 px-6 lg:px-20 bg-[#F4F7FA]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#0D9488]">Access Your Portal</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#102A43]">Who are you?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patient */}
            <Link
              to="/patient_dashboard"
              className="group flex flex-col items-start gap-5 p-7 bg-white border border-slate-200 rounded-2xl hover:border-[#0D9488]/60 hover:shadow-lg transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] flex items-center justify-center group-hover:scale-105 transition">
                <User className="w-7 h-7 text-[#0D9488]" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[#102A43] text-xl">Patient Portal</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Manage your health profile, QR medical card, and consent grants. You decide who can see your records.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[#0D9488] text-sm font-bold">
                Sign In / Register <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Doctor */}
            <Link
              to="/doctor_dashboard"
              className="group flex flex-col items-start gap-5 p-7 bg-white border border-slate-200 rounded-2xl hover:border-[#0D9488]/60 hover:shadow-lg transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] flex items-center justify-center group-hover:scale-105 transition">
                <Stethoscope className="w-7 h-7 text-[#0D9488]" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[#102A43] text-xl">Doctor Portal</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Scan patient QR codes, submit consent requests, view authorized records, and initiate emergency break-glass access when clinically required.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[#0D9488] text-sm font-bold">
                Sign In / Register <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Admin */}
            <Link
              to="/admin_dashboard"
              className="group flex flex-col items-start gap-5 p-7 bg-white border border-slate-200 rounded-2xl hover:border-[#0D9488]/60 hover:shadow-lg transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5F2] flex items-center justify-center group-hover:scale-105 transition">
                <Shield className="w-7 h-7 text-[#0D9488]" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-[#102A43] text-xl">Admin Portal</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Verify physician credentials, manage platform users, and review system-wide audit logs.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[#0D9488] text-sm font-bold">
                Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-20 px-6 lg:px-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#0D9488]">Why Medora</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#102A43]">Built around patient rights</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: 'Patient-Controlled Consent',
                desc: 'You approve every access request individually. Access can be revoked at any moment from your dashboard.',
              },
              {
                icon: QrCode,
                title: 'Secure QR Gateway',
                desc: 'Your QR card contains only a secure opaque token. Scanning it never exposes clinical records — it simply identifies you.',
              },
              {
                icon: Bell,
                title: 'Emergency Readiness',
                desc: 'Verified physicians can initiate break-glass access in genuine emergencies, with mandatory justification and instant notification to the patient.',
              },
              {
                icon: FileText,
                title: 'Auditable Access History',
                desc: 'Every login, consent decision, record view, and emergency override is logged immutably and visible to the patient.',
              },
              {
                icon: Fingerprint,
                title: 'Zero-Trust Architecture',
                desc: 'Role-based permissions are enforced server-side. Frontend visibility alone never grants clinical data access.',
              },
              {
                icon: CheckCircle2,
                title: 'Verified Physicians Only',
                desc: 'Doctors must submit credentials and receive administrator approval before requesting patient access or initiating break-glass.',
              },
              {
                icon: ShieldCheck,
                title: 'Time-Limited Consent',
                desc: 'Approved access grants automatically expire after 30 days. Patients can revoke immediately at any time.',
              },
              {
                icon: Activity,
                title: 'Always Available',
                desc: 'Critical triage information is available to authorized responders even when the patient is unable to communicate.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3 p-6 rounded-2xl bg-[#F4F7FA] border border-slate-200 hover:border-[#0D9488]/40 hover:bg-[#E8F5F2]/30 transition">
                <div className="w-10 h-10 rounded-xl bg-[#E8F5F2] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#0D9488]" />
                </div>
                <h4 className="font-black text-[#102A43] text-sm">{title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 px-6 lg:px-20 bg-gradient-to-r from-[#102A43] to-[#0D9488]">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Ready to secure your medical history?
          </h2>
          <p className="text-slate-300 text-base">
            Create your patient profile in minutes and generate your personal emergency Medical QR Card.
          </p>
          <Link
            to="/patient_dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-[#102A43] font-black text-base hover:bg-[#E8F5F2] transition shadow-lg"
          >
            Create Patient Account <ArrowRight className="w-5 h-5 text-[#0D9488]" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#102A43] text-slate-400 px-6 lg:px-20 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm">MEDORA SYSTEM</span>
              <p className="text-[11px] text-slate-500">Emergency Medical Access Platform</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-xs font-semibold">
            <Link to="/patient_dashboard" className="hover:text-white transition">Patient Portal</Link>
            <Link to="/doctor_dashboard" className="hover:text-white transition">Doctor Portal</Link>
            <Link to="/admin_dashboard" className="hover:text-white transition">Admin Portal</Link>
          </nav>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Medora Healthcare Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
