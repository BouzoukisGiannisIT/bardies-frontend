import { LogOut } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth } from '../../app/AuthContext';
import { errorMessage } from '../../services/errors';

// Η σελίδα βαρδιών δηλώνει αν έχει μη αποθηκευμένες αλλαγές· η κεφαλίδα το ελέγχει στο logout.
const UnsavedContext = createContext<Dispatch<SetStateAction<boolean>> | null>(null);

/** Δίνει τη δυνατότητα δήλωσης μη αποθηκευμένων αλλαγών μόνο στις προστατευμένες σελίδες. */
export function useUnsavedChanges() {
  const setUnsaved = useContext(UnsavedContext);
  if (!setUnsaved) throw new Error('AppLayout is missing');
  return setUnsaved;
}

/** Κοινή κεφαλίδα desktop, πλοήγηση δύο συνδέσμων και περιοχή προστατευμένων σελίδων. */
export function AppLayout({ children }: { children: ReactNode }) {
  // Η ετικέτα κεφαλίδας και το logout βασίζονται στο context συνδεδεμένου χρήστη.
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Μεταφέρουμε την επιλεγμένη ημέρα και στους δύο συνδέσμους πλοήγησης.
  const selectedDate = new URLSearchParams(location.search).get('date');
  const dateQuery = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
  // Η φόρμα βαρδιών μπορεί να εμποδίσει το logout πριν χαθεί το React state της.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Εμφανίζουμε αποτυχημένο logout αντί να προσποιούμαστε ότι έληξε η συνεδρία.
  const [error, setError] = useState('');

  /** Επιβεβαιώνει τυχόν αλλαγές και κλείνει τη συνεδρία μέσω AuthService. */
  async function signOut() {
    if (hasUnsavedChanges && !window.confirm('Υπάρχουν μη αποθηκευμένες αλλαγές. Θέλετε να αποσυνδεθείτε;')) return;
    // Πλοηγούμαστε μόνο αφού η υπηρεσία επιβεβαιώσει το logout.
    try { await logout(); navigate('/login', { replace: true }); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  // Ο provider περιβάλλει τη σελίδα ώστε το ShiftEntryPage να δηλώνει αλλαγές προς τα πάνω.
  return <UnsavedContext.Provider value={setHasUnsavedChanges}><div className="app-shell">
    {/* Η ετικέτα συνδεδεμένου χρήστη προκύπτει από το User, όχι από σταθερό κείμενο ρόλου. */}
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-mark">ΥΒ</div>
        <div className="brand-name">Υπηρεσία Βαρδιών</div>
        <div className="header-spacer" />
        <span className="signed-in">Συνδεδεμένος ως: <strong>{user?.displayName}</strong></span>
        <button className="button button-quiet signout" onClick={signOut}><LogOut size={16} /> Αποσύνδεση</button>
      </div>
    </header>
    {/* Η πλοήγηση διατηρεί την ίδια ημερομηνία YYYY-MM-DD μεταξύ σελίδων. */}
    <nav className="main-nav" aria-label="Κύρια πλοήγηση">
      <div className="nav-inner">
        <NavLink to={`/${dateQuery}`} end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Αρχική</NavLink>
        <NavLink to={`/shifts${dateQuery}`} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Ορισμός βαρδιών</NavLink>
      </div>
    </nav>
    {/* Το σφάλμα logout της υπηρεσίας παραμένει ορατό στον χρήστη. */}
    {error && <div className="layout-error alert error" role="alert">{error}</div>}
    {/* Το περιεχόμενο του Router Outlet έρχεται από το προστατευμένο route. */}
    <main className="main-content">{children}</main>
  </div></UnsavedContext.Provider>;
}
