# Smart Waste Classifier

Snap your waste, instantly know the right bin.

A clean, modern, mobile-first web application that helps users identify waste materials and provides clear sorting guidance, preparation tips, and upcycling ideas.

## Features

- **Camera & Gallery capture** – take a photo or choose from gallery
- **Real AI classification** – powered by Google Gemini Vision (optional)
- **Mock fallback** – works offline / without API key
- **Preparation tips** – 3 practical steps for each item
- **Fun facts** & **upcycling ideas**
- **History** – saved scans with localStorage
- **Explore** – bin color guide and educational articles
- **Profile** – stats, settings, and API key management
- **Dark mode** support
- **Fully responsive** and accessible (WCAG-minded)
- **No build step** – open directly or deploy to GitHub Pages

## Enable Real AI Detection

1. Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Open the app → go to **Profile** tab
3. Paste your Gemini API key and click **Save Key**
4. The status will change to “Real AI active”

Without an API key the app still works using realistic mock results.

## How to Run Locally

1. Clone or download this repository
2. Open `index.html` in a modern browser  
   *(or serve the folder with any static server)*

```bash
# Example with Python
python -m http.server 8000

# Example with npx
npx serve .
```

Then visit `http://localhost:8000`

> **Note:** Camera access requires HTTPS (or localhost). GitHub Pages works perfectly.

## Project Structure

```
smart-waste-classifier/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css          # All styles, design tokens, dark mode
├── js/
│   ├── app.js              # Main logic, navigation, state
│   ├── camera.js           # Camera handling & capture
│   ├── classification.js   # Mock classification + JSON format
│   └── storage.js          # localStorage helpers
├── assets/                 # (optional) icons / favicon
└── README.md
```

## Tech Stack

- Vanilla HTML + CSS + JavaScript (no framework)
- Modern CSS (Custom Properties, Flexbox, Grid)
- Inline SVG icons (Lucide-style)
- `localStorage` for history & settings
- `navigator.mediaDevices.getUserMedia` for camera

## Classification Output Format

The app expects classification results in this exact JSON shape:

```json
{
  "object_name": "Plastic Bottle",
  "confidence": 92,
  "category": "Plastic",
  "bin_color": "Yellow",
  "material": "PET plastic",
  "is_recyclable": true,
  "preparation_tips": ["tip 1", "tip 2", "tip 3"],
  "fun_fact": "One short sentence.",
  "recycling_ideas": ["idea 1", "idea 2", "idea 3"],
  "safety_note": null
}
```

## Bin Color Mapping

| Color  | Category                  |
|--------|---------------------------|
| Green  | Organic Waste             |
| Blue   | Paper & Cardboard         |
| Yellow | Plastic / Metal / Glass   |
| Red    | Hazardous / E-Waste       |
| Grey   | Residual / Textile / Other|

## Privacy

- Photos are processed only for analysis
- Nothing is uploaded or stored permanently by default
- Users can clear history at any time
- Camera permission is requested with a clear reason

## License

MIT – feel free to use and adapt.

---

Built with care for a cleaner planet.
