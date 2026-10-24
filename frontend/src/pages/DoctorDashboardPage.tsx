import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Pill,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Bell,
  User,
  Settings,
  Search,
  Lock,
  Unlock,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Database,
  LogOut,
  Flame,
  Activity,
  RefreshCw,
  FileClock,
  HeartHandshake,
  Award,
  QrCode,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Trash2,
  Filter,
  Info,
  X,
  Check
} from 'lucide-react';
import { apiCall, setAuthToken, getAuthToken } from '../api';

const DEFAULT_CATALOGUE: Record<string, { category: string; icd_code: string; medicines: Array<{ name: string; formulation: string; default_dosage: string; default_frequency: string; default_route: string; default_duration: string; instructions: string }> }> = {
  "Hypertension (High Blood Pressure)": {
    category: "Cardiovascular",
    icd_code: "I10",
    medicines: [
      { name: "Telmisartan", formulation: "40mg Tablet", default_dosage: "40mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take in the morning with water" },
      { name: "Amlodipine", formulation: "5mg Tablet", default_dosage: "5mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take at night" },
      { name: "Losartan", formulation: "50mg Tablet", default_dosage: "50mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take with or without food" },
      { name: "Hydrochlorothiazide", formulation: "12.5mg Tablet", default_dosage: "12.5mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take in the morning to avoid nocturia" },
      { name: "Metoprolol Succinate", formulation: "25mg Extended-Release Tablet", default_dosage: "25mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Swallow whole, do not crush" },
      { name: "Enalapril", formulation: "5mg Tablet", default_dosage: "5mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Monitor for persistent dry cough" }
    ]
  },
  "Type 2 Diabetes Mellitus": {
    category: "Endocrine / Metabolic",
    icd_code: "E11",
    medicines: [
      { name: "Metformin", formulation: "500mg Extended-Release Tablet", default_dosage: "500mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "30 days", instructions: "Take with or immediately after meals" },
      { name: "Glimepiride", formulation: "1mg Tablet", default_dosage: "1mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take before breakfast" },
      { name: "Sitagliptin", formulation: "50mg Tablet", default_dosage: "50mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take with or without food" },
      { name: "Empagliflozin", formulation: "10mg Tablet", default_dosage: "10mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Drink adequate water throughout the day" },
      { name: "Dapagliflozin", formulation: "10mg Tablet", default_dosage: "10mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take in the morning" },
      { name: "Insulin Glargine", formulation: "100 units/mL Subcutaneous Solution", default_dosage: "10 units", default_frequency: "Once at bedtime (HS)", default_route: "Subcutaneous", default_duration: "30 days", instructions: "Rotate subcutaneous injection sites" }
    ]
  },
  "Bronchial Asthma / COPD": {
    category: "Respiratory",
    icd_code: "J45",
    medicines: [
      { name: "Salbutamol (Albuterol)", formulation: "100mcg/puff MDI Inhaler", default_dosage: "2 puffs", default_frequency: "As needed (PRN)", default_route: "Inhalation", default_duration: "30 days", instructions: "Use with spacer for acute breathlessness" },
      { name: "Budesonide", formulation: "200mcg Inhalation Aerosol", default_dosage: "1 puff", default_frequency: "Twice daily (BD)", default_route: "Inhalation", default_duration: "30 days", instructions: "Rinse mouth with water after inhalation" },
      { name: "Formoterol + Budesonide", formulation: "6mcg/200mcg DPI Dry Powder", default_dosage: "1 inhalation", default_frequency: "Twice daily (BD)", default_route: "Inhalation", default_duration: "30 days", instructions: "Inhale deeply and rinse mouth" },
      { name: "Montelukast", formulation: "10mg Tablet", default_dosage: "10mg", default_frequency: "Once at bedtime (HS)", default_route: "Oral", default_duration: "30 days", instructions: "Take in the evening" }
    ]
  },
  "Bacterial Respiratory / Systemic Infection": {
    category: "Infectious Disease",
    icd_code: "J06",
    medicines: [
      { name: "Amoxicillin-Clavulanate (Augmentin)", formulation: "625mg Film-Coated Tablet", default_dosage: "625mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "5-7 days", instructions: "Complete full prescribed course with meals" },
      { name: "Azithromycin", formulation: "500mg Tablet", default_dosage: "500mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "3-5 days", instructions: "Take 1 hour before or 2 hours after meals" },
      { name: "Cefixime", formulation: "200mg Tablet", default_dosage: "200mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "5-7 days", instructions: "Take after meals" },
      { name: "Doxycycline", formulation: "100mg Capsule", default_dosage: "100mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "7 days", instructions: "Take with a full glass of water, remain upright for 30m" }
    ]
  },
  "Gastroesophageal Reflux Disease (GERD) & Gastritis": {
    category: "Gastroenterology",
    icd_code: "K21",
    medicines: [
      { name: "Pantoprazole", formulation: "40mg Gastro-Resistant Tablet", default_dosage: "40mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "14 days", instructions: "Take 30-60 minutes before breakfast" },
      { name: "Omeprazole", formulation: "20mg Capsule", default_dosage: "20mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "14 days", instructions: "Take before the first meal of the day" },
      { name: "Rabeprazole", formulation: "20mg Tablet", default_dosage: "20mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "14 days", instructions: "Take on an empty stomach" },
      { name: "Sucralfate", formulation: "1g/5mL Oral Suspension", default_dosage: "10mL", default_frequency: "Three times daily (TDS)", default_route: "Oral", default_duration: "7 days", instructions: "Take 1 hour before meals and at bedtime" }
    ]
  },
  "Coronary Artery Disease & Dyslipidemia": {
    category: "Cardiovascular",
    icd_code: "I25",
    medicines: [
      { name: "Atorvastatin", formulation: "20mg Tablet", default_dosage: "20mg", default_frequency: "Once at bedtime (HS)", default_route: "Oral", default_duration: "30 days", instructions: "Take at night" },
      { name: "Rosuvastatin", formulation: "10mg Tablet", default_dosage: "10mg", default_frequency: "Once at bedtime (HS)", default_route: "Oral", default_duration: "30 days", instructions: "Take once daily with or without food" },
      { name: "Aspirin (Ecosprin)", formulation: "75mg Gastro-Resistant Tablet", default_dosage: "75mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take after meals to reduce stomach irritation" },
      { name: "Clopidogrel", formulation: "75mg Tablet", default_dosage: "75mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30 days", instructions: "Take with or without food" }
    ]
  },
  "Acute Pain & Musculoskeletal Inflammation": {
    category: "Orthopedics / Rheumatology",
    icd_code: "M79",
    medicines: [
      { name: "Paracetamol (Acetaminophen)", formulation: "650mg Tablet", default_dosage: "650mg", default_frequency: "Three times daily (TDS)", default_route: "Oral", default_duration: "3-5 days", instructions: "Take after meals, do not exceed 3g in 24 hours" },
      { name: "Ibuprofen", formulation: "400mg Tablet", default_dosage: "400mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "3-5 days", instructions: "Always take with or after food" },
      { name: "Diclofenac Sodium", formulation: "50mg Enteric-Coated Tablet", default_dosage: "50mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "3-5 days", instructions: "Take with food; avoid if history of peptic ulcer" },
      { name: "Tramadol", formulation: "50mg Capsule", default_dosage: "50mg", default_frequency: "As needed (PRN)", default_route: "Oral", default_duration: "3 days", instructions: "For severe breakthrough pain only" }
    ]
  },
  "Allergic Rhinitis & Dermatitis": {
    category: "Immunology / Allergy",
    icd_code: "J30",
    medicines: [
      { name: "Cetirizine", formulation: "10mg Tablet", default_dosage: "10mg", default_frequency: "Once at bedtime (HS)", default_route: "Oral", default_duration: "7 days", instructions: "May cause mild drowsiness" },
      { name: "Levocetirizine", formulation: "5mg Tablet", default_dosage: "5mg", default_frequency: "Once at bedtime (HS)", default_route: "Oral", default_duration: "7 days", instructions: "Take at night" },
      { name: "Fexofenadine", formulation: "120mg Tablet", default_dosage: "120mg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "7 days", instructions: "Take with water, avoid taking with fruit juices" },
      { name: "Mometasone Furoate", formulation: "50mcg/actuation Nasal Spray", default_dosage: "2 sprays in each nostril", default_frequency: "Once daily (OD)", default_route: "Intranasal", default_duration: "14 days", instructions: "Shake well before use" }
    ]
  },
  "Hypothyroidism": {
    category: "Endocrinology",
    icd_code: "E03",
    medicines: [
      { name: "Levothyroxine Sodium (50mcg)", formulation: "50mcg Tablet", default_dosage: "50mcg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30-90 days", instructions: "Take first thing in the morning on an empty stomach with plain water, 30-60 mins before breakfast" },
      { name: "Levothyroxine Sodium (75mcg)", formulation: "75mcg Tablet", default_dosage: "75mcg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30-90 days", instructions: "Take on an empty stomach" },
      { name: "Levothyroxine Sodium (100mcg)", formulation: "100mcg Tablet", default_dosage: "100mcg", default_frequency: "Once daily (OD)", default_route: "Oral", default_duration: "30-90 days", instructions: "Take on an empty stomach" }
    ]
  },
  "Migraine & Vascular Headache": {
    category: "Neurology",
    icd_code: "G43",
    medicines: [
      { name: "Sumatriptan", formulation: "50mg Tablet", default_dosage: "50mg", default_frequency: "At onset of headache", default_route: "Oral", default_duration: "As needed", instructions: "Take at first sign of migraine attack; may repeat once after 2 hours if needed" },
      { name: "Naproxen Sodium", formulation: "500mg Tablet", default_dosage: "500mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "3 days", instructions: "Take with food at onset of attack" },
      { name: "Propranolol", formulation: "40mg Tablet", default_dosage: "40mg", default_frequency: "Twice daily (BD)", default_route: "Oral", default_duration: "30 days", instructions: "Prophylactic therapy; take regularly" }
    ]
  }
};

const DOSAGE_UNITS = [
  "500mg", "650mg", "250mg", "100mg", "50mg", "25mg", "20mg", "10mg", "5mg", "2.5mg",
  "1 Tablet", "2 Tablets", "1 Capsule", "5mL", "10mL", "15mL",
  "1 Puff", "2 Puffs", "10 Units", "20 Units", "1 Patch", "As prescribed"
];

const FREQUENCY_OPTIONS = [
  "Once daily (OD)",
  "Twice daily (BD / BID)",
  "Three times daily (TDS / TID)",
  "Four times daily (QID)",
  "Once at bedtime (HS)",
  "Every 8 hours",
  "Every 12 hours",
  "As needed (PRN)",
  "Weekly once"
];

const ROUTE_OPTIONS = [
  "Oral",
  "Sublingual",
  "Inhalation",
  "Subcutaneous",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Topical",
  "Intranasal",
  "Ophthalmic",
  "Otic"
];

const DURATION_OPTIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "30 days",
  "60 days",
  "90 days",
  "Ongoing / Long-term",
  "Single dose"
];

type DoctorSidebarTab =
  | 'dashboard'
  | 'patients'
  | 'qr-scanner'
  | 'records'
  | 'prescriptions'
  | 'consultations'
  | 'access_requests'
  | 'emergency'
  | 'notifications'
  | 'profile'
  | 'settings';

function normalizePatientRecord(data: any): any {
  if (!data) return null;
  if (data.patient) {
    return {
      auth_info: data.auth_info || { auth_type: 'NORMAL_CONSENT' },
      patient: {
        id: data.patient.id || 0,
        full_name: data.patient.full_name || 'Patient',
        unique_patient_id: data.patient.unique_patient_id || 'N/A',
        blood_group: data.patient.blood_group || 'N/A',
        dnr_status: !!data.patient.dnr_status,
        organ_donor: !!data.patient.organ_donor,
        gender: data.patient.gender || '',
        date_of_birth: data.patient.date_of_birth || '',
        phone: data.patient.phone || data.patient.contact_number || '',
        address: data.patient.address || ''
      },
      diagnoses: Array.isArray(data.diagnoses) ? data.diagnoses : (Array.isArray(data.conditions) ? data.conditions : []),
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      current_medications: Array.isArray(data.current_medications) ? data.current_medications : (Array.isArray(data.medications) ? data.medications : []),
      prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
      surgeries: Array.isArray(data.surgeries) ? data.surgeries : [],
      visits: Array.isArray(data.visits) ? data.visits : [],
      emergency_contacts: Array.isArray(data.emergency_contacts) ? data.emergency_contacts : [],
      audit_provenance: Array.isArray(data.audit_provenance) ? data.audit_provenance : []
    };
  }
  return {
    auth_info: { auth_type: data.access_level || 'LEVEL_2_NORMAL' },
    patient: {
      id: data.patient_id || data.id || 0,
      full_name: data.full_name || 'Patient',
      unique_patient_id: data.unique_patient_id || 'N/A',
      blood_group: data.blood_group || 'N/A',
      dnr_status: !!data.dnr_status,
      organ_donor: !!data.organ_donor,
      gender: data.gender || '',
      date_of_birth: data.date_of_birth || '',
      phone: data.phone || '',
      address: data.address || ''
    },
    diagnoses: Array.isArray(data.conditions) ? data.conditions : (Array.isArray(data.diagnoses) ? data.diagnoses : []),
    allergies: Array.isArray(data.allergies) ? data.allergies : [],
    current_medications: Array.isArray(data.medications) ? data.medications : (Array.isArray(data.current_medications) ? data.current_medications : []),
    prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
    surgeries: Array.isArray(data.surgeries) ? data.surgeries : [],
    visits: Array.isArray(data.visits) ? data.visits : [],
    emergency_contacts: Array.isArray(data.emergency_contacts) ? data.emergency_contacts : [],
    audit_provenance: Array.isArray(data.audit_provenance) ? data.audit_provenance : []
  };
}

export default function DoctorDashboardPage() {
  const { Doctor_Name } = useParams<{ Doctor_Name: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DoctorSidebarTab>('patients');
  const [doctorData, setDoctorData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patientPanelCollapsed, setPatientPanelCollapsed] = useState(false);

  // Patient Selection & Directory
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'emergency' | 'pending'>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientRecord, setPatientRecord] = useState<any>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  // Sub-tabs inside Full-Width Clinical Workspace
  const [clinicalTab, setClinicalTab] = useState<
    'summary' | 'diagnoses' | 'allergies' | 'medications' | 'prescriptions' | 'surgeries' | 'notes' | 'provenance'
  >('summary');

  // Break-glass & Emergency Access states
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [reasonCategory, setReasonCategory] = useState('Unconscious Trauma');
  const [certify, setCertify] = useState(true);
  const [emergencyTimeLeft, setEmergencyTimeLeft] = useState(900);

  // QR Scanner state
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [qrScanResult, setQrScanResult] = useState<any>(null);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [qrScanLoading, setQrScanLoading] = useState(false);


  // Consultations, Notifications, Access Requests
  const [consultations, setConsultations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myAccessRequests, setMyAccessRequests] = useState<any[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Prescriptions Management & Clinical Catalogue State
  const [prescriptionsList, setPrescriptionsList] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionSearchQuery, setPrescriptionSearchQuery] = useState('');
  const [prescriptionFilterPatient, setPrescriptionFilterPatient] = useState<number | 'all'>('all');
  const [clinicalCatalogue, setClinicalCatalogue] = useState<any>(null);

  // Structured Prescription & Clinical Entry Modal State
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxEditingId, setRxEditingId] = useState<number | null>(null);
  const [rxPatientId, setRxPatientId] = useState<number | ''>('');
  const [rxVisitDate, setRxVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [rxDiagnosis, setRxDiagnosis] = useState('Hypertension (High Blood Pressure)');
  const [rxCustomDiagnosis, setRxCustomDiagnosis] = useState('');
  const [rxMedicines, setRxMedicines] = useState<Array<{
    name: string;
    isCustom: boolean;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions: string;
  }>>([
    {
      name: 'Telmisartan',
      isCustom: false,
      dosage: '40mg',
      frequency: 'Once daily (OD)',
      duration: '30 days',
      route: 'Oral',
      instructions: 'Take in the morning with water'
    }
  ]);
  const [rxClinicalNotes, setRxClinicalNotes] = useState('');
  const [rxIsCritical, setRxIsCritical] = useState(false);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [rxFormError, setRxFormError] = useState<string | null>(null);
  const [rxWarningNotice, setRxWarningNotice] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadDoctorProfile = async () => {
    try {
      const d = await apiCall('/doctors/me');
      setDoctorData(d);
    } catch {
      setAuthToken(null);
      navigate('/Doctor_dashboard');
    }
  };

  const loadPatients = async () => {
    try {
      const data = await apiCall(`/doctors/patients?search=${encodeURIComponent(searchQuery)}&status_filter=${statusFilter}`);
      setPatientsList(data);
      // Auto-select first patient if none selected
      if (data.length > 0 && selectedPatientId === null) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load patients', err);
    }
  };

  const loadConsultations = async () => {
    try {
      const c = await apiCall('/doctors/me/consultations');
      setConsultations(c);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    try {
      const n = await apiCall('/doctors/me/notifications');
      setNotifications(n);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAccessRequests = async () => {
    try {
      const data = await apiCall('/access/requests/doctor');
      setMyAccessRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load doctor access requests', err);
    }
  };

  const loadClinicalCatalogue = async () => {
    try {
      const cat = await apiCall('/doctors/clinical-catalogue');
      if (cat && cat.catalogue) {
        setClinicalCatalogue(cat);
      }
    } catch (err: any) {
      console.warn('Could not fetch remote clinical catalogue, using local clinical guideline catalogue.', err);
    }
  };

  const loadPrescriptions = async () => {
    setPrescriptionsLoading(true);
    try {
      const data = await apiCall('/doctors/prescriptions');
      setPrescriptionsList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load prescriptions', err);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const handleOpenNewPrescription = (patientId?: number) => {
    setRxEditingId(null);
    const authorizedPatients = patientsList.filter(p => p.is_authorized);
    if (patientId) {
      setRxPatientId(patientId);
    } else if (selectedPatientId && authorizedPatients.some(p => p.id === selectedPatientId)) {
      setRxPatientId(selectedPatientId);
    } else if (authorizedPatients.length > 0) {
      setRxPatientId(authorizedPatients[0].id);
    } else {
      setRxPatientId('');
    }

    setRxVisitDate(new Date().toISOString().split('T')[0]);
    const defaultCondition = "Hypertension (High Blood Pressure)";
    setRxDiagnosis(defaultCondition);
    setRxCustomDiagnosis('');

    const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
    const firstMed = activeCat[defaultCondition]?.medicines?.[0];
    if (firstMed) {
      setRxMedicines([{
        name: firstMed.name,
        isCustom: false,
        dosage: firstMed.default_dosage,
        frequency: firstMed.default_frequency,
        duration: firstMed.default_duration,
        route: firstMed.default_route,
        instructions: firstMed.instructions
      }]);
    } else {
      setRxMedicines([{
        name: '',
        isCustom: true,
        dosage: '500mg',
        frequency: 'Once daily (OD)',
        duration: '30 days',
        route: 'Oral',
        instructions: ''
      }]);
    }

    setRxClinicalNotes('');
    setRxIsCritical(false);
    setRxFormError(null);
    setRxWarningNotice(null);
    setRxModalOpen(true);
  };

  const handleEditPrescription = (pr: any) => {
    setRxEditingId(pr.id);
    setRxPatientId(pr.patient_id);
    setRxVisitDate(pr.visit_date || new Date().toISOString().split('T')[0]);

    const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
    if (activeCat[pr.diagnosis]) {
      setRxDiagnosis(pr.diagnosis);
      setRxCustomDiagnosis('');
    } else {
      setRxDiagnosis('__CUSTOM__');
      setRxCustomDiagnosis(pr.diagnosis);
    }

    if (Array.isArray(pr.medicines) && pr.medicines.length > 0) {
      setRxMedicines(pr.medicines.map((m: any) => {
        const isMapped = activeCat[pr.diagnosis]?.medicines?.some(
          (cm: any) => cm.name.toLowerCase() === (m.name || '').toLowerCase()
        );
        return {
          name: m.name || '',
          isCustom: !isMapped,
          dosage: m.dosage || '500mg',
          frequency: m.frequency || 'Once daily (OD)',
          duration: m.duration || '30 days',
          route: m.route || 'Oral',
          instructions: m.instructions || ''
        };
      }));
    } else {
      setRxMedicines([{
        name: pr.prescription_text || '',
        isCustom: true,
        dosage: 'As prescribed',
        frequency: 'Daily',
        duration: '30 days',
        route: 'Oral',
        instructions: ''
      }]);
    }

    setRxClinicalNotes(pr.clinical_notes || '');
    setRxIsCritical(Boolean(pr.is_critical));
    setRxFormError(null);
    setRxWarningNotice(null);
    setRxModalOpen(true);
  };

  const handleConditionChange = (newCondition: string) => {
    setRxDiagnosis(newCondition);
    setRxWarningNotice(null);

    const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
    const mappedMeds = activeCat[newCondition]?.medicines || [];
    const mappedMedNames = mappedMeds.map((m: any) => m.name.toLowerCase());

    let clearedCount = 0;
    const updatedMeds = rxMedicines.map((m) => {
      if (!m.isCustom && m.name && !mappedMedNames.includes(m.name.toLowerCase())) {
        clearedCount++;
        return {
          ...m,
          name: '',
          dosage: mappedMeds[0]?.default_dosage || '500mg',
          frequency: mappedMeds[0]?.default_frequency || 'Once daily (OD)',
          route: mappedMeds[0]?.default_route || 'Oral',
          duration: mappedMeds[0]?.default_duration || '30 days',
          instructions: mappedMeds[0]?.instructions || ''
        };
      }
      return m;
    });

    setRxMedicines(updatedMeds);
    if (clearedCount > 0) {
      setRxWarningNotice(`${clearedCount} medicine selection(s) incompatible with ${newCondition} cleared.`);
    }
  };

  const handleAddMedicineRow = () => {
    const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
    const mappedMeds = activeCat[rxDiagnosis]?.medicines || [];
    setRxMedicines([
      ...rxMedicines,
      {
        name: '',
        isCustom: mappedMeds.length === 0,
        dosage: mappedMeds[0]?.default_dosage || '500mg',
        frequency: mappedMeds[0]?.default_frequency || 'Once daily (OD)',
        duration: mappedMeds[0]?.default_duration || '30 days',
        route: mappedMeds[0]?.default_route || 'Oral',
        instructions: mappedMeds[0]?.instructions || ''
      }
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    if (rxMedicines.length <= 1) return;
    setRxMedicines(rxMedicines.filter((_, i) => i !== index));
  };

  const handleUpdateMedicineRow = (index: number, field: string, value: any) => {
    const updated = [...rxMedicines];
    updated[index] = { ...updated[index], [field]: value };
    setRxMedicines(updated);
  };

  const handleSelectMappedMedicine = (index: number, medName: string) => {
    if (medName === '__CUSTOM__') {
      handleUpdateMedicineRow(index, 'isCustom', true);
      handleUpdateMedicineRow(index, 'name', '');
      return;
    }
    const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
    const mappedMeds = activeCat[rxDiagnosis]?.medicines || [];
    const item = mappedMeds.find((m: any) => m.name === medName);

    if (item) {
      const updated = [...rxMedicines];
      updated[index] = {
        name: item.name,
        isCustom: false,
        dosage: item.default_dosage,
        frequency: item.default_frequency,
        duration: item.default_duration,
        route: item.default_route,
        instructions: item.instructions
      };
      setRxMedicines(updated);
    } else {
      handleUpdateMedicineRow(index, 'name', medName);
    }
  };

  const handleSaveClinicalPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setRxFormError(null);

    if (!rxPatientId) {
      setRxFormError('Please select an authorized patient.');
      return;
    }

    const finalDiagnosis = rxDiagnosis === '__CUSTOM__' ? rxCustomDiagnosis.trim() : rxDiagnosis.trim();
    if (!finalDiagnosis) {
      setRxFormError('Please select or specify a diagnosis / medical condition.');
      return;
    }

    if (rxMedicines.length === 0) {
      setRxFormError('At least one medicine is required.');
      return;
    }

    for (let i = 0; i < rxMedicines.length; i++) {
      if (!rxMedicines[i].name.trim()) {
        setRxFormError(`Medicine name is required for medicine item #${i + 1}.`);
        return;
      }
    }

    setRxSubmitting(true);
    try {
      const payload = {
        patient_id: Number(rxPatientId),
        visit_date: rxVisitDate,
        diagnosis: finalDiagnosis,
        medicines: rxMedicines.map(m => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          route: m.route.trim(),
          instructions: m.instructions.trim()
        })),
        clinical_notes: rxClinicalNotes.trim(),
        is_critical: rxIsCritical
      };

      if (rxEditingId) {
        await apiCall(`/doctors/prescriptions/${rxEditingId}`, 'PUT', payload);
        showToast('Prescription updated successfully.');
      } else {
        await apiCall('/doctors/prescriptions', 'POST', payload);
        showToast('Clinical entry and prescription saved to database.');
      }

      setRxModalOpen(false);
      setRxEditingId(null);
      await loadPrescriptions();
      if (selectedPatientId === Number(rxPatientId)) {
        try {
          const updated = await apiCall(`/doctors/patients/${selectedPatientId}/full-record`);
          setPatientRecord(normalizePatientRecord(updated));
        } catch (_) {}
      }
    } catch (err: any) {
      setRxFormError(err.message || 'Failed to save clinical prescription.');
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleQuickAddAllergy = async () => {
    if (!selectedPatientId) {
      showToast('Please select an authorized patient first.', 'error');
      return;
    }
    const allergen = prompt('Enter allergen / drug name causing allergic reaction:');
    if (!allergen || !allergen.trim()) return;
    const severity = prompt('Enter severity (MILD, MODERATE, SEVERE, ANAPHYLAXIS):', 'MODERATE');
    try {
      await apiCall(`/doctors/patients/${selectedPatientId}/clinical-entry`, 'POST', {
        entry_type: 'ALLERGY',
        title: allergen.trim(),
        detail: severity || 'MODERATE',
        notes: 'Flagged during clinical examination',
        is_critical: severity?.toUpperCase().includes('SEVERE') || severity?.toUpperCase().includes('ANAPHYLAXIS')
      });
      showToast(`Allergy alert for ${allergen} committed to patient dossier.`);
      try {
        const updated = await apiCall(`/doctors/patients/${selectedPatientId}/full-record`);
        setPatientRecord(normalizePatientRecord(updated));
      } catch (_) {}
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/Doctor_dashboard');
      return;
    }
    loadDoctorProfile();
    loadPatients();
    loadConsultations();
    loadNotifications();
    loadAccessRequests();
    loadClinicalCatalogue();
    loadPrescriptions();
  }, [navigate]);

  useEffect(() => {
    loadPatients();
  }, [searchQuery, statusFilter]);

  // Load selected patient record
  useEffect(() => {
    if (selectedPatientId) {
      setRecordLoading(true);
      apiCall(`/doctors/patients/${selectedPatientId}/full-record`)
        .then((res) => {
          setPatientRecord(normalizePatientRecord(res));
        })
        .catch(() => {
          setPatientRecord(null);
        })
        .finally(() => {
          setRecordLoading(false);
        });
    } else {
      setPatientRecord(null);
    }
  }, [selectedPatientId]);

  // Break-glass 15-minute countdown timer
  useEffect(() => {
    let interval: any = null;
    if (patientRecord?.auth_info?.auth_type === 'EMERGENCY_OVERRIDE' && emergencyTimeLeft > 0) {
      interval = setInterval(() => {
        setEmergencyTimeLeft((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [patientRecord, emergencyTimeLeft]);

  const handleLogout = () => {
    setAuthToken(null);
    showToast('Doctor session ended.');
    navigate('/Doctor_dashboard');
  };

  // Doctor Request Normal Consented Access (Level 2)
  const handleRequestConsent = async (patId: number) => {
    const reason = prompt('Enter clinical justification for normal outpatient records review:', 'Routine clinical consultation and medication review');
    if (!reason) return;
    try {
      await apiCall('/access/request', 'POST', {
        patient_id: patId,
        reason,
        requested_scope: 'NORMAL_CLINICAL'
      });
      showToast('Consent request dispatched to patient dashboard.');
      await loadPatients();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Doctor Submit Break-Glass Override (Level 3)
  const handleBreakGlassSubmit = async () => {
    if (!selectedPatientId || !justification.trim()) {
      showToast('Mandatory clinical emergency justification required.', 'error');
      return;
    }
    try {
      await apiCall('/access/emergency/override', 'POST', {
        patient_id: selectedPatientId,
        reason_category: reasonCategory,
        clinical_justification: justification
      });
      setBreakGlassOpen(false);
      setEmergencyTimeLeft(900);
      showToast('LEVEL 3 EMERGENCY OVERRIDE ACTIVATED (15-min window)');
      await loadPatients();
      try {
        const full = await apiCall(`/doctors/patients/${selectedPatientId}/full-record`);
        setPatientRecord(normalizePatientRecord(full));
      } catch (_) {}
      setActiveTab('records');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Doctor Respond to Consultation / Appointment
  const handleDoctorRespondConsult = async (reqId: number, status: 'CONFIRMED' | 'ACCEPTED' | 'REJECTED') => {
    const isAccept = status === 'CONFIRMED' || status === 'ACCEPTED';
    const note = prompt(
      `Enter clinical instructions or notes for ${isAccept ? 'CONFIRMED' : 'REJECTED'}:`,
      isAccept ? 'Appointment confirmed. Please arrive 10 minutes prior.' : 'Physician unavailable at requested time.'
    );
    if (note === null) return;
    try {
      await apiCall(`/doctors/me/consultations/${reqId}/respond`, 'POST', {
        status: isAccept ? 'CONFIRMED' : 'REJECTED',
        doctor_response: note
      });
      showToast(`Appointment marked as ${isAccept ? 'CONFIRMED' : 'REJECTED'}.`);
      await loadConsultations();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Resubmit Doctor Verification Application
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitLicense, setResubmitLicense] = useState('');
  const [resubmitHospital, setResubmitHospital] = useState('');

  // ─── Doctor Profile Edit State ───
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', specialization: '', hospital_name: '', medical_license_number: '' });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const openProfileEdit = () => {
    setProfileForm({
      full_name: doctorData?.full_name || '',
      phone: doctorData?.phone || '',
      specialization: doctorData?.specialization || '',
      hospital_name: doctorData?.hospital_name || '',
      medical_license_number: doctorData?.medical_license_number || ''
    });
    setProfileError(null);
    setProfileSuccess(null);
    setProfileEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    if (!profileForm.full_name.trim()) { setProfileError('Full name is required.'); return; }
    if (!profileForm.phone.trim() || !/^\d{10}$/.test(profileForm.phone.trim())) { setProfileError('Phone must be exactly 10 digits.'); return; }
    if (!profileForm.specialization.trim()) { setProfileError('Specialization is required.'); return; }
    setProfileLoading(true);
    try {
      const updated = await apiCall('/doctors/me', 'PUT', profileForm);
      setDoctorData(updated);
      setProfileSuccess('Profile updated successfully.');
      setProfileEditOpen(false);
      showToast('Profile saved successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // ─── Settings: Change Password State ───
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (!pwCurrent.trim()) { setPwError('Current password is required.'); return; }
    if (pwNew.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await apiCall('/doctors/me/change-password', 'POST', { current_password: pwCurrent, new_password: pwNew });
      setPwSuccess('Password changed successfully. Use the new password on your next login.');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      showToast('Password changed successfully.');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleResubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/doctors/me/verification/resubmit', 'POST', {
        medical_license_number: resubmitLicense || doctorData?.medical_license_number,
        hospital_name: resubmitHospital || doctorData?.hospital_name,
        notes: resubmitNotes || 'Resubmitted with updated credentials'
      });
      showToast('Verification application resubmitted. Status updated to PENDING.');
      setResubmitOpen(false);
      await loadDoctorProfile();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };


  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedPatientSummary = patientsList.find((p) => p.id === selectedPatientId);

  return (
    <div className="h-screen w-screen flex bg-[#F4F7FA] text-[#102A43] font-sans overflow-hidden selection:bg-[#E8F5F2] selection:text-[#0D9488]">
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

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Deep Navy #102A43)                           */}
      {/* ========================================================================= */}
      <aside className={`${sidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0 pointer-events-none' : 'w-64 opacity-100'} bg-[#102A43] text-white flex flex-col justify-between shrink-0 shadow-xl z-30 select-none transition-all duration-300 ease-in-out`}>
        <div>
          {/* Brand Header */}
          <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between gap-2 min-w-[250px]">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/" className="w-9 h-9 rounded-xl bg-[#0D9488] flex items-center justify-center font-bold text-white shadow-md shrink-0">
                <Activity className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">MEDORA</span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#0D9488]/40 text-[#14B8A6] border border-[#14B8A6]/40">
                    CLINICAL
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium truncate">Physician Workspace</p>
              </div>
            </div>

            {/* Hide Sidebar Button */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Hide Sidebar"
            >
              <PanelLeftClose className="w-4 h-4 text-[#14B8A6]" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 text-xs font-semibold">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'qr-scanner', label: 'QR Token Scanner', icon: QrCode },
              { id: 'records', label: 'Medical Records', icon: FileText },
              { id: 'prescriptions', label: `Prescriptions (${prescriptionsList.length})`, icon: Pill },
              { id: 'consultations', label: `Consultations (${consultations.filter(c => c.status === 'PENDING').length})`, icon: Calendar },
              { id: 'access_requests', label: 'Access Requests', icon: ShieldCheck },
              { id: 'emergency', label: 'Emergency Access', icon: ShieldAlert },
              { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.is_read).length})`, icon: Bell },
              { id: 'profile', label: 'Doctor Profile', icon: User },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as DoctorSidebarTab)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl transition ${
                    isActive
                      ? 'bg-[#0D9488] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Doctor Identity & Footer */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="font-extrabold text-xs text-white truncate">
                    Dr. {Doctor_Name ? Doctor_Name.replace(/_/g, ' ') : doctorData?.full_name || 'Arun Sharma, MD'}
                  </div>
                  <div className="text-[10px] text-teal-400 font-mono truncate">
                    {doctorData?.medical_license_number || 'NMC-DEL-89234'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition shrink-0 ml-2"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                <Database className="w-3 h-3 text-[#14B8A6]" /> Doctor Portal
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. PATIENT-SELECTION PANEL (Middle Sidebar for Patient Selection)         */}
      {/* ========================================================================= */}
      <section className={`${patientPanelCollapsed ? 'w-0 hidden' : 'w-80'} bg-white border-r border-[#E8F5F2] flex flex-col shrink-0 overflow-hidden shadow-xs transition-all duration-300`}>
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-[#F4F7FA]/60">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#102A43] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0D9488]" /> Patient Registry
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={loadPatients} title="Refresh Patient List" className="p-1 text-slate-400 hover:text-[#0D9488]">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPatientPanelCollapsed(true)}
                title="Hide Patient Panel"
                className="p-1 rounded text-slate-400 hover:text-[#102A43] hover:bg-slate-200 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or PAT-ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'authorized', label: 'Authorized' },
              { id: 'emergency', label: 'Emergency' },
              { id: 'pending', label: 'Pending' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-[#0D9488] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patients List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {patientsList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No patients matching filter.</div>
          ) : (
            patientsList.map((p) => {
              const isSelected = selectedPatientId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setActiveTab('records');
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition text-xs border ${
                    isSelected
                      ? 'bg-[#E8F5F2] border-[#0D9488]/40 shadow-xs'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#102A43] text-sm">{p.full_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-mono text-[11px]">
                        <span>{p.unique_patient_id}</span>
                        <span>&bull;</span>
                        <span className="font-bold text-rose-600">{p.blood_group}</span>
                      </div>
                    </div>

                    {/* Authorization Status Badge */}
                    <div>
                      {p.authorization_status === 'AUTHORIZED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <Unlock className="w-3 h-3 text-emerald-600" /> Authorized
                        </span>
                      )}
                      {p.authorization_status === 'EMERGENCY_ACTIVE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
                          <Flame className="w-3 h-3 text-rose-600" /> Override Active
                        </span>
                      )}
                      {p.authorization_status === 'PENDING_CONSENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Consent
                        </span>
                      )}
                      {p.authorization_status === 'UNAUTHORIZED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FULL-WIDTH CLINICAL WORKSPACE                                          */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col bg-[#F4F7FA] overflow-y-auto">
        {/* Top Operational Ribbon */}
        <header className="bg-white border-b border-[#E8F5F2] px-6 lg:px-8 py-3.5 shadow-2xs flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Show / Hide Navigation Sidebar */}
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

            {/* Show / Hide Patient Selection Panel */}
            <button
              onClick={() => setPatientPanelCollapsed(!patientPanelCollapsed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7FA] hover:bg-slate-200 text-[#102A43] text-xs font-bold border border-slate-200 transition shrink-0 shadow-2xs"
              title={patientPanelCollapsed ? "Show Patient Registry Panel" : "Hide Patient Registry Panel"}
            >
              <Users className="w-4 h-4 text-[#0D9488]" />
              <span>{patientPanelCollapsed ? "Show Patients" : "Hide Patients"}</span>
            </button>
            <h2 className="font-black text-lg text-[#102A43]">
              {activeTab === 'prescriptions'
                ? 'Clinical Prescriptions & Formulations Dashboard'
                : activeTab === 'profile'
                ? 'Doctor Profile'
                : activeTab === 'settings'
                ? 'Account Settings'
                : selectedPatientSummary?.full_name
                ? `Patient Workspace: ${selectedPatientSummary.full_name}`
                : 'Clinical Workspace'}
            </h2>
            {selectedPatientSummary && activeTab !== 'prescriptions' && activeTab !== 'profile' && activeTab !== 'settings' && (
              <span className="font-mono text-xs text-slate-500 font-bold bg-[#F4F7FA] px-2.5 py-1 rounded-lg border border-slate-200">
                {selectedPatientSummary.unique_patient_id}
              </span>
            )}
            {/* Status indicator */}
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
              doctorData?.verification_status === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : doctorData?.verification_status === 'UNDER_REVIEW'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : doctorData?.verification_status === 'REJECTED'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              Verification: {doctorData?.verification_status || 'PENDING'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {recordLoading && (
              <span className="text-xs font-bold text-[#0D9488] animate-pulse">Loading Clinical Record...</span>
            )}

            {patientRecord?.auth_info?.auth_type === 'EMERGENCY_OVERRIDE' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-xs">
                <Clock className="w-4 h-4 animate-spin text-rose-600" />
                <span>Override Timer: {formatTimer(emergencyTimeLeft)}</span>
              </div>
            )}

            {doctorData?.verification_status === 'VERIFIED' && activeTab !== 'profile' && activeTab !== 'settings' && (
              <button
                onClick={() => handleOpenNewPrescription(selectedPatientSummary?.is_authorized ? selectedPatientSummary.id : undefined)}
                className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Clinical Entry
              </button>
            )}
          </div>
        </header>

        {/* Global Verification Status Banner for Pending/Rejected/Suspended */}
        {doctorData?.verification_status !== 'VERIFIED' && (
          <div className={`px-8 py-4 border-b text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            doctorData?.verification_status === 'REJECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : doctorData?.verification_status === 'SUSPENDED'
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : doctorData?.verification_status === 'UNDER_REVIEW'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {doctorData?.verification_status === 'PENDING' && 'Verification Application Pending Administrative Review'}
                  {doctorData?.verification_status === 'UNDER_REVIEW' && 'Professional Credentials Currently Under Administrative Review'}
                  {doctorData?.verification_status === 'REJECTED' && 'Verification Application Rejected'}
                  {doctorData?.verification_status === 'SUSPENDED' && 'Doctor Consultation Privileges Suspended'}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {doctorData?.verification_status === 'PENDING' &&
                  'Your verification application has been submitted and is awaiting administrative review. You cannot appear in the patient consultation directory until your application is approved.'}
                {doctorData?.verification_status === 'UNDER_REVIEW' &&
                  'Your professional details are currently being reviewed by the Medora administration team.'}
                {doctorData?.verification_status === 'REJECTED' &&
                  `Reason for rejection: ${doctorData?.rejection_reason || 'Incomplete credential documentation'}. Please update details and resubmit.`}
                {doctorData?.verification_status === 'SUSPENDED' &&
                  'Your account cannot receive new consultation bookings or access clinical records while restricted.'}
              </p>
              {doctorData?.information_requested && (
                <div className="p-2 bg-white/80 rounded-lg border border-amber-300 font-medium text-[11px] mt-1">
                  <strong>Administrator Instructions:</strong> {doctorData.information_requested}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] bg-white/70 px-2.5 py-1 rounded-lg border font-bold">
                Ref: {doctorData?.application_reference || 'DOC-APP-2026'}
              </span>
              {(doctorData?.verification_status === 'REJECTED' || doctorData?.information_requested) && (
                <button
                  onClick={() => setResubmitOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold hover:bg-[#14B8A6] transition"
                >
                  Correct & Resubmit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Workspace Body */}
        <div className="p-8 flex-1 space-y-6 max-w-7xl w-full mx-auto">

          {/* ─── PRESCRIPTION DASHBOARD WORKSPACE ─── */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              {/* Header / Overview Banner */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-[#E8F5F2] px-3 py-1 rounded-full">
                      Prescription Dashboard
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      {prescriptionsList.length} Total Orders
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-[#102A43]">
                    Clinical Prescriptions & Formulations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive overview of all patient prescriptions authored by your medical credentials.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={loadPrescriptions}
                    disabled={prescriptionsLoading}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                    title="Refresh Prescriptions"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${prescriptionsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                  <button
                    onClick={() => handleOpenNewPrescription()}
                    disabled={doctorData?.verification_status !== 'VERIFIED'}
                    className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Clinical Entry
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white border border-[#E8F5F2] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={prescriptionSearchQuery}
                    onChange={(e) => setPrescriptionSearchQuery(e.target.value)}
                    placeholder="Search by patient name, Card ID, condition/diagnosis, medicine, or instructions..."
                    className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                  />
                  {prescriptionSearchQuery && (
                    <button
                      onClick={() => setPrescriptionSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={prescriptionFilterPatient}
                    onChange={(e) => setPrescriptionFilterPatient(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-[#F4F7FA] text-xs font-bold text-[#102A43] focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                  >
                    <option value="all">All Authorized Patients</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.unique_patient_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prescriptions List */}
              {(() => {
                const filtered = prescriptionsList.filter((pr) => {
                  if (prescriptionFilterPatient !== 'all' && pr.patient_id !== Number(prescriptionFilterPatient)) {
                    return false;
                  }
                  if (!prescriptionSearchQuery.trim()) return true;
                  const q = prescriptionSearchQuery.toLowerCase().trim();
                  return (
                    (pr.patient_name || '').toLowerCase().includes(q) ||
                    (pr.patient_unique_id || '').toLowerCase().includes(q) ||
                    (pr.diagnosis || '').toLowerCase().includes(q) ||
                    (pr.clinical_notes || '').toLowerCase().includes(q) ||
                    (pr.visit_date || '').toLowerCase().includes(q) ||
                    (pr.medicines || []).some((m: any) =>
                      (m.name || '').toLowerCase().includes(q) ||
                      (m.instructions || '').toLowerCase().includes(q) ||
                      (m.dosage || '').toLowerCase().includes(q)
                    )
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white border border-[#E8F5F2] rounded-3xl p-12 text-center space-y-4 shadow-xs">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center mx-auto">
                        <Pill className="w-7 h-7" />
                      </div>
                      <h4 className="text-lg font-black text-[#102A43]">
                        {prescriptionSearchQuery || prescriptionFilterPatient !== 'all'
                          ? 'No Prescriptions Matching Your Filters'
                          : 'No Prescriptions Authored Yet'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {prescriptionSearchQuery || prescriptionFilterPatient !== 'all'
                          ? 'Try adjusting your search query or reset the patient filter.'
                          : 'When you examine an authorized patient, create their clinical entry and prescription to record medication orders, diagnosis, and notes.'}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => handleOpenNewPrescription()}
                          disabled={doctorData?.verification_status !== 'VERIFIED'}
                          className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold text-xs transition inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add Clinical Entry Now
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((pr: any) => (
                      <div
                        key={pr.id}
                        className={`bg-white border rounded-3xl p-6 shadow-xs hover:shadow-md transition space-y-4 ${
                          pr.is_critical ? 'border-rose-300 ring-1 ring-rose-200' : 'border-[#E8F5F2]'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-base text-[#102A43]">
                                {pr.patient_name}
                              </span>
                              <span className="font-mono text-xs font-bold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                {pr.patient_unique_id}
                              </span>
                              {pr.is_critical && (
                                <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" /> Critical Triage Flag
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span>
                                Condition: <strong className="text-[#102A43] font-bold">{pr.diagnosis}</strong>
                              </span>
                              <span>&bull;</span>
                              <span>Visit Date: <strong>{pr.visit_date}</strong></span>
                              <span>&bull;</span>
                              <span>Issued: {new Date(pr.date_issued).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEditPrescription(pr)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#0D9488]" /> Edit Entry
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPatientId(pr.patient_id);
                                setActiveTab('records');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 font-bold text-xs transition"
                            >
                              View Patient Dossier
                            </button>
                          </div>
                        </div>

                        {/* Prescribed Medicines Section */}
                        <div className="space-y-2">
                          <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-[#0D9488]" /> Prescribed Medications ({pr.medicines?.length || 0})
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.isArray(pr.medicines) && pr.medicines.length > 0 ? (
                              pr.medicines.map((med: any, mIdx: number) => (
                                <div
                                  key={mIdx}
                                  className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200/80 space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-sm text-[#102A43]">
                                      {med.name}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5F2] text-[#0D9488] border border-[#0D9488]/30">
                                      {med.route || 'Oral'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap font-medium">
                                    {med.dosage && (
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-[#102A43]">
                                        Dosage: {med.dosage}
                                      </span>
                                    )}
                                    {med.frequency && (
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                        {med.frequency}
                                      </span>
                                    )}
                                    {med.duration && (
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                        {med.duration}
                                      </span>
                                    )}
                                  </div>

                                  {med.instructions && (
                                    <p className="text-slate-600 font-normal bg-white/70 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                                      <strong className="text-slate-700 font-semibold">Directions:</strong> {med.instructions}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-xs italic">No structured medicines listed.</p>
                            )}
                          </div>
                        </div>

                        {/* Clinical Notes & Instructions */}
                        {pr.clinical_notes && (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                              Clinical Observations & Follow-up Instructions:
                            </span>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {pr.clinical_notes}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>Attending Physician: <strong className="text-slate-600">{pr.doctor_name || 'Dr. ' + (doctorData?.full_name || 'Medical Specialist')}</strong></span>
                          <span className="font-mono">Record ID: #{pr.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── QR TOKEN SCANNER ─── */}
          {activeTab === 'qr-scanner' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-xs space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-black text-[#102A43] flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#0D9488]" /> QR Token Scanner
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the token from a patient's Medical QR Card. The backend will validate it and identify the patient without exposing clinical records. You must then request consent before viewing records.
                  </p>
                </div>

                {/* Token entry form */}
                <div className="space-y-3 max-w-xl">
                  <label className="block text-xs font-bold text-[#102A43]">QR Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrTokenInput}
                      onChange={(e) => { setQrTokenInput(e.target.value); setQrScanResult(null); setQrScanError(null); }}
                      placeholder="Paste token from patient's QR card..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-mono focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        const tok = qrTokenInput.trim();
                        if (!tok) { setQrScanError('Please enter a token.'); return; }
                        setQrScanLoading(true); setQrScanResult(null); setQrScanError(null);
                        try {
                          const res = await apiCall(`/qr/doctor-scan/${encodeURIComponent(tok)}`, 'POST');
                          setQrScanResult(res);
                        } catch (e: any) {
                          setQrScanError(e.message || 'Token validation failed. The token may be invalid, expired, or revoked.');
                        } finally { setQrScanLoading(false); }
                      }}
                      disabled={qrScanLoading}
                      className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />{qrScanLoading ? 'Validating...' : 'Validate'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    The token is only used to identify the patient. No clinical data is transferred during validation.
                  </p>
                </div>

                {/* Error state */}
                {qrScanError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{qrScanError}
                  </div>
                )}

                {/* Success state */}
                {qrScanResult && (
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" /> Token Valid — Patient Identified
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#F4F7FA] border border-slate-200">
                        <p className="text-slate-500 font-medium">Patient Name</p>
                        <p className="font-bold text-[#102A43] mt-0.5">{qrScanResult.patient_name}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F4F7FA] border border-slate-200">
                        <p className="text-slate-500 font-medium">Patient ID</p>
                        <p className="font-bold font-mono text-[#0D9488] mt-0.5">{qrScanResult.unique_patient_id}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Notice:</strong> {qrScanResult.notice || 'Medical records are protected. Select access method to proceed.'}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          const reason = prompt('Enter clinical justification for this access request:', 'Outpatient consultation based on patient QR card referral');
                          if (!reason) return;
                          try {
                            await apiCall('/access/request', 'POST', {
                              patient_id: qrScanResult.patient_id,
                              reason,
                              requested_scope: 'NORMAL_CLINICAL'
                            });
                            showToast('Consent request sent to patient. You will be notified when approved.');
                            setQrScanResult(null); setQrTokenInput('');
                          } catch (e: any) { showToast(e.message || 'Request failed.', 'error'); }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition"
                      >
                        Request Patient Consent
                      </button>
                      <button
                        onClick={() => { setQrScanResult(null); setQrTokenInput(''); }}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* If Doctor is not verified, show dedicated verification panel on default workspace */}
          {doctorData?.verification_status !== 'VERIFIED' && activeTab === 'patients' && (
            <div className="bg-white border border-[#E8F5F2] rounded-3xl p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-4 border-b pb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#102A43]">Physician Verification Dossier</h3>
                  <p className="text-xs text-slate-500">
                    Application Reference: <strong className="font-mono text-[#0D9488]">{doctorData?.application_reference || 'DOC-APP-2026-PENDING'}</strong> &bull; Submitted: {doctorData?.created_at ? new Date(doctorData.created_at).toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Status</span>
                  <p className="text-base font-extrabold text-[#102A43] uppercase">{doctorData?.verification_status || 'PENDING'}</p>
                  <p className="text-[11px] text-slate-500">Not eligible for patient consultation directory.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Medical Council Registration</span>
                  <p className="text-base font-extrabold text-[#102A43] font-mono">{doctorData?.medical_license_number || 'N/A'}</p>
                  <p className="text-[11px] text-slate-500">{doctorData?.registration_authority || 'Medical Council'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Practice / Hospital</span>
                  <p className="text-base font-extrabold text-[#102A43]">{doctorData?.hospital_name || 'Clinic'}</p>
                  <p className="text-[11px] text-slate-500">{doctorData?.specialization || 'General Specialist'}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#E8F5F2] text-[#0D9488] text-xs space-y-2">
                <h4 className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Next Verification Steps
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>Your submitted license number is undergoing administrative cross-verification with the registered Medical Council.</li>
                  <li>Once an authorized administrator approves your credentials, your profile will immediately activate in the patient consultation directory.</li>
                  <li>Ordinary patient health records and appointment requests will remain protected until verification is complete.</li>
                </ul>
              </div>

              {(doctorData?.verification_status === 'REJECTED' || doctorData?.information_requested) && (
                <div className="pt-2">
                  <button
                    onClick={() => setResubmitOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition"
                  >
                    Open Resubmission Form
                  </button>
                </div>
              )}
            </div>
          )}

          {/* If No Patient Selected */}
          {activeTab !== 'prescriptions' && activeTab !== 'profile' && activeTab !== 'settings' && doctorData?.verification_status === 'VERIFIED' && !selectedPatientSummary && (
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto mt-10">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#102A43]">No Patient Selected</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {patientsList.length === 0
                  ? 'No patients are currently registered.'
                  : 'Select a patient from the directory on the left to review authorized medical records or dispatch an access request.'}
              </p>
            </div>
          )}

          {/* If Unauthorized View */}
          {activeTab !== 'prescriptions' && activeTab !== 'profile' && activeTab !== 'settings' && selectedPatientSummary && !selectedPatientSummary.is_authorized && (
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Zero-Trust Access Barrier
                </span>
                <h3 className="text-2xl font-black text-[#102A43]">
                  Protected Clinical History Locked
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Patient selection does not grant authorization. In compliance with HIPAA and ABDM Zero-Trust policies, protected clinical history is encrypted until authorized.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto pt-4 text-left text-xs">
                {/* Method 1: Consented Access */}
                <div className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-extrabold text-[#102A43] text-sm">Procedure A: Request Patient Consent</h4>
                    <p className="text-slate-500 mt-1">
                      Dispatches an access notification to the patient's dashboard for standard outpatient record review.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRequestConsent(selectedPatientSummary.id)}
                    className="w-full py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    <HeartHandshake className="w-4 h-4" /> Dispatch Consent Request
                  </button>
                </div>

                {/* Method 2: Break-Glass Override */}
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-extrabold text-rose-900 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" /> Procedure B: Break-Glass Emergency
                    </h4>
                    <p className="text-rose-700 mt-1">
                      Immediate 15-minute emergency override for unconscious trauma or critical life-threatening triage.
                    </p>
                  </div>
                  <button
                    onClick={() => setBreakGlassOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4 h-4" /> Initiate Break-Glass Override
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* If Authorized View: Full-Width Multi-Section Workspace */}
          {activeTab !== 'prescriptions' && activeTab !== 'profile' && activeTab !== 'settings' && selectedPatientSummary?.is_authorized && patientRecord?.patient && (
            <div className="space-y-6">
              {/* Patient Banner */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-[#E8F5F2] px-3 py-1 rounded-full">
                      Authorized Clinical History
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Access: {patientRecord.auth_info?.auth_type || 'AUTHORIZED'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-[#102A43] mt-2">
                    {patientRecord.patient?.full_name || 'Patient'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>Card ID: <strong className="text-[#102A43] font-mono">{patientRecord.patient?.unique_patient_id || 'N/A'}</strong></span>
                    <span>&bull;</span>
                    <span>Blood Group: <strong className="text-rose-600 font-bold">{patientRecord.patient?.blood_group || 'N/A'}</strong></span>
                    <span>&bull;</span>
                    <span>DNR: <strong className="text-amber-600">{patientRecord.patient?.dnr_status ? 'ACTIVE DNR' : 'RESUSCITATE'}</strong></span>
                    <span>&bull;</span>
                    <span>Organ Donor: <strong className="text-[#0D9488]">{patientRecord.patient?.organ_donor ? 'YES' : 'NO'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenNewPrescription(selectedPatientId || undefined)}
                    className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Clinical Entry
                  </button>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px text-xs font-bold">
                {[
                  { id: 'summary', label: 'Overview' },
                  { id: 'diagnoses', label: `Diagnoses (${(patientRecord.diagnoses || []).length})` },
                  { id: 'allergies', label: `Allergies (${(patientRecord.allergies || []).length})` },
                  { id: 'medications', label: `Medications (${(patientRecord.current_medications || []).length})` },
                  { id: 'prescriptions', label: `Prescriptions (${(patientRecord.prescriptions || []).length})` },
                  { id: 'surgeries', label: `Surgeries (${(patientRecord.surgeries || []).length})` },
                  { id: 'notes', label: `Clinical Visits (${(patientRecord.visits || []).length})` },
                  { id: 'provenance', label: `Provenance Audit (${(patientRecord.audit_provenance || []).length})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setClinicalTab(t.id as any)}
                    className={`px-4 py-3 border-b-2 transition whitespace-nowrap ${
                      clinicalTab === t.id
                        ? 'border-[#0D9488] text-[#0D9488] bg-white rounded-t-xl'
                        : 'border-transparent text-slate-500 hover:text-[#102A43]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* SECTION: SUMMARY & OVERVIEW */}
              {clinicalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-white border border-[#E8F5F2] shadow-xs space-y-3 text-xs">
                    <h4 className="font-extrabold text-[#102A43] text-sm">Critical Directives</h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-rose-50 text-rose-800">
                        <strong>Severe Allergies:</strong>
                        <p>{(patientRecord.allergies || []).map((a: any) => a.allergen).join(', ') || 'None recorded'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 text-amber-800">
                        <strong>High-Risk Active Medications:</strong>
                        <p>{(patientRecord.current_medications || []).map((m: any) => `${m.medicine_name} (${m.dosage})`).join(', ') || 'None recorded'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white border border-[#E8F5F2] shadow-xs space-y-3 text-xs">
                    <h4 className="font-extrabold text-[#102A43] text-sm">Emergency Proxy Contacts</h4>
                    <div className="space-y-2">
                      {(patientRecord.emergency_contacts || []).length === 0 ? (
                        <p className="text-slate-400 py-3 text-center">No emergency proxy contacts registered.</p>
                      ) : (
                        (patientRecord.emergency_contacts || []).map((ec: any) => (
                          <div key={ec.id} className="p-3 rounded-xl bg-[#F4F7FA] border border-slate-200">
                            <p className="font-bold text-[#102A43]">{ec.contact_name} ({ec.relationship_type})</p>
                            <p className="text-slate-500 font-mono mt-0.5">{ec.phone}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white border border-[#E8F5F2] shadow-xs space-y-3 text-xs">
                    <h4 className="font-extrabold text-[#102A43] text-sm">Authorization Record</h4>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 space-y-1">
                      <p><strong>Status:</strong> Active</p>
                      <p><strong>Grant Mechanism:</strong> {patientRecord.auth_info?.auth_type || 'NORMAL_CONSENT'}</p>
                      <p><strong>Scope:</strong> Full Clinical Workspace Access</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: DIAGNOSES */}
              {clinicalTab === 'diagnoses' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-[#102A43] text-base">Diagnoses & Chronic Conditions</h4>
                    <button
                      onClick={() => handleOpenNewPrescription(selectedPatientId || undefined)}
                      className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold"
                    >
                      + Add Diagnosis & Prescription
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(patientRecord.diagnoses || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No diagnoses or chronic conditions recorded.</div>
                    ) : (
                      (patientRecord.diagnoses || []).map((d: any) => (
                        <div key={d.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex justify-between items-center">
                          <div>
                            <p className="font-extrabold text-sm text-[#102A43]">{d.condition_name}</p>
                            <p className="text-slate-500 mt-0.5">{d.notes || 'Documented condition'}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {d.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: ALLERGIES */}
              {clinicalTab === 'allergies' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-[#102A43] text-base">Allergies & Anaphylaxis Reactions</h4>
                    <button
                      onClick={handleQuickAddAllergy}
                      className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold"
                    >
                      + Add Allergy Flag
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(patientRecord.allergies || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No allergies recorded.</div>
                    ) : (
                      (patientRecord.allergies || []).map((a: any) => (
                        <div key={a.id} className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex justify-between items-center">
                          <div>
                            <p className="font-extrabold text-sm text-rose-900">{a.allergen}</p>
                            <p className="text-rose-700 mt-0.5">Reaction: {a.reaction || 'Severe allergic reaction'}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">
                            {a.severity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: MEDICATIONS */}
              {clinicalTab === 'medications' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-[#102A43] text-base">Current & Historical Medications</h4>
                    <button
                      onClick={() => handleOpenNewPrescription(selectedPatientId || undefined)}
                      className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold"
                    >
                      + Prescribe Medication
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(patientRecord.current_medications || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No active medications recorded.</div>
                    ) : (
                      (patientRecord.current_medications || []).map((m: any) => (
                        <div key={m.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex justify-between items-center">
                          <div>
                            <p className="font-extrabold text-sm text-[#102A43]">{m.medicine_name} — {m.dosage}</p>
                            <p className="text-slate-500 mt-0.5">Frequency: {m.frequency} &bull; Route: {m.route}</p>
                            {m.notes && <p className="text-slate-400 text-[11px] mt-1">{m.notes}</p>}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ACTIVE
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: PRESCRIPTIONS */}
              {clinicalTab === 'prescriptions' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-[#102A43] text-base">Prescriptions Issued</h4>
                      <p className="text-xs text-slate-500">Official medication orders and administration instructions for this patient.</p>
                    </div>
                    <button
                      onClick={() => handleOpenNewPrescription(selectedPatientId || undefined)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Issue Prescription
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    {(patientRecord.prescriptions || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                        No prescriptions recorded for this patient.
                      </div>
                    ) : (
                      (patientRecord.prescriptions || []).map((pr: any) => (
                        <div key={pr.id} className="p-5 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-3">
                          <div className="flex justify-between items-start gap-2 border-b border-slate-200/80 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-[#102A43]">{pr.diagnosis || 'Clinical Prescription'}</span>
                                {pr.is_critical && (
                                  <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                                    Critical Flag
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                Visit Date: {pr.visit_date} &bull; Issued: {pr.date_issued ? new Date(pr.date_issued).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleEditPrescription(pr)}
                              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center gap-1 text-[11px]"
                            >
                              <Edit3 className="w-3 h-3 text-[#0D9488]" /> Edit
                            </button>
                          </div>

                          {/* Medicines list */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Array.isArray(pr.medicines) && pr.medicines.length > 0 ? (
                              pr.medicines.map((m: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-[#102A43]">{m.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                                      {m.route || 'Oral'}
                                    </span>
                                  </div>
                                  <div className="flex gap-1.5 text-[11px] text-slate-600">
                                    {m.dosage && <span><strong>Dose:</strong> {m.dosage}</span>}
                                    {m.frequency && <span>&bull; {m.frequency}</span>}
                                    {m.duration && <span>&bull; {m.duration}</span>}
                                  </div>
                                  {m.instructions && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5">Note: {m.instructions}</p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-600">{pr.prescription_text}</p>
                            )}
                          </div>

                          {pr.clinical_notes && (
                            <p className="text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                              <strong>Clinical Notes:</strong> {pr.clinical_notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: SURGERIES */}
              {clinicalTab === 'surgeries' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <h4 className="font-extrabold text-[#102A43] text-base">Surgical History & Procedures</h4>
                  <div className="space-y-2 text-xs">
                    {(patientRecord.surgeries || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No surgical history recorded.</div>
                    ) : (
                      (patientRecord.surgeries || []).map((s: any) => (
                        <div key={s.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200">
                          <p className="font-extrabold text-sm text-[#102A43]">{s.procedure_name}</p>
                          <p className="text-slate-500 mt-0.5">Date: {s.surgery_date || 'Past'} &bull; Hospital: {s.hospital || 'Hospital'} &bull; Surgeon: {s.surgeon || 'N/A'}</p>
                          {s.notes && <p className="text-slate-600 mt-1">{s.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: CLINICAL NOTES */}
              {clinicalTab === 'notes' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-[#102A43] text-base">Attending Clinical Notes</h4>
                    <button
                      onClick={() => handleOpenNewPrescription(selectedPatientId || undefined)}
                      className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-bold"
                    >
                      + Add Clinical Note & Prescription
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    {(patientRecord.visits || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No clinical visit notes recorded.</div>
                    ) : (
                      (patientRecord.visits || []).map((v: any) => (
                        <div key={v.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-sm text-[#102A43]">{v.reason}</span>
                            <span className="text-[10px] text-slate-400">{v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <p className="text-slate-700"><strong>Diagnosis:</strong> {v.diagnosis}</p>
                          <p className="text-slate-600 mt-1">{v.treatment_notes}</p>
                          <p className="text-[11px] text-teal-700 font-semibold mt-1">Author: {v.doctor_name}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: PROVENANCE AUDIT */}
              {clinicalTab === 'provenance' && (
                <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
                  <h4 className="font-extrabold text-[#102A43] text-base flex items-center gap-2">
                    <FileClock className="w-4 h-4 text-[#0D9488]" /> Record Provenance & Change History
                  </h4>
                  <div className="overflow-x-auto text-xs">
                    {(patientRecord.audit_provenance || []).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No audit trail entries recorded.</div>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold">
                            <th className="py-2">Timestamp</th>
                            <th>Role</th>
                            <th>Action</th>
                            <th>Event Notes</th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(patientRecord.audit_provenance || []).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</td>
                            <td className="font-bold text-[#102A43]">{p.actor_role}</td>
                            <td className="font-mono text-[#0D9488]">{p.action}</td>
                            <td className="text-slate-600">{p.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONSULTATIONS & APPOINTMENTS TAB */}
          {activeTab === 'consultations' && (
            <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-[#102A43] text-base">Patient Appointment Queue</h3>
                  <p className="text-xs text-slate-500">Incoming consultation and review requests from verified patient portal.</p>
                </div>
                <button onClick={loadConsultations} className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
                </button>
              </div>

              <div className="space-y-3">
                {consultations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                    No appointment requests found.
                  </div>
                ) : (
                  consultations.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[#102A43]">{c.patient_name || 'Patient'}</p>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                            {c.consultation_mode || 'IN_PERSON'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            c.status === 'CONFIRMED' || c.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : c.status === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          <strong>Reason:</strong> {c.reason} &bull; <strong>Scheduled Date:</strong> {c.preferred_date || 'Flexible'} {c.slot_time ? `(${c.slot_time})` : ''}
                        </p>
                        {c.doctor_response && (
                          <p className="text-emerald-700 font-medium">Doctor remarks: {c.doctor_response}</p>
                        )}
                      </div>

                      {c.status === 'PENDING' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDoctorRespondConsult(c.id, 'CONFIRMED')}
                            disabled={doctorData?.verification_status !== 'VERIFIED'}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-40 text-white font-bold text-xs transition shadow-2xs"
                          >
                            Accept Appointment
                          </button>
                          <button
                            onClick={() => handleDoctorRespondConsult(c.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ACCESS REQUESTS TAB */}
          {activeTab === 'access_requests' && (
            <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-[#102A43] text-base">My Access Requests</h3>
                  <p className="text-xs text-slate-500">Track the status of consent requests you have submitted to patients.</p>
                </div>
                <button onClick={loadAccessRequests} className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {myAccessRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-[#F4F7FA] rounded-2xl border border-dashed border-slate-300">
                  No access requests submitted yet. Use the Patient Registry to select a patient and dispatch a consent request.
                </div>
              ) : (
                <div className="space-y-3">
                  {myAccessRequests.map((req: any) => {
                    const statusColor: Record<string, string> = {
                      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
                      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
                      REVOKED: 'bg-slate-200 text-slate-700 border-slate-300',
                      EXPIRED: 'bg-orange-100 text-orange-800 border-orange-200',
                    };
                    const sColor = statusColor[req.status] || 'bg-slate-100 text-slate-600 border-slate-200';
                    return (
                      <div key={req.id} className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#102A43]">{req.patient_name || `Patient #${req.patient_id}`}</span>
                              {req.unique_patient_id && <span className="font-mono text-[10px] text-slate-500">{req.unique_patient_id}</span>}
                            </div>
                            <p className="text-slate-600"><strong>Reason:</strong> {req.reason}</p>
                            <p className="text-slate-500 text-[11px]">
                              Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : 'N/A'}
                              {req.reviewed_at && <> &bull; Reviewed: {new Date(req.reviewed_at).toLocaleString()}</>}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${sColor}`}>
                            {req.status}
                          </span>
                        </div>
                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setSelectedPatientId(req.patient_id);
                              setActiveTab('records');
                              showToast('Opening authorized patient records...');
                            }}
                            className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Open Authorized Records
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-[#E8F5F2] rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-[#102A43] text-base">Cross-Portal Notifications</h3>
              <div className="space-y-2 text-xs">
                {notifications.length === 0 ? (
                  <p className="text-slate-400 py-4">No notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-xl bg-[#F4F7FA] border border-slate-200 flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#102A43]">{n.title}</p>
                        <p className="text-slate-600 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── DOCTOR PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-3xl">
              {/* Profile Header Card */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-3xl font-black text-white select-none">
                    {(doctorData?.full_name || 'D').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-black text-[#102A43] truncate">Dr. {doctorData?.full_name || 'Loading...'}</h2>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                      doctorData?.verification_status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : doctorData?.verification_status === 'UNDER_REVIEW'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : doctorData?.verification_status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {doctorData?.verification_status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{doctorData?.specialization || '—'} &bull; {doctorData?.hospital_name || '—'}</p>
                  <p className="text-xs font-mono text-teal-700 mt-1">{doctorData?.medical_license_number || '—'}</p>
                </div>
                <button
                  onClick={openProfileEdit}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition shadow-xs"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-5">
                <h3 className="font-extrabold text-[#102A43] text-base border-b pb-3">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {[
                    { label: 'Full Name', value: doctorData?.full_name },
                    { label: 'Email Address', value: doctorData?.email, protected: true },
                    { label: 'Phone Number', value: doctorData?.phone },
                    { label: 'Specialization', value: doctorData?.specialization },
                    { label: 'Medical License No.', value: doctorData?.medical_license_number },
                    { label: 'Hospital / Clinic', value: doctorData?.hospital_name },
                    { label: 'Registration Authority', value: doctorData?.registration_authority },
                    { label: 'Medical Qualification', value: doctorData?.medical_qualification },
                    { label: 'State Jurisdiction', value: doctorData?.state_jurisdiction },
                    { label: 'Professional Address', value: doctorData?.professional_address },
                    { label: 'Years of Experience', value: doctorData?.years_of_experience != null ? `${doctorData.years_of_experience} yrs` : undefined },
                    { label: 'Account Created', value: doctorData?.created_at ? new Date(doctorData.created_at).toLocaleDateString() : undefined },
                  ].map(({ label, value, protected: isProtected }) => (
                    <div key={label} className="p-3.5 rounded-2xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>
                        {isProtected && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                      </div>
                      <p className="font-semibold text-[#102A43] truncate">{value || <span className="text-slate-400 italic">Not set</span>}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Status Card */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-3">
                <h3 className="font-extrabold text-[#102A43] text-base border-b pb-3">Verification Status</h3>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    doctorData?.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#102A43]">{doctorData?.verification_status || 'PENDING'}</p>
                    <p className="text-xs text-slate-500">
                      {doctorData?.verification_status === 'VERIFIED'
                        ? `Verified on ${doctorData?.verified_at ? new Date(doctorData.verified_at).toLocaleDateString() : 'N/A'}`
                        : 'Your credentials are pending administrative review.'}
                    </p>
                  </div>
                </div>
                {doctorData?.application_reference && (
                  <p className="text-xs text-slate-500 font-mono">Application Ref: <strong className="text-[#0D9488]">{doctorData.application_reference}</strong></p>
                )}
                {doctorData?.verification_notes && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800">
                    <strong>Admin Note:</strong> {doctorData.verification_notes}
                  </div>
                )}
                {doctorData?.rejection_reason && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                    <strong>Rejection Reason:</strong> {doctorData.rejection_reason}
                  </div>
                )}
              </div>

              {/* Profile Edit Modal */}
              {profileEditOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-white border border-[#E8F5F2] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <h3 className="text-xl font-black text-[#102A43]">Edit Profile</h3>
                        <p className="text-xs text-slate-500">Email and verification status cannot be changed here.</p>
                      </div>
                      <button onClick={() => setProfileEditOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                      {profileError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">{profileError}</div>}
                      {profileSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{profileSuccess}</div>}
                      {[
                        { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Dr. Full Name' },
                        { label: 'Phone (10 digits) *', key: 'phone', type: 'tel', placeholder: '9876543210' },
                        { label: 'Specialization *', key: 'specialization', type: 'text', placeholder: 'e.g. Cardiology' },
                        { label: 'Hospital / Clinic Name', key: 'hospital_name', type: 'text', placeholder: 'Apollo Hospitals' },
                        { label: 'Medical License Number', key: 'medical_license_number', type: 'text', placeholder: 'NMC-DEL-XXXXX' },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label className="block font-bold text-[#102A43] mb-1">{label}</label>
                          <input
                            type={type}
                            value={(profileForm as any)[key]}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] focus:ring-2 focus:ring-[#0D9488] focus:outline-none font-medium"
                          />
                        </div>
                      ))}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                        <button type="button" onClick={() => setProfileEditOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold transition hover:bg-slate-200">Cancel</button>
                        <button type="submit" disabled={profileLoading} className="px-6 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold transition flex items-center gap-2">
                          {profileLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── SETTINGS TAB ─── */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">

              {/* Change Password */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center border border-teal-200">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#102A43] text-base">Change Password</h3>
                    <p className="text-xs text-slate-500">Your current password is required to set a new one.</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  {pwError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">{pwError}</div>}
                  {pwSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{pwSuccess}</div>}
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Current Password</label>
                    <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Enter current password" className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] focus:ring-2 focus:ring-[#0D9488] focus:outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">New Password</label>
                    <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Min. 8 characters" className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] focus:ring-2 focus:ring-[#0D9488] focus:outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1">Confirm New Password</label>
                    <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat new password" className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] focus:ring-2 focus:ring-[#0D9488] focus:outline-none font-medium" />
                  </div>
                  <div className="pt-1">
                    <button type="submit" disabled={pwLoading} className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs">
                      {pwLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...</> : <><Check className="w-3.5 h-3.5" /> Update Password</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Information */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center border border-teal-200">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#102A43] text-base">Account Information</h3>
                    <p className="text-xs text-slate-500">Read-only identity details linked to this session.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {[
                    { label: 'Full Name', value: doctorData?.full_name },
                    { label: 'Email', value: doctorData?.email },
                    { label: 'Role', value: 'DOCTOR' },
                    { label: 'Verification', value: doctorData?.verification_status },
                    { label: 'License No.', value: doctorData?.medical_license_number },
                    { label: 'Doctor ID', value: `DOC-${doctorData?.id}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-2xl bg-[#F4F7FA] border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
                      <p className="font-semibold text-[#102A43] mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session & Logout */}
              <div className="bg-white border border-[#E8F5F2] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-200">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#102A43] text-base">Session & Security</h3>
                    <p className="text-xs text-slate-500">Manage your active session.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-[#102A43]">Current Session</p>
                    <p className="text-slate-500 mt-0.5">Authenticated as Dr. {doctorData?.full_name || '—'} &bull; Doctor Portal</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition text-xs"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal: Break-Glass Override */}
        {breakGlassOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border-2 border-rose-500 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Mandatory Emergency Justification
                </span>
                <h4 className="text-2xl font-black text-[#102A43] mt-2">Activate Level 3 Break-Glass</h4>
                <p className="text-xs text-slate-600">
                  This action generates a permanent tamper-evident audit record. Use only in genuine clinical emergencies.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Emergency Category</label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-[#F4F7FA] font-medium"
                  >
                    <option value="Unconscious Trauma">Unconscious Trauma / GCS &lt; 8</option>
                    <option value="Acute Anaphylaxis">Acute Anaphylaxis / Airway Compromise</option>
                    <option value="Cardiac Arrest">Cardiac Arrest / Resuscitation</option>
                    <option value="Mass Casualty Triage">Mass Casualty Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Clinical Justification & Observations</label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    required
                    placeholder="Document the patient's state and why consent cannot be obtained..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-[#F4F7FA] font-medium"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="certify"
                    checked={certify}
                    onChange={(e) => setCertify(e.target.checked)}
                    className="w-4 h-4 text-[#0D9488]"
                  />
                  <label htmlFor="certify" className="text-slate-600 font-medium">
                    I certify under medical licensure regulations that this override is necessary.
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBreakGlassOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!certify || !justification.trim()}
                    onClick={handleBreakGlassSubmit}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition shadow-md flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" /> Activate Break-Glass
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADD CLINICAL ENTRY & STRUCTURED PRESCRIPTION                      */}
        {/* ========================================================================= */}
        {rxModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border border-[#E8F5F2] rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E8F5F2] text-[#0D9488]">
                      Clinical Order Authoring
                    </span>
                    {rxEditingId && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
                        Editing Rx #{rxEditingId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-[#102A43] mt-1">
                    {rxEditingId ? 'Update Clinical Entry & Prescription' : 'Add Clinical Entry & Prescription'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formulate guideline-aligned medication regimens with verified condition-to-drug mappings.
                  </p>
                </div>
                <button
                  onClick={() => setRxModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Validation Error Banner */}
              {rxFormError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{rxFormError}</span>
                </div>
              )}

              {/* Warning Notice Banner (e.g. Cleared incompatible medicines) */}
              {rxWarningNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{rxWarningNotice}</span>
                  </div>
                  <button onClick={() => setRxWarningNotice(null)} className="text-amber-700 hover:text-amber-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveClinicalPrescription} className="space-y-5 text-xs">
                {/* 1. Patient Selection & Visit Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200">
                  <div>
                    <label className="block font-bold text-[#102A43] mb-1.5">
                      Authorized Patient <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={rxPatientId}
                      onChange={(e) => setRxPatientId(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                    >
                      <option value="">-- Select Authorized Patient --</option>
                      {patientsList
                        .filter((p) => p.is_authorized)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} ({p.unique_patient_id})
                          </option>
                        ))}
                    </select>
                    {patientsList.filter((p) => p.is_authorized).length === 0 && (
                      <p className="text-rose-600 text-[11px] mt-1 font-semibold">
                        No authorized patients found. Please request consent from the Patient Registry first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#102A43] mb-1.5">
                      Visit / Examination Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={rxVisitDate}
                      onChange={(e) => setRxVisitDate(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Medical Condition / Diagnosis Selection */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#F4F7FA] border border-slate-200">
                  <label className="block font-bold text-[#102A43]">
                    Medical Condition / Diagnosis <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecting a condition dynamically displays relevant guideline-mapped medications in the prescription dropdown below.
                  </p>

                  <select
                    value={rxDiagnosis}
                    onChange={(e) => handleConditionChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-[#102A43] focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                  >
                    {Object.keys(clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE).map((condName) => {
                      const details = (clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE)[condName];
                      return (
                        <option key={condName} value={condName}>
                          {condName} [{details.icd_code}] - {details.category}
                        </option>
                      );
                    })}
                    <option value="__CUSTOM__">-- Other / Enter Custom Medical Condition --</option>
                  </select>

                  {rxDiagnosis === '__CUSTOM__' && (
                    <div className="pt-2">
                      <label className="block font-bold text-slate-700 mb-1">Custom Condition / Diagnosis Title</label>
                      <input
                        type="text"
                        value={rxCustomDiagnosis}
                        onChange={(e) => setRxCustomDiagnosis(e.target.value)}
                        placeholder="e.g. Acute Pharyngitis, Nephrolithiasis, Post-Op Care..."
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Condition-Based Prescribed Medicines */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#102A43] flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-[#0D9488]" /> Prescribed Medications
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {((clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE)[rxDiagnosis]?.medicines?.length || 0) > 0
                          ? `Showing guideline-aligned medications mapped to ${rxDiagnosis}`
                          : 'No mapped medicines found for this condition. You may specify custom medications.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Medicine
                    </button>
                  </div>

                  {/* Medicines List */}
                  <div className="space-y-3">
                    {rxMedicines.map((med, idx) => {
                      const activeCat = clinicalCatalogue?.catalogue || DEFAULT_CATALOGUE;
                      const mappedMeds = activeCat[rxDiagnosis]?.medicines || [];

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs relative"
                        >
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-extrabold text-xs text-[#102A43] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              Medication Order #{idx + 1}
                            </span>

                            {rxMedicines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMedicineRow(idx)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            )}
                          </div>

                          {/* Medicine Selection / Input */}
                          <div>
                            <label className="block font-bold text-[#102A43] mb-1">
                              Medicine Name & Strength <span className="text-rose-500">*</span>
                            </label>

                            {!med.isCustom && mappedMeds.length > 0 ? (
                              <div className="space-y-1.5">
                                <select
                                  value={med.name}
                                  onChange={(e) => handleSelectMappedMedicine(idx, e.target.value)}
                                  required
                                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] font-bold text-xs text-[#102A43] focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                                >
                                  <option value="">-- Select Mapped Medicine for {rxDiagnosis} --</option>
                                  {mappedMeds.map((m: any) => (
                                    <option key={m.name} value={m.name}>
                                      {m.name} ({m.formulation})
                                    </option>
                                  ))}
                                  <option value="__CUSTOM__">+ Enter Custom / Unmapped Medicine...</option>
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={med.name}
                                  onChange={(e) => handleUpdateMedicineRow(idx, 'name', e.target.value)}
                                  required
                                  placeholder="Enter medicine name & strength (e.g. Paracetamol 650mg, Insulin Glargine)..."
                                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] font-medium text-xs focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                                />
                                {mappedMeds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMedicineRow(idx, 'isCustom', false)}
                                    className="text-[11px] text-[#0D9488] font-bold hover:underline"
                                  >
                                    &larr; Switch back to guideline-mapped medicines for {rxDiagnosis}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Dosage, Frequency, Route, Duration */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Dosage Unit</label>
                              <input
                                type="text"
                                list={`dosage-list-${idx}`}
                                value={med.dosage}
                                onChange={(e) => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                                placeholder="e.g. 500mg, 1 Tablet"
                                className="w-full p-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                              />
                              <datalist id={`dosage-list-${idx}`}>
                                {DOSAGE_UNITS.map((u) => (
                                  <option key={u} value={u} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                              <input
                                type="text"
                                list={`freq-list-${idx}`}
                                value={med.frequency}
                                onChange={(e) => handleUpdateMedicineRow(idx, 'frequency', e.target.value)}
                                placeholder="e.g. Once daily (OD)"
                                className="w-full p-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                              />
                              <datalist id={`freq-list-${idx}`}>
                                {FREQUENCY_OPTIONS.map((f) => (
                                  <option key={f} value={f} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Route</label>
                              <select
                                value={med.route}
                                onChange={(e) => handleUpdateMedicineRow(idx, 'route', e.target.value)}
                                className="w-full p-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                              >
                                {ROUTE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Duration</label>
                              <input
                                type="text"
                                list={`dur-list-${idx}`}
                                value={med.duration}
                                onChange={(e) => handleUpdateMedicineRow(idx, 'duration', e.target.value)}
                                placeholder="e.g. 30 days"
                                className="w-full p-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                              />
                              <datalist id={`dur-list-${idx}`}>
                                {DURATION_OPTIONS.map((d) => (
                                  <option key={d} value={d} />
                                ))}
                              </datalist>
                            </div>
                          </div>

                          {/* Instructions */}
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Special Administration Instructions</label>
                            <input
                              type="text"
                              value={med.instructions}
                              onChange={(e) => handleUpdateMedicineRow(idx, 'instructions', e.target.value)}
                              placeholder="e.g. Take with warm water after meals, avoid alcohol..."
                              className="w-full p-2 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Clinical Notes & Observations */}
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">
                    Clinical Notes, Examination Findings & Vitals
                  </label>
                  <textarea
                    rows={3}
                    value={rxClinicalNotes}
                    onChange={(e) => setRxClinicalNotes(e.target.value)}
                    placeholder="Enter physician observations, blood pressure, lab values, or review notes..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
                  />
                </div>

                {/* 5. Critical Emergency Flag */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <input
                    type="checkbox"
                    id="rxCritFlag"
                    checked={rxIsCritical}
                    onChange={(e) => setRxIsCritical(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <label htmlFor="rxCritFlag" className="font-bold text-rose-800 text-xs cursor-pointer">
                    Flag as Critical / High-Risk in Patient Emergency Triage
                  </label>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRxModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rxSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] disabled:opacity-50 text-white font-bold text-xs transition shadow-sm flex items-center gap-2"
                  >
                    {rxSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{rxEditingId ? 'Update Prescription' : 'Commit & Save Prescription'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resubmit Verification Application */}
        {resubmitOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#E8F5F2] rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-[#102A43]">Resubmit Verification Credentials</h4>
                  <p className="text-xs text-slate-500">Correct your medical license or practice details for administrator re-review.</p>
                </div>
                <button onClick={() => setResubmitOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                  &times;
                </button>
              </div>

              {doctorData?.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <strong>Previous Rejection Reason:</strong> {doctorData.rejection_reason}
                </div>
              )}

              {doctorData?.information_requested && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Administrator Instructions:</strong> {doctorData.information_requested}
                </div>
              )}

              <form onSubmit={handleResubmitVerification} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Medical License / Registration Number</label>
                  <input
                    type="text"
                    defaultValue={doctorData?.medical_license_number || ''}
                    onChange={(e) => setResubmitLicense(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Hospital / Practice Name</label>
                  <input
                    type="text"
                    defaultValue={doctorData?.hospital_name || ''}
                    onChange={(e) => setResubmitHospital(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#102A43] mb-1">Correction Notes / Explanatory Remarks</label>
                  <textarea
                    rows={3}
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    required
                    placeholder="Describe corrections made or provide clarifications requested by the administrator..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setResubmitOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold transition shadow-sm"
                  >
                    Submit for Re-Review
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

