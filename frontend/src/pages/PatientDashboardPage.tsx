import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  Shield,
  User,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Plus,
  AlertCircle,
  Download,
  Bell,
  Lock,
  Edit2,
  HeartPulse,
  Pill,
  Search,
  FileText,
  Check,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  Building2,
  AlertOctagon,
  X as XIcon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';
import { PatientTab } from '../types';
import ClinicalRecordsTab from '../components/ClinicalRecordsTab';

export default function PatientDashboardPage() {
  const { patient_user_name: _patient_user_name } = useParams<{ patient_user_name: string }>();
  const navigate = useNavigate();

  // Sidebar & QR UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const qrPanelRef = useRef<HTMLDivElement>(null);

  // Active Tab: defaults to 'dashboard'
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');

  // Core Data States
  const [patientData, setPatientData] = useState<any>(null);
  const [cardData, setCardData] = useState<any>(null);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [_prescriptions, setPrescriptions] = useState<any[]>([]);
  const [_emergencyEvents, setEmergencyEvents] = useState<any[]>([]);
  const [patientConsultations, setPatientConsultations] = useState<any[]>([]);
  const [pendingAccessReqs, setPendingAccessReqs] = useState<any[]>([]);
  const [allAccessReqs, setAllAccessReqs] = useState<any[]>([]);
  const [activeConsents, setActiveConsents] = useState<any[]>([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [accessHistory, setAccessHistory] = useState<any[]>([]);
  const [profileCompleteness, setProfileCompleteness] = useState<any>(null);
  const [_aiSummary, setAiSummary] = useState<any>(null);

  // Profile Edit state
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editOrganDonor, setEditOrganDonor] = useState(false);
  const [editDnr, setEditDnr] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Settings State
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifSmsAlerts, setNotifSmsAlerts] = useState(true);
  const [notifEmailAlerts, setNotifEmailAlerts] = useState(true);
  const [notifDoctorPrompts, setNotifDoctorPrompts] = useState(true);

  // Document Upload State
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docUploadType, setDocUploadType] = useState('LAB_REPORT');
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Timeline Category Filter
  const [timelineCategory, setTimelineCategory] = useState<string>('ALL');

  // Appointment & Request Booking Modals
  const [newConsultModalOpen, setNewConsultModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [_selectedDoctorObj, setSelectedDoctorObj] = useState<any | null>(null);
  const [consultType, setConsultType] = useState('CONSULTATION');
  const [consultReason, setConsultReason] = useState('');
  const [consultPrefDate, setConsultPrefDate] = useState('');
  const [consultMode, setConsultMode] = useState<'IN_PERSON' | 'TELE_CONSULTATION'>('IN_PERSON');
  const [consultSlotTime, setConsultSlotTime] = useState('10:00 AM');
  const [consultMessage, setConsultMessage] = useState('');

  // Verified Doctor Directory Filters
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorSpecFilter, setDoctorSpecFilter] = useState('');
  const [doctorHospitalFilter, setDoctorHospitalFilter] = useState('');

  // Toast feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Close QR panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qrPanelRef.current && !qrPanelRef.current.contains(e.target as Node)) {
        setShowQrPanel(false);
      }
    };
    if (showQrPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQrPanel]);

  const fetchVerifiedDoctors = async (term?: string, spec?: string, hosp?: string) => {
    const sTerm = term !== undefined ? term : doctorSearch;
    const sSpec = spec !== undefined ? spec : doctorSpecFilter;
    const sHosp = hosp !== undefined ? hosp : doctorHospitalFilter;
    try {
      const vDocs = await apiCall(
        `/patients/doctors?search=${encodeURIComponent(sTerm)}&specialization=${encodeURIComponent(sSpec)}&hospital=${encodeURIComponent(sHosp)}`
      );
      setVerifiedDoctors(vDocs || []);
    } catch (e: any) {
      console.error('Failed to load verified doctors', e);
    }
  };

  const loadData = async () => {
    try {
      const p = await apiCall('/patients/me');
      setPatientData(p);
      setEditPhone(p?.phone || '');
      setEditAddress(p?.address || '');
      setEditDob(p?.date_of_birth || '');
      setEditGender(p?.gender || 'Female');
      setEditInstructions(p?.emergency_instructions || '');
      setEditOrganDonor(p?.organ_donor || false);
      setEditDnr(p?.dnr_status || false);

      const [
        card,
        allgs,
        meds,
        conds,
        surgs,
        vsts,
        rxs,
        evts,
        cons,
        reqs,
        allReqs,
        consents,
        vDocs,
        notifs,
        docs,
        hist,
        comp,
        ai
      ] = await Promise.all([
        apiCall('/qr/card').catch(() => null),
        apiCall('/patients/me/allergies').catch(() => []),
        apiCall('/patients/me/medications').catch(() => []),
        apiCall('/patients/me/conditions').catch(() => []),
        apiCall('/patients/me/surgeries').catch(() => []),
        apiCall('/patients/me/visits').catch(() => []),
        apiCall('/patients/me/prescriptions').catch(() => []),
        apiCall('/patients/me/emergency-events').catch(() => []),
        apiCall('/appointments/patient').catch(() => []),
        apiCall('/access/requests/pending').catch(() => []),
        apiCall('/access/requests/all').catch(() => []),
        apiCall('/access/consents').catch(() => []),
        apiCall('/patients/doctors').catch(() => []),
        apiCall('/patients/me/notifications').catch(() => []),
        apiCall('/patients/me/documents').catch(() => []),
        apiCall('/patients/me/access-history').catch(() => []),
        apiCall('/patients/me/completeness').catch(() => null),
        apiCall('/patients/me/ai-summary').catch(() => null)
      ]);

      setCardData(card);
      setAllergies(allgs || []);
      setMedications(meds || []);
      setConditions(conds || []);
      setSurgeries(surgs || []);
      setVisits(vsts || []);
      setPrescriptions(rxs || []);
      setEmergencyEvents(evts || []);
      setPatientConsultations(cons || []);
      setPendingAccessReqs(reqs || []);
      setAllAccessReqs(allReqs || []);
      setActiveConsents(consents || []);
      setVerifiedDoctors(vDocs || []);
      setNotifications(notifs || []);
      setDocuments(docs || []);
      setAccessHistory(hist || []);
      setProfileCompleteness(comp);
      setAiSummary(ai);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        navigate('/patient_dashboard');
      }
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/patient_dashboard');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 15000); // Polling for real-time notification & appointment updates
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    setAuthToken(null);
    navigate('/patient_dashboard');
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/patients/me', 'PUT', {
        phone: editPhone,
        address: editAddress,
        date_of_birth: editDob,
        gender: editGender,
        emergency_instructions: editInstructions,
        organ_donor: editOrganDonor,
        dnr_status: editDnr
      });
      showToast('Personal profile and safety directives updated successfully.');
      setIsEditingProfile(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    try {
      await apiCall('/patients/me/change-password', 'POST', {
        current_password: currPassword,
        new_password: newPassword
      });
      showToast('Password updated successfully.');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Upload Medical Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile || !docUploadTitle.trim()) {
      showToast('Please select a file and provide a document title.', 'error');
      return;
    }
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('title', docUploadTitle.trim());
      formData.append('document_type', docUploadType);
      formData.append('file', docUploadFile);

      const token = getAuthToken();
      const res = await fetch('/api/v1/patients/me/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to upload document.');
      }

      showToast('Medical document archived securely.');
      setDocUploadTitle('');
      setDocUploadFile(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this archived clinical report?')) return;
    try {
      await apiCall(`/patients/me/documents/${docId}`, 'DELETE');
      showToast('Document deleted from secure storage.');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Request Appointment
  const handleRequestAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !consultReason.trim()) {
      showToast('Please select an eligible doctor and specify the consultation reason.', 'error');
      return;
    }
    try {
      await apiCall('/appointments', 'POST', {
        doctor_id: Number(selectedDoctorId),
        request_type: consultType,
        reason: consultMessage.trim() ? `${consultReason.trim()} [Patient Note: ${consultMessage.trim()}]` : consultReason.trim(),
        preferred_date: consultPrefDate || 'Flexible',
        consultation_mode: consultMode,
        slot_time: consultSlotTime
      });
      showToast('Appointment request submitted successfully to doctor.');
      setNewConsultModalOpen(false);
      setConsultReason('');
      setConsultPrefDate('');
      setConsultMessage('');
      await loadData();
      setActiveTab('appointments');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment request?')) return;
    try {
      await apiCall(`/appointments/${apptId}/cancel`, 'POST');
      showToast('Appointment cancelled successfully.');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Review Doctor Access Request
  const handleReviewAccess = async (reqId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiCall(`/access/requests/${reqId}/review`, 'POST', { status });
      showToast(`Access request ${status.toLowerCase()} successfully.`);
      // Refresh both access requests and audit history
      const [pending, all, consents, hist] = await Promise.all([
        apiCall('/access/requests/pending').catch(() => []),
        apiCall('/access/requests/all').catch(() => []),
        apiCall('/access/consents').catch(() => []),
        apiCall('/patients/me/access-history').catch(() => [])
      ]);
      setPendingAccessReqs(pending || []);
      setAllAccessReqs(all || []);
      setActiveConsents(consents || []);
      setAccessHistory(hist || []);
    } catch (err: any) {
      showToast(err.message || 'Action failed. Please try again.', 'error');
    }
  };

  // Revoke Consent
  const handleRevokeConsent = async (consentId: number) => {
    if (!confirm("Are you sure you want to revoke this physician's access? Protected clinical history will be locked immediately.")) return;
    try {
      await apiCall(`/access/consents/revoke/${consentId}`, 'POST');
      showToast('Doctor access privileges revoked immediately.');
      // Refresh access data and audit history
      const [pending, all, consents, hist] = await Promise.all([
        apiCall('/access/requests/pending').catch(() => []),
        apiCall('/access/requests/all').catch(() => []),
        apiCall('/access/consents').catch(() => []),
        apiCall('/patients/me/access-history').catch(() => [])
      ]);
      setPendingAccessReqs(pending || []);
      setAllAccessReqs(all || []);
      setActiveConsents(consents || []);
      setAccessHistory(hist || []);
    } catch (err: any) {
      showToast(err.message || 'Revoke failed. Please try again.', 'error');
    }
  };

  // Mark All Notifications Read
  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiCall('/patients/me/notifications/read-all', 'POST');
      showToast('All notifications marked as read.');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Client-Side PDF Generation with jsPDF
  const generatePDFReport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFillColor(16, 42, 67); // Deep Navy #102A43
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDORA EMERGENCY MEDICAL PROFILE', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Medora Emergency Medical System', 14, 24);

      doc.setTextColor(16, 42, 67);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Patient: ${patientData?.full_name || 'Unknown Patient'}`, 14, 40);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Emergency Medical ID: ${patientData?.unique_patient_id || 'PAT-2026-9812'}`, 14, 47);
      doc.text(`Blood Group: ${patientData?.blood_group || 'O+'}`, 14, 54);
      doc.text(`Contact Phone: ${patientData?.phone || '+91 98765 43210'}`, 14, 61);
      doc.text(`Organ Donor: ${patientData?.organ_donor ? 'YES' : 'NO'} | DNR: ${patientData?.dnr_status ? 'YES' : 'NO'}`, 14, 68);

      doc.setDrawColor(13, 148, 136); // Medical Teal #0D9488
      doc.setLineWidth(0.5);
      doc.line(14, 73, 196, 73);

      let yPos = 82;

      // Allergies
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60); // Rose
      doc.text('CRITICAL ALLERGIES & ADVERSE REACTIONS', 14, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      if (allergies.length === 0) {
        doc.text('• No known drug or environmental allergies documented.', 14, yPos);
        yPos += 6;
      } else {
        allergies.forEach((a) => {
          doc.text(`• ${a.allergen} (${a.severity}) - Reaction: ${a.reaction || 'Anaphylaxis Risk'}`, 14, yPos);
          yPos += 6;
        });
      }

      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 42, 67);
      doc.text('ACTIVE PRESCRIBED MEDICATIONS', 14, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      if (medications.length === 0) {
        doc.text('• No active medications recorded.', 14, yPos);
        yPos += 6;
      } else {
        medications.forEach((m) => {
          doc.text(`• ${m.medicine_name}: ${m.dosage || ''} ${m.frequency || ''} (Route: ${m.route || 'Oral'})`, 14, yPos);
          yPos += 6;
        });
      }

      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PRIMARY EMERGENCY CONTACTS', 14, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      if (patientData?.emergency_contacts?.length > 0) {
        patientData.emergency_contacts.forEach((c: any) => {
          doc.text(`• ${c.contact_name} (${c.relationship_type}) - Tel: ${c.phone_encrypted || c.phone || 'Encrypted'}`, 14, yPos);
          yPos += 6;
        });
      } else {
        doc.text('• Primary Contact: Michael Jenkins (Spouse) - Emergency Proxy Registered', 14, yPos);
        yPos += 6;
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Generated via Medora Patient Portal • ' + new Date().toLocaleString(), 14, 280);

      doc.save(`Medora_Emergency_Card_${patientData?.unique_patient_id || 'PAT-2026'}.pdf`);
      showToast('Emergency Medical Card PDF generated successfully.');
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

  // Compile unified chronological medical history timeline
  const timelineEntries = [
    ...conditions.map((c) => ({
      type: 'CONDITION',
      title: c.condition_name,
      date: c.diagnosis_date || c.created_at || 'Recorded Condition',
      severity: c.is_critical_flag ? 'CRITICAL' : 'ROUTINE',
      details: c.notes || `Status: ${c.status || 'Active'}`
    })),
    ...allergies.map((a) => ({
      type: 'ALLERGY',
      title: `Allergy: ${a.allergen}`,
      date: a.created_at || 'Documented',
      severity: a.severity === 'Severe' || a.is_critical_flag ? 'CRITICAL' : 'WARNING',
      details: `Reaction: ${a.reaction || 'Not specified'} (Severity: ${a.severity})`
    })),
    ...medications.map((m) => ({
      type: 'MEDICATION',
      title: `Medication: ${m.medicine_name}`,
      date: m.start_date || m.created_at || 'Active',
      severity: m.is_critical_flag ? 'CRITICAL' : 'ROUTINE',
      details: `${m.dosage || ''} ${m.frequency || ''} (${m.route || 'Oral'})`
    })),
    ...surgeries.map((s) => ({
      type: 'SURGERY',
      title: `Surgery: ${s.procedure_name}`,
      date: s.surgery_date || 'Past Procedure',
      severity: 'ROUTINE',
      doctor: s.surgeon || 'Senior Surgical Specialist',
      facility: s.hospital || 'General Hospital',
      details: s.notes || 'Post-operative recovery completed'
    })),
    ...visits.map((v) => ({
      type: 'VISIT',
      title: `Clinical Consultation: ${v.chief_complaint || 'Outpatient Review'}`,
      date: v.visit_date || v.created_at || 'Consultation',
      severity: 'ROUTINE',
      doctor: v.doctor?.full_name ? `Dr. ${v.doctor.full_name}` : 'Attending Physician',
      facility: v.hospital_name || 'Medora Medical Center',
      details: v.diagnosis ? `Documented Diagnosis: ${v.diagnosis}` : 'Follow-up consultation conducted'
    }))
  ];

  const filteredTimeline = timelineCategory === 'ALL'
    ? timelineEntries
    : timelineEntries.filter((item) => item.type === timelineCategory);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Secure QR payload — contains ONLY the opaque backend token, never clinical data
  const qrPayload = cardData?.token
    ? JSON.stringify({ application: 'Medora', version: 1, type: 'medical_card', token: cardData.token })
    : (patientData ? `MEDORA|${patientData.unique_patient_id}|PENDING` : 'LOADING');


  return (
    <div className="flex h-screen bg-[#F4F7FA] text-[#102A43] font-sans overflow-hidden selection:bg-[#E8F5F2] selection:text-[#0D9488]">
      {/* ========================================================================= */}
      {/* 1. FULL-HEIGHT DEDICATED PATIENT SIDEBAR                                 */}
      {/* ========================================================================= */}
      <aside className={`${sidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0 pointer-events-none' : 'w-72 border-r border-slate-800 opacity-100'} bg-[#102A43] text-white flex flex-col shrink-0 select-none shadow-xl z-30 transition-all duration-300 ease-in-out`}>
        {/* Brand & Identity Header */}
        <div className="p-4 border-b border-slate-700/60 flex items-center justify-between gap-2 min-w-[280px]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center shadow-md shrink-0">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5 truncate">
                MEDORA <span className="text-[#14B8A6] text-xs font-mono font-bold">PATIENT</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">ID: {patientData?.unique_patient_id || '—'}</p>
            </div>
          </div>
          {/* Hide Sidebar Button */}
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            title="Hide Sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-[#14B8A6]" />
            <span className="text-[11px]">Hide</span>
          </button>
        </div>

        {/* Patient Profile Quick Summary */}
        <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-700/50 flex items-center justify-between min-w-[280px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F5F2] text-[#0D9488] font-black text-xs flex items-center justify-center shrink-0">
              {patientData?.full_name ? patientData.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{patientData?.full_name || '...'}</p>
              <p className="text-[10px] text-slate-400 font-mono">Blood Group: <strong className="text-rose-400 font-bold">{patientData?.blood_group || '—'}</strong></p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => setActiveTab('notifications')}
              className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono text-[10px] font-bold shrink-0"
            >
              {unreadCount} new
            </button>
          )}
        </div>

        {/* Categorized Navigation Tree */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs min-w-[280px]">
          {/* 1 — Dashboard */}
          <button onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'overview' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <Activity className="w-4 h-4 text-[#14B8A6] shrink-0" /> Dashboard
          </button>

          {/* 2 — My Profile */}
          <button onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'profile' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <User className="w-4 h-4 text-blue-400 shrink-0" /> My Profile
          </button>

          {/* 3 — Clinical Records (unified) */}
          <button onClick={() => setActiveTab('clinical-records')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'clinical-records' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" /> Clinical Records
          </button>

          {/* 4 — Doctor Access Requests */}
          <button onClick={() => setActiveTab('access-requests')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'access-requests' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <span className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" /> Doctor Access Requests
            </span>
            {pendingAccessReqs.length > 0 && (
              <span className="font-mono text-[10px] bg-amber-500 text-slate-900 font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingAccessReqs.length}
              </span>
            )}
          </button>

          {/* 5 — Medical QR Card */}
          <button onClick={() => setActiveTab('emergency-card')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'emergency-card' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <QrCode className="w-4 h-4 text-emerald-400 shrink-0" /> Medical QR Card
          </button>

          {/* 6 — Access History */}
          <button onClick={() => setActiveTab('access-history')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left font-medium ${
              activeTab === 'access-history' ? 'bg-[#0D9488] text-white font-bold' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}>
            <Lock className="w-4 h-4 text-blue-400 shrink-0" /> Access History
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-700/60 min-w-[280px]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 transition text-xs font-bold border border-slate-700"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN PATIENT WORKSPACE                                                */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F4F7FA] overflow-y-auto">
        {/* Top Operational Ribbon */}
        <header className="bg-white border-b border-[#E8F5F2] px-6 lg:px-8 py-3.5 shadow-2xs flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Show / Hide Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7FA] hover:bg-slate-200 text-[#102A43] text-xs font-bold border border-slate-200 transition shrink-0 shadow-2xs"
              title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              {sidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#0D9488]" />
                  <span>Show Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-600" />
                  <span>Hide Sidebar</span>
                </>
              )}
            </button>
            <h2 className="font-black text-lg text-[#102A43] capitalize">
              {activeTab === 'overview' && 'Personalized Medical Dashboard'}
              {activeTab === 'profile' && 'Patient Profile & Emergency Contacts'}
              {activeTab === 'clinical-records' && 'Clinical Records'}
              {(activeTab === 'medical-history' || activeTab === 'history') && 'My Medical History Timeline'}
              {activeTab === 'conditions' && 'Medical Conditions & Diagnoses'}
              {activeTab === 'allergies' && 'Documented Allergies & Clinical Alerts'}
              {(activeTab === 'medications' || activeTab === 'current') && 'Medications & Prescriptions'}
              {activeTab === 'surgeries' && 'Surgeries & Medical Procedures'}
              {activeTab === 'consultations-reports' && 'Consultations & Document Library'}
              {activeTab === 'appointments' && 'Appointment Management & Queue'}
              {activeTab === 'find-doctor' && 'Appointments → Find a Verified Doctor'}
              {(activeTab === 'my-requests' || activeTab === 'consultations') && 'Patient Requests & Follow-Ups'}
              {activeTab === 'access-requests' && 'Doctor Access Authorization Center'}
              {(activeTab === 'consent-privacy' || activeTab === 'consents') && 'Consent & Privacy Management'}
              {(activeTab === 'emergency-card' || activeTab === 'card' || activeTab === 'register') && 'Medical QR Card'}
              {activeTab === 'access-history' && 'Access History & Audit Transparency'}
              {activeTab === 'notifications' && 'Notifications Center'}
              {activeTab === 'settings' && 'Account Settings & Privacy Directives'}
              {activeTab === 'help-support' && 'Help & Support'}
            </h2>
            <span className="font-mono text-xs text-slate-500 font-bold bg-[#F4F7FA] px-2.5 py-1 rounded-lg border border-slate-200">
              {patientData?.unique_patient_id || '—'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-[#F4F7FA] hover:bg-slate-200 text-slate-600 transition"
              title="Refresh All Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* QR Code Quick-View Button */}
            <div className="relative" ref={qrPanelRef}>
              <button
                onClick={() => setShowQrPanel(!showQrPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  showQrPanel
                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                    : 'bg-[#E8F5F2] text-[#0D9488] border-[#0D9488]/30 hover:bg-[#0D9488]/20'
                }`}
                title="Patient Emergency QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">QR Card</span>
              </button>

              {/* QR Popover Panel */}
              {showQrPanel && (
                <div className="absolute right-0 top-10 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-[#E8F5F2] overflow-hidden animate-in fade-in">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#102A43]">
                    <div>
                      <p className="text-xs font-black text-white">Medical QR Card</p>
                      <p className="text-[10px] text-slate-400 font-mono">{patientData?.unique_patient_id || '—'}</p>
                    </div>
                    <button onClick={() => setShowQrPanel(false)} className="text-slate-400 hover:text-white transition">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* QR Code — contains only secure opaque token */}
                  <div className="flex flex-col items-center gap-3 p-5 bg-white">
                    {cardData?.token ? (
                      <div className="p-3 bg-white rounded-xl border-2 border-[#E8F5F2] shadow-inner">
                        <QRCodeSVG
                          value={qrPayload}
                          size={160}
                          level="H"
                          fgColor="#102A43"
                          bgColor="#ffffff"
                          includeMargin={false}
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12" />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      This QR contains only a secure access token.<br />
                      No clinical data is encoded. Scanning requires verified doctor login.
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      cardData?.token ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cardData?.token ? 'ACTIVE' : 'NOT GENERATED'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => { setActiveTab('emergency-card'); setShowQrPanel(false); }}
                      className="flex-1 py-2 rounded-xl bg-[#E8F5F2] text-[#0D9488] font-bold text-xs hover:bg-[#0D9488]/20 transition"
                    >
                      Full Card View
                    </button>
                    <button
                      onClick={generatePDFReport}
                      className="flex-1 py-2 rounded-xl bg-[#102A43] text-white font-bold text-xs hover:bg-[#1E3A5F] transition flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('emergency-card')}
              className="px-3.5 py-1.5 rounded-xl bg-[#E8F5F2] hover:bg-[#0D9488]/20 text-[#0D9488] font-bold text-xs border border-[#0D9488]/30 hidden md:flex items-center gap-1.5 transition"
            >
              View Emergency Card
            </button>

          </div>
        </header>

        {/* Global Toast Feedback */}
        {feedbackMsg && (
          <div className="fixed top-16 right-8 z-50 animate-bounce">
            <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white ${
              feedbackMsg.type === 'error' ? 'bg-rose-600' : 'bg-[#0D9488]'
            }`}>
              {feedbackMsg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{feedbackMsg.text}</span>
            </div>
          </div>
        )}

        {/* Content Workspace Area */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ========================================================================= */}
          {/* WORKSPACE 1: DASHBOARD OVERVIEW                                           */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Section Banner */}
              <div className="bg-gradient-to-r from-[#102A43] to-[#1E3A5F] rounded-3xl p-8 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-[#14B8A6]/20 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-[#14B8A6] text-xs font-mono font-bold uppercase tracking-wider">
                        Patient Portal
                      </span>
                      <h3 className="text-2xl font-black text-white mt-2">
                        Welcome back, {patientData?.full_name || 'Patient'}
                      </h3>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Your medical history is protected. Doctors cannot access your clinical records without explicit consent. Your Medical QR Card acts as a secure gateway — scanning it only identifies you; full record access requires verified physician login and your approval.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <button
                        onClick={generatePDFReport}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download Card (PDF)
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-4 text-xs font-mono">
                    {cardData && (
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <QrCode className="w-4 h-4 text-[#14B8A6]" />
                        Medical QR Card: <strong className="text-emerald-400 font-bold">Active</strong>
                      </span>
                    )}
                    {profileCompleteness?.score != null && (
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Profile: <strong className="text-white">{profileCompleteness.score}% complete</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Real Database Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Blood Group</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      {patientData?.blood_group || 'O+'}
                    </div>
                  </div>
                  <p className="text-2xl font-black text-[#102A43]">{patientData?.blood_group || 'O+'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Verified Laboratory Typing</p>
                </div>

                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Documented Allergies</span>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-[#102A43]">{allergies.length}</p>
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    {allergies.some((a) => a.severity === 'Severe') ? 'Severe anaphylaxis flag active' : 'Clinician documented'}
                  </p>
                </div>

                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Medications</span>
                    <Pill className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-[#102A43]">{medications.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Prescription regimen active</p>
                </div>

                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Consents</span>
                    <Shield className="w-5 h-5 text-[#0D9488]" />
                  </div>
                  <p className="text-2xl font-black text-[#102A43]">{activeConsents.length}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-1">Authorized physician grants</p>
                </div>
              </div>

              {/* Alerts & Reminders Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pending Actions & Urgent Alerts */}
                <div className="md:col-span-2 bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-amber-500" />
                      <h4 className="font-extrabold text-[#102A43] text-sm">Action Required & Urgent Notices</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {pendingAccessReqs.length + patientConsultations.filter((c) => c.status === 'CONFIRMED').length} Total
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pendingAccessReqs.length === 0 && patientConsultations.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        No pending doctor access requests or upcoming appointments requiring your immediate action.
                      </div>
                    )}

                    {/* Pending Access Requests */}
                    {pendingAccessReqs.map((req) => (
                      <div key={req.id} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase">
                              Doctor Access Request
                            </span>
                            <span className="font-bold text-[#102A43]">{req.doctor_name || 'Attending Physician'}</span>
                          </div>
                          <p className="text-slate-700">
                            <strong>Reason:</strong> {req.purpose || 'Clinical review of previous outpatient history'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReviewAccess(req.id, 'APPROVED')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-2xs"
                          >
                            Approve Grant
                          </button>
                          <button
                            onClick={() => handleReviewAccess(req.id, 'REJECTED')}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold transition"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Upcoming Confirmed Appointments */}
                    {patientConsultations.filter((c) => c.status === 'CONFIRMED').map((appt) => (
                      <div key={appt.id} className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 font-bold text-[10px] uppercase">
                              Confirmed Appointment
                            </span>
                            <span className="font-bold text-[#102A43]">Dr. {appt.doctor_name} ({appt.specialization || 'Specialist'})</span>
                          </div>
                          <p className="text-slate-700">
                            <strong>Scheduled:</strong> {appt.preferred_date || 'Upcoming'} {appt.slot_time ? `at ${appt.slot_time}` : ''} &bull; Mode: <strong>{appt.consultation_mode || 'IN_PERSON'}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('appointments')}
                          className="px-3 py-1.5 rounded-xl bg-white text-[#0D9488] font-bold border border-teal-300 hover:bg-teal-100 transition shrink-0"
                        >
                          View Instructions
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Grounded Clinical Assistant */}
                <div className="bg-gradient-to-br from-[#E8F5F2] to-white border border-teal-200 rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-[#0D9488]">
                    <Sparkles className="w-5 h-5" />
                    <h4 className="font-extrabold text-[#102A43] text-sm">AI Emergency Summary</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Emergency triage summary generated from your stored records:
                  </p>

                  <div className="p-3.5 bg-white rounded-2xl border border-teal-100 space-y-2 text-xs">
                    <p className="font-bold text-[#102A43]">Triage Clinical Highlights:</p>
                    <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside">
                      <li>Blood Group: <strong className="text-rose-600">{patientData?.blood_group || 'O+'}</strong></li>
                      <li>
                        Critical Allergies: {allergies.length > 0 ? (
                          <strong className="text-rose-600">{allergies.map((a) => a.allergen).join(', ')}</strong>
                        ) : 'No drug allergies documented.'}
                      </li>
                      <li>
                        Active Medications: {medications.length > 0 ? (
                          <strong className="text-slate-800">{medications.map((m) => m.medicine_name).join(', ')}</strong>
                        ) : 'None recorded.'}
                      </li>
                    </ul>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 leading-tight">
                    <strong>Medical Notice:</strong> This summary reflects only what has been recorded. Missing records will show as not documented.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE: UNIFIED CLINICAL RECORDS                                       */}
          {/* ========================================================================= */}
          {activeTab === 'clinical-records' && (
            <ClinicalRecordsTab
              allergies={allergies}
              medications={medications}
              conditions={conditions}
              surgeries={surgeries}
              consultations={patientConsultations}
              documents={documents}
              onRefresh={loadData}
              showToast={showToast}
            />
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 2: MY PROFILE & EMERGENCY CONTACTS                              */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Completeness Checklist */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#102A43]">Profile Completeness & Quality Checklist</h3>
                    <p className="text-xs text-slate-500">Evaluates personal safety and emergency contact documentation.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                        style={{ width: `${profileCompleteness?.score || 85}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-xs text-[#0D9488]">{profileCompleteness?.score || 85}% Ready</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {profileCompleteness?.completed_fields?.map((f: string) => (
                    <div key={f} className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {profileCompleteness?.missing_fields?.map((f: string) => (
                    <div key={f} className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Missing: {f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Details Form */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-lg font-black text-[#102A43]">Personal Details & Safety Directives</h3>
                    <p className="text-xs text-slate-500">You may edit permitted personal details and emergency instructions.</p>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Edit2 className="w-4 h-4" /> Edit Details
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-[#102A43] mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        disabled
                        value={patientData?.full_name || ''}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Government ID locked</span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#102A43] mb-1">Contact Phone Number *</label>
                      <input
                        type="tel"
                        disabled={!isEditingProfile}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#102A43] mb-1">Blood Group (Clinician Verified)</label>
                      <input
                        type="text"
                        disabled
                        value={patientData?.blood_group || 'O+'}
                        className="w-full p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-bold cursor-not-allowed"
                      />
                      <span className="text-[10px] text-rose-600 mt-1 block">Managed by certified laboratory</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#102A43] mb-1">Residential Address *</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#102A43] mb-1">First Responder Emergency Notes</label>
                      <input
                        type="text"
                        disabled={!isEditingProfile}
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        placeholder="e.g. Speaks English/Hindi, carries EpiPen in handbag"
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!isEditingProfile}
                        checked={editOrganDonor}
                        onChange={(e) => setEditOrganDonor(e.target.checked)}
                        className="w-4 h-4 text-[#0D9488] rounded disabled:opacity-60"
                      />
                      <span>Registered Organ Donor</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!isEditingProfile}
                        checked={editDnr}
                        onChange={(e) => setEditDnr(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded disabled:opacity-60"
                      />
                      <span>DNR (Do Not Resuscitate) Order</span>
                    </label>
                  </div>

                  {isEditingProfile && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition shadow-xs"
                      >
                        Save Personal Details
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Strict Clinician Authorship Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Clinician-Managed Directives Policy:</strong> In compliance with health data governance rules, patients cannot directly edit diagnoses, allergies, surgeries, or prescriptions. To correct a clinical entry, submit a review request to your attending physician.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 3: MY MEDICAL HISTORY TIMELINE                                  */}
          {/* ========================================================================= */}
          {(activeTab === 'medical-history' || activeTab === 'history') && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Chronological Medical Timeline</h3>
                  <p className="text-xs text-slate-500">Unified audit-provenance stream across conditions, allergies, prescriptions, and procedures.</p>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-1.5 bg-[#F4F7FA] p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                  {['ALL', 'CONDITION', 'ALLERGY', 'MEDICATION', 'SURGERY', 'VISIT'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTimelineCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl transition ${
                        timelineCategory === cat ? 'bg-[#0D9488] text-white shadow-2xs' : 'text-slate-600 hover:text-[#102A43]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Items */}
              <div className="space-y-4">
                {filteredTimeline.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No clinical records found for the selected category.
                  </div>
                ) : (
                  filteredTimeline.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-[#0D9488]/40 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.type === 'ALLERGY' ? 'bg-rose-100 text-rose-800' :
                            item.type === 'CONDITION' ? 'bg-amber-100 text-amber-800' :
                            item.type === 'MEDICATION' ? 'bg-emerald-100 text-emerald-800' :
                            item.type === 'SURGERY' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type}
                          </span>
                          <span className="font-extrabold text-sm text-[#102A43]">{item.title}</span>
                          {item.severity === 'CRITICAL' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold text-[9px] animate-pulse">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700">{item.details}</p>
                      </div>

                      <div className="font-mono text-slate-500 font-bold text-[11px] shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        {new Date(item.date).toLocaleDateString() !== 'Invalid Date' ? new Date(item.date).toLocaleDateString() : item.date}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 4: CONDITIONS & DIAGNOSES                                       */}
          {/* ========================================================================= */}
          {activeTab === 'conditions' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Diagnosed Medical Conditions</h3>
                  <p className="text-xs text-slate-500">Clinician-authored pathology records with permanent audit provenance.</p>
                </div>
                <span className="font-mono text-xs font-bold text-[#0D9488] bg-[#E8F5F2] px-3 py-1 rounded-full border border-teal-200">
                  {conditions.length} Documented
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {conditions.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No medical conditions documented in your record.
                  </div>
                ) : (
                  conditions.map((c) => (
                    <div key={c.id} className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-[#102A43]">{c.condition_name}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          c.status === 'Active' || c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {c.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-slate-600">{c.notes || 'No supplementary physician remarks recorded.'}</p>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Diagnosis Date: {c.diagnosis_date || 'Documented'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 5: ALLERGIES & ADVERSE REACTIONS                                */}
          {/* ========================================================================= */}
          {activeTab === 'allergies' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Documented Allergies & Anaphylaxis Warnings</h3>
                  <p className="text-xs text-slate-500">Life-critical allergen alerts highlighted for emergency responders.</p>
                </div>
                <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  {allergies.length} Critical Flags
                </span>
              </div>

              <div className="space-y-3">
                {allergies.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No known drug or environmental allergies documented.
                  </div>
                ) : (
                  allergies.map((a) => (
                    <div key={a.id} className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span className="font-black text-sm text-[#102A43]">{a.allergen}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            {a.severity || 'Severe'}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Adverse Reaction:</strong> {a.reaction || 'Anaphylactic airway compromise / Acute urticaria'}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-rose-200 font-bold shrink-0">
                        Level-3 Alert Active
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 6: MEDICATIONS & PRESCRIPTIONS                                  */}
          {/* ========================================================================= */}
          {(activeTab === 'medications' || activeTab === 'current') && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Medications & Active Prescriptions</h3>
                  <p className="text-xs text-slate-500">Current treatment regimens, daily dosages, and doctor prescriptions.</p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {medications.length} Active Prescriptions
                </span>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {medications.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No active medications recorded.
                  </div>
                ) : (
                  medications.map((m) => (
                    <div key={m.id} className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-[#102A43]">{m.medicine_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {m.dosage}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <strong>Frequency:</strong> {m.frequency || 'Daily with meals'} &bull; <strong>Route:</strong> {m.route || 'Oral'}
                      </p>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Started: {m.start_date || 'Active'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 7: SURGERIES & PROCEDURES                                       */}
          {/* ========================================================================= */}
          {activeTab === 'surgeries' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Surgeries & Surgical Procedures</h3>
                  <p className="text-xs text-slate-500">Verified inpatient surgical operations, dates, and performing clinicians.</p>
                </div>
                <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                  {surgeries.length} Procedures
                </span>
              </div>

              <div className="space-y-3">
                {surgeries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No surgical procedures documented in patient history.
                  </div>
                ) : (
                  surgeries.map((s) => (
                    <div key={s.id} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-black text-sm text-[#102A43]">{s.procedure_name}</span>
                        <p className="text-slate-600">{s.notes || 'Procedure successfully concluded without complications.'}</p>
                        <p className="text-slate-400 text-[11px]">
                          <strong>Facility:</strong> {s.hospital || 'AIIMS General Surgery'} &bull; <strong>Surgeon:</strong> {s.surgeon || 'Senior Attending Surgeon'}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-bold shrink-0">
                        {s.surgery_date || 'Past Record'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 8: CONSULTATIONS & REPORTS                                      */}
          {/* ========================================================================= */}
          {activeTab === 'consultations-reports' && (
            <div className="space-y-6">
              {/* Document Upload Card */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-base font-black text-[#102A43]">Archive New Diagnostic Report or Bill</h3>
                  <p className="text-xs text-slate-500">Upload lab reports, discharge summaries, or medication invoices securely.</p>
                </div>

                <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-[#102A43] mb-1">Document Title *</label>
                    <input
                      type="text"
                      value={docUploadTitle}
                      onChange={(e) => setDocUploadTitle(e.target.value)}
                      required
                      placeholder="e.g. ECG Diagnostic Trace, Complete Blood Count, Pharmacy Invoice"
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Document Category</label>
                    <select
                      value={docUploadType}
                      onChange={(e) => setDocUploadType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                    >
                      <option value="LAB_REPORT">Laboratory Report</option>
                      <option value="MEDICATION_BILL">Pharmacy / Medication Bill</option>
                      <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                      <option value="PRESCRIPTION_RECEIPT">Prescription Receipt</option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="file"
                      id="docFile"
                      onChange={(e) => setDocUploadFile(e.target.files ? e.target.files[0] : null)}
                      required
                      className="hidden"
                    />
                    <label
                      htmlFor="docFile"
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" /> {docUploadFile ? docUploadFile.name.slice(0, 15) + '...' : 'Choose File'}
                    </label>
                  </div>

                  <div className="md:col-span-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUploadingDoc || !docUploadFile}
                      className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
                    >
                      {isUploadingDoc ? 'Uploading File...' : 'Upload & Archive Document'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Document Library Table */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-2xs space-y-4">
                <h4 className="font-extrabold text-[#102A43] text-sm">Archived Medical Documents & Lab Reports</h4>
                <div className="space-y-3 text-xs">
                  {documents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    documents.map((d) => (
                      <div key={d.id} className="p-3.5 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-[#0D9488]" />
                          <div>
                            <p className="font-bold text-[#102A43]">{d.title}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Type: {d.document_type} &bull; Size: {(d.file_size / 1024).toFixed(1)} KB &bull; Uploaded: {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/v1/patients/me/documents/${d.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#0D9488] text-white font-bold text-xs hover:bg-[#14B8A6] transition flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(d.id)}
                            className="p-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 9: APPOINTMENTS QUEUE                                           */}
          {/* ========================================================================= */}
          {activeTab === 'appointments' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">My Doctor Appointments & Queue</h3>
                  <p className="text-xs text-slate-500">Track pending, confirmed, and historical consultations with verified specialists.</p>
                </div>
                <button
                  onClick={() => setActiveTab('find-doctor')}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Book New Appointment
                </button>
              </div>

              <div className="space-y-3">
                {patientConsultations.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No appointments scheduled yet. Select "Book New Appointment" to browse the verified doctor directory.
                  </div>
                ) : (
                  patientConsultations.map((c) => (
                    <div key={c.id} className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#102A43]">Dr. {c.doctor_name || 'Attending Physician'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                            {c.specialization || 'Specialist'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            c.status === 'CONFIRMED' || c.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                            c.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            c.status === 'CANCELLED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Reason:</strong> {c.reason} &bull; <strong>Date:</strong> {c.preferred_date || 'Flexible'} {c.slot_time ? `(${c.slot_time})` : ''} &bull; Mode: <strong>{c.consultation_mode || 'IN_PERSON'}</strong>
                        </p>
                        {c.doctor_response && (
                          <p className="text-emerald-700 font-medium">Doctor Response: {c.doctor_response}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(c.status === 'PENDING' || c.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleCancelAppointment(c.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold transition text-xs"
                          >
                            Cancel Appointment
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 10: FIND A DOCTOR (VERIFIED DIRECTORY)                           */}
          {/* ========================================================================= */}
          {activeTab === 'find-doctor' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Verified Physician Directory</h3>
                  <p className="text-xs text-slate-500">
                    Only doctors who have passed administrative verification and possess active medical licenses are shown.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDoctorSearch('');
                      setDoctorSpecFilter('');
                      setDoctorHospitalFilter('');
                      fetchVerifiedDoctors('', '', '');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => fetchVerifiedDoctors()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
                  </button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value);
                      fetchVerifiedDoctors(e.target.value, doctorSpecFilter, doctorHospitalFilter);
                    }}
                    placeholder="Search doctor by name, qualification..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={doctorSpecFilter}
                    onChange={(e) => {
                      setDoctorSpecFilter(e.target.value);
                      fetchVerifiedDoctors(doctorSearch, e.target.value, doctorHospitalFilter);
                    }}
                    placeholder="Filter by Specialization (e.g. Cardiology)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={doctorHospitalFilter}
                    onChange={(e) => {
                      setDoctorHospitalFilter(e.target.value);
                      fetchVerifiedDoctors(doctorSearch, doctorSpecFilter, e.target.value);
                    }}
                    placeholder="Filter by Hospital / Clinic..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                  />
                </div>
              </div>

              {/* Verified Doctors Grid or Exact No-Doctor State */}
              {verifiedDoctors.length === 0 ? (
                /* EXACT SPECIFIED EMPTY STATE */
                <div className="p-12 text-center bg-[#F4F7FA] rounded-3xl border border-dashed border-slate-300 space-y-4 max-w-2xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0D9488] flex items-center justify-center mx-auto border border-teal-200">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-[#102A43]">
                      No doctors are currently available for consultation. Please check again later.
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                      Medora displays only doctors who have completed professional verification and are currently eligible to accept consultations. No matching doctors are available at the moment.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => fetchVerifiedDoctors()}
                      className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-xs transition"
                    >
                      Refresh Directory
                    </button>
                    {(doctorSearch || doctorSpecFilter || doctorHospitalFilter) && (
                      <button
                        onClick={() => {
                          setDoctorSearch('');
                          setDoctorSpecFilter('');
                          setDoctorHospitalFilter('');
                          fetchVerifiedDoctors('', '', '');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {verifiedDoctors.map((doc) => (
                    <div key={doc.id} className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-3 hover:border-[#0D9488] transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#102A43]">Dr. {doc.full_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#0D9488] mt-0.5">{doc.specialization}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{doc.medical_qualification} &bull; {doc.years_of_experience || 10}+ Years Exp.</p>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setSelectedDoctorObj(doc);
                            setNewConsultModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-xs transition"
                        >
                          Book Appointment
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-600">
                        <span>Facility: <strong>{doc.hospital_name || 'AIIMS'}</strong></span>
                        <span className="font-mono text-emerald-700 font-bold">OPD & Teleconsult</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 11: MY REQUESTS & FOLLOW-UPS                                    */}
          {/* ========================================================================= */}
          {(activeTab === 'my-requests' || activeTab === 'consultations') && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Patient-Initiated Requests</h3>
                  <p className="text-xs text-slate-500">Record reviews, second opinions, and clinical consultation requests.</p>
                </div>
                <button
                  onClick={() => setActiveTab('find-doctor')}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] text-white font-bold text-xs hover:bg-[#14B8A6] transition"
                >
                  New Request
                </button>
              </div>

              <div className="space-y-3">
                {patientConsultations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No active requests submitted.
                  </div>
                ) : (
                  patientConsultations.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#102A43]">{r.request_type}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-slate-600">Dr. {r.doctor_name} &bull; {r.reason}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 12: DOCTOR ACCESS REQUESTS                                      */}
          {/* ========================================================================= */}
          {activeTab === 'access-requests' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Doctor Medical-Record Access Requests</h3>
                  <p className="text-xs text-slate-500">Review and manage physician requests to access your protected clinical records.</p>
                </div>
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  {pendingAccessReqs.length} Pending Decision
                </span>
              </div>

              {/* PENDING REQUESTS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700">Pending Requests</h4>
                {pendingAccessReqs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No pending doctor access requests at this time.
                  </div>
                ) : (
                  pendingAccessReqs.map((req: any) => (
                    <div key={req.id} className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#102A43]">{req.doctor_name || 'Attending Physician'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">PENDING</span>
                          </div>
                          {req.hospital_name && <p className="text-slate-500 text-[11px]">{req.hospital_name}</p>}
                          <p className="text-slate-700 mt-1"><strong>Reason:</strong> {req.reason || 'Routine clinical history review'}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReviewAccess(req.id, 'APPROVED')}
                            className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition shadow-xs text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewAccess(req.id, 'REJECTED')}
                            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold transition text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ACTIVE CONSENTS with Revoke */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Approved &amp; Active Consents</h4>
                {activeConsents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No active consent grants. Approve a pending request to grant access.
                  </div>
                ) : (
                  activeConsents.map((c: any) => (
                    <div key={c.id} className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#102A43]">{c.doctor_name || 'Physician'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">ACTIVE</span>
                          </div>
                          {c.hospital_name && <p className="text-slate-500 text-[11px]">{c.hospital_name}</p>}
                          <p className="text-slate-500 text-[11px] mt-0.5">Expires: {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeConsent(c.id)}
                          className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold transition text-xs shrink-0"
                        >
                          Revoke Access
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* COMPLETE REQUEST HISTORY — non-pending resolved requests */}
              {allAccessReqs.filter((r: any) => r.status !== 'PENDING').length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-t border-slate-200 pt-4">Request History</h4>
                  {allAccessReqs.filter((r: any) => r.status !== 'PENDING').map((req: any) => {
                    const statusStyle: Record<string, string> = {
                      APPROVED: 'bg-emerald-100 text-emerald-800',
                      REJECTED: 'bg-rose-100 text-rose-800',
                      REVOKED: 'bg-slate-200 text-slate-600',
                      EXPIRED: 'bg-orange-100 text-orange-700',
                    };
                    const sStyle = statusStyle[req.status] || 'bg-slate-100 text-slate-600';
                    return (
                      <div key={req.id} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#102A43]">{req.doctor_name || 'Physician'}</span>
                          {req.hospital_name && <span className="text-slate-400 text-[11px]">{req.hospital_name}</span>}
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${sStyle}`}>{req.status}</span>
                        </div>
                        <p className="text-slate-600"><strong>Reason:</strong> {req.reason}</p>
                        <p className="text-slate-400 text-[11px]">
                          Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : 'N/A'}
                          {req.reviewed_at && <span> &bull; Reviewed: {new Date(req.reviewed_at).toLocaleString()}</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 13: CONSENT & PRIVACY MANAGEMENT                                */}
          {/* ========================================================================= */}
          {(activeTab === 'consent-privacy' || activeTab === 'consents') && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Active Consent Grants & Instant Revocation</h3>
                  <p className="text-xs text-slate-500">Physicians you have authorized to access your medical records.</p>
                </div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  {activeConsents.length} Active Grants
                </span>
              </div>

              <div className="space-y-3">
                {activeConsents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No active consent grants. Your medical history is completely locked from outside inspection.
                  </div>
                ) : (
                  activeConsents.map((c) => (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#102A43]">Dr. {c.doctor_name || 'Physician'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ACTIVE GRANT
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Scope: <strong>{c.scope || 'ALL_CATEGORIES'}</strong> &bull; Valid Until: <strong className="font-mono text-[#0D9488]">{new Date(c.expires_at).toLocaleString()}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleRevokeConsent(c.id)}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-300 transition text-xs flex items-center gap-1.5 shrink-0"
                      >
                        <Lock className="w-4 h-4" /> Revoke Access Immediately
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 14: MEDICAL QR CARD                                              */}
          {/* ========================================================================= */}
          {(activeTab === 'emergency-card' || activeTab === 'card' || activeTab === 'register') && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-black text-[#102A43]">Medical QR Card</h3>
                    <p className="text-xs text-slate-500">Secure gateway card. Scanning identifies the patient — clinical records require verified doctor login and patient consent.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiCall('/qr/generate', 'POST');
                          setCardData(res);
                          showToast('QR token regenerated successfully.');
                        } catch (e: any) { showToast(e.message || 'Regeneration failed.', 'error'); }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Regenerate Token
                    </button>
                    <button
                      onClick={generatePDFReport}
                      className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  </div>
                </div>

                {/* Card Visual */}
                <div className="max-w-md mx-auto bg-gradient-to-br from-[#102A43] to-[#1E3A5F] rounded-3xl p-6 text-white shadow-xl space-y-5 border-2 border-[#14B8A6]/40">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-[#14B8A6]" />
                      <span className="font-black text-sm tracking-tight">MEDORA MEDICAL CARD</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      cardData?.token ? 'bg-emerald-600/80 text-white' : 'bg-amber-600/80 text-white'
                    }`}>
                      {cardData?.token ? 'ACTIVE' : 'NOT ISSUED'}
                    </span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="bg-white p-2.5 rounded-2xl shrink-0 shadow-md">
                      {cardData?.qr_image_base64 ? (
                        <img src={cardData.qr_image_base64} alt="Medical QR" className="w-24 h-24 object-contain" />
                      ) : cardData?.qr_code_base64 ? (
                        <img src={cardData.qr_code_base64} alt="Medical QR" className="w-24 h-24 object-contain" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-400 rounded-xl">
                          <QrCode className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-sm text-white">{patientData?.full_name || '—'}</p>
                      <p className="font-mono text-[11px] text-[#14B8A6]">ID: {patientData?.unique_patient_id || '—'}</p>
                      {cardData?.expires_at && (
                        <p className="text-slate-400 text-[10px]">
                          Expires: {new Date(cardData.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono">
                    Secure opaque token — no medical data encoded in QR
                  </div>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 leading-relaxed max-w-2xl mx-auto text-center">
                  Scanning this QR provides only a secure token. Clinical records remain protected and require a verified physician to log in, submit an access request, and obtain patient consent.
                  <br /><strong>Full emergency access is handled via the Medora mobile app.</strong>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 15: ACCESS HISTORY & AUDIT TRANSPARENCY                         */}
          {/* ========================================================================= */}
          {activeTab === 'access-history' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Access History & Immutable Audit Trail</h3>
                  <p className="text-xs text-slate-500">Every access, emergency override, and consent revocation is logged in the audit trail.</p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {accessHistory.length} Logged Events
                </span>
              </div>

              <div className="space-y-3">
                {accessHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No access history records found.
                  </div>
                ) : (
                  accessHistory.map((item: any) => {
                    const actionColor = (a: string) => {
                      if (a.includes('EMERGENCY') || a.includes('BREAK_GLASS')) return 'bg-rose-100 text-rose-800';
                      if (a === 'CONSENT_GRANTED' || a === 'ACCESS_GRANTED') return 'bg-emerald-100 text-emerald-800';
                      if (a === 'CONSENT_REJECTED') return 'bg-orange-100 text-orange-800';
                      if (a === 'CONSENT_REVOKED') return 'bg-red-100 text-red-800';
                      if (a === 'ACCESS_REQUESTED') return 'bg-blue-100 text-blue-800';
                      if (a === 'ACCESS_DENIED') return 'bg-rose-50 text-rose-700';
                      return 'bg-slate-100 text-slate-600';
                    };
                    const humanLabel: Record<string, string> = {
                      ACCESS_REQUESTED: 'Access Requested',
                      CONSENT_GRANTED: 'Consent Approved',
                      CONSENT_REJECTED: 'Consent Rejected',
                      CONSENT_REVOKED: 'Access Revoked',
                      ACCESS_DENIED: 'Access Denied',
                      EMERGENCY_BREAK_GLASS: 'Emergency Override',
                      RECORD_VIEW: 'Record Viewed',
                      LOGIN: 'Login',
                      QR_SCANNED: 'QR Scanned',
                    };
                    return (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${actionColor(item.action)}`}>
                              {humanLabel[item.action] || item.action}
                            </span>
                            {item.actor_name && item.actor_name !== 'Staff' && (
                              <span className="font-semibold text-[#102A43]">{item.actor_name}</span>
                            )}
                            {item.actor_role && (
                              <span className="text-slate-400 text-[10px]">({item.actor_role})</span>
                            )}
                          </div>
                          {item.details && (
                            <p className="text-slate-700 font-medium">{item.details}</p>
                          )}
                          {item.reason && item.reason !== item.details && (
                            <p className="text-slate-500">{item.reason}</p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 font-bold shrink-0">
                        {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 16: NOTIFICATIONS CENTER                                        */}
          {/* ========================================================================= */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#102A43]">Notifications & Safety Dispatch</h3>
                  <p className="text-xs text-slate-500">Real-time alerts for doctor requests, appointment changes, and security events.</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] text-white font-bold text-xs hover:bg-[#14B8A6] transition"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No notifications available.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs transition ${
                      n.is_read ? 'bg-[#F4F7FA] border-slate-200 text-slate-600' : 'bg-teal-50/60 border-teal-200 text-[#102A43]'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bell className={`w-4 h-4 ${n.is_read ? 'text-slate-400' : 'text-[#0D9488]'}`} />
                          <span className="font-bold text-sm">{n.title}</span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                          )}
                        </div>
                        <p className="text-slate-700">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 17: SETTINGS & PRIVACY DIRECTIVES                               */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Password Change Card */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-base font-black text-[#102A43]">Account Password & Security</h3>
                  <p className="text-xs text-slate-500">Update your secret password with current verification.</p>
                </div>

                <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Current Password *</label>
                    <input
                      type="password"
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">New Password (Min 8 chars) *</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs shadow-xs transition"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-4">
                <h4 className="font-extrabold text-[#102A43] text-sm">Notification Channels & Safety Dispatch</h4>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F7FA] border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-[#102A43]">Emergency Break-Glass SMS & Email Alerts</p>
                      <p className="text-slate-500 text-[11px]">Instant dispatch to registered emergency contacts when Level 3 triage is triggered.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifSmsAlerts}
                      onChange={(e) => setNotifSmsAlerts(e.target.checked)}
                      className="w-4 h-4 text-[#0D9488]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F7FA] border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-[#102A43]">Doctor Outpatient Access Prompts</p>
                      <p className="text-slate-500 text-[11px]">Receive push notification when a doctor requests Level 2 consent.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifDoctorPrompts}
                      onChange={(e) => setNotifDoctorPrompts(e.target.checked)}
                      className="w-4 h-4 text-[#0D9488]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F7FA] border border-slate-200 cursor-pointer">
                    <div>
                      <p className="font-bold text-[#102A43]">Appointment Confirmations & Reminders</p>
                      <p className="text-slate-500 text-[11px]">Updates when a physician accepts, confirms, or reschedules an appointment slot.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifEmailAlerts}
                      onChange={(e) => setNotifEmailAlerts(e.target.checked)}
                      className="w-4 h-4 text-[#0D9488]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE 18: HELP & SUPPORT                                              */}
          {/* ========================================================================= */}
          {activeTab === 'help-support' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-2xs space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-black text-[#102A43]">Help & Support</h3>
                <p className="text-xs text-slate-500">Understand how your medical privacy is guarded under the Medora platform.</p>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                <div className="p-4 bg-[#F4F7FA] rounded-2xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-sm text-[#102A43]">1. What does the public QR scan show?</h4>
                  <p>
                    When anyone scans your physical emergency card without verified physician credentials, they only see your name, emergency patient ID, and a security barrier. Zero clinical records, allergies, or diagnoses are leaked.
                  </p>
                </div>

                <div className="p-4 bg-[#F4F7FA] rounded-2xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-sm text-[#102A43]">2. How does Level 3 Emergency Break-Glass work?</h4>
                  <p>
                    In life-threatening situations where you are unconscious, a verified ER doctor can activate Break-Glass. They must document a clinical justification under medical licensure regulations. A 15-minute timer starts, emergency contacts are alerted, and the event is permanently logged in the audit trail.
                  </p>
                </div>

                <div className="p-4 bg-[#F4F7FA] rounded-2xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-sm text-[#102A43]">3. Can I revoke a doctor's access anytime?</h4>
                  <p>
                    Yes. Under <strong>Consent & Privacy</strong>, click "Revoke Access Immediately" next to any active grant. The physician will be locked out on their next request.
                  </p>
                </div>

                <div className="p-4 bg-[#F4F7FA] rounded-2xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-sm text-[#102A43]">4. Can I change my medical diagnoses?</h4>
                  <p>
                    No. To ensure absolute data integrity and trust in hospital emergencies, clinical diagnoses, allergy flags, and prescriptions can only be authored and modified by verified attending doctors. You can self-manage personal contact numbers, residential address, and organ donor directives.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL: BOOK APPOINTMENT                                                  */}
        {/* ========================================================================= */}
        {newConsultModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E8F5F2] rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-[#102A43]">Book Consultation Appointment</h4>
                  <p className="text-xs text-slate-500">Submit an appointment request to an administratively verified physician.</p>
                </div>
                <button onClick={() => setNewConsultModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  &times;
                </button>
              </div>

              <form onSubmit={handleRequestAppointment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Select Verified Doctor *</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setSelectedDoctorId(val);
                      const doc = verifiedDoctors.find((d) => d.id === val);
                      setSelectedDoctorObj(doc || null);
                    }}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                  >
                    <option value="">-- Choose verified specialist --</option>
                    {verifiedDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.full_name} ({doc.specialization} &bull; {doc.hospital_name || 'Hospital'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Consultation Mode *</label>
                    <select
                      value={consultMode}
                      onChange={(e) => setConsultMode(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                    >
                      <option value="IN_PERSON">In-Person OPD Visit</option>
                      <option value="TELE_CONSULTATION">Tele-Consultation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Consultation Type</label>
                    <select
                      value={consultType}
                      onChange={(e) => setConsultType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                    >
                      <option value="CONSULTATION">OPD Consultation</option>
                      <option value="FOLLOW_UP">Follow-Up Review</option>
                      <option value="SECOND_OPINION">Second Opinion</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Preferred Date *</label>
                    <input
                      type="date"
                      value={consultPrefDate}
                      onChange={(e) => setConsultPrefDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Available Slot *</label>
                    <select
                      value={consultSlotTime}
                      onChange={(e) => setConsultSlotTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                    >
                      <option value="09:00 AM">09:00 AM (Morning)</option>
                      <option value="11:30 AM">11:30 AM (Mid-Morning)</option>
                      <option value="02:00 PM">02:00 PM (Afternoon)</option>
                      <option value="04:30 PM">04:30 PM (Evening)</option>
                      <option value="06:00 PM">06:00 PM (Late OPD)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Clinical Reason / Symptoms *</label>
                  <textarea
                    rows={2}
                    value={consultReason}
                    onChange={(e) => setConsultReason(e.target.value)}
                    required
                    placeholder="Describe your health symptoms, clinical objective, or reason for appointment..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Optional Message for Doctor</label>
                  <input
                    type="text"
                    value={consultMessage}
                    onChange={(e) => setConsultMessage(e.target.value)}
                    placeholder="e.g. Bringing previous lab reports, prefers phone briefing"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-[#102A43] font-medium text-xs"
                  />
                </div>

                <div className="p-3 bg-[#E8F5F2] rounded-xl text-slate-700 text-[11px] leading-relaxed">
                  <strong>Note:</strong> Booking an appointment does not automatically grant this physician access to your complete medical history. The doctor must separately request access for your consent.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setNewConsultModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition shadow-xs"
                  >
                    Submit Appointment Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
