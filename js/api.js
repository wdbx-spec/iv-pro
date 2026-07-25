const CF_ACCOUNT_ID = '0f305960aedde3e10d1bccf4779862de';
const CF_API_TOKEN  = 'YOUR_NEW_CLOUDFLARE_TOKEN'; // placeholder - user replaces
const GEMINI_API_KEY = 'YOUR_NEW_GEMINI_KEY';       // placeholder - user replaces

function getApiConfig() {
  const globalConfig = window.__PROMPTAI_CONFIG__ || {};
  return {
    cfAccountId: globalConfig.CF_ACCOUNT_ID || CF_ACCOUNT_ID,
    cfApiToken: globalConfig.CF_API_TOKEN || CF_API_TOKEN,
    geminiApiKey: globalConfig.GEMINI_API_KEY || GEMINI_API_KEY
  };
}

function base64ToUint8Array(base64Str) {
  const binaryString = atob(base64Str.split(',')[1] || base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function analyzeImage(base64, prompt = 'Describe this image with extreme visual detail. Include: main subject, exact actions, environment, lighting, camera angle, color palette, textures, mood, depth, and any notable elements. Provide a dense descriptive paragraph.') {
  const config = getApiConfig();
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run/@cf/llava-1.5-7b-hf`;
  
  const imageBytes = base64ToUint8Array(base64);
  
  const data = {
    prompt: prompt,
    image: [...imageBytes]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cfApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication error. Check your API token.');
    }
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.result && result.result.description) {
      return result.result.description;
    } else {
      throw new Error('Unexpected response format from API.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds.');
    }
    throw error;
  }
}

export async function analyzeVideo(frames, onProgress) {
  const config = getApiConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`;

  if (onProgress) onProgress({ step: 'uploading' });

  const systemPrompt = `Analyze the chronological sequence of frames. 
Return ONLY a valid JSON array (no markdown code blocks).
Each item: { "scene": number, "time": "MM:SS", "description": "detailed string" }`;

  const inlineDataParts = frames.map(frame => {
    const [mimeInfo, base64Data] = frame.split(',');
    const mimeType = mimeInfo.replace('data:', '').replace(';base64', '') || 'image/jpeg';
    return {
      inline_data: {
        mime_type: mimeType,
        data: base64Data
      }
    };
  });

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          ...inlineDataParts
        ]
      }
    ]
  };

  if (onProgress) onProgress({ step: 'analyzing' });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const result = await response.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error('Empty response from Gemini API.');
    }

    if (onProgress) onProgress({ step: 'parsing' });

    let jsonStr = candidateText;
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      }
    }
    
    try {
      const parsedArray = JSON.parse(jsonStr);
      if (Array.isArray(parsedArray)) {
        return parsedArray;
      } else {
         throw new Error("Parsed result is not an array");
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response', jsonStr);
      throw new Error('Failed to parse analysis results as JSON array.');
    }

  } catch (error) {
    throw error;
  }
}
