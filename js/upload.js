import { showPreview, hidePreview, showToast } from './ui.js';

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

let currentFile = null;
let currentFileType = null;
let objectUrl = null;

export function initUpload(onFileReady) {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const removeBtn = document.getElementById('remove-file');
  
  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0], onFileReady);
    }
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0], onFileReady);
    }
  });

  window.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleFile(e.clipboardData.files[0], onFileReady);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent clicking upload zone
      clearUpload();
    });
  }
}

function handleFile(file, onFileReady) {
  const result = validateAndLoadFile(file);
  if (!result.valid) {
    showToast(result.error, 'error');
    return;
  }
  
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  
  currentFile = file;
  currentFileType = result.fileType;
  objectUrl = URL.createObjectURL(file);
  
  showPreview(file, objectUrl);
  
  if (onFileReady && typeof onFileReady === 'function') {
    onFileReady(file);
  }
}

export function validateAndLoadFile(file) {
  const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
  const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
  
  if (!isImage && !isVideo) {
    return { valid: false, error: 'Unsupported file type. Please upload an image or video.' };
  }
  
  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image exceeds maximum size of 10MB.' };
  }
  
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: 'Video exceeds maximum size of 50MB.' };
  }
  
  return {
    valid: true,
    fileType: isImage ? 'image' : 'video'
  };
}

export function clearUpload() {
  currentFile = null;
  currentFileType = null;
  
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.value = '';
  }
  
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  
  hidePreview();
}

export function getCurrentFile() {
  return currentFile;
}

export function getCurrentFileType() {
  return currentFileType;
}
