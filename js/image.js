// image.js
import { compressImage } from './utils.js';

/**
 * Processes an image, returning base64 without prefix and metadata.
 */
export function processImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = async () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;
            
            try {
                const base64 = await compressImage(file, 1280, 0.85);
                
                let newWidth = width;
                let newHeight = height;
                if (width > 1280) {
                    const ratio = 1280 / width;
                    newWidth = 1280;
                    newHeight = height * ratio;
                }
                
                const estimatedSize = Math.floor(base64.length * 0.75);

                resolve({
                    base64,
                    width: newWidth,
                    height: newHeight,
                    size: estimatedSize
                });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        
        img.src = url;
    });
}

/**
 * Returns metadata of the image without compressing.
 */
export function getImageMetadata(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.width,
                height: img.height,
                size: file.size,
                format: file.type
            });
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}
