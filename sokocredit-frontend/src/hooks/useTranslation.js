import { useEffect, useState } from 'react';
import { getCurrentLanguage } from '../utils/i18n';

// Simple hook: returns the current language and re-renders when it changes.
export default function useTranslation() {
  const [lang, setLang] = useState(getCurrentLanguage());

  useEffect(() => {
    const handler = (e) => setLang(e.detail?.lang || getCurrentLanguage());
    window.addEventListener('language-changed', handler);
    return () => window.removeEventListener('language-changed', handler);
  }, []);

  return { lang };
}
