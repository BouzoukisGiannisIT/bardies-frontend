import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { errorMessage } from '../services/errors';

export function LoginPage() {
  // Τα πεδία είναι τοπικό state φόρμας· η σελίδα δεν αποθηκεύει ποτέ τον κωδικό.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  // Το AuthContext αναθέτει το login στη mock ή στην πραγματική HTTP υπηρεσία.
  const { login } = useAuth();
  const navigate = useNavigate();

  // Η υποβολή ξεκινά τη συνεδρία και αντικαθιστά το /login στο ιστορικό browser.
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-screen"><div className="auth-card">
    <div className="auth-emblem">ΥΒ</div>
    <p className="eyebrow">ΕΣΩΤΕΡΙΚΗ ΕΦΑΡΜΟΓΗ</p>
    <h1>Σύστημα Διαχείρισης Βαρδιών</h1>
    <p className="auth-description">Συνδεθείτε για να δείτε και να διαχειριστείτε το ημερήσιο πρόγραμμα.</p>
    <form onSubmit={submit} className="form-stack">
      {/* Η αυτόματη συμπλήρωση browser δεν αλλάζει το συμβόλαιο πιστοποίησης. */}
      <label>Username<input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p role="alert" className="alert error">{error}</p>}
      <button className="button button-primary full" disabled={pending}>{pending ? 'Σύνδεση…' : 'Σύνδεση'}</button>
    </form>
    <div className="auth-footer"><Link to="/register">Δημιουργία λογαριασμού</Link></div>
    {/* Τα δοκιμαστικά στοιχεία κρύβονται αυτόματα στο real API mode. */}
    {import.meta.env.VITE_API_MODE !== 'real' && <div className="demo-note"><strong>Demo πρόσβαση</strong><span>d4 · d5 · emk · akp · aym</span><span>Κωδικός: demo123</span><small>Τα στοιχεία αυτά ισχύουν μόνο για τη δοκιμαστική λειτουργία.</small></div>}
  </div></main>;
}
