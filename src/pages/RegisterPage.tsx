import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../services';
import { errorMessage } from '../services/errors';
import type { Department } from '../types/models';
import { useEffect } from 'react';

export function RegisterPage() {
  // Η εγγραφή συλλέγει αίτημα· δεν δημιουργεί συνδεδεμένη συνεδρία.
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  // Οι καταστάσεις φόρτωσης και μηνυμάτων αποτρέπουν διπλές υποβολές και δείχνουν σφάλματα API.
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Η λίστα τμημάτων έρχεται από τον ίδιο κατάλογο που χρησιμοποιεί το Dashboard.
  useEffect(() => {
    // Η δημόσια εγγραφή χρειάζεται τον κατάλογο, αλλά η επιλογή τμήματος δεν δίνει δικαιώματα.
    services.staff.getDepartments().then((units) => setDepartments(units.filter((unit) => unit.kind === 'department')))
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  // Υποβάλλουμε μόνο πλήρες αίτημα μετά τους ελέγχους της φόρμας.
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    // Το backend πρέπει να ελέγξει ξανά τις τιμές και να αποφασίσει για την πρόσβαση.
    if (password !== confirm) { setError('Οι κωδικοί δεν ταιριάζουν.'); return; }
    if (!departmentId) { setError('Επιλέξτε τμήμα.'); return; }
    setPending(true);
    try {
      await services.auth.register({ fullName, username, password, departmentId });
      setSuccess(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-screen"><div className="auth-card register-card">
    <p className="eyebrow">ΑΙΤΗΜΑ ΠΡΟΣΒΑΣΗΣ</p><h1>Δημιουργία λογαριασμού</h1>
    <p className="auth-description">Η υποβολή αιτήματος δεν ενεργοποιεί αυτόματα πρόσβαση.</p>
    {/* Μετά την αποδοχή αιτήματος δείχνουμε επιβεβαίωση· η έγκριση γίνεται εκτός του UI. */}
    {success ? <div className="alert success" role="status">Το αίτημα εγγραφής υποβλήθηκε.</div> : <form onSubmit={submit} className="form-stack">
      <label>Ονοματεπώνυμο<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
      <label>Password<input required type="password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label>Επιβεβαίωση password<input required type="password" minLength={6} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
      <label>Τμήμα<select required value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">Επιλέξτε τμήμα</option>{departments.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      {error && <p className="alert error" role="alert">{error}</p>}
      <button className="button button-primary full" disabled={pending}>{pending ? 'Υποβολή…' : 'Υποβολή αιτήματος'}</button>
    </form>}
    <div className="auth-footer"><Link to="/login">Επιστροφή στη σύνδεση</Link></div>
  </div></main>;
}
