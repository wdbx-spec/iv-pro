export const ENGINE_CONFIGS = {
  'midjourney': { name: 'Midjourney', suffix: '--v 7 --stylize 300 --ar 16:9 --quality 2', separator: ', ', wrapper: (p) => p },
  'dalle': { name: 'DALL-E 3', suffix: '', separator: '. ', wrapper: (p) => `Create an image of: ${p}` },
  'runway': { name: 'Runway Gen-3', suffix: 'cinematic camera movement, smooth dolly shot, professional color grading, 4K resolution', separator: ', ', wrapper: (p) => p },
  'sora': { name: 'Sora', suffix: 'photorealistic motion, coherent physics, smooth temporal consistency, cinematic depth of field', separator: ', ', wrapper: (p) => p },
  'flux': { name: 'Flux', suffix: '--ar 16:9 --steps 30 --cfg 7.5', separator: ', ', wrapper: (p) => p },
  'stable-diffusion': { name: 'Stable Diffusion', suffix: '<lora:detail_tweaker:0.8>, masterpiece, best quality, 8k uhd, BREAK', separator: ', ', wrapper: (p) => p },
  'imagen': { name: 'Imagen', suffix: 'photorealistic, high fidelity, professional photography, vivid colors', separator: ', ', wrapper: (p) => p },
  'leonardo': { name: 'Leonardo', suffix: 'ultra high resolution, ultra detailed, 8k resolution, professional quality', separator: ', ', wrapper: (p) => p }
};

export const STYLE_MAP = {
  'photorealistic': 'ultra-realistic photography, 8K UHD, shot on ARRI Alexa 65, volumetric natural lighting, photorealistic textures, hyperdetailed',
  'cinematic': 'cinematic anamorphic lens, dramatic chiaroscuro lighting, 35mm film grain, IMAX quality, award-winning cinematography',
  'anime': 'Studio Ghibli + Makoto Shinkai aesthetic, vibrant cel-shaded colors, masterpiece anime keyframe, breathtaking background detail',
  'digital-art': 'trending on ArtStation, high-quality digital concept art, masterful composition, crisp lines, vibrant HDR',
  'oil-painting': 'classical oil on canvas, heavy impasto texture, chiaroscuro, museum-quality fine art, old masters technique',
  'watercolor': 'delicate watercolor on paper, fluid color washes, visible paper grain, ethereal soft edges, luminous transparency',
  '3d-render': 'Octane Render + Unreal Engine 5, ray-traced global illumination, PBR materials, volumetric fog, cinema4d quality',
  'minimalist': 'ultra-minimalist design, vast negative space, single focal element, flat lighting, Scandinavian aesthetic',
  'abstract': 'abstract expressionism, bold geometric shapes, dynamic color fields, non-representational, contemporary gallery art',
  'fantasy': 'epic dark fantasy, ethereal atmospheric lighting, intricate world-building detail, magical luminescence, concept art quality'
};

export const ENGINE_SUFFIXES = {
  'midjourney': '--v 7 --stylize 300 --ar 16:9 --quality 2',
  'dalle': '',
  'runway': 'cinematic camera movement, smooth dolly shot, professional color grading, 4K resolution',
  'sora': 'photorealistic motion, coherent physics, smooth temporal consistency, cinematic depth of field',
  'flux': '--ar 16:9 --steps 30 --cfg 7.5',
  'stable-diffusion': '<lora:detail_tweaker:0.8>, masterpiece, best quality, 8k uhd, BREAK',
  'imagen': 'photorealistic, high fidelity, professional photography, vivid colors',
  'leonardo': 'ultra high resolution, ultra detailed, 8k resolution, professional quality'
};

export function buildImagePrompt(description, engine, style) {
  const config = ENGINE_CONFIGS[engine] || { separator: ', ', wrapper: p => p };
  const styleText = STYLE_MAP[style] || '';
  const suffixText = ENGINE_SUFFIXES[engine] || '';
  
  const parts = [description];
  if (styleText) parts.push(styleText);
  if (suffixText) parts.push(suffixText);
  
  const joined = parts.filter(Boolean).join(config.separator);
  return config.wrapper(joined);
}

export function buildVideoScenePrompt(scene, engine, style) {
  const config = ENGINE_CONFIGS[engine] || { separator: ', ', wrapper: p => p };
  const styleText = STYLE_MAP[style] || '';
  const suffixText = ENGINE_SUFFIXES[engine] || '';
  
  const timeContext = scene.time ? `[Time: ${scene.time}] ` : '';
  const parts = [`${timeContext}${scene.description}`];
  
  if (styleText) parts.push(styleText);
  if (suffixText) parts.push(suffixText);
  
  const joined = parts.filter(Boolean).join(config.separator);
  return config.wrapper(joined);
}

export function generateNegativePrompt(style) {
  const baseNegative = 'blurry, low quality, watermark, signature, jpeg artifacts, deformed, distorted, worst quality, ugly, bad proportions';
  
  const specificNegatives = {
    'photorealistic': 'illustration, 3d render, painting, drawing, art, sketch',
    'anime': 'photorealistic, 3d render, realism',
    '3d-render': '2d, illustration, sketch, drawing, photo',
  };
  
  const extra = specificNegatives[style];
  return extra ? `${baseNegative}, ${extra}` : baseNegative;
}

export function calculatePromptScore(prompt) {
  if (!prompt || typeof prompt !== 'string') return 0;
  
  let score = 0;
  const lowerPrompt = prompt.toLowerCase();
  
  // Length heuristic (up to 40 points)
  const wordCount = prompt.split(/\\s+/).length;
  if (wordCount > 10) score += 10;
  if (wordCount > 25) score += 15;
  if (wordCount > 50) score += 15;
  
  // Detail heuristics (15 points each)
  const lightingKeywords = ['lighting', 'light', 'illuminated', 'chiaroscuro', 'shadow', 'glow', 'sunlight'];
  if (lightingKeywords.some(kw => lowerPrompt.includes(kw))) score += 15;
  
  const cameraKeywords = ['camera', 'lens', 'angle', 'shot', 'view', 'macro', 'wide', 'telephoto'];
  if (cameraKeywords.some(kw => lowerPrompt.includes(kw))) score += 15;
  
  const styleKeywords = ['style', 'aesthetic', 'art', 'render', 'texture', 'detailed'];
  if (styleKeywords.some(kw => lowerPrompt.includes(kw))) score += 15;
  
  const technicalKeywords = ['4k', '8k', 'uhd', 'resolution', '--v', '--ar', 'hdr', 'quality'];
  if (technicalKeywords.some(kw => lowerPrompt.includes(kw))) score += 15;
  
  return Math.min(100, score);
}
