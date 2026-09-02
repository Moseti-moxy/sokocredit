// Multi-language Support Configuration
// Support for English and Swahili only

// Metadata shown by language selectors throughout the application.
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
};

// Translation strings grouped by language and accessed through the `t` helper.
export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.customers': 'Customers',
    'nav.chamas': 'Chamas',
    'nav.loans': 'Loans',
    'nav.renewals': 'Renewals',
    'nav.inventory': 'Inventory',
    'nav.creditChecks': 'Credit Checks',
    'nav.locations': 'Locations',
    'nav.messages': 'Messages',
    'nav.customerSupport': 'Customer Support',
    'nav.communicationCenter': 'Communication Center',
    'nav.businessRegistry': 'Business Registry',
    'nav.analytics': 'Analytics',
    'nav.reports': 'Reports',
    'nav.risk': 'Risk',
    'nav.auditLog': 'Audit Log',
    'nav.agents': 'Agents',
    'nav.settings': 'Settings',
    'nav.appSettings': 'App Settings',
    'nav.logout': 'Log out',
    'nav.more': 'More',

    // Common
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',

    // Language settings
    'language.title': 'Language Settings',
    'language.description': 'Select your preferred language for the application interface.',
    'language.current': 'Current Language:',

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
    'nav.chamas': 'Vikundi',
    'nav.loans': 'Mikopo',
    'nav.renewals': 'Upyaji wa Mikopo',
    'nav.inventory': 'Hesabu',
    'nav.creditChecks': 'Ukaguzi wa Mkopo',
    'nav.locations': 'Maeneo',
    'nav.messages': 'Ujumbe',
    'nav.customerSupport': 'Msaada kwa Wateja',
    'nav.communicationCenter': 'Kituo cha Mawasiliano',
    'nav.businessRegistry': 'Usajili wa Biashara',
    'nav.analytics': 'Uchambuzi',
    'nav.reports': 'Ripoti',
    'nav.risk': 'Hatari',
    'nav.auditLog': 'Kumbukumbu za Ukaguzi',
    'nav.agents': 'Mawakala',
    'nav.settings': 'Mipangilio',
    'nav.appSettings': 'Mipangilio ya Programu',
    'nav.logout': 'Toka',
    'nav.more': 'Zaidi',

    // Common
    'common.success': 'Umefanikiwa',
    'common.error': 'Kosa',
    'common.loading': 'Inapakia...',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.submit': 'Tuma',

    // Language settings
    'language.title': 'Mipangilio ya Lugha',
    'language.description': 'Chagua lugha unayopendelea kwa muonekano wa programu.',
    'language.current': 'Lugha ya Sasa:',

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
  // English is the safe fallback — also covers a stored preference for a
  // language that has since been removed from SUPPORTED_LANGUAGES.
  const stored = localStorage.getItem('sokocredit.language');
  return SUPPORTED_LANGUAGES[stored] ? stored : 'en';
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
