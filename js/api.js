/**
 * PromptAI – API Integration Module
 * Handles Cloudflare Workers AI (LLaVa) for images
 * and Google Gemini 2.0 Flash for video analysis.
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
 * Extract multiple frames from a video file evenly across its duration.
 * @param {File} file 
 * @param {number} numFrames 
 * @returns {Promise<string[]>} Array of base64 image strings
 */
function extractVideoFrames(file, numFrames = 5) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const frames = [];
    let currentFrameIdx = 0;
    let timestamps = [];

    video.onloadeddata = () => {
      // Calculate timestamps at 10%, 30%, 50%, 70%, 90%
      const duration = video.duration;
      for (let i = 0; i < numFrames; i++) {
        const percent = (i * 2 + 1) / (numFrames * 2); 
        timestamps.push(duration * percent);
      }
      // Start seeking to the first timestamp
      video.currentTime = timestamps[0];
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      frames.push(dataUrl.split(',')[1]);

      currentFrameIdx++;
      if (currentFrameIdx < numFrames) {
        // Seek to next timestamp
        video.currentTime = timestamps[currentFrameIdx];
      } else {
        // Done
        URL.revokeObjectURL(url);
        resolve(frames);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for frame extraction.'));
    };
  });
}

/**
 * Style descriptions mapped to highly detailed style tags
 */
const STYLE_MAP = {
  photorealistic: 'ultra-realistic photography, 8K UHD, sharp focus, taken on ARRI Alexa 65, natural volumetric lighting, photorealistic textures, highly detailed',
  cinematic: 'cinematic composition, dramatic moody lighting, film grain, anamorphic lens flare, award-winning cinematography, movie still, 35mm film',
  anime: 'Studio Ghibli aesthetic, high quality anime art style, vibrant flat colors, cel shading, detailed background, Makoto Shinkai style, masterpiece',
  digital: 'trending on ArtStation, digital concept art, highly detailed digital painting, crisp lines, vivid colors, masterful composition',
  oil: 'classical oil painting on canvas, heavy impasto brushstrokes, rich textures, chiaroscuro lighting, museum quality fine art',
  watercolor: 'delicate watercolor painting, fluid color washes, visible paper texture, soft blended edges, ethereal aesthetic',
  '3d': '3D octane render, Unreal Engine 5, ray tracing, path tracing, subsurface scattering, physically based rendering (PBR), volumetric fog',
  minimalist: 'minimalist design, clean vector lines, vast negative space, simple elegant composition, modern aesthetic, flat lighting',
  abstract: 'abstract contemporary art, bold geometric shapes, expressive color palette, non-representational, fluid dynamics',
  fantasy: 'epic dark fantasy art, ethereal atmosphere, magical glowing lighting, enchanted environment, intricate mythical details'
};

/**
 * Format a single description into a highly optimized prompt for the target engine
 */
function enhancePrompt(description, engine, style) {
  const styleDesc = STYLE_MAP[style] || '';
  const cleanDesc = description.replace(/\n+/g, ' ').trim();

  switch (engine) {
    case 'midjourney':
      return `${cleanDesc}, ${styleDesc} --v 6.0 --ar 16:9 --style raw --q 2`;

    case 'dalle':
      return `Create an image in the following style: ${styleDesc}. The main subject and scene is: ${cleanDesc}. Ensure the composition is highly professional, detailed, and visually striking.`;

    case 'runway':
      return `[Camera Movement: Smooth cinematic tracking shot]. Scene: ${cleanDesc}. Aesthetic: ${styleDesc}. High fidelity, 4K resolution, professional color grading, dynamic motion.`;

    case 'sora':
      return `Cinematic high-fidelity video. ${cleanDesc}. Visual style: ${styleDesc}. Temporal coherence, photorealistic physics, smooth fluid motion, cinematic lighting and depth of field.`;

    case 'luma':
      return `Highly detailed video generation. ${cleanDesc}. Style: ${styleDesc}. 3D-aware movement, realistic global illumination, accurate reflections, rich volumetric atmosphere.`;

    default:
      return `${cleanDesc}, ${styleDesc}`;
  }
}

/**
 * Analyze an image file using Cloudflare Workers AI (LLaVa)
 * Returns a single formatted prompt string.
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
        prompt: 'Describe this image with extreme technical detail. Focus on the main subject, exact action, environment, lighting setup, camera angle, color palette, and mood. Provide a single, dense descriptive paragraph.',
        max_tokens: 512
      })
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const description = data?.result?.description || data?.result?.response || (typeof data?.result === 'string' ? data.result : JSON.stringify(data.result));
    
    return {
      type: 'image',
      prompts: [enhancePrompt(description, engine, style)]
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}

/**
 * Analyze a video file using Google Gemini
 * Extracts multiple frames to generate a scene-by-scene breakdown.
 * Returns an array of formatted prompt strings.
 */
export async function analyzeVideo(file, engine, style) {
  try {
    // Extract 4 frames for scene analysis
    const base64Frames = await extractVideoFrames(file, 4);

    // Build the parts array for Gemini, injecting each frame chronologically
    const parts = [
      {
        text: `Analyze these sequential frames from a video. Break the video down into distinct, chronological scenes or shots. For each scene, describe what is happening in extreme visual detail (action, subject, camera movement, lighting, environment).
        
IMPORTANT: You MUST return ONLY a valid JSON array of strings. Do not include markdown blocks like \`\`\`json. Each string in the array should be the raw description of one scene. Do not include labels like "Scene 1", just the description itself.
Example: ["A wide shot of a man walking...", "A close up of the man's face as he looks up..."]`
      }
    ];

    for (const frame of base64Frames) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: frame
        }
      });
    }

    const payload = {
      contents: [{ parts }]
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
    let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up response text in case Gemini added markdown or extra text
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let scenes = [];
    try {
      scenes = JSON.parse(responseText);
      if (!Array.isArray(scenes)) {
        scenes = [responseText]; // Fallback if it didn't return an array
      }
    } catch (e) {
      // If parsing fails, treat the whole response as a single scene
      console.warn("Failed to parse Gemini JSON, falling back to raw text.", e);
      scenes = [responseText];
    }

    // Enhance each scene description to a full prompt
    const enhancedScenes = scenes.map(sceneDesc => enhancePrompt(sceneDesc, engine, style));

    return {
      type: 'video',
      prompts: enhancedScenes
    };
  } catch (error) {
    console.error('Video analysis failed:', error);
    throw error;
  }
}
