import { useEffect, useState } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { services } from '../services';
import { errorMessage } from '../services/errors';
import type { DailyRoster, Department, StaffMember } from '../types/models';
import { formatGreekDate, isDateKey, todayInAthens } from '../utils/date';
import { downloadRosterExcel } from '../utils/exportExcel';

export function DashboardPage() {
  // Κρατάμε την ημέρα στο URL ώστε να διατηρείται σε συνδέσμους και ιστορικό browser.
  const [params, setParams] = useSearchParams();
  const selected = params.get('date');
  const date = selected && isDateKey(selected) ? selected : todayInAthens();
  // Οι υπηρεσίες παρέχουν χωριστά τον κατάλογο, το προσωπικό και όλο το πρόγραμμα.
  const [units, setUnits] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roster, setRoster] = useState<DailyRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  // Η αύξηση του revision προκαλεί νέα φόρτωση χωρίς αλλαγή ημερομηνίας.
  const [revision, setRevision] = useState(0);

  // Φορτώνουμε πρόγραμμα και ονόματα όταν αλλάζει η ημέρα ή ζητείται ανανέωση.
  useEffect(() => {
    // Αγνοούμε απαντήσεις που έφτασαν αφού αντικαταστάθηκε αυτό το effect.
    let active = true;
    setLoading(true);
    setRoster(null);
    Promise.all([services.staff.getDepartments(), services.shifts.getDailyRoster(date)]).then(async ([loadedUnits, loadedRoster]) => {
      // Κάθε τμήμα έχει δικό του endpoint προσωπικού· αφαιρούμε διπλότυπα άτομα.
      const memberLists = await Promise.all(loadedUnits.map((unit) => services.staff.getStaff(unit.id)));
      if (!active) return;
      setUnits(loadedUnits);
      setRoster(loadedRoster);
      setStaff([...new Map(memberLists.flat().map((member) => [member.id, member])).values()]);
      setError('');
      setLoading(false);
    }).catch((reason: unknown) => {
      if (active) {
        setError(errorMessage(reason));
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [date, revision]);

  // Δεχόμαστε μόνο έγκυρη ημερομηνία πριν ενημερωθεί το URL ή κληθεί το API.
  function changeDate(value: string) {
    if (!isDateKey(value)) return;
    setRoster(null);
    setLoading(true);
    setParams({ date: value });
  }

  // Εξάγουμε ακριβώς το εμφανιζόμενο πρόγραμμα και δείχνουμε τυχόν σφάλμα.
  async function exportExcel() {
    if (!roster || loading) return;
    setExporting(true);
    setError('');
    try {
      await downloadRosterExcel(roster, units, staff);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setExporting(false);
    }
  }

  // Ο χάρτης ονομάτων αποφεύγει επαναλαμβανόμενες αναζητήσεις σε κάθε γραμμή.
  const names = new Map(staff.map((member) => [member.id, member.fullName]));
  // Τα τμήματα μπαίνουν στον κύριο πίνακα· οι 24ωρες υπηρεσίες σε ξεχωριστές ενότητες.
  const departments = units.filter((unit) => unit.kind === 'department');
  const services24 = units.filter((unit) => unit.kind === 'service');
  // Βάρδιες χωρίς ανάθεση εμφανίζονται κενές· η απάντηση δεν χρειάζεται να τις περιλαμβάνει όλες.
  const membersFor = (unitId: string, shiftTypeId: string) => {
    const assignment = roster?.assignments.find((item) => item.unitId === unitId && item.shiftTypeId === shiftTypeId);
    return assignment?.staffIds.map((id) => names.get(id) ?? 'Άγνωστο προσωπικό') ?? [];
  };

  return <>
    {/* Η επιλογή ημέρας, η ανανέωση και η εξαγωγή αφορούν την ίδια ημερομηνία. */}
    <div className="page-heading">
      <div><p className="eyebrow">ΗΜΕΡΗΣΙΟ ΠΡΟΓΡΑΜΜΑ</p><h1>Ημερήσιες Βάρδιες</h1><p className="date-caption">{formatGreekDate(date)}</p></div>
      <div className="heading-actions"><label className="date-field">Ημερομηνία<input type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
        <button className="button button-secondary" onClick={() => { setLoading(true); setRevision((value) => value + 1); }} title="Ανανέωση δεδομένων" aria-label="Ανανέωση δεδομένων"><RefreshCw size={17} /></button>
        <button className="button button-primary" onClick={exportExcel} disabled={loading || !roster || exporting}><FileSpreadsheet size={17} />{exporting ? 'Εξαγωγή…' : 'Εξαγωγή Excel'}</button>
      </div>
    </div>
    {error && <div className="alert error" role="alert">{error}</div>}
    {/* Περιμένουμε την υπηρεσία πριν δείξουμε γραμμές ή ενεργοποιήσουμε την εξαγωγή. */}
    {loading ? <div className="panel loading" role="status">Φόρτωση ημερήσιου προγράμματος…</div> : <>
      {/* Εμφανίζουμε κάθε ρυθμισμένη βάρδια, ακόμη κι αν λείπει ανάθεση από το API. */}
      <section className="panel roster-panel" aria-labelledby="roster-title">
        <div className="panel-heading"><div><h2 id="roster-title">Βάρδιες τμημάτων</h2><p>Συγκεντρωτικό πρόγραμμα για την επιλεγμένη ημέρα</p></div><Link className="text-link" to={`/shifts?date=${date}`}>Ορισμός βαρδιών →</Link></div>
        <table className="roster-table"><thead><tr><th>ΤΜΗΜΑ</th><th>ΒΑΡΔΙΑ</th><th>ΠΡΟΣΩΠΙΚΟ</th></tr></thead><tbody>
          {departments.flatMap((unit) => unit.shiftTypes.map((shift, index) => {
            const selectedNames = membersFor(unit.id, shift.id);
            return <tr key={`${unit.id}:${shift.id}`} className={index === 0 ? 'unit-start' : ''}>
              <td>{index === 0 && <span className="unit-badge">{unit.name}</span>}</td><td>{shift.label}</td>
              <td>{selectedNames.length ? selectedNames.join(', ') : <span className="empty-value">Δεν έχει δηλωθεί προσωπικό</span>}</td>
            </tr>;
          }))}
        </tbody></table>
      </section>
      {/* Οι υπηρεσίες χρησιμοποιούν το ίδιο πρόγραμμα αλλά εμφανίζονται χωριστά. */}
      {services24.map((unit) => <section className="panel service-panel" key={unit.id} aria-labelledby={`service-${unit.id}`}>
        <div className="panel-heading"><div><h2 id={`service-${unit.id}`}>{unit.name}</h2><p>Ξεχωριστή ημερήσια ανάθεση</p></div></div>
        {unit.shiftTypes.map((shift) => { const selectedNames = membersFor(unit.id, shift.id); return <div className="service-row" key={shift.id}><span>{shift.label}</span><strong>{selectedNames.length ? selectedNames.join(', ') : <span className="empty-value">Δεν έχει δηλωθεί προσωπικό</span>}</strong></div>; })}
      </section>)}
    </>}
  </>;
}
