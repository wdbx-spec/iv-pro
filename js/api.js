/**
 * PromptAI – API Integration Module
 * Handles Cloudflare Workers AI (LLaVa) for images
 * and Google Gemini for video analysis.
 */

const CF_ACCOUNT_ID = '0f305960aedde3e10d1bccf4779862de';
const CF_API_TOKEN = 'cfut_g6CIz2iTRq9lmEXsNhe2V1f5qk3Oou6HSEoYzIBfc7b6f363';
const CF_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`;

const GEMINI_API_KEY = 'AQ.Ab8RN6KGE5_3ptqxvhfXGwXoMtivNvJK8uiuliiPs-mmazdcZg';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Convert a File to base64 string (without data URI prefix)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Extract a single frame from a video file at the given time (seconds)
 */
function extractVideoFrame(file, time = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(time, video.duration - 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      resolve(dataUrl.split(',')[1]);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Style descriptions mapped to style keys
 */
const STYLE_MAP = {
  photorealistic: 'ultra-realistic photograph, 8K resolution, sharp focus, natural lighting',
  cinematic: 'cinematic scene, dramatic lighting, film grain, anamorphic lens, movie still',
  anime: 'anime art style, manga illustration, cel shading, vibrant colors, Studio Ghibli inspired',
  digital: 'digital art, concept art, artstation trending, highly detailed illustration',
  oil: 'oil painting on canvas, rich textures, visible brush strokes, classical fine art',
  watercolor: 'delicate watercolor painting, soft washes, paper texture, fluid colors',
  '3d': '3D render, octane render, unreal engine 5, volumetric lighting, subsurface scattering',
  minimalist: 'minimalist design, clean lines, simple composition, negative space, modern',
  abstract: 'abstract art, bold shapes, vibrant palette, expressive, non-representational',
  fantasy: 'fantasy art, ethereal atmosphere, magical lighting, enchanted, mythical'
};

/**
 * Format the AI description into a professional prompt for the target engine
 */
function enhancePrompt(description, engine, style) {
  const styleDesc = STYLE_MAP[style] || '';
  const cleanDesc = description.replace(/\n+/g, ' ').trim();

  switch (engine) {
    case 'midjourney':
      return `${styleDesc}, ${cleanDesc}, highly detailed, professional quality --v 6 --ar 16:9 --style raw`;

    case 'dalle':
      return `Create a ${styleDesc} image: ${cleanDesc}. The scene should be highly detailed with professional composition and lighting.`;

    case 'runway':
      return `${styleDesc}. Scene: ${cleanDesc}. Smooth cinematic camera movement, dynamic transitions, professional color grading, 4K quality.`;

    case 'sora':
      return `${styleDesc}. ${cleanDesc}. Cinematic quality, temporal coherence, smooth motion, professional cinematography, high fidelity details.`;

    case 'luma':
      return `${styleDesc}. ${cleanDesc}. 3D-aware composition, realistic global illumination, accurate reflections, physically-based materials, volumetric atmosphere.`;

    default:
      return `${styleDesc}. ${cleanDesc}`;
  }
}

/**
 * Analyze an image file using Cloudflare Workers AI (LLaVa)
 */
export async function analyzeImage(file, engine, style) {
  try {
    const base64Image = await fileToBase64(file);

    // Convert base64 to byte array for Cloudflare
    const binaryString = atob(base64Image);
    const imageArray = Array.from(binaryString, (c) => c.charCodeAt(0));

    const response = await fetch(CF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageArray,
        prompt: 'Describe this image in extreme detail. Include the subject, composition, colors, lighting, textures, mood, environment, camera angle, and any artistic elements. Be thorough — this description will be used to recreate the image in an AI art generator.',
        max_tokens: 512
      })
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const description = data?.result?.description || data?.result?.response || (typeof data?.result === 'string' ? data.result : JSON.stringify(data.result));
    return enhancePrompt(description, engine, style);
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}

/**
 * Analyze a video file using Google Gemini (extracts a key frame)
 */
export async function analyzeVideo(file, engine, style) {
  try {
    const base64Frame = await extractVideoFrame(file, 1);

    const payload = {
      contents: [{
        parts: [
          {
            text: 'Describe this video frame in extreme detail. Include the subject, composition, colors, lighting, textures, mood, environment, camera angle, motion, and any artistic elements. Be thorough — this description will be used to generate AI video/image content.'
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Frame
            }
          }
        ]
      }]
    };

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const description = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return enhancePrompt(description, engine, style);
  } catch (error) {
    console.error('Video analysis failed:', error);
    throw error;
  }
}
