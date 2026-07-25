export const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr', 'de', 'es', 'zh'];
export const RTL_LANGUAGES = ['ar'];

let translations = {};
let currentLang = 'en';

export async function initI18n() {
  const savedLang = localStorage.getItem('app_lang') || navigator.language.split('-')[0];
  const langToSet = SUPPORTED_LANGUAGES.includes(savedLang) ? savedLang : 'en';
  await setLanguage(langToSet);
}

export async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
  currentLang = lang;
  
  try {
    const response = await fetch(`/lang/${lang}.json`);
    if (!response.ok) throw new Error(`Could not load language file for ${lang}`);
    translations = await response.json();
  } catch (error) {
    console.warn(`Translation load failed: ${error.message}. Falling back to empty translations.`);
    translations = {};
  }
  
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  localStorage.setItem('app_lang', lang);
  
  applyTranslations();
}

export function t(key, vars = {}) {
  let str = translations[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return str;
}

export function getCurrentLanguage() {
  return currentLang;
}

export function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });
}
