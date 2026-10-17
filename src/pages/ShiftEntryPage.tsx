import { useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../app/AuthContext';
import { useUnsavedChanges } from '../components/layout/AppLayout';
import { services } from '../services';
import { errorMessage } from '../services/errors';
import type { Department, StaffMember } from '../types/models';
import { canEditUnit } from '../utils/permissions';
import { formatGreekDate, isDateKey, todayInAthens } from '../utils/date';

// Κάθε ID τύπου βάρδιας αντιστοιχεί σε μία ή περισσότερες θέσεις επιλογής προσωπικού.
type Draft = Record<string, string[]>;

export function ShiftEntryPage() {
  // Ο χρήστης και τα επιτρεπόμενα τμήματα έρχονται από τον επιλεγμένο auth adapter.
  const { user } = useAuth();
  const setUnsavedChanges = useUnsavedChanges();
  // Η ημερομηνία στο URL ανοίγει τη φόρμα στην ίδια ημέρα με το Dashboard.
  const [params, setParams] = useSearchParams();
  const selected = params.get('date');
  const date = selected && isDateKey(selected) ? selected : todayInAthens();
  const [units, setUnits] = useState<Department[]>([]);
  const [unitId, setUnitId] = useState(user?.departmentId ?? 'd4');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  // Το baseline είναι η τελευταία φορτωμένη/αποθηκευμένη μορφή· η σύγκριση βρίσκει αλλαγές.
  const [draft, setDraft] = useState<Draft>({});
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Βρίσκουμε τις ρυθμισμένες βάρδιες του τμήματος στον κατάλογο του API.
  const unit = useMemo(() => units.find((item) => item.id === unitId), [units, unitId]);
  const dirty = !loading && baseline !== '' && JSON.stringify(draft) !== baseline;
  // Η πλοήγηση ζητά επιβεβαίωση αν η φόρμα έχει μη αποθηκευμένες αλλαγές.
  const blocker = useBlocker(dirty);

  // Ενημερώνουμε το layout ώστε να προειδοποιήσει πριν από logout με εκκρεμείς αλλαγές.
  useEffect(() => {
    setUnsavedChanges(dirty);
    return () => setUnsavedChanges(false);
  }, [dirty, setUnsavedChanges]);

  // Ο router blocker χειρίζεται συνδέσμους της εφαρμογής και ιστορικό browser.
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Υπάρχουν μη αποθηκευμένες αλλαγές. Θέλετε να φύγετε;')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  // Κλείσιμο ή ανανέωση σελίδας χρειάζεται και προειδοποίηση από τον browser.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Φορτώνουμε μία φορά τον σταθερό κατάλογο· το UI δεν τον τροποποιεί.
  useEffect(() => {
    let active = true;
    services.staff.getDepartments().then((value) => { if (active) setUnits(value); })
      .catch((reason: unknown) => { if (active) { setError(errorMessage(reason)); setLoading(false); } });
    return () => { active = false; };
  }, []);

  // Φορτώνουμε διαθέσιμο προσωπικό και υπάρχουσες αναθέσεις για ημέρα και τμήμα.
  useEffect(() => {
    // Μη διαθέσιμο ή μη εξουσιοδοτημένο τμήμα δεν πρέπει να ζητήσει δεδομένα επεξεργασίας.
    if (!unit || !user || !canEditUnit(user, unitId)) return;
    let active = true;
    setLoading(true);
    setDraft({});
    setBaseline('');
    Promise.all([services.staff.getStaff(unitId), services.shifts.getDailyRoster(date)]).then(([members, roster]) => {
      if (!active) return;
      // Προσθέτουμε μία κενή επιλογή όταν η βάρδια δεν έχει ακόμη ανάθεση.
      const next = Object.fromEntries(unit.shiftTypes.map((shift) => {
        const assigned = roster.assignments.find((item) => item.unitId === unitId && item.shiftTypeId === shift.id)?.staffIds ?? [];
        return [shift.id, assigned.length ? [...assigned] : ['']];
      }));
      setStaff(members);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setError('');
      setSuccess('');
      setLoading(false);
    }).catch((reason: unknown) => {
      if (active) {
        setError(errorMessage(reason));
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [date, unitId, unit, user]);

  // Πριν αλλάξει ημέρα ή τμήμα, ζητάμε επιβεβαίωση αν θα χαθούν αλλαγές.
  function allowDiscard(): boolean {
    return !dirty || window.confirm('Υπάρχουν μη αποθηκευμένες αλλαγές. Θέλετε να συνεχίσετε;');
  }

  function changeDate(value: string) {
    if (!isDateKey(value) || !allowDiscard()) return;
    setLoading(true);
    setParams({ date: value });
  }

  function changeUnit(value: string) {
    if (!allowDiscard()) return;
    setLoading(true);
    setUnitId(value);
  }

  // Αλλάζουμε μόνο τη συγκεκριμένη θέση προσωπικού και κρατάμε όλες τις άλλες.
  function updateSlot(shiftId: string, index: number, value: string) {
    setDraft((current) => ({ ...current, [shiftId]: current[shiftId].map((id, position) => position === index ? value : id) }));
    setSuccess('');
  }

  // Η βάρδια μπορεί να έχει πολλά άτομα, γι' αυτό προστίθενται ή αφαιρούνται θέσεις.
  function addSlot(shiftId: string) {
    setDraft((current) => ({ ...current, [shiftId]: [...current[shiftId], ''] }));
    setSuccess('');
  }
  function removeSlot(shiftId: string, index: number) {
    // Κρατάμε μία κενή θέση ώστε να παραμένει δυνατή η επιλογή σε άδεια βάρδια.
    setDraft((current) => { const next = current[shiftId].filter((_, position) => position !== index); return { ...current, [shiftId]: next.length ? next : [''] }; });
    setSuccess('');
  }

  // Στέλνουμε πλήρη αντικατάσταση των βαρδιών αυτού του τμήματος για την ημέρα.
  async function save() {
    // Οι έλεγχοι του client βοηθούν τον χρήστη· το backend πρέπει να επαναλάβει τους ελέγχους δικαιωμάτων.
    if (!user || !unit || !canEditUnit(user, unitId)) { setError('Δεν έχετε δικαίωμα αλλαγής σε αυτό το τμήμα.'); return; }
    // Οι κενές επιλογές γίνονται κενοί πίνακες staffIds στο αίτημα υπηρεσίας.
    const assignments = unit.shiftTypes.map((shift) => ({ shiftTypeId: shift.id, staffIds: (draft[shift.id] ?? []).filter(Boolean) }));
    // Δεν στέλνουμε διπλότυπα ή προσωπικό που δεν είναι διαθέσιμο για το τμήμα.
    if (assignments.some((item) => new Set(item.staffIds).size !== item.staffIds.length)) { setError('Το ίδιο πρόσωπο επιλέχθηκε δύο φορές στην ίδια βάρδια.'); return; }
    if (assignments.some((item) => item.staffIds.some((id) => !staff.some((person) => person.id === id && person.availableForUnitIds.includes(unitId))))) { setError('Επιλέχθηκε μη διαθέσιμο προσωπικό.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const roster = await services.shifts.saveUnitAssignments({ date, unitId, assignments });
      // Μετά την αποθήκευση χρησιμοποιούμε την απάντηση υπηρεσίας ως έγκυρη κατάσταση.
      const next = Object.fromEntries(unit.shiftTypes.map((shift) => {
        const ids = roster.assignments.find((item) => item.unitId === unitId && item.shiftTypeId === shift.id)?.staffIds ?? [];
        return [shift.id, ids.length ? [...ids] : ['']];
      }));
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setSuccess('Οι βάρδιες αποθηκεύτηκαν επιτυχώς');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return <>
    {/* Η επιστροφή στο Dashboard διατηρεί την ίδια επιλεγμένη ημερομηνία. */}
    <div className="page-heading"><div><p className="eyebrow">ΚΑΤΑΧΩΡΙΣΗ</p><h1>Ορισμός βαρδιών</h1><p className="date-caption">{formatGreekDate(date)}</p></div><Link className="button button-secondary" to={`/?date=${date}`}>Επιστροφή στην αρχική</Link></div>
    <section className="panel entry-panel">
      {/* Οι διαχειριστές επιλέγουν επιτρεπόμενο τμήμα· του απλού χρήστη είναι σταθερό. */}
      <div className="entry-top">
        <label className="date-field">Ημερομηνία<input type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
        {user?.role === 'admin' ? <label className="unit-field">Επιλογή τμήματος<select value={unitId} onChange={(event) => changeUnit(event.target.value)}>{units.filter((item) => canEditUnit(user, item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <div className="fixed-unit"><span>ΤΜΗΜΑ</span><strong>{unit?.name ?? '—'}</strong></div>}
      </div>
      <div className="section-divider" />
      <div className="form-heading"><h2>{unit?.kind === 'department' ? `Τμήμα ${unit.name} — Ορισμός βαρδιών` : unit?.name ?? 'Βάρδιες'}</h2><p>Επιλέξτε προσωπικό από την προκαθορισμένη λίστα.</p></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {success && <div className="alert success" role="status">{success}</div>}
      {/* Η φόρτωση και τα δικαιώματα προστατεύουν τις λίστες επεξεργασίας. */}
      {loading ? <p className="loading-text" role="status">Φόρτωση βαρδιών…</p> : unit && canEditUnit(user, unitId) ? <div className="shift-list">
        {unit.shiftTypes.map((shift) => <div className="shift-row" key={shift.id}>
          <div className="shift-label"><strong>{shift.label}</strong><span>Προσωπικό βάρδιας</span></div>
          <div className="shift-controls">{(draft[shift.id] ?? ['']).map((value, index) => <div className="slot" key={`${shift.id}:${index}`}>
            <label className="sr-only" htmlFor={`${shift.id}-${index}`}>{shift.label}, άτομο {index + 1}</label>
            <select id={`${shift.id}-${index}`} value={value} onChange={(event) => updateSlot(shift.id, index, event.target.value)}>
              <option value="">Δεν έχει οριστεί</option>
              {/* Απενεργοποιούμε άτομο που έχει ήδη επιλεγεί στην ίδια βάρδια. */}
              {staff.map((person) => <option key={person.id} value={person.id} disabled={person.id !== value && draft[shift.id]?.includes(person.id)}>{person.fullName}</option>)}
            </select>
            {(draft[shift.id]?.length ?? 0) > 1 && <button className="button icon-button" type="button" onClick={() => removeSlot(shift.id, index)} aria-label={`Αφαίρεση ατόμου από ${shift.label}`}><Trash2 size={17} /></button>}
          </div>)}
          <button className="add-person" type="button" onClick={() => addSlot(shift.id)}><Plus size={16} /> Προσθήκη ατόμου</button></div>
        </div>)}
      </div> : <p className="alert error">Δεν έχετε πρόσβαση σε αυτό το τμήμα.</p>}
      <div className="entry-actions"><button className="button button-primary" disabled={loading || saving || !unit || !canEditUnit(user, unitId)} onClick={save}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</button></div>
    </section>
  </>;
}
