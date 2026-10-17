import type { Services } from './contracts';
import { createMockServices } from './mock/mockServices';
import { createHttpServices } from './http/httpServices';

// Το Vite ενσωματώνει αυτές τις τιμές στο build, όχι κατά την εκτέλεση στον browser.
// Εδώ γίνεται η μοναδική επιλογή mode· οι σελίδες εισάγουν πάντα το ίδιο `services`.
export const services: Services = import.meta.env.VITE_API_MODE === 'real'
  // Στο real mode όλες οι λειτουργίες περνούν από τον HTTP adapter και το base URL.
  ? createHttpServices(import.meta.env.VITE_API_BASE_URL ?? '/api')
  // Στο mock mode χρησιμοποιούνται δοκιμαστικά δεδομένα και τοπική αποθήκευση.
  : createMockServices();
