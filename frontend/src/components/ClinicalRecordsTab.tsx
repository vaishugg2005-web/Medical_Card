import { useState } from 'react';
import {
  AlertTriangle, Pill, Activity, Stethoscope, FileText,
  Plus, Trash2, FolderOpen
} from 'lucide-react';
import { apiCall } from '../api';

interface Props {
  allergies: any[];
  medications: any[];
  conditions: any[];
  surgeries: any[];
  consultations: any[];
  documents: any[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type Section = 'allergies' | 'medications' | 'conditions' | 'surgeries' | 'consultations' | 'documents';

const SECTIONS: { id: Section; label: string; Icon: any; color: string }[] = [
  { id: 'allergies',     label: 'Allergies',     Icon: AlertTriangle, color: 'text-rose-500' },
  { id: 'medications',   label: 'Medications',   Icon: Pill,          color: 'text-emerald-500' },
  { id: 'conditions',    label: 'Conditions',    Icon: Activity,      color: 'text-amber-500' },
  { id: 'surgeries',     label: 'Surgeries',     Icon: Stethoscope,   color: 'text-purple-500' },
  { id: 'consultations', label: 'Consultations', Icon: FileText,      color: 'text-blue-500' },
  { id: 'documents',     label: 'Documents',     Icon: FolderOpen,    color: 'text-teal-500' },
];

const cls = 'w-full p-2.5 rounded-xl border border-slate-300 bg-[#F4F7FA] text-xs font-medium focus:ring-2 focus:ring-[#0D9488] focus:outline-none';
const btnPrimary = 'px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#14B8A6] text-white font-bold text-xs transition flex items-center gap-1.5';
const btnGhost = 'px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-xs transition';

export default function ClinicalRecordsTab({ allergies, medications, conditions, surgeries, consultations, documents, onRefresh, showToast }: Props) {
  const [active, setActive] = useState<Section>('allergies');

  const [aAllergen, setAAllergen] = useState('');
  const [aSeverity, setASeverity] = useState('MILD');
  const [aReaction, setAReaction] = useState('');
  const [aSaving, setASaving] = useState(false);

  const [mName, setMName] = useState('');
  const [mDosage, setMDosage] = useState('');
  const [mFreq, setMFreq] = useState('');
  const [mRoute, setMRoute] = useState('ORAL');
  const [mSaving, setMSaving] = useState(false);

  const [cName, setCName] = useState('');
  const [cStatus, setCStatus] = useState('ACTIVE');
  const [cNotes, setCNotes] = useState('');
  const [cSaving, setCSaving] = useState(false);

  const [sProcedure, setSProcedure] = useState('');
  const [sDate, setSDate] = useState('');
  const [sSurgeon, setSSurgeon] = useState('');
  const [sHospital, setSHospital] = useState('');
  const [sSaving, setSSaving] = useState(false);

  const saveAllergy = async () => {
    if (!aAllergen.trim()) { showToast('Allergen name required.', 'error'); return; }
    setASaving(true);
    try {
      await apiCall('/patients/allergies', 'POST', { allergen: aAllergen.trim(), severity: aSeverity, reaction_description: aReaction.trim() });
      showToast('Allergy saved.'); setAAllergen(''); setAReaction(''); onRefresh();
    } catch (e: any) { showToast(e.message || 'Failed to save allergy.', 'error'); }
    finally { setASaving(false); }
  };

  const deleteAllergy = async (id: number) => {
    try { await apiCall(`/patients/allergies/${id}`, 'DELETE'); showToast('Allergy removed.'); onRefresh(); }
    catch (e: any) { showToast(e.message || 'Delete failed.', 'error'); }
  };

  const saveMedication = async () => {
    if (!mName.trim()) { showToast('Medicine name required.', 'error'); return; }
    setMSaving(true);
    try {
      await apiCall('/patients/medications', 'POST', { medicine_name: mName.trim(), dosage: mDosage.trim(), frequency: mFreq.trim(), route_of_administration: mRoute, is_active: true });
      showToast('Medication saved.'); setMName(''); setMDosage(''); setMFreq(''); onRefresh();
    } catch (e: any) { showToast(e.message || 'Failed to save medication.', 'error'); }
    finally { setMSaving(false); }
  };

  const deleteMedication = async (id: number) => {
    try { await apiCall(`/patients/medications/${id}`, 'DELETE'); showToast('Medication removed.'); onRefresh(); }
    catch (e: any) { showToast(e.message || 'Delete failed.', 'error'); }
  };

  const saveCondition = async () => {
    if (!cName.trim()) { showToast('Condition name required.', 'error'); return; }
    setCSaving(true);
    try {
      await apiCall('/patients/conditions', 'POST', { condition_name: cName.trim(), status: cStatus, clinical_notes: cNotes.trim() });
      showToast('Condition saved.'); setCName(''); setCNotes(''); onRefresh();
    } catch (e: any) { showToast(e.message || 'Failed to save condition.', 'error'); }
    finally { setCSaving(false); }
  };

  const deleteCondition = async (id: number) => {
    try { await apiCall(`/patients/conditions/${id}`, 'DELETE'); showToast('Condition removed.'); onRefresh(); }
    catch (e: any) { showToast(e.message || 'Delete failed.', 'error'); }
  };

  const saveSurgery = async () => {
    if (!sProcedure.trim()) { showToast('Procedure name required.', 'error'); return; }
    setSSaving(true);
    try {
      await apiCall('/patients/surgeries', 'POST', { procedure_name: sProcedure.trim(), surgery_date: sDate || undefined, surgeon_name: sSurgeon.trim() || undefined, hospital_name: sHospital.trim() || undefined });
      showToast('Surgery record saved.'); setSProcedure(''); setSDate(''); setSSurgeon(''); setSHospital(''); onRefresh();
    } catch (e: any) { showToast(e.message || 'Failed to save surgery.', 'error'); }
    finally { setSSaving(false); }
  };

  const deleteSurgery = async (id: number) => {
    try { await apiCall(`/patients/surgeries/${id}`, 'DELETE'); showToast('Surgery record removed.'); onRefresh(); }
    catch (e: any) { showToast(e.message || 'Delete failed.', 'error'); }
  };

  const counts: Record<Section, number> = {
    allergies: allergies.length, medications: medications.length,
    conditions: conditions.length, surgeries: surgeries.length,
    consultations: consultations.length, documents: documents.length,
  };

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
      <FileText className="w-8 h-8 opacity-40" />
      <span>No {label} recorded yet.</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, label, Icon, color }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${
              active === id ? 'bg-[#102A43] text-white border-[#102A43] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0D9488] hover:text-[#0D9488]'
            }`}>
            <Icon className={`w-3.5 h-3.5 ${active === id ? 'text-white' : color}`} />
            {label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${active === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E8F5F2] rounded-2xl shadow-sm overflow-hidden">

        {active === 'allergies' && (
          <div className="divide-y divide-slate-100">
            <div className="p-5 space-y-3 bg-rose-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Add Allergy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input className={cls} placeholder="Allergen (e.g. Penicillin) *" value={aAllergen} onChange={e => setAAllergen(e.target.value)} />
                <select className={cls} value={aSeverity} onChange={e => setASeverity(e.target.value)}>
                  {['MILD','MODERATE','SEVERE','LIFE_THREATENING'].map(s => <option key={s}>{s}</option>)}
                </select>
                <input className={cls} placeholder="Reaction description (optional)" value={aReaction} onChange={e => setAReaction(e.target.value)} />
              </div>
              <button onClick={saveAllergy} disabled={aSaving} className={btnPrimary}><Plus className="w-3.5 h-3.5" />{aSaving ? 'Saving...' : 'Add Allergy'}</button>
            </div>
            <div className="divide-y divide-slate-50">
              {allergies.length === 0 ? <EmptyState label="allergies" /> : allergies.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">{a.allergen}</span>
                    {a.reaction_description && <span className="text-slate-500 ml-2">— {a.reaction_description}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${a.severity === 'LIFE_THREATENING' ? 'bg-rose-100 text-rose-800' : a.severity === 'SEVERE' ? 'bg-orange-100 text-orange-800' : a.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{a.severity}</span>
                    <button onClick={() => deleteAllergy(a.id)} className={btnGhost}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'medications' && (
          <div className="divide-y divide-slate-100">
            <div className="p-5 space-y-3 bg-emerald-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><Pill className="w-4 h-4 text-emerald-500" /> Add Medication</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input className={cls} placeholder="Medicine name *" value={mName} onChange={e => setMName(e.target.value)} />
                <input className={cls} placeholder="Dosage (e.g. 500mg)" value={mDosage} onChange={e => setMDosage(e.target.value)} />
                <input className={cls} placeholder="Frequency (e.g. Twice daily)" value={mFreq} onChange={e => setMFreq(e.target.value)} />
                <select className={cls} value={mRoute} onChange={e => setMRoute(e.target.value)}>
                  {['ORAL','INTRAVENOUS','INTRAMUSCULAR','TOPICAL','INHALATION','SUBCUTANEOUS','OTHER'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={saveMedication} disabled={mSaving} className={btnPrimary}><Plus className="w-3.5 h-3.5" />{mSaving ? 'Saving...' : 'Add Medication'}</button>
            </div>
            <div className="divide-y divide-slate-50">
              {medications.length === 0 ? <EmptyState label="medications" /> : medications.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">{m.medicine_name}</span>
                    {m.dosage && <span className="text-slate-500 ml-2">{m.dosage}</span>}
                    {m.frequency && <span className="text-slate-400 ml-2">· {m.frequency}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700">{m.route_of_administration || 'ORAL'}</span>
                    <button onClick={() => deleteMedication(m.id)} className={btnGhost}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'conditions' && (
          <div className="divide-y divide-slate-100">
            <div className="p-5 space-y-3 bg-amber-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><Activity className="w-4 h-4 text-amber-500" /> Add Condition / Diagnosis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input className={cls} placeholder="Condition name *" value={cName} onChange={e => setCName(e.target.value)} />
                <select className={cls} value={cStatus} onChange={e => setCStatus(e.target.value)}>
                  {['ACTIVE','RESOLVED','CHRONIC','IN_REMISSION'].map(s => <option key={s}>{s}</option>)}
                </select>
                <input className={cls} placeholder="Clinical notes (optional)" value={cNotes} onChange={e => setCNotes(e.target.value)} />
              </div>
              <button onClick={saveCondition} disabled={cSaving} className={btnPrimary}><Plus className="w-3.5 h-3.5" />{cSaving ? 'Saving...' : 'Add Condition'}</button>
            </div>
            <div className="divide-y divide-slate-50">
              {conditions.length === 0 ? <EmptyState label="conditions" /> : conditions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">{c.condition_name}</span>
                    {c.clinical_notes && <span className="text-slate-500 ml-2">— {c.clinical_notes}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${c.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : c.status === 'CHRONIC' ? 'bg-orange-100 text-orange-800' : c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                    <button onClick={() => deleteCondition(c.id)} className={btnGhost}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'surgeries' && (
          <div className="divide-y divide-slate-100">
            <div className="p-5 space-y-3 bg-purple-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><Stethoscope className="w-4 h-4 text-purple-500" /> Add Surgery / Procedure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input className={cls} placeholder="Procedure name *" value={sProcedure} onChange={e => setSProcedure(e.target.value)} />
                <input className={cls} type="date" value={sDate} onChange={e => setSDate(e.target.value)} />
                <input className={cls} placeholder="Surgeon name (optional)" value={sSurgeon} onChange={e => setSSurgeon(e.target.value)} />
                <input className={cls} placeholder="Hospital / Facility" value={sHospital} onChange={e => setSHospital(e.target.value)} />
              </div>
              <button onClick={saveSurgery} disabled={sSaving} className={btnPrimary}><Plus className="w-3.5 h-3.5" />{sSaving ? 'Saving...' : 'Add Surgery Record'}</button>
            </div>
            <div className="divide-y divide-slate-50">
              {surgeries.length === 0 ? <EmptyState label="surgeries" /> : surgeries.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">{s.procedure_name}</span>
                    {s.surgeon_name && <span className="text-slate-500 ml-2">— Dr. {s.surgeon_name}</span>}
                    {s.hospital_name && <span className="text-slate-400 ml-2">· {s.hospital_name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.surgery_date && <span className="font-mono text-[10px] text-slate-500">{new Date(s.surgery_date).toLocaleDateString()}</span>}
                    <button onClick={() => deleteSurgery(s.id)} className={btnGhost}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'consultations' && (
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4 bg-blue-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Consultations</h3>
              <p className="text-xs text-slate-500 mt-1">Consultations appear here once confirmed by a verified doctor.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {consultations.length === 0 ? <EmptyState label="consultations" /> : consultations.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">Dr. {c.doctor_name || 'Unknown'}</span>
                    <span className="text-slate-500 ml-2">· {c.specialization || 'General'}</span>
                    {c.reason && <p className="text-slate-400 mt-0.5 truncate max-w-xs">{c.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${c.status === 'CONFIRMED' ? 'bg-teal-100 text-teal-800' : c.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                    {c.preferred_date && <span className="font-mono text-[10px] text-slate-400">{c.preferred_date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'documents' && (
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4 bg-teal-50/40">
              <h3 className="font-black text-sm text-[#102A43] flex items-center gap-2"><FolderOpen className="w-4 h-4 text-teal-500" /> Documents & Reports</h3>
              <p className="text-xs text-slate-500 mt-1">Medical documents attached to your profile.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {documents.length === 0 ? <EmptyState label="documents" /> : documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-[#102A43]">{d.title || d.document_type || 'Document'}</span>
                    <span className="text-slate-400 ml-2">· {d.document_type}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
