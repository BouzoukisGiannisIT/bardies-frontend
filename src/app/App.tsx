import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ShiftEntryPage } from '../pages/ShiftEntryPage';

/** Προστατεύει τα routes προγράμματος και καταχώρισης μέχρι να ανακτηθεί η συνεδρία. */
function Protected() {
  // Ο AuthProvider παίρνει τον χρήστη από τον επιλεγμένο adapter υπηρεσίας.
  const { user, loading, error } = useAuth();
  // Δεν ανακατευθύνουμε όσο εκκρεμεί το /auth/me ή η mock εκδοχή του.
  if (loading) return <div className="screen-message">Φόρτωση συνεδρίας…</div>;
  // Δείχνουμε ρητά το σφάλμα υπηρεσίας αντί να θεωρήσουμε τον χρήστη αποσυνδεδεμένο.
  if (error) return <div className="screen-message" role="alert">{error}</div>;
  // Οι προστατευμένες σελίδες μοιράζονται κεφαλίδα/πλοήγηση· οι επισκέπτες πάνε στο login.
  return user ? <AppLayout><Outlet /></AppLayout> : <Navigate to="/login" replace />;
}

/** Αποτρέπει συνδεδεμένους χρήστες από τις φόρμες login και εγγραφής. */
function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-message">Φόρτωση συνεδρίας…</div>;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

// Τα routes είναι χωριστά από τη λογική σελίδων, ώστε η σύνδεση backend να μην τα αλλάξει.
const routes = [
  // Αυτές οι φόρμες δεν απαιτούν ενεργή συνεδρία.
  { element: <PublicOnly />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }] },
  // Το Dashboard και η φόρμα βαρδιών απαιτούν συνδεδεμένο χρήστη.
  { element: <Protected />, children: [{ path: '/', element: <DashboardPage /> }, { path: '/shifts', element: <ShiftEntryPage /> }] },
  // Άγνωστα paths επιστρέφουν στο κύριο route, όπου εφαρμόζεται ο έλεγχος σύνδεσης.
  { path: '*', element: <Navigate to="/" replace /> },
];

/** Δημιουργεί έναν router ανά εμφάνιση του App, απομονώνοντας και τα component tests. */
export function App() {
  const [router] = useState(() => createBrowserRouter([...routes]));
  return <RouterProvider router={router} />;
}
