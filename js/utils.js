// utils.js

/**
 * Converts a file to base64 string without data URI prefix.
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1]; // Remove prefix
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Resizes and compresses an image file. Returns base64 string without prefix.
 */
export function compressImage(file, maxWidthPx = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;

            if (width > maxWidthPx) {
                const ratio = maxWidthPx / width;
                width = maxWidthPx;
                height = height * ratio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = error => {
            URL.revokeObjectURL(url);
            reject(error);
        };
        img.src = url;
    });
}

/**
 * Formats file size to human readable format.
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats date to e.g. 'Jul 25, 2026'
 */
export function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Formats milliseconds to MM:SS
 */
export function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Debounces a function call.
 */
export function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

/**
 * Generates a short random ID.
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Copies text to clipboard with fallback.
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } finally {
                textArea.remove();
            }
        }
    } catch (err) {
        console.error('Failed to copy', err);
    }
}

/**
 * Helper to download files.
 */
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function downloadTextFile(text, filename) {
    downloadFile(text, filename, 'text/plain');
}

export function downloadJsonFile(data, filename) {
    downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

export function downloadMarkdownFile(text, filename) {
    downloadFile(text, filename, 'text/markdown');
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
