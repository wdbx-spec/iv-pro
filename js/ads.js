/**
 * PromptAI – AdSense Integration Module
 * Handles banner ads and the rewarded banner modal flow.
 */

const PUBLISHER_ID = 'ca-pub-3618365568004987';
const AD_UNIT_ID = '4314248288';

/**
 * Initialize AdSense — the script is already loaded in index.html,
 * so this is a no-op safety check.
 */
export function initAds() {
  // AdSense script is already in the HTML head.
  // This function exists for future extension (e.g., consent checks).
}

/**
 * Insert a standard AdSense banner into the given container.
 */
export function showBannerAd(containerId) {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Don't double-push if already has an ins element
    if (container.querySelector('.adsbygoogle')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch { /* already pushed */ }
      return;
    }

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', PUBLISHER_ID);
    ins.setAttribute('data-ad-slot', AD_UNIT_ID);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');

    container.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.error('Failed to show banner ad:', e);
  }
}

/**
 * Show a rewarded banner modal with a 5-second countdown.
 * Returns a Promise that resolves when the user completes the wait.
 */
export function showRewardedBannerModal() {
  return new Promise((resolve, reject) => {
    // Create overlay using CSS classes from style.css
    const overlay = document.createElement('div');
    overlay.className = 'reward-modal-overlay';

    overlay.innerHTML = `
      <div class="reward-modal">
        <div class="reward-modal__icon">
          <i data-lucide="gift"></i>
        </div>
        <h3 class="reward-modal__title" data-i18n="quota.modal.title">Daily Free Limit Reached</h3>
        <p class="reward-modal__desc" data-i18n="quota.modal.desc">
          You've used all 5 free attempts for today. Watch a short ad to get 5 more attempts!
        </p>
        <div class="reward-modal__ad" id="reward-modal-ad"></div>
        <div class="reward-modal__timer" id="reward-timer">5</div>
        <button class="reward-modal__btn" id="reward-close-btn" disabled>
          <span data-i18n="quota.modal.wait">Please wait...</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Render Lucide icons in the modal
    if (window.lucide) window.lucide.createIcons();

    // Load banner ad into the modal
    showBannerAd('reward-modal-ad');

    const timerEl = document.getElementById('reward-timer');
    const closeBtn = document.getElementById('reward-close-btn');
    let timeLeft = 5;

    const interval = setInterval(() => {
      timeLeft -= 1;
      if (timerEl) timerEl.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(interval);
        if (timerEl) timerEl.textContent = '✓';
        if (closeBtn) {
          closeBtn.disabled = false;
          closeBtn.innerHTML = '<span data-i18n="quota.modal.btn">Close & Get 5 More Attempts</span>';
        }
      }
    }, 1000);

    closeBtn.addEventListener('click', () => {
      if (!closeBtn.disabled) {
        overlay.remove();
        resolve();
      }
    });
  });
}
