export function showToast(message, type, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type} toast--slide-up`;
  
  let iconClass = 'fas fa-info-circle';
  if (type === 'success') iconClass = 'fas fa-check-circle';
  else if (type === 'error') iconClass = 'fas fa-times-circle';
  else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span class="toast__message">${message}</span>
    <button class="toast__close"><i class="fas fa-times"></i></button>
  `;

  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}

export function showLoading(message) {
  const loadingState = document.getElementById('loading-state');
  const resultSection = document.getElementById('result-section');
  const generateBtn = document.getElementById('generate-btn');
  
  if (loadingState) loadingState.style.display = 'flex';
  if (resultSection) resultSection.style.display = 'none';
  if (generateBtn) generateBtn.style.display = 'none';
  
  updateLoadingMessage(message);
  updateProgress(0);
}

export function hideLoading() {
  const loadingState = document.getElementById('loading-state');
  const generateBtn = document.getElementById('generate-btn');
  
  if (loadingState) loadingState.style.display = 'none';
  if (generateBtn) generateBtn.style.display = 'block';
}

export function updateLoadingMessage(message) {
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.textContent = message;
  }
}

export function updateProgress(percent) {
  const progressBar = document.getElementById('loading-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
}

export function animateProgress(targetPercent, durationMs) {
  return new Promise((resolve) => {
    const progressBar = document.getElementById('loading-progress-bar');
    if (!progressBar) return resolve();

    const currentWidth = parseFloat(progressBar.style.width) || 0;
    const distance = targetPercent - currentWidth;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeProgress = progress * (2 - progress); // Ease out
      
      const newWidth = currentWidth + (distance * easeProgress);
      progressBar.style.width = `${newWidth}%`;
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(step);
  });
}

export function renderImageResult(prompt, engine, score) {
  const resultPrompt = document.getElementById('result-prompt');
  const resultSection = document.getElementById('result-section');
  const resultEngineBadge = document.getElementById('result-engine-badge');
  
  if (resultPrompt) {
    resultPrompt.innerHTML = '';
    resultPrompt.textContent = prompt;
  }
  
  if (resultEngineBadge) {
    resultEngineBadge.textContent = getEngineName(engine);
  }
  
  if (resultSection) {
    resultSection.style.display = 'block';
  }
  
  renderQualityScore(score);
}

export function renderVideoResult(scenes, engine) {
  const resultPrompt = document.getElementById('result-prompt');
  const resultSection = document.getElementById('result-section');
  const resultEngineBadge = document.getElementById('result-engine-badge');
  
  if (resultPrompt) {
    resultPrompt.innerHTML = '';
    let fullText = '';
    let totalScore = 0;
    
    scenes.forEach((scene, index) => {
      const card = document.createElement('div');
      card.className = 'scene-card';
      
      const header = document.createElement('div');
      header.className = 'scene-card__header';
      header.innerHTML = `
        <span class="badge">Scene ${scene.scene}</span>
        <span class="timestamp">${scene.time}</span>
      `;
      
      const content = document.createElement('div');
      content.className = 'scene-card__content';
      content.textContent = scene.prompt;
      
      const actions = document.createElement('div');
      actions.className = 'scene-card__actions';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-outline';
      copyBtn.textContent = 'Copy Scene';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(scene.prompt);
          showToast('Scene copied to clipboard', 'success');
        } catch (err) {
          showToast('Failed to copy', 'error');
        }
      });
      
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn btn-outline';
      downloadBtn.textContent = 'Download Scene';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-outline toggle-btn';
      toggleBtn.textContent = 'Expand/Collapse';
      toggleBtn.addEventListener('click', () => {
        content.classList.toggle('expanded');
      });
      
      actions.appendChild(copyBtn);
      actions.appendChild(downloadBtn);
      actions.appendChild(toggleBtn);
      
      card.appendChild(header);
      card.appendChild(content);
      card.appendChild(actions);
      
      resultPrompt.appendChild(card);
      
      fullText += `Scene ${scene.scene} [${scene.time}]: ${scene.prompt}\n`;
    });
    
    resultPrompt.dataset.fullText = fullText;
  }
  
  if (resultEngineBadge) {
    resultEngineBadge.textContent = getEngineName(engine);
  }
  
  if (resultSection) {
    resultSection.style.display = 'block';
  }
  
  renderQualityScore(85); // Placeholder for average score if not provided per scene
}

export function renderQualityScore(score) {
  const scoreBar = document.getElementById('quality-score-bar');
  const scoreNumber = document.getElementById('quality-score-number');
  
  if (scoreBar && scoreNumber) {
    scoreBar.style.width = '0%';
    scoreBar.className = 'progress-bar'; // reset classes
    
    setTimeout(() => {
      scoreBar.style.width = `${score}%`;
      
      if (score <= 40) {
        scoreBar.classList.add('bg-red');
      } else if (score <= 70) {
        scoreBar.classList.add('bg-yellow');
      } else {
        scoreBar.classList.add('bg-green');
      }
      
      let currentScore = 0;
      const interval = setInterval(() => {
        if (currentScore >= score) {
          clearInterval(interval);
          scoreNumber.textContent = score + '%';
        } else {
          currentScore++;
          scoreNumber.textContent = currentScore + '%';
        }
      }, 20);
    }, 100);
  }
}

export function openHistoryPanel() {
  const historyPanel = document.getElementById('history-panel');
  const overlay = document.getElementById('history-overlay');
  if (historyPanel) historyPanel.classList.add('open');
  if (overlay) overlay.style.display = 'block';
}

export function closeHistoryPanel() {
  const historyPanel = document.getElementById('history-panel');
  const overlay = document.getElementById('history-overlay');
  if (historyPanel) historyPanel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
}

