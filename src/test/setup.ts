import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Η υλοποίηση Node Request του React Router απορρίπτει AbortSignal του jsdom.
// Στα component tests κρατάμε το εγγενές signal· τα effects της εφαρμογής χειρίζονται την ακύρωση.
const NativeRequest = globalThis.Request;
globalThis.Request = class extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init ? { ...init, signal: undefined } : undefined);
  }
};

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => cleanup());
