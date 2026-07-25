const QUOTA_KEY = 'promptai_quota';
const MAX_ATTEMPTS = 5;

function getTodayStr() {
    const today = new Date();
    // YYYY-MM-DD format
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function resetIfNewDay() {
    let quota = localStorage.getItem(QUOTA_KEY);
    const todayStr = getTodayStr();
    
    if (quota) {
        try {
            quota = JSON.parse(quota);
            if (quota.date !== todayStr) {
                quota = { count: MAX_ATTEMPTS, date: todayStr };
                localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
            }
        } catch (e) {
            quota = { count: MAX_ATTEMPTS, date: todayStr };
            localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
        }
    } else {
        quota = { count: MAX_ATTEMPTS, date: todayStr };
        localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
    }
    return quota;
}

export function getQuota() {
    const quota = resetIfNewDay();
    return { remaining: quota.count, total: MAX_ATTEMPTS };
}

export function useQuota() {
    const quota = resetIfNewDay();
    if (quota.count > 0) {
        quota.count -= 1;
        localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
        return true;
    }
    return false;
}

export function rechargeQuota() {
    const quota = resetIfNewDay();
    quota.count += 5;
    localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
    return getQuota();
}
