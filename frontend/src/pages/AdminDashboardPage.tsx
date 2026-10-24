import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Activity,
  User,
  Stethoscope,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Terminal,
  ShieldAlert,
  Check,
  X,
  Search,
  Ban,
  RotateCcw,
  HelpCircle,
  Eye
} from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';
import { AdminTab } from '../types';

export default function AdminDashboardPage() {
  const { admin_name } = useParams<{ admin_name: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('verifications');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminPatients, setAdminPatients] = useState<any[]>([]);
  const [adminAudits, setAdminAudits] = useState<any[]>([]);
  const [adminEmergencyEvents, setAdminEmergencyEvents] = useState<any[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Doctor Verification Queue State
  const [appQueueItems, setAppQueueItems] = useState<any[]>([]);
  const [appQueueCounts, setAppQueueCounts] = useState<any>({
    pending: 0,
    under_review: 0,
    verified: 0,
    rejected: 0,
    suspended: 0,
    info_requested: 0,
    total: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [specFilter, setSpecFilter] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Review Modal State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [infoRequestedText, setInfoRequestedText] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('Administrative Cross-Verification with State Medical Council');
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [selectedAppDossier, setSelectedAppDossier] = useState<any | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<'approve' | 'reject' | 'info' | 'suspend' | 'history'>('approve');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadVerificationQueue = async () => {
    setLoadingQueue(true);
    try {
      const q = await apiCall(`/admin/doctor-applications?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}&specialization=${encodeURIComponent(specFilter)}`);
      setAppQueueItems(q.items || []);
      setAppQueueCounts(q.counts || {});
    } catch (err: any) {
      console.error('Failed to load application queue', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const loadData = async () => {
    try {
      const [stats, pats, audits, events] = await Promise.all([
        apiCall('/admin/stats').catch(() => null),
        apiCall('/admin/patients').catch(() => []),
        apiCall('/admin/audit-logs').catch(() => []),
        apiCall('/admin/emergency-events').catch(() => [])
      ]);
      setAdminStats(stats);
      setAdminPatients(pats);
      setAdminAudits(audits);
      setAdminEmergencyEvents(events);
      await loadVerificationQueue();
    } catch (err: any) {
      showToast(err.message || 'Session expired. Please log in.', 'error');
      setAuthToken(null);
      navigate('/admin_dashboard');
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/admin_dashboard');
      return;
    }
    loadData();
  }, [navigate]);

  useEffect(() => {
    loadVerificationQueue();
  }, [statusFilter, specFilter]);

  const handleLogout = () => {
    setAuthToken(null);
    showToast('Administrator session ended.');
    navigate('/admin_dashboard');
  };

  // Inspect Application Dossier
  const handleOpenReviewModal = async (app: any) => {
    setSelectedApp(app);
    setReviewNotes('');
    setRejectionReason('');
    setInfoRequestedText('');
    setChecklistConfirmed(false);
    setActiveActionTab('approve');
    setReviewModalOpen(true);

    try {
      // Mark as under review if it was pending
      if (app.verification_status === 'PENDING') {
        await apiCall(`/admin/doctor-applications/${app.id}/review`, 'POST', {
          notes: `Inspection initiated by ${admin_name || 'Administrator'}`
        });
      }
      const dossier = await apiCall(`/admin/doctor-applications/${app.id}`);
      setSelectedAppDossier(dossier);
      await loadVerificationQueue();
    } catch (err: any) {
      console.error(err);
    }
  };

  // 1. Approve Doctor
  const handleApproveDoctor = async () => {
    if (!checklistConfirmed) {
      showToast('You must confirm that medical credentials have been cross-verified.', 'error');
      return;
    }
    try {
      await apiCall(`/admin/doctor-applications/${selectedApp.id}/approve`, 'POST', {
        notes: reviewNotes || `Approved via ${verificationMethod}`,
        verification_method: verificationMethod
      });
      showToast(`Dr. ${selectedApp.full_name} has been verified and added to consultation directory.`);
      setReviewModalOpen(false);
      await loadVerificationQueue();
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 2. Reject Application
  const handleRejectDoctor = async () => {
    if (!rejectionReason.trim()) {
      showToast('A formal rejection reason is mandatory.', 'error');
      return;
    }
    try {
      await apiCall(`/admin/doctor-applications/${selectedApp.id}/reject`, 'POST', {
        reason: rejectionReason,
        notes: reviewNotes
      });
      showToast(`Application for Dr. ${selectedApp.full_name} rejected.`);
      setReviewModalOpen(false);
      await loadVerificationQueue();
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 3. Request Additional Information
  const handleRequestInfo = async () => {
    if (!infoRequestedText.trim()) {
      showToast('Please provide instructions on what information is needed.', 'error');
      return;
    }
    try {
      await apiCall(`/admin/doctor-applications/${selectedApp.id}/request-information`, 'POST', {
        information_requested: infoRequestedText
      });
      showToast('Information request dispatched to physician portal.');
      setReviewModalOpen(false);
      await loadVerificationQueue();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 4. Suspend Doctor
  const handleSuspendDoctor = async () => {
    try {
      await apiCall(`/admin/doctors/${selectedApp.id}/suspend`, 'POST', {
        notes: reviewNotes || 'Suspended by administrator'
      });
      showToast(`Doctor ${selectedApp.full_name} suspended from patient consultations.`);
      setReviewModalOpen(false);
      await loadVerificationQueue();
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 5. Reinstate Doctor
  const handleReinstateDoctor = async () => {
    try {
      await apiCall(`/admin/doctors/${selectedApp.id}/reinstate`, 'POST', {
        notes: reviewNotes || 'Reinstated by administrator'
      });
      showToast(`Doctor ${selectedApp.full_name} reinstated to VERIFIED status.`);
      setReviewModalOpen(false);
      await loadVerificationQueue();
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#102A43] flex flex-col font-sans selection:bg-[#E8F5F2] selection:text-[#0D9488]">
      {/* Toast Alert Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-[#E8F5F2] text-[#0D9488] border-[#0D9488]/30'
          }`}
        >
          {feedbackMsg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Navigation Shell */}
      <header className="bg-[#102A43] text-white px-6 lg:px-12 py-3.5 shadow-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Link to="/" className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center font-bold shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">
                MEDORA <span className="text-[#14B8A6]">ADMIN CONSOLE</span>
              </span>

            </div>
            <p className="text-[11px] text-slate-300 hidden sm:block font-medium">
              Administrator: <span className="font-bold text-[#14B8A6]">{admin_name || 'Admin'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Full-Viewport Application Area */}
      <main className="flex-1 w-full px-6 lg:px-12 py-8 flex flex-col max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'verifications', label: `Doctor Verification Center (${appQueueCounts.pending} Pending)`, icon: Stethoscope },
            { id: 'overview', label: 'System Overview', icon: Activity },
            { id: 'patients', label: `Registered Patients (${adminPatients.length})`, icon: User },
            { id: 'audit', label: `Audit Trail (${adminAudits.length})`, icon: Terminal },
            { id: 'emergency', label: `Break-Glass Overrides (${adminEmergencyEvents.length})`, icon: ShieldAlert }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#0D9488] text-[#0D9488] bg-white rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-[#102A43]'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DOCTOR VERIFICATION CENTER                                         */}
        {/* ========================================================================= */}
        {activeTab === 'verifications' && (
          <div className="space-y-6">
            
            {/* Real Database-Backed Verification Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div
                onClick={() => setStatusFilter('PENDING')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'PENDING' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{appQueueCounts.pending}</p>
                <span className="text-[10px] text-slate-500">Awaiting audit</span>
              </div>

              <div
                onClick={() => setStatusFilter('UNDER_REVIEW')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'UNDER_REVIEW' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Under Review</span>
                <p className="text-2xl font-black text-blue-700 mt-1">{appQueueCounts.under_review}</p>
                <span className="text-[10px] text-slate-500">Inspection open</span>
              </div>

              <div
                onClick={() => setStatusFilter('VERIFIED')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'VERIFIED' ? 'bg-teal-100 border-[#0D9488] ring-2 ring-[#0D9488]' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488]">Verified Doctors</span>
                <p className="text-2xl font-black text-[#0D9488] mt-1">{appQueueCounts.verified}</p>
                <span className="text-[10px] text-slate-500">Directory active</span>
              </div>

              <div
                onClick={() => setStatusFilter('REJECTED')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'REJECTED' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Rejected</span>
                <p className="text-2xl font-black text-rose-700 mt-1">{appQueueCounts.rejected}</p>
                <span className="text-[10px] text-slate-500">Ineligible</span>
              </div>

              <div
                onClick={() => setStatusFilter('SUSPENDED')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'SUSPENDED' ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Suspended</span>
                <p className="text-2xl font-black text-slate-700 mt-1">{appQueueCounts.suspended}</p>
                <span className="text-[10px] text-slate-500">Restricted</span>
              </div>

              <div
                onClick={() => setStatusFilter('ALL')}
                className={`cursor-pointer p-4 rounded-2xl border transition ${statusFilter === 'ALL' ? 'bg-[#102A43] text-white border-[#102A43]' : 'bg-white border-[#E8F5F2] hover:bg-slate-50'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Applications</span>
                <p className="text-2xl font-black mt-1">{appQueueCounts.total}</p>
                <span className="text-[10px] opacity-70">All states</span>
              </div>
            </div>

            {/* Verification Queue Table & Filter Toolbar */}
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-4">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadVerificationQueue()}
                      placeholder="Search doctor name, license number, ref..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-[#102A43] focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={loadVerificationQueue}
                    className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-xs font-bold transition"
                  >
                    Search
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={specFilter}
                    onChange={(e) => setSpecFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium text-[#102A43]"
                  >
                    <option value="">All Specializations</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Critical Care / ICU">Critical Care / ICU</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Neurology">Neurology</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium text-[#102A43]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">PENDING</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Applications Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-3 px-2">App Reference</th>
                      <th>Physician Name</th>
                      <th>Licensing Identifier</th>
                      <th>Specialization / Hospital</th>
                      <th>Submitted Date</th>
                      <th>Current Status</th>
                      <th className="text-right px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingQueue ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">Loading verification queue...</td>
                      </tr>
                    ) : appQueueItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">No physician applications matching filter criteria.</td>
                      </tr>
                    ) : (
                      appQueueItems.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2 font-mono font-bold text-[#0D9488]">
                            {app.application_reference || `DOC-APP-${app.id}`}
                          </td>
                          <td>
                            <div className="font-extrabold text-[#102A43]">Dr. {app.full_name}</div>
                            <div className="text-[11px] text-slate-500">{app.email || app.phone}</div>
                          </td>
                          <td>
                            <div className="font-mono font-bold text-[#102A43]">{app.medical_license_number}</div>
                            <div className="text-[10px] text-slate-500">{app.registration_authority || 'Medical Council'}</div>
                          </td>
                          <td>
                            <div className="font-semibold text-slate-800">{app.specialization}</div>
                            <div className="text-[11px] text-slate-500">{app.hospital_name}</div>
                          </td>
                          <td className="text-slate-500">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                app.verification_status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : app.verification_status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : app.verification_status === 'UNDER_REVIEW'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : app.verification_status === 'SUSPENDED'
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {app.verification_status}
                            </span>
                          </td>
                          <td className="text-right px-2">
                            <button
                              onClick={() => handleOpenReviewModal(app)}
                              className="px-3 py-1.5 rounded-lg bg-[#E8F5F2] hover:bg-[#0D9488]/20 text-[#0D9488] font-bold text-xs transition inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Review Dossier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SYSTEM OVERVIEW                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Total Users</span>
                <p className="text-3xl font-black text-[#102A43] mt-2">{adminStats?.total_patients + adminStats?.total_doctors || 5}</p>
                <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Active across system</span>
              </div>
              <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Registered Patients</span>
                <p className="text-3xl font-black text-[#0D9488] mt-2">{adminPatients.length}</p>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Registered in system</span>
              </div>
              <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Verified Physicians</span>
                <p className="text-3xl font-black text-[#102A43] mt-2">{appQueueCounts.verified}</p>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Active in directory</span>
              </div>
              <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs">
                <span className="text-xs text-slate-500 font-bold uppercase">Audit Log Volume</span>
                <p className="text-3xl font-black text-[#0D9488] mt-2">{adminAudits.length}</p>
                <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Total events recorded</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REGISTERED PATIENTS                                                */}
        {/* ========================================================================= */}
        {activeTab === 'patients' && (
          <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#102A43] text-base">Registered Patient Directory</h3>
            <div className="space-y-3">
              {adminPatients.map((pat) => (
                <div key={pat.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-sm text-[#102A43]">{pat.full_name}</p>
                    <p className="text-slate-500 mt-0.5">
                      Card ID: <strong className="font-mono text-[#102A43]">{pat.unique_patient_id}</strong> &bull; Blood Group: <strong className="text-rose-600">{pat.blood_group}</strong>
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    ID: {pat.unique_patient_id || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUDIT TRAIL                                                        */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#102A43] text-base">Tamper-Evident System Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5">Timestamp</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Reason / Notes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminAudits.slice(0, 35).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="font-bold text-[#102A43]">{a.actor_role}</td>
                      <td className="font-mono text-[#0D9488]">{a.action}</td>
                      <td className="text-slate-600">{a.reason || 'N/A'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {a.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BREAK-GLASS OVERRIDES                                              */}
        {/* ========================================================================= */}
        {activeTab === 'emergency' && (
          <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#102A43] text-base">Break-Glass Emergency Overrides</h3>
            {adminEmergencyEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No emergency override events logged.</p>
            ) : (
              <div className="space-y-3">
                {adminEmergencyEvents.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-rose-900 text-sm">Emergency Override Event #{ev.id}</span>
                      <span className="text-[10px] text-slate-500">{new Date(ev.timestamp || ev.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700"><strong>Attending Doctor:</strong> {ev.doctor_name || 'Physician'}</p>
                    <p className="text-slate-700"><strong>Patient Target:</strong> {ev.patient_name || 'Patient'}</p>
                    <p className="text-rose-800"><strong>Clinical Justification:</strong> {ev.justification || 'Emergency triage override'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE APPLICATION REVIEW DOSSIER MODAL                            */}
      {/* ========================================================================= */}
      {reviewModalOpen && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-[#E8F5F2] rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Dossier: Dr. {selectedApp.full_name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedApp.verification_status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedApp.verification_status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedApp.verification_status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Reference: <strong>{selectedApp.application_reference || `DOC-APP-${selectedApp.id}`}</strong> &bull; Submitted: {new Date(selectedApp.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Professional Information Card */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-[#F4F7FA] rounded-2xl text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Medical Registration Number</span>
                <p className="font-mono font-bold text-sm text-[#102A43]">{selectedApp.medical_license_number}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Registration Authority</span>
                <p className="font-bold text-[#102A43]">{selectedApp.registration_authority || 'National Medical Commission'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">State / Jurisdiction</span>
                <p className="font-bold text-[#102A43]">{selectedApp.state_jurisdiction || 'Delhi'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Medical Qualification</span>
                <p className="font-bold text-[#102A43]">{selectedApp.medical_qualification || 'MBBS, MD'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Specialization</span>
                <p className="font-bold text-[#0D9488]">{selectedApp.specialization}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Hospital / Practice</span>
                <p className="font-bold text-[#102A43]">{selectedApp.hospital_name}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Practice Address</span>
                <p className="text-slate-700">{selectedApp.professional_address || 'Registered OPD Desk'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Experience</span>
                <p className="font-bold text-[#102A43]">{selectedApp.years_of_experience || 5} Years</p>
              </div>
            </div>

            {/* Action Tabs: Approve / Reject / Request Info / Suspend / History */}
            <div className="flex rounded-xl bg-[#F4F7FA] p-1 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveActionTab('approve')}
                className={`flex-1 py-2 rounded-lg transition ${activeActionTab === 'approve' ? 'bg-[#0D9488] text-white shadow-xs' : 'text-slate-600 hover:text-[#102A43]'}`}
              >
                Approve Doctor
              </button>
              <button
                onClick={() => setActiveActionTab('reject')}
                className={`flex-1 py-2 rounded-lg transition ${activeActionTab === 'reject' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-[#102A43]'}`}
              >
                Reject Application
              </button>
              <button
                onClick={() => setActiveActionTab('info')}
                className={`flex-1 py-2 rounded-lg transition ${activeActionTab === 'info' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-[#102A43]'}`}
              >
                Request Info
              </button>
              <button
                onClick={() => setActiveActionTab('suspend')}
                className={`flex-1 py-2 rounded-lg transition ${activeActionTab === 'suspend' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-[#102A43]'}`}
              >
                Suspend / Reinstate
              </button>
              <button
                onClick={() => setActiveActionTab('history')}
                className={`flex-1 py-2 rounded-lg transition ${activeActionTab === 'history' ? 'bg-[#102A43] text-white shadow-xs' : 'text-slate-600 hover:text-[#102A43]'}`}
              >
                Audit History
              </button>
            </div>

            {/* SUB-PANEL: APPROVE */}
            {activeActionTab === 'approve' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Documented Verification Procedure / Method</label>
                  <input
                    type="text"
                    value={verificationMethod}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Administrative Notes & Verification Evidence</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Cross-verified against NMC Doctor Registry. Degree qualifications validated..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistConfirmed}
                      onChange={(e) => setChecklistConfirmed(e.target.checked)}
                      className="mt-0.5 rounded text-[#0D9488]"
                    />
                    <span className="text-[11px] text-emerald-900 font-semibold">
                      I confirm that I have reviewed the submitted medical license number, authority, and professional information. Approving this application will immediately make Dr. {selectedApp.full_name} eligible in the patient consultation directory.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveDoctor}
                    disabled={!checklistConfirmed}
                    className="px-6 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Formally Approve & Activate
                  </button>
                </div>
              </div>
            )}

            {/* SUB-PANEL: REJECT */}
            {activeActionTab === 'reject' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-rose-900 mb-1">Mandatory Rejection Reason *</label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    placeholder="e.g. License number not found in State Medical Council registry, or qualification certificate expired..."
                    className="w-full p-2.5 rounded-xl border border-rose-300 bg-rose-50 text-xs font-medium"
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  The doctor will be notified of this reason and allowed to correct and resubmit their application from the Doctor Portal.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectDoctor}
                    disabled={!rejectionReason.trim()}
                    className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject Application
                  </button>
                </div>
              </div>
            )}

            {/* SUB-PANEL: REQUEST INFO */}
            {activeActionTab === 'info' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-amber-900 mb-1">Information / Corrections Required *</label>
                  <textarea
                    rows={3}
                    value={infoRequestedText}
                    onChange={(e) => setInfoRequestedText(e.target.value)}
                    required
                    placeholder="e.g. Please provide updated clinic address or specify primary hospital affiliation..."
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-xs font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestInfo}
                    disabled={!infoRequestedText.trim()}
                    className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-4 h-4" /> Dispatch Information Request
                  </button>
                </div>
              </div>
            )}

            {/* SUB-PANEL: SUSPEND / REINSTATE */}
            {activeActionTab === 'suspend' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-100 rounded-xl space-y-2">
                  <p className="font-bold text-slate-800">Account Privilege Management</p>
                  <p className="text-slate-600 text-[11px]">
                    Current Status: <strong className="uppercase">{selectedApp.verification_status}</strong>
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Administrative Reason</label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Reason for suspension or reinstatement..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {selectedApp.verification_status !== 'SUSPENDED' && (
                    <button
                      onClick={handleSuspendDoctor}
                      className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5"
                    >
                      <Ban className="w-4 h-4" /> Suspend Doctor
                    </button>
                  )}
                  {selectedApp.verification_status === 'SUSPENDED' && (
                    <button
                      onClick={handleReinstateDoctor}
                      className="px-6 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> Reinstate Doctor
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SUB-PANEL: HISTORY */}
            {activeActionTab === 'history' && (
              <div className="space-y-3 text-xs max-h-60 overflow-y-auto">
                {(!selectedAppDossier?.history || selectedAppDossier.history.length === 0) ? (
                  <p className="text-slate-400 py-4 text-center">No prior verification transitions recorded.</p>
                ) : (
                  selectedAppDossier.history.map((h: any) => (
                    <div key={h.id} className="p-3 bg-[#F4F7FA] rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#102A43]">
                          {h.previous_status} &rarr; <span className="text-[#0D9488]">{h.new_status}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600">{h.notes || 'No notes'}</p>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
