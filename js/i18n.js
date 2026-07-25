/**
 * PromptAI – Internationalization (i18n) Module
 * Handles language detection, switching, RTL support, and translations.
 */

const LANG_KEY = 'promptai_lang';
const SUPPORTED_LANGS = ['en', 'fr', 'de', 'es', 'zh', 'ar'];

let currentLanguage = 'en';
let translations = {};

/**
 * Get the currently active language code.
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Initialize i18n: detect or restore saved language, then apply.
 */
export async function initI18n() {
  let savedLang = localStorage.getItem(LANG_KEY);

  if (!savedLang) {
    // Detect from browser
    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    savedLang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en';
  }

  await setLanguage(savedLang);
}

/**
 * Switch to a new language. Fetches the JSON file and updates the DOM.
 */
export async function setLanguage(langCode) {
  if (!SUPPORTED_LANGS.includes(langCode)) langCode = 'en';

  try {
    const response = await fetch(`lang/${langCode}.json`);
    if (!response.ok) throw new Error(`Failed to load language: ${langCode}`);

    translations = await response.json();
    currentLanguage = langCode;
    localStorage.setItem(LANG_KEY, langCode);

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translated = translations[key];
      if (translated) {
        // Preserve inner HTML structure for elements with icons
        if (el.querySelector('i, svg')) {
          // Only update text nodes, not icon elements
          const textNode = Array.from(el.childNodes).find(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
          );
          if (textNode) {
            textNode.textContent = ' ' + translated;
          }
        } else {
          el.textContent = translated;
        }
      }
    });

    // Set HTML direction and lang
    const html = document.documentElement;
    html.lang = langCode;

    if (langCode === 'ar') {
      html.dir = 'rtl';
      document.body.style.fontFamily = "'Tajawal', 'Outfit', system-ui, sans-serif";
    } else {
      html.dir = 'ltr';
      document.body.style.fontFamily = '';
    }
  } catch (e) {
    console.error('i18n error:', e);
    // Fallback: if we failed to load a non-English language, try English
    if (langCode !== 'en') {
      await setLanguage('en');
    }
  }
}

/**
 * Translate a key, with optional interpolation parameters.
 * Usage: t('quota.display', { count: 3 }) → replaces {count} with 3
 */
export function t(key, params = {}) {
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}
