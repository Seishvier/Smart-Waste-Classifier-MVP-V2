/**
 * classification.js – Waste classification logic
 * Supports real AI (Google Gemini Vision) + mock fallback
 * Output always follows Part A JSON format
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/* =====================================================
   SYSTEM PROMPT FOR REAL AI
   ===================================================== */
const CLASSIFICATION_PROMPT = `You are an expert waste classification AI for a recycling app.
Analyze the image and identify the MAIN waste object.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):

{
  "object_name": "string, object name in English",
  "confidence": 0-100 integer,
  "category": "one of: Organic Waste, Paper & Cardboard, Plastic, Glass, Metal, E-Waste, Hazardous Waste, Textile, Rubber, Composite/Mixed, Medical Waste, Residual/Other",
  "bin_color": "one of: Green, Blue, Yellow, Red, Grey",
  "material": "specific material e.g. PET plastic, cardboard, aluminum",
  "is_recyclable": true or false,
  "preparation_tips": ["tip 1", "tip 2", "tip 3"],
  "fun_fact": "one short accurate sentence about recycling this material",
  "recycling_ideas": ["idea 1", "idea 2", "idea 3"],
  "safety_note": null or a short safety warning if hazardous/sharp/medical
}

Rules:
- Focus on the most dominant clearly visible object.
- Bin colors: Organic=Green, Paper/Cardboard=Blue, Plastic/Metal/Glass=Yellow, Hazardous/E-Waste/Medical=Red, Residual/Textile/Mixed=Grey.
- Give exactly 3 short practical preparation tips.
- If hazardous, medical, or sharp: set safety_note and replace upcycling ideas with safe disposal advice.
- Never suggest burning waste or pouring chemicals down drains.
- Be honest with confidence score. Use lower confidence if image is unclear.
- Output ONLY the JSON. No other text.`;

/* =====================================================
   MOCK DATABASE (fallback when no API key)
   ===================================================== */
const MOCK_DATABASE = [
  {
    result: {
      object_name: "Plastic Bottle",
      confidence: 92,
      category: "Plastic",
      bin_color: "Yellow",
      material: "PET plastic",
      is_recyclable: true,
      preparation_tips: [
        "Empty and rinse the bottle",
        "Remove the cap and label if possible",
        "Crush to save space"
      ],
      fun_fact: "It takes about 450 years for a PET bottle to decompose in nature.",
      recycling_ideas: [
        "Turn into a plant watering can by piercing small holes in the cap",
        "Cut the bottom to make a small storage container",
        "Use as a seed starter for gardening"
      ],
      safety_note: null
    }
  },
  {
    result: {
      object_name: "Aluminum Can",
      confidence: 94,
      category: "Metal",
      bin_color: "Yellow",
      material: "Aluminum",
      is_recyclable: true,
      preparation_tips: [
        "Empty completely",
        "Rinse if sticky",
        "Do not crush if your local facility prefers intact cans"
      ],
      fun_fact: "Recycling one aluminum can saves enough energy to power a TV for three hours.",
      recycling_ideas: [
        "Make pencil holders by decorating the outside",
        "Create wind chimes with several cans",
        "Use as planters for small herbs"
      ],
      safety_note: null
    }
  },
  {
    result: {
      object_name: "Cardboard Box",
      confidence: 90,
      category: "Paper & Cardboard",
      bin_color: "Blue",
      material: "Corrugated cardboard",
      is_recyclable: true,
      preparation_tips: [
        "Flatten the box",
        "Remove all tape and plastic packaging",
        "Keep dry and clean"
      ],
      fun_fact: "Cardboard can be recycled 5–7 times before the fibers become too short.",
      recycling_ideas: [
        "Build a cat house or play fort",
        "Create drawer organizers",
        "Use as weed barrier in the garden"
      ],
      safety_note: null
    }
  },
  {
    result: {
      object_name: "Food Scraps",
      confidence: 88,
      category: "Organic Waste",
      bin_color: "Green",
      material: "Organic matter",
      is_recyclable: true,
      preparation_tips: [
        "Remove any plastic packaging",
        "Keep free from meat if your compost is plant-only",
        "Drain excess liquid"
      ],
      fun_fact: "Food waste in landfills produces methane, a potent greenhouse gas.",
      recycling_ideas: [
        "Start a home compost bin",
        "Use coffee grounds as fertilizer",
        "Make banana peel fertilizer water"
      ],
      safety_note: null
    }
  },
  {
    result: {
      object_name: "Glass Jar",
      confidence: 91,
      category: "Glass",
      bin_color: "Yellow",
      material: "Glass",
      is_recyclable: true,
      preparation_tips: [
        "Rinse thoroughly",
        "Remove metal lids (recycle separately)",
        "Do not break the glass"
      ],
      fun_fact: "Glass can be recycled endlessly without loss of quality.",
      recycling_ideas: [
        "Reuse as storage for dry goods",
        "Turn into a candle holder",
        "Make a terrarium"
      ],
      safety_note: null
    }
  },
  {
    result: {
      object_name: "Battery",
      confidence: 95,
      category: "Hazardous Waste",
      bin_color: "Red",
      material: "Mixed metals & chemicals",
      is_recyclable: true,
      preparation_tips: [
        "Do not throw in regular trash",
        "Tape the terminals to prevent short circuits",
        "Take to a designated battery collection point"
      ],
      fun_fact: "One battery can contaminate 600,000 liters of water if disposed improperly.",
      recycling_ideas: [
        "Never attempt to open or upcycle batteries",
        "Store used batteries in a cool dry place until disposal",
        "Look for retailer take-back programs"
      ],
      safety_note: "Hazardous item. Never incinerate or puncture batteries."
    }
  },
  {
    result: {
      object_name: "Electronic Device",
      confidence: 87,
      category: "E-Waste",
      bin_color: "Red",
      material: "Mixed electronics",
      is_recyclable: true,
      preparation_tips: [
        "Remove personal data if possible",
        "Do not throw in regular bins",
        "Take to an e-waste collection center"
      ],
      fun_fact: "E-waste contains valuable metals like gold and rare earth elements.",
      recycling_ideas: [
        "Donate working devices if still functional",
        "Use official manufacturer take-back programs",
        "Never dismantle electronics at home"
      ],
      safety_note: "Contains potentially hazardous components. Use official recycling channels."
    }
  },
  {
    result: {
      object_name: "Cotton Fabric",
      confidence: 85,
      category: "Textile",
      bin_color: "Grey",
      material: "Cotton textile",
      is_recyclable: true,
      preparation_tips: [
        "Clean and dry the fabric",
        "Remove any non-textile parts if required",
        "Check local textile recycling options"
      ],
      fun_fact: "The fashion industry is responsible for about 10% of global carbon emissions.",
      recycling_ideas: [
        "Cut into cleaning rags",
        "Make reusable shopping bags",
        "Create patchwork projects or quilts"
      ],
      safety_note: null
    }
  }
];

