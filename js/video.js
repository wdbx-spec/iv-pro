// video.js

/**
 * Extracts frames from a video file at 10%, 30%, 50%, 70%, 90% of duration.
 * Returns array of pure base64 strings (JPEG, max 1280px wide).
 */
export function extractFrames(file, numFrames = 5) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        
        const url = URL.createObjectURL(file);
        video.src = url;

        video.onloadeddata = async () => {
            try {
                const duration = video.duration;
                if (!duration || !isFinite(duration)) {
                    throw new Error("Invalid video duration.");
                }

                const frames = [];
                const interval = duration / numFrames;
                
                for (let i = 0; i < numFrames; i++) {
                    const targetTime = (i * interval) + (interval / 2);
                    const base64Frame = await captureFrame(video, targetTime);
                    frames.push(base64Frame);
                }

                URL.revokeObjectURL(url);
                resolve(frames);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        video.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
    });
}

function captureFrame(video, time) {
    return new Promise((resolve, reject) => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            
            try {
                let width = video.videoWidth;
                let height = video.videoHeight;
                const maxWidth = 1280;
                
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = height * ratio;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl.split(',')[1]);
            } catch (err) {
                reject(err);
            }
        };

        const onError = (err) => {
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            reject(err);
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        
        video.currentTime = time;
    });
}

/**
 * Returns basic metadata for a video file.
 */
export function getVideoMetadata(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        const url = URL.createObjectURL(file);
        video.src = url;
        
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                size: file.size
            });
        };
        
        video.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
    });
}