export function renderHistoryItems(items) {
  const container = document.getElementById('history-items-container');
  if (!container) return;
  
  container.innerHTML = '';
  if (!items || items.length === 0) {
    renderEmptyHistory();
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <img src="${item.thumbnail}" alt="${item.filename}" class="history-item__thumbnail" />
      <div class="history-item__info">
        <div class="history-item__name">${item.filename}</div>
        <div class="history-item__engine"><span class="badge">${item.engine}</span></div>
        <div class="history-item__date">${item.date}</div>
      </div>
      <div class="history-item__actions">
        <button class="btn btn-primary btn-sm use-btn">Use</button>
        <button class="btn btn-danger btn-sm delete-btn"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    el.querySelector('.delete-btn').addEventListener('click', () => {
      el.remove();
      if (container.children.length === 0) renderEmptyHistory();
    });
    
    container.appendChild(el);
  });
}

export function renderEmptyHistory() {
  const container = document.getElementById('history-items-container');
  if (container) {
    container.innerHTML = '<div class="empty-state">No history items found.</div>';
  }
}

export function openFavoritesPanel() {
  const favoritesPanel = document.getElementById('favorites-panel');
  if (favoritesPanel) favoritesPanel.classList.add('open');
}

export function closeFavoritesPanel() {
  const favoritesPanel = document.getElementById('favorites-panel');
  if (favoritesPanel) favoritesPanel.classList.remove('open');
}

export function renderFavoriteItems(items) {
  const container = document.getElementById('favorites-items-container');
  if (!container) return;
  
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state">No favorites yet.</div>';
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'favorite-item';
    el.innerHTML = `
      <div class="favorite-item__content">${item.content}</div>
      <button class="btn btn-sm btn-danger remove-fav-btn"><i class="fas fa-heart-broken"></i></button>
    `;
    el.querySelector('.remove-fav-btn').addEventListener('click', () => {
      el.remove();
    });
    container.appendChild(el);
  });
}

export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'flex';
}

export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
}

export function updateThemeUI(theme) {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.checked = (theme === 'dark');
  }
  document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
}

export function updateLanguageUI(lang) {
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

export function updateQuotaUI(quota) {
  const quotaDisplay = document.getElementById('quota-display');
  if (quotaDisplay) {
    quotaDisplay.textContent = `${quota.remaining} / ${quota.total}`;
  }
}

let rewardedInterval;

export function openRewardedModal(onClaim) {
  const modal = document.getElementById('rewarded-modal');
  const claimBtn = document.getElementById('rewarded-claim');
  const cancelBtn = document.getElementById('rewarded-cancel');
  const countdownText = document.getElementById('rewarded-countdown');
  
  if (!modal || !claimBtn || !cancelBtn || !countdownText) return;
  
  modal.style.display = 'flex';
  claimBtn.disabled = true;
  
  let timeLeft = 15;
  countdownText.textContent = `Wait ${timeLeft}s to claim reward`;
  
  clearInterval(rewardedInterval);
  rewardedInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(rewardedInterval);
      countdownText.textContent = 'Reward ready!';
      claimBtn.disabled = false;
    } else {
      countdownText.textContent = `Wait ${timeLeft}s to claim reward`;
    }
  }, 1000);
  
  const claimHandler = () => {
    clearInterval(rewardedInterval);
    closeRewardedModal();
    if (onClaim) onClaim();
    claimBtn.removeEventListener('click', claimHandler);
  };
  
  const cancelHandler = () => {
    clearInterval(rewardedInterval);
    closeRewardedModal();
    cancelBtn.removeEventListener('click', cancelHandler);
  };
  
  claimBtn.addEventListener('click', claimHandler);
  cancelBtn.addEventListener('click', cancelHandler);
}

export function closeRewardedModal() {
  const modal = document.getElementById('rewarded-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  clearInterval(rewardedInterval);
}

export function showPreview(file, objectUrl) {
  const uploadZone = document.getElementById('upload-zone');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImage = document.getElementById('preview-image');
  const previewVideo = document.getElementById('preview-video');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  
  if (uploadZone) uploadZone.style.display = 'none';
  if (uploadPreview) uploadPreview.style.display = 'block';
  
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  
  if (file.type.startsWith('image/')) {
    if (previewImage) {
      previewImage.src = objectUrl;
      previewImage.style.display = 'block';
    }
    if (previewVideo) previewVideo.style.display = 'none';
  } else if (file.type.startsWith('video/')) {
    if (previewVideo) {
      previewVideo.src = objectUrl;
      previewVideo.style.display = 'block';
    }
    if (previewImage) previewImage.style.display = 'none';
  }
}

export function hidePreview() {
  const uploadZone = document.getElementById('upload-zone');
  const uploadPreview = document.getElementById('upload-preview');
  const previewImage = document.getElementById('preview-image');
  const previewVideo = document.getElementById('preview-video');
  
  if (uploadZone) uploadZone.style.display = 'block';
  if (uploadPreview) uploadPreview.style.display = 'none';
  if (previewImage) previewImage.src = '';
  if (previewVideo) previewVideo.src = '';
}

export function initNavbarScroll() {
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });
}

export function openMobileNav() {
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) mobileNav.classList.add('open');
}

export function closeMobileNav() {
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) mobileNav.classList.remove('open');
}

export function getEngineName(engineId) {
  const engines = {
    'midjourney': 'Midjourney v6',
    'dalle3': 'DALL-E 3',
    'stable-diffusion': 'Stable Diffusion XL',
    'sora': 'Sora',
    'runway': 'Runway Gen-2',
    'pika': 'Pika Labs'
  };
  return engines[engineId] || engineId;
}
