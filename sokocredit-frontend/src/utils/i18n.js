// Multi-language Support Configuration
// Support for English and Swahili only

// Metadata shown by language selectors throughout the application.
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  lu: { name: 'Luo', nativeName: 'Dholuo', flag: '🇰🇪' },
  ki: { name: 'Kikuyu', nativeName: 'Gĩkũyũ', flag: '🇰🇪' },
  ka: { name: 'Kamba', nativeName: 'Kikamba', flag: '🇰🇪' },
  lh: { name: 'Luhya', nativeName: 'Luhya', flag: '🇰🇪' },
  so: { name: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴' },
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
  // Luo (Dholuo)
  lu: {
    'nav.home': 'Ka',
    'nav.customers': 'Wateja',
    'nav.loans': 'Mikopo',
    'nav.analytics': 'Wangʼe',
    'nav.chamas': 'Vikundi',
    'nav.inventory': 'Hesabu',
    'nav.location': 'Kondegi mag Wateja',
    'nav.crb': 'Ofisi mar Mikopo',
    'nav.renewal': 'Gik ma Mikopo',
    'nav.communications': 'Thur',
    'nav.business': 'Biashara',

    'common.success': 'Nitiegi',
    'common.error': 'Koro',
    'common.loading': 'Konyru...',
    'common.save': 'Nadru',
    'common.cancel': 'Gik',
    'common.submit': 'Timbe',

    'crb.title': 'Ofisi mar Mikopo',
    'crb.check': 'Nyar Kiyudo mar Mkopo',
    'crb.status': 'Bura mar Mkopo',
    'crb.sync': 'Konyru gi Ofisi',

    'inventory.title': 'Hesabu',
    'inventory.addNew': 'Tero Hesabu Neno',
    'inventory.tracking': 'Rar Staki',
    'inventory.soldUnits': 'Wikogo mag Timo',

    'location.title': 'Kondegi mag Wateja',
    'location.map': 'Wuok Ramani',
    'location.route': 'Giro Rengʼ',
    'location.history': 'Gik Moko',
  },

  // Kikuyu (Gĩkũyũ)
  ki: {
    'nav.home': 'Ngai',
    'nav.customers': 'Mîthîni',
    'nav.loans': 'Maũndũ',
    'nav.analytics': 'Gũciaria',
    'nav.chamas': 'Mîthûrû',
    'nav.inventory': 'Mburi ya biashara',
    'nav.location': 'Atha a Mîthîni',
    'nav.crb': 'Ũhoro wa Ntonywo',
    'nav.renewal': 'Gũthũkana Maũndũ',
    'nav.communications': 'Matûmîrîo',
    'nav.business': 'Mburi wa Biashara',

    'common.success': 'Mûno',
    'common.error': 'Kwîrîa',
    'common.loading': 'Gũcooka...',
    'common.save': 'Hîndîra',
    'common.cancel': 'Gûkûrû',
    'common.submit': 'Tûgîa',

    'crb.title': 'Ũhoro wa Ntonywo',
    'crb.check': 'Gûtîkana Ithîo',
    'crb.status': 'Mûthî',
    'crb.sync': 'Tûkûmia na Ofisi',

    'inventory.title': 'Mburi ya Biashara',
    'inventory.addNew': 'Tîra Mburi Maũndũ',
    'inventory.tracking': 'Gûciaria Wendo',
    'inventory.soldUnits': 'Mathûgû ma Kûrîa',

    'location.title': 'Atha a Mîthîni',
    'location.map': 'Tegia Ramani',
    'location.route': 'Rûgano rwa Njû',
    'location.history': 'Rîa mbere',
  },

  // Kamba (Kikamba)
  ka: {
    'nav.home': 'Ikũmi',
    'nav.customers': 'Aathu',
    'nav.loans': 'Mîkûko',
    'nav.analytics': 'Kûlûmîka',
    'nav.chamas': 'Mîhîî',
    'nav.inventory': 'Kîthîa',
    'nav.location': 'Mûno wa Aathu',
    'nav.crb': 'Kîlûkûlû kia Mîkûko',
    'nav.renewal': 'Kûlîla Mîkûko',
    'nav.communications': 'Mûno wa Maũndũ',
    'nav.business': 'Biashara',

    'common.success': 'Kuteka',
    'common.error': 'Kûsûka',
    'common.loading': 'Kûlûthua...',
    'common.save': 'Tûka',
    'common.cancel': 'Kûgûkûlû',
    'common.submit': 'Thîna',

    'crb.title': 'Kîlûkûlû kia Mîkûko',
    'crb.check': 'Kûsûka ĩtîa kia Mkûko',
    'crb.status': 'Mûno wa Mkûko',
    'crb.sync': 'Kûthûla na Ofisi',

    'inventory.title': 'Kîthîa',
    'inventory.addNew': 'Kûthîa Kîthîa Kîa Nû',
    'inventory.tracking': 'Kûlûmya Staki',
    'inventory.soldUnits': 'Vitengo vîvûlî',

    'location.title': 'Mûno wa Aathu',
    'location.map': 'Tûa Ramani',
    'location.route': 'Kûlîla Njia',
    'location.history': 'Mûno wa Mabere',
  },

  // Luhya
  lh: {
    'nav.home': 'Nyumba',
    'nav.customers': 'Abakili',
    'nav.loans': 'Ebyemalango',
    'nav.analytics': 'Obwonyo',
    'nav.chamas': 'Ebikundi',
    'nav.inventory': 'Ebintu bya Biashara',
    'nav.location': 'Eko lyabakili',
    'nav.crb': 'Ofisi ya Malango',
    'nav.renewal': 'Okukola Malango',
    'nav.communications': 'Obutumwa',
    'nav.business': 'Biashara',

    'common.success': 'Kuhya',
    'common.error': 'Kokosa',
    'common.loading': 'Kukora...',
    'common.save': 'Okusa',
    'common.cancel': 'Okucima',
    'common.submit': 'Okutumya',

    'crb.title': 'Ofisi ya Malango',
    'crb.check': 'Enkola ya Malango',
    'crb.status': 'Ekipimo',
    'crb.sync': 'Kukusanya na Ofisi',

    'inventory.title': 'Ebintu bya Biashara',
    'inventory.addNew': 'Okuteka Ebintu Ebisha',
    'inventory.tracking': 'Okuruba Staki',
    'inventory.soldUnits': 'Enkumbi Ezitwidywe',

    'location.title': 'Eko lyabakili',
    'location.map': 'Lona Ramani',
    'location.route': 'Okurumba Njia',
    'location.history': 'Ebyome',
  },

  // Somali (Soomaali)
  so: {
    'nav.home': 'Hoyga',
    'nav.customers': 'Macaamiisha',
    'nav.loans': 'Amaah',
    'nav.analytics': 'Falanqayn',
    'nav.chamas': 'Kooxaha',
    'nav.inventory': 'Alaab Kayd',
    'nav.location': 'Goobta Macaamiisha',
    'nav.crb': 'Xafiiska Deynta',
    'nav.renewal': 'Dib u cusbooneysiinta Amaahda',
    'nav.communications': 'Isgaarsiinta',
    'nav.business': 'Ganacsi',

    'common.success': 'Guul',
    'common.error': 'Khalad',
    'common.loading': 'Soo raraya...',
    'common.save': 'Kaydi',
    'common.cancel': 'Jooji',
    'common.submit': 'Gudbi',

    'crb.title': 'Xafiiska Deynta',
    'crb.check': 'Hubi Dhibcaha Deynta',
    'crb.status': 'Xaaladda Deynta',
    'crb.sync': 'Isku xidh Xafiiska',

    'inventory.title': 'Alaab Kayd',
    'inventory.addNew': 'Kudar Alaab Cusub',
    'inventory.tracking': 'La soco kaydka',
    'inventory.soldUnits': 'Unugyada la iibsaday',

    'location.title': 'Goobta Macaamiisha',
    'location.map': 'Eeg Khariidadda',
    'location.route': 'Hagaaji Waddada',
    'location.history': 'Taariikhda Goobta',
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
