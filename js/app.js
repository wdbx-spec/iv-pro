/**
 * PromptAI – Main Application Module
 * Orchestrates UI interactions, routing, file handling, and integrations.
 */

import { analyzeImage, analyzeVideo } from './api.js';
import { getQuota, useQuota, rechargeQuota, resetIfNewDay } from './quota.js';
import { initAds, showBannerAd, showRewardedBannerModal } from './ads.js';
import { initI18n, setLanguage, t, getCurrentLanguage } from './i18n.js';

// ================================================================
// STATE
// ================================================================
const state = {
  currentFile: null,
  fileType: null, // 'image' | 'video'
  selectedEngine: 'midjourney',
  selectedStyle: 'photorealistic',
  currentPage: 'home',
  isGenerating: false
};

// ================================================================
// DOM REFERENCES
// ================================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  // Upload
  uploadZone: $('#upload-drop-area'),
  fileInput: $('#file-input'),
  uploadPreview: $('#upload-preview'),
  previewImage: $('#preview-image'),
  previewVideo: $('#preview-video'),
  removeFileBtn: $('#remove-file'),
  fileName: $('#file-name'),
  uploadInner: $('#upload-drop-area'),

  // Generate
  generateBtn: $('#generate-btn'),
  loadingState: $('#loading-state'),
  loadingText: $('#loading-text'),
  loadingProgress: $('#loading-progress'),

  // Result
  resultSection: $('#result-section'),
  resultPrompt: $('#result-prompt'),
  copyBtn: $('#copy-btn'),
  downloadBtn: $('#download-btn'),
  newBtn: $('#new-btn'),

  // Selects
  engineBtn: $('#engine-btn'),
  engineDropdown: $('#engine-dropdown'),
  engineSelect: $('#engine-select'),
  engineSelected: $('#engine-selected'),
  styleBtn: $('#style-btn'),
  styleDropdown: $('#style-dropdown'),
  styleSelect: $('#style-select'),
  styleSelected: $('#style-selected'),

  // Quota
  quotaCount: $('#quota-count'),

  // Navigation
  mainNav: $('#main-nav'),
  mobileMenuBtn: $('#mobile-menu-btn'),
  mobileNav: $('#mobile-nav'),
  mobileNavClose: $('#mobile-nav-close'),
  pageHome: $('#page-home'),
  pageDynamic: $('#page-dynamic'),
  dynamicContent: $('#dynamic-content'),

  // Theme
  themeToggle: $('#theme-toggle'),

  // Language
  langBtn: $('#lang-btn'),
  langSelector: $('#lang-selector'),
  langDropdown: $('#lang-dropdown'),
  currentLangLabel: $('#current-lang-label'),

  // Toast
  toast: $('#toast'),
  toastMessage: $('#toast-message'),

  // Loading ad
  loadingAdContainer: $('#loading-ad-container')
};

// ================================================================
// INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Init theme
  initTheme();

  // Init i18n
  await initI18n();

  // Init quota
  resetIfNewDay();
  updateQuotaDisplay();

  // Init ads
  initAds();
  showBannerAd('bottom-ad');

  // Init Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind events
  bindUploadEvents();
  bindSelectEvents();
  bindGenerateEvents();
  bindResultEvents();
  bindNavigationEvents();
  bindThemeEvents();
  bindLanguageEvents();

  // Handle initial hash
  handleHashChange();

  // Register service worker
  registerSW();
});

// ================================================================
// SERVICE WORKER
// ================================================================
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail - SW not critical
    });
  }
}

// ================================================================
// THEME
// ================================================================
function initTheme() {
  const saved = localStorage.getItem('promptai_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('promptai_theme', next);
}

function bindThemeEvents() {
  dom.themeToggle?.addEventListener('click', () => {
    toggleTheme();
  });
}

// ================================================================
// LANGUAGE
// ================================================================
function bindLanguageEvents() {
  // Toggle dropdown
  dom.langBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.langSelector.classList.toggle('open');
  });

  // Select language
  $$('.lang-option').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      await setLanguage(lang);
      updateLangUI(lang);
      dom.langSelector.classList.remove('open');
      // Re-init Lucide icons after i18n update
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Close on outside click
  document.addEventListener('click', () => {
    dom.langSelector?.classList.remove('open');
  });

  // Set initial UI
  updateLangUI(getCurrentLanguage());
}

function updateLangUI(lang) {
  const labels = { en: 'EN', fr: 'FR', de: 'DE', es: 'ES', zh: '中', ar: 'عر' };
  if (dom.currentLangLabel) dom.currentLangLabel.textContent = labels[lang] || 'EN';

  // Update active state
  $$('.lang-option').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.lang === lang);
  });
}

