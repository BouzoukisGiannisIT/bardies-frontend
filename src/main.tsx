import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AuthProvider } from './app/AuthContext';
import './styles/global.css';

// Τοποθετούμε την εφαρμογή στο μοναδικό root στοιχείο του index.html.
ReactDOM.createRoot(document.getElementById('root')!).render(
  // Το StrictMode βοηθά να εντοπίζονται προβληματικά React effects στην ανάπτυξη.
  // Ο AuthProvider ανακτά τον χρήστη πριν εμφανιστούν προστατευμένα routes.
  <React.StrictMode><AuthProvider><App /></AuthProvider></React.StrictMode>,
);