/* =====================================================
   API KEY MANAGEMENT
   ===================================================== */
function getApiKey() {
  return localStorage.getItem('swc_gemini_api_key') || '';
}

function setApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem('swc_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('swc_gemini_api_key');
  }
}

function hasApiKey() {
  return !!getApiKey();
}

/* =====================================================
   REAL AI CLASSIFICATION (Gemini Vision)
   ===================================================== */
async function classifyWithGemini(imageDataUrl) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key');

  // Extract pure base64 (remove data:image/...;base64,)
  const base64Data = imageDataUrl.split(',')[1];
  if (!base64Data) throw new Error('Invalid image data');

  const payload = {
    contents: [
      {
        parts: [
          { text: CLASSIFICATION_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini API error:', errText);
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from AI');

  // Parse JSON (handle possible markdown wrapping)
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const result = JSON.parse(cleaned);

  // Basic validation
  if (!result.object_name || !result.category || !result.bin_color) {
    throw new Error('Invalid AI response structure');
  }

  // Ensure confidence is number
  result.confidence = Math.max(0, Math.min(100, parseInt(result.confidence) || 70));

  return result;
}

/* =====================================================
   MOCK CLASSIFICATION (fallback)
   ===================================================== */
function classifyWithMock() {
  return new Promise((resolve) => {
    const delay = 1600 + Math.random() * 1000;
    setTimeout(() => {
      const selected = MOCK_DATABASE[Math.floor(Math.random() * MOCK_DATABASE.length)].result;
      const confidence = Math.max(45, Math.min(96, selected.confidence + Math.floor(Math.random() * 10) - 5));
      resolve({ ...selected, confidence });
    }, delay);
  });
}

/* =====================================================
   MAIN CLASSIFICATION FUNCTION
   ===================================================== */
async function classifyWaste(imageDataUrl) {
  // Prefer real AI if key exists
  if (hasApiKey()) {
    try {
      console.log('Using Gemini Vision AI…');
      return await classifyWithGemini(imageDataUrl);
    } catch (err) {
      console.warn('Real AI failed, falling back to mock:', err.message);
      // Optional: show toast from app.js if needed
      return await classifyWithMock();
    }
  }

  // No API key → pure mock
  console.log('No API key – using mock classification');
  return await classifyWithMock();
}

/* =====================================================
   MANUAL RESULT (for user correction)
   ===================================================== */
function createManualResult(category, binColor, note = '') {
  const materialMap = {
    'Organic Waste': 'Organic matter',
    'Paper & Cardboard': 'Paper / Cardboard',
    'Plastic': 'Plastic',
    'Glass': 'Glass',
    'Metal': 'Metal',
    'E-Waste': 'Electronic components',
    'Hazardous Waste': 'Hazardous material',
    'Textile': 'Textile',
    'Residual/Other': 'Mixed / Residual'
  };

  return {
    object_name: category,
    confidence: 100,
    category,
    bin_color: binColor,
    material: materialMap[category] || 'Unknown',
    is_recyclable: !['Hazardous Waste', 'Residual/Other'].includes(category),
    preparation_tips: [
      'Follow local sorting guidelines',
      'Keep items clean and dry when possible',
      'Separate different materials if mixed'
    ],
    fun_fact: 'Correct sorting greatly improves recycling rates and reduces contamination.',
    recycling_ideas: [
      'Check local upcycling workshops',
      'Look for community reuse programs',
      'When in doubt, place in residual bin'
    ],
    safety_note: category === 'Hazardous Waste'
      ? 'Hazardous item. Use designated collection points only.'
      : null,
    user_note: note || null
  };
}

// Expose globally
window.classifyWaste = classifyWaste;
window.createManualResult = createManualResult;
window.getApiKey = getApiKey;
window.setApiKey = setApiKey;
window.hasApiKey = hasApiKey;