// ================================================================
// FILE UPLOAD
// ================================================================
function bindUploadEvents() {
  // Click to upload
  dom.uploadZone?.addEventListener('click', () => {
    dom.fileInput?.click();
  });

  // File input change
  dom.fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // Drag & drop
  dom.uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.uploadZone.classList.add('dragover');
  });

  dom.uploadZone?.addEventListener('dragleave', () => {
    dom.uploadZone.classList.remove('dragover');
  });

  dom.uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // Remove file
  dom.removeFileBtn?.addEventListener('click', () => {
    clearFile();
  });
}

function handleFile(file) {
  // Validate type
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/webm'];

  if (!imageTypes.includes(file.type) && !videoTypes.includes(file.type)) {
    showToast(t('error.format') || 'Unsupported file format.');
    return;
  }

  // Validate size
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 50 * 1024 * 1024; // 50MB
  const isImage = imageTypes.includes(file.type);
  const maxSize = isImage ? maxImageSize : maxVideoSize;

  if (file.size > maxSize) {
    showToast(t('error.size') || 'File too large.');
    return;
  }

  state.currentFile = file;
  state.fileType = isImage ? 'image' : 'video';

  // Show preview
  showPreview(file);

  // Enable generate button
  dom.generateBtn.disabled = false;
}

function showPreview(file) {
  const url = URL.createObjectURL(file);

  dom.uploadZone.style.display = 'none';
  dom.uploadPreview.style.display = 'flex';

  if (state.fileType === 'image') {
    dom.previewImage.src = url;
    dom.previewImage.style.display = 'block';
    dom.previewVideo.style.display = 'none';
  } else {
    dom.previewVideo.src = url;
    dom.previewVideo.style.display = 'block';
    dom.previewImage.style.display = 'none';
  }

  dom.fileName.textContent = file.name;
}

function clearFile() {
  state.currentFile = null;
  state.fileType = null;

  dom.uploadZone.style.display = 'flex';
  dom.uploadPreview.style.display = 'none';
  dom.previewImage.style.display = 'none';
  dom.previewImage.src = '';
  dom.previewVideo.style.display = 'none';
  dom.previewVideo.src = '';
  dom.fileName.textContent = '';
  dom.fileInput.value = '';
  dom.generateBtn.disabled = true;

  // Hide result
  dom.resultSection.style.display = 'none';
}

// ================================================================
// CUSTOM SELECTS
// ================================================================
function bindSelectEvents() {
  // Engine select
  setupCustomSelect(
    dom.engineBtn, dom.engineSelect, dom.engineDropdown, dom.engineSelected,
    (value, label) => { state.selectedEngine = value; }
  );

  // Style select
  setupCustomSelect(
    dom.styleBtn, dom.styleSelect, dom.styleDropdown, dom.styleSelected,
    (value, label) => { state.selectedStyle = value; }
  );

  // Close all selects on outside click
  document.addEventListener('click', () => {
    $$('.custom-select').forEach((s) => s.classList.remove('open'));
  });
}

function setupCustomSelect(btn, selectEl, dropdown, selectedEl, onChange) {
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other selects
    $$('.custom-select').forEach((s) => {
      if (s !== selectEl) s.classList.remove('open');
    });
    selectEl.classList.toggle('open');
  });

  dropdown?.querySelectorAll('.custom-select__option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = opt.dataset.value;
      const label = opt.textContent.trim();

      // Update active
      dropdown.querySelectorAll('.custom-select__option').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');

      // Update display
      selectedEl.textContent = label;
      selectEl.classList.remove('open');

      onChange(value, label);
    });
  });
}

// ================================================================
// GENERATE PROMPT
// ================================================================
function bindGenerateEvents() {
  dom.generateBtn?.addEventListener('click', () => {
    generatePrompt();
  });
}

async function generatePrompt() {
  if (!state.currentFile || state.isGenerating) return;

  // Check quota
  resetIfNewDay();
  if (!useQuota()) {
    // Show rewarded ad modal
    try {
      await showRewardedBannerModal();
      rechargeQuota();
      updateQuotaDisplay();
      showToast(t('quota.success') || '5 new attempts added!');
      // Retry generation
      generatePrompt();
    } catch {
      // User closed without completing
    }
    return;
  }

  updateQuotaDisplay();
  state.isGenerating = true;

  // Show loading
  dom.generateBtn.style.display = 'none';
  dom.resultSection.style.display = 'none';
  dom.loadingState.style.display = 'flex';

  // Animate progress bar
  animateProgress();

  // Push loading ad
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // AdSense not loaded
  }

  try {
    let result;
    if (state.fileType === 'image') {
      dom.loadingText.textContent = t('loading.image') || 'Analyzing your image...';
      result = await analyzeImage(state.currentFile, state.selectedEngine, state.selectedStyle);
    } else {
      dom.loadingText.textContent = t('loading.video') || 'Analyzing your video...';
      result = await analyzeVideo(state.currentFile, state.selectedEngine, state.selectedStyle);
    }

    // Show result
    dom.loadingState.style.display = 'none';
    dom.resultSection.style.display = 'block';
    dom.resultPrompt.textContent = result;
  } catch (error) {
    dom.loadingState.style.display = 'none';
    dom.generateBtn.style.display = 'flex';
    showToast(t('error.generic') || 'An error occurred. Please try again.');
    console.error('Generation error:', error);
  }

  state.isGenerating = false;
}

