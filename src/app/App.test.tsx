import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { AuthProvider } from './AuthContext';

function openApp(path = '/login') {
  window.history.replaceState({}, '', path);
  return render(<AuthProvider><App /></AuthProvider>);
}

describe('application flow', () => {
  it('redirects guests, logs in and signs out', async () => {
    const user = userEvent.setup();
    openApp('/shifts');
    expect(await screen.findByRole('heading', { name: 'Σύστημα Διαχείρισης Βαρδιών' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Username'), 'd4');
    await user.type(screen.getByLabelText('Password'), 'demo123');
    await user.click(screen.getByRole('button', { name: 'Σύνδεση' }));
    expect(await screen.findByRole('heading', { name: 'Ημερήσιες Βάρδιες' })).toBeInTheDocument();
    expect(screen.getByText(/Συνδεδεμένος ως:/)).toHaveTextContent('Δ4');
    await user.click(screen.getByRole('button', { name: 'Αποσύνδεση' }));
    expect(await screen.findByRole('heading', { name: 'Σύστημα Διαχείρισης Βαρδιών' })).toBeInTheDocument();
  });

  it('shows all units, an empty date, and a saved change after returning to dashboard', async () => {
    const user = userEvent.setup();
    openApp();
    await screen.findByRole('heading', { name: 'Σύστημα Διαχείρισης Βαρδιών' });
    await user.type(screen.getByLabelText('Username'), 'd4');
    await user.type(screen.getByLabelText('Password'), 'demo123');
    await user.click(screen.getByRole('button', { name: 'Σύνδεση' }));
    await screen.findByRole('heading', { name: 'Βάρδιες τμημάτων' });
    const initialTable = screen.getByRole('table');
    for (const name of ['Δ4', 'Δ5', 'ΕΜΚ']) expect(within(initialTable).getByText(name)).toBeInTheDocument();
    expect(screen.getByText('24ωρη Υπηρεσία — ΑΚΠ / ΑΥΜ')).toBeInTheDocument();
    const date = screen.getByLabelText('Ημερομηνία');
    fireEvent.change(date, { target: { value: '2020-01-01' } });
    await waitFor(() => expect(screen.getAllByText('Δεν έχει δηλωθεί προσωπικό').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('link', { name: 'Ορισμός βαρδιών →' }));
    expect(await screen.findByText('Τμήμα Δ4 — Ορισμός βαρδιών')).toBeInTheDocument();
    expect(screen.queryByLabelText('Επιλογή τμήματος')).not.toBeInTheDocument();
    const morning = await screen.findByLabelText('Πρωινή, άτομο 1');
    await user.selectOptions(morning, 'd4-4');
    await user.click(screen.getByRole('button', { name: 'Αποθήκευση' }));
    expect(await screen.findByText('Οι βάρδιες αποθηκεύτηκαν επιτυχώς')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Επιστροφή στην αρχική' }));
    const table = await screen.findByRole('table');
    await waitFor(() => expect(within(table).getByText('Ελένη Λαμπροπούλου')).toBeInTheDocument());
    expect(within(table).getByText('Δ5')).toBeInTheDocument();
    cleanup();
    openApp('/?date=2020-01-01');
    expect(await screen.findByText('Ελένη Λαμπροπούλου', {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('lets an admin choose the 24H service without staff management controls', async () => {
    const user = userEvent.setup();
    openApp();
    await screen.findByRole('heading', { name: 'Σύστημα Διαχείρισης Βαρδιών' });
    await user.type(screen.getByLabelText('Username'), 'aym');
    await user.type(screen.getByLabelText('Password'), 'demo123');
    await user.click(screen.getByRole('button', { name: 'Σύνδεση' }));
    await screen.findByRole('heading', { name: 'Βάρδιες τμημάτων' });
    await user.click(screen.getByRole('link', { name: 'Ορισμός βαρδιών →' }));
    const unit = await screen.findByLabelText('Επιλογή τμήματος');
    await waitFor(() => expect(within(unit).getByRole('option', { name: '24ωρη Υπηρεσία — ΑΚΠ / ΑΥΜ' })).toBeInTheDocument());
    await user.selectOptions(unit, '24h');
    const duty = await screen.findByLabelText('24ωρη υπηρεσία, άτομο 1');
    expect(within(duty).getByRole('option', { name: 'Ανδρέας Καρράς' })).toBeInTheDocument();
    expect(within(duty).queryByRole('option', { name: 'Νίκος Παπαδόπουλος' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /προσθήκη προσωπικού/i })).not.toBeInTheDocument();
  });
});
