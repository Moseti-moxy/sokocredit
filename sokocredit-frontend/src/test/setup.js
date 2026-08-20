import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Auth state persists to localStorage/sessionStorage — clear both between
// tests so one test's login doesn't leak into the next.
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
