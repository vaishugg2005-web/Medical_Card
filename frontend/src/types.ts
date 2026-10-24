export type UserRole = 'landing' | 'patient' | 'doctor' | 'admin' | 'public';
export type PatientTab =
  | 'overview'
  | 'profile'
  | 'clinical-records'
  | 'medical-history'
  | 'conditions'
  | 'allergies'
  | 'medications'
  | 'surgeries'
  | 'consultations-reports'
  | 'appointments'
  | 'find-doctor'
  | 'my-requests'
  | 'access-requests'
  | 'consent-privacy'
  | 'emergency-card'
  | 'notifications'
  | 'access-history'
  | 'settings'
  | 'help-support'
  | 'history'
  | 'current'
  | 'register'
  | 'consultations'
  | 'consents'
  | 'card';
export type DoctorTab = 'overview' | 'consultations' | 'scanner' | 'records' | 'credentials';
export type AdminTab = 'overview' | 'verifications' | 'patients' | 'audit' | 'emergency';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}
