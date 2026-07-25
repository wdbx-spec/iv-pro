// quota.js
import { load, save, Keys } from './storage.js';

export const QUOTA_KEY = Keys.QUOTA;
export const DEFAULT_QUOTA = 5;

export function getQuota() {
    const defaultQuotaObj = {
        remaining: DEFAULT_QUOTA,
        total: DEFAULT_QUOTA,
        lastReset: new Date().toISOString()
    };
    return load(QUOTA_KEY, defaultQuotaObj);
}

function saveQuota(quotaObj) {
    save(QUOTA_KEY, quotaObj);
}

export function resetIfNewDay() {
    const quota = getQuota();
    const lastResetDate = new Date(quota.lastReset).toDateString();
    const today = new Date().toDateString();
    
    if (lastResetDate !== today) {
        quota.remaining = quota.total;
        quota.lastReset = new Date().toISOString();
        saveQuota(quota);
    }
}

export function useQuota() {
    resetIfNewDay();
    const quota = getQuota();
    if (quota.remaining <= 0) {
        return false;
    }
    quota.remaining -= 1;
    saveQuota(quota);
    return true;
}

export function rechargeQuota(amount = 5) {
    const quota = getQuota();
    quota.remaining += amount;
    saveQuota(quota);
}

export function hasQuota() {
    resetIfNewDay();
    return getQuota().remaining > 0;
}

export function startRewardedAdTimer(onComplete, onTick, durationSeconds = 15) {
    let secondsRemaining = durationSeconds;
    let timerId;

    const tick = () => {
        if (secondsRemaining <= 0) {
            clearInterval(timerId);
            onComplete();
        } else {
            onTick(secondsRemaining);
            secondsRemaining -= 1;
        }
    };

    tick();
    timerId = setInterval(tick, 1000);

    return function cancel() {
        clearInterval(timerId);
    };
}