function animateProgress() {
  const bar = dom.loadingProgress;
  if (!bar) return;
  bar.style.width = '0%';

  let progress = 0;
  const interval = setInterval(() => {
    if (progress >= 90) {
      clearInterval(interval);
      return;
    }
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    bar.style.width = progress + '%';
  }, 500);

  // Store interval for cleanup
  bar._interval = interval;
}

// ================================================================
// RESULT ACTIONS
// ================================================================
function bindResultEvents() {
  // Copy
  dom.copyBtn?.addEventListener('click', () => {
    const text = dom.resultPrompt.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('result.copied') || 'Copied!');
    }).catch(() => {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(t('result.copied') || 'Copied!');
    });
  });

  // Download
  dom.downloadBtn?.addEventListener('click', () => {
    const text = dom.resultPrompt.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptai-${state.selectedEngine}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Generate another
  dom.newBtn?.addEventListener('click', () => {
    clearFile();
    dom.generateBtn.style.display = 'flex';
    dom.resultSection.style.display = 'none';
    dom.loadingState.style.display = 'none';
  });
}

// ================================================================
// QUOTA DISPLAY
// ================================================================
function updateQuotaDisplay() {
  const quota = getQuota();
  if (dom.quotaCount) {
    dom.quotaCount.textContent = `${quota.remaining}/${quota.total}`;
  }
}

// ================================================================
// NAVIGATION / ROUTING
// ================================================================
function bindNavigationEvents() {
  // Hash-based routing
  window.addEventListener('hashchange', handleHashChange);

  // Nav links
  $$('[data-page]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const page = link.dataset.page;
      if (page) {
        e.preventDefault();
        window.location.hash = page;
      }
    });
  });

  // Mobile menu
  dom.mobileMenuBtn?.addEventListener('click', () => {
    dom.mobileNav?.classList.add('open');
  });

  dom.mobileNavClose?.addEventListener('click', () => {
    dom.mobileNav?.classList.remove('open');
  });

  dom.mobileNav?.addEventListener('click', (e) => {
    if (e.target === dom.mobileNav) {
      dom.mobileNav.classList.remove('open');
    }
  });

  // Close mobile nav on link click
  $$('.mobile-nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      dom.mobileNav?.classList.remove('open');
    });
  });
}

async function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'home';
  state.currentPage = hash;

  // Update active nav links
  $$('.nav-link, .mobile-nav__link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === hash);
  });

  if (hash === 'home') {
    dom.pageHome.classList.add('active');
    dom.pageHome.style.display = 'block';
    dom.pageDynamic.classList.remove('active');
    dom.pageDynamic.style.display = 'none';
  } else {
    dom.pageHome.classList.remove('active');
    dom.pageHome.style.display = 'none';
    dom.pageDynamic.classList.add('active');
    dom.pageDynamic.style.display = 'block';

    // Load page
    await loadPage(hash);
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadPage(pageName) {
  try {
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    dom.dynamicContent.innerHTML = html;

    // Re-apply i18n
    await setLanguage(getCurrentLanguage());

    // Re-init Lucide icons in dynamic content
    if (window.lucide) window.lucide.createIcons();

    // Init FAQ accordion if on FAQ page
    if (pageName === 'faq') initFaqAccordion();

  } catch {
    dom.dynamicContent.innerHTML = `
      <div class="page-content" style="text-align:center; padding: 60px 20px;">
        <h1 class="page-title">404</h1>
        <p class="page-subtitle">Page not found</p>
        <a href="#home" class="btn-primary" data-page="home">Go Home</a>
      </div>
    `;
  }
}

function initFaqAccordion() {
  $$('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');

      // Close all
      $$('.faq-item').forEach((fi) => fi.classList.remove('open'));

      // Toggle clicked
      if (!wasOpen) item.classList.add('open');
    });
  });
}

// ================================================================
// TOAST
// ================================================================
function showToast(message) {
  if (!dom.toast || !dom.toastMessage) return;
  dom.toastMessage.textContent = message;
  dom.toast.classList.add('show');

  setTimeout(() => {
    dom.toast.classList.remove('show');
  }, 3000);
}

// ================================================================
// Make showToast globally available for other modules
// ================================================================
window.__promptai_showToast = showToast;
