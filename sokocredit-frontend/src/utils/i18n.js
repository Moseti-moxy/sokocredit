// Multi-language Support Configuration
// Support for English, Swahili, and local languages

// Metadata shown by language selectors throughout the application.
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  luo: { name: 'Luo', nativeName: 'Dholuo', flag: '🇰🇪' },
  kikuyu: { name: 'Kikuyu', nativeName: 'Gikuyu', flag: '🇰🇪' },
  kamba: { name: 'Kamba', nativeName: 'Kikamba', flag: '🇰🇪' },
};

// Translation strings grouped by language and accessed through the `t` helper.
export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.customers': 'Customers',
    'nav.loans': 'Loans',
    'nav.analytics': 'Analytics',
    'nav.chamas': 'Chamas',
    'nav.inventory': 'Inventory Finance',
    'nav.location': 'Customer Location',
    'nav.crb': 'Credit Checks',
    'nav.renewal': 'Loan Renewals',
    'nav.communications': 'Communications',
    'nav.business': 'Business Registry',
    
    // Common
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    
    // CRB
    'crb.title': 'Credit Reference Bureau',
    'crb.check': 'Check Credit Score',
    'crb.status': 'Credit Status',
    'crb.sync': 'Sync with CRB',
    
    // Inventory
    'inventory.title': 'Inventory Financing',
    'inventory.addNew': 'Add New Inventory',
    'inventory.tracking': 'Track Stock',
    'inventory.soldUnits': 'Units Sold',
    
    // Location
    'location.title': 'Customer Location',
    'location.map': 'View Map',
    'location.route': 'Optimize Route',
    'location.history': 'Location History',
  },
  sw: {
    // Navigation
    'nav.home': 'Nyumbani',
    'nav.customers': 'Wateja',
    'nav.loans': 'Mikopo',
    'nav.analytics': 'Uchambuzi',
    'nav.chamas': 'Vikundi',
    'nav.inventory': 'Fedha za Hesabu',
    'nav.location': 'Mahali pa Wateja',
    'nav.crb': 'Ukaguzi wa Mkopo',
    'nav.renewal': 'Kuanzia Mikopo',
    'nav.communications': 'Mawasiliano',
    'nav.business': 'Ndoto ya Biashara',
    
    // Common
    'common.success': 'Umefanikiwa',
    'common.error': 'Kosa',
    'common.loading': 'Inakuwa...',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.submit': 'Tuma',
    
    // CRB
    'crb.title': 'Ofisi ya Mikopo',
    'crb.check': 'Angalia Kiwango cha Mikopo',
    'crb.status': 'Hali ya Mkopo',
    'crb.sync': 'Sambaza na Ofisi',
    
    // Inventory
    'inventory.title': 'Fedha za Hesabu',
    'inventory.addNew': 'Ongeza Hesabu Mpya',
    'inventory.tracking': 'Fuatilia Staki',
    'inventory.soldUnits': 'Vitengo Vilivyouzwa',
    
    // Location
    'location.title': 'Mahali pa Wateja',
    'location.map': 'Tazama Ramani',
    'location.route': 'Boreshe Njia',
    'location.history': 'Historia ya Mahali',
  },
};

export const getCurrentLanguage = () => {
  // English is the safe fallback when a visitor has not selected a language.
  return localStorage.getItem('sokocredit.language') || 'en';
};

export const setLanguage = (lang) => {
  if (SUPPORTED_LANGUAGES[lang]) {
    // Persist the choice and notify mounted UI components to refresh their text.
    localStorage.setItem('sokocredit.language', lang);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
  }
};

export const t = (key, lang = null) => {
  // Fall back to English, then to the key, so missing translations stay visible.
  const currentLang = lang || getCurrentLanguage();
  const translationObj = translations[currentLang] || translations.en;
  return translationObj[key] || key;
};
