import { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, setLanguage, t } from '../utils/i18n';
import { Globe } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

export default function LanguageSettings() {
  const { lang: currentLang } = useTranslation();
  const [, setLocal] = useState(currentLang); // local setter used when user clicks a button

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLocal(event.detail.lang);
    };
    window.addEventListener('language-changed', handleLanguageChange);
    return () => window.removeEventListener('language-changed', handleLanguageChange);
  }, []);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={20} className="text-brand-600" />
        <h2 className="font-display font-semibold text-slate-900">{t('language.title', currentLang)}</h2>
      </div>

      <p className="text-xs text-slate-500 mb-4">{t('language.description', currentLang)}</p>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={`p-3 rounded-lg border-2 transition text-left ${
              currentLang === code
                ? 'border-brand-500 bg-brand-50'
                : 'border-brand-100 hover:border-brand-200 bg-white'
            }`}
          >
            <p className="text-lg mb-1">{lang.flag}</p>
            <p className={`text-sm font-medium ${currentLang === code ? 'text-brand-700' : 'text-slate-700'}`}>
              {lang.nativeName}
            </p>
            <p className={`text-xs ${currentLang === code ? 'text-brand-600' : 'text-slate-500'}`}>
              {lang.name}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-100">
        <p className="text-xs text-brand-700">
          <span className="font-semibold">{t('language.current', currentLang)}</span> {SUPPORTED_LANGUAGES[currentLang].nativeName}
        </p>
      </div>
    </div>
  );
}
