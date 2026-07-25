import { initI18n, t, setLanguage, getCurrentLanguage } from './i18n.js';
import { 
  showToast, showLoading, hideLoading, updateLoadingMessage, 
  animateProgress, renderImageResult, renderVideoResult, 
  openHistoryPanel, openFavoritesPanel, openSettingsModal, 
  openRewardedModal, closeRewardedModal, updateThemeUI, 
  updateLanguageUI, updateQuotaUI, initNavbarScroll 
} from './ui.js';
import { initUpload, getCurrentFile, getCurrentFileType, clearUpload } from './upload.js';
import { analyzeImage, analyzeVideo } from './api.js';
import { buildImagePrompt, buildVideoScenePrompt, calculatePromptScore } from './prompt.js';
import { processImage } from './image.js';
import { extractFrames } from './video.js';
import { 
  getQuota, useQuota, rechargeQuota, resetIfNewDay, startRewardedAdTimer 
} from './quota.js';
import { 
  load, save, addToHistory, getHistory, getSettings 
} from './storage.js';
import { generateId } from './utils.js';

// --- State ---
const state = {
  isGenerating: false,
  engine: 'midjourney',
  style: 'photorealistic'
};

// --- DOM Elements ---
const dom = {
  generateBtn: document.getElementById('generate-btn'),
  engineSelect: document.getElementById('engine-select'),
  styleSelect: document.getElementById('style-select'),
  historyBtn: document.getElementById('history-btn'),
  favoritesBtn: document.getElementById('favorites-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  langBtn: document.getElementById('lang-btn'),
  historyClearBtn: document.getElementById('history-clear'),
  newBtn: document.getElementById('new-btn')
};

// --- Initialization ---
async function init() {
  // 1. Language & Theme
  await initI18n();
  const settings = getSettings();
  if (settings && settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }
  updateThemeUI(document.documentElement.getAttribute('data-theme'));
  updateLanguageUI(getCurrentLanguage());
  
  // 2. Quota
  resetIfNewDay();
  updateQuotaUI(getQuota());

  // 3. UI Events
  initNavbarScroll();
  initUpload((file, fileType) => {
    dom.generateBtn.disabled = false;
  });

  // 4. Bind Events
  bindEvents();
}

// --- Event Binding ---
function bindEvents() {
  // Selectors
  dom.engineSelect?.addEventListener('change', (e) => state.engine = e.target.value);
  dom.styleSelect?.addEventListener('change', (e) => state.style = e.target.value);

  // Generate
  dom.generateBtn?.addEventListener('click', handleGenerate);

  // Panels
  dom.historyBtn?.addEventListener('click', () => {
    // Re-render history before opening (implemented inside ui.js or we can pass data)
    openHistoryPanel();
  });
  dom.favoritesBtn?.addEventListener('click', openFavoritesPanel);
  dom.langBtn?.addEventListener('click', openSettingsModal);
  
  // Theme Toggle
  dom.themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    save('SETTINGS', { ...getSettings(), theme: next });
    updateThemeUI(next);
  });

  // New Button
  dom.newBtn?.addEventListener('click', () => {
    clearUpload();
    document.getElementById('result-section').hidden = true;
    dom.generateBtn.hidden = false;
    dom.generateBtn.disabled = true;
  });
}

// --- Core Generation Flow ---
async function handleGenerate() {
  const file = getCurrentFile();
  const fileType = getCurrentFileType();

  if (!file) {
    showToast(t('error.nofile'), 'error');
    return;
  }

  if (state.isGenerating) return;

  // Check Quota
  if (!useQuota()) {
    showRewardedAdFlow();
    return;
  }
  updateQuotaUI(getQuota());

  state.isGenerating = true;
  showLoading(t('loading.start'));

  try {
    let resultPrompts = [];
    let score = 0;
    const historyId = generateId();

    if (fileType === 'image') {
      updateLoadingMessage(t('loading.processing'));
      animateProgress(30, 1000);
      
      const { base64 } = await processImage(file);
      
      updateLoadingMessage(t('loading.ai'));
      animateProgress(70, 2000);
      
      const rawDescription = await analyzeImage(base64);
      
      updateLoadingMessage(t('loading.crafting'));
      animateProgress(95, 500);
      
      const finalPrompt = buildImagePrompt(rawDescription, state.engine, state.style);
      score = calculatePromptScore(finalPrompt);
      
      renderImageResult(finalPrompt, state.engine, score);
      
      // Save to History
      addToHistory({
        id: historyId,
        type: 'image',
        engine: state.engine,
        style: state.style,
        prompts: [finalPrompt],
        filename: file.name,
        createdAt: new Date().toISOString()
      });

    } else if (fileType === 'video') {
      updateLoadingMessage(t('loading.extracting'));
      animateProgress(20, 2000);
      
      const frames = await extractFrames(file, 5);
      
      updateLoadingMessage(t('loading.ai'));
      animateProgress(60, 4000);
      
      const scenes = await analyzeVideo(frames, (info) => {
        if (info.step === 'analyzing') animateProgress(80, 2000);
      });
      
      updateLoadingMessage(t('loading.crafting'));
      animateProgress(95, 500);
      
      const finalScenes = scenes.map(scene => ({
        ...scene,
        prompt: buildVideoScenePrompt(scene, state.engine, state.style)
      }));
      
      score = calculatePromptScore(finalScenes[0]?.prompt || '');
      
      renderVideoResult(finalScenes, state.engine);
      
      // Save to History
      addToHistory({
        id: historyId,
        type: 'video',
        engine: state.engine,
        style: state.style,
        prompts: finalScenes.map(s => s.prompt),
        filename: file.name,
        createdAt: new Date().toISOString()
      });
    }

    animateProgress(100, 200);
    setTimeout(() => {
      hideLoading();
      showToast(t('success.generated'), 'success');
    }, 400);

  } catch (error) {
    console.error('Generation Error:', error);
    hideLoading();
    dom.generateBtn.hidden = false;
    showToast(error.message || t('error.generic'), 'error');
    // Refund quota on error
    rechargeQuota(1);
    updateQuotaUI(getQuota());
  } finally {
    state.isGenerating = false;
  }
}

// --- Monetization ---
function showRewardedAdFlow() {
  openRewardedModal(() => {
    // User watched ad
    rechargeQuota(5);
    updateQuotaUI(getQuota());
    closeRewardedModal();
    showToast(t('quota.rewarded'), 'success');
  });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', init);
