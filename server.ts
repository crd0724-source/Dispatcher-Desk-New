import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON with large payload support for base64 documents
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazy Gemini client helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side AI Document OCR Extraction endpoint
app.post('/api/ai/extract-rate-con', async (req, res) => {
  try {
    const { fileData, mimeType, fileName, documentText } = req.body;

    if (!fileData && !documentText) {
      return res.status(400).json({
        error: 'Missing fileData (base64) or documentText for extraction.',
      });
    }

    const ai = getGeminiClient();

    // If Gemini API Key is available, use real Gemini 3.7 Flash extraction
    if (ai) {
      const systemInstruction = `You are an expert freight logistics AI specialized in parsing North American trucking Rate Confirmations and Broker Carrier Agreements.
Your job is to accurately extract structured load, broker, route, financial, and accessorial information from rate confirmation documents or text.

STRICT ACCURACY RULES:
1. ZERO HALLUCINATION: If a field is not explicitly present in the document, return null. Never make up addresses, names, or amounts.
2. FINANCIAL SANITY: Extract the gross rate / carrier total pay accurately. If there are accessorial line items (fuel surcharge, detention, tarp, stop off), extract them separately.
3. EQUIPMENT & COMMODITY: Map equipment type strictly to one of: "dry_van", "reefer", "flatbed", "step_deck", "power_only", "box_truck", "hotshot", "other".
4. DATES: Format pickup and delivery datetimes as ISO strings where possible or formatted date strings.
5. CONFIDENCE SCORES: Provide an honest numerical confidence score (0 to 100) for overall extraction and key sections based on image clarity / OCR certainty.
6. WARNINGS: Add clear warning strings if there are ambiguities, missing fields, or conflicting amounts.`;

      const promptText = `Please parse this trucking Rate Confirmation document and return the structured JSON data according to the schema.
Extract all broker info, load number, rate, origin/pickup, destination/delivery, equipment, commodity, weight, accessorials, and instructions.
If any text was provided:
${documentText ? `Document Text:\n"""\n${documentText}\n"""` : 'Document is attached as an image/PDF.'}`;

      let contentsPayload: any;

      if (fileData && mimeType) {
        // Multi-part with binary data
        contentsPayload = {
          parts: [
            {
              inlineData: {
                data: fileData,
                mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        };
      } else {
        // Text-only
        contentsPayload = promptText;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contentsPayload,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              broker: {
                type: Type.OBJECT,
                properties: {
                  company_name: { type: Type.STRING },
                  mc_number: { type: Type.STRING },
                  dot_number: { type: Type.STRING },
                  contact_name: { type: Type.STRING },
                  contact_phone: { type: Type.STRING },
                  contact_email: { type: Type.STRING },
                  payment_terms_days: { type: Type.INTEGER },
                  raw_text: { type: Type.STRING },
                },
                required: ['company_name'],
              },
              load_info: {
                type: Type.OBJECT,
                properties: {
                  load_number: { type: Type.STRING },
                  rate: { type: Type.NUMBER },
                  equipment_type: { type: Type.STRING },
                  commodity: { type: Type.STRING },
                  weight_lbs: { type: Type.NUMBER },
                  special_instructions: { type: Type.STRING },
                  raw_text: { type: Type.STRING },
                },
                required: ['load_number', 'rate'],
              },
              origin: {
                type: Type.OBJECT,
                properties: {
                  facility_name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  zip: { type: Type.STRING },
                  pickup_datetime: { type: Type.STRING },
                  pickup_window_start: { type: Type.STRING },
                  pickup_window_end: { type: Type.STRING },
                  raw_text: { type: Type.STRING },
                },
                required: ['city', 'state'],
              },
              destination: {
                type: Type.OBJECT,
                properties: {
                  facility_name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  zip: { type: Type.STRING },
                  delivery_datetime: { type: Type.STRING },
                  delivery_window_start: { type: Type.STRING },
                  delivery_window_end: { type: Type.STRING },
                  raw_text: { type: Type.STRING },
                },
                required: ['city', 'state'],
              },
              accessorials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                  },
                  required: ['type'],
                },
              },
              confidence_scores: {
                type: Type.OBJECT,
                properties: {
                  overall: { type: Type.NUMBER },
                  broker: { type: Type.NUMBER },
                  load_number: { type: Type.NUMBER },
                  rate: { type: Type.NUMBER },
                  origin: { type: Type.NUMBER },
                  destination: { type: Type.NUMBER },
                  equipment_type: { type: Type.NUMBER },
                  commodity: { type: Type.NUMBER },
                  dates: { type: Type.NUMBER },
                },
                required: ['overall', 'rate', 'origin', 'destination'],
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['broker', 'load_info', 'origin', 'destination', 'confidence_scores'],
          },
        },
      });

      const rawJson = response.text ? response.text.trim() : '{}';
      const parsedData = JSON.parse(rawJson);

      return res.json({
        success: true,
        extractedData: parsedData,
        source: 'gemini-3.7-flash',
        extractedAt: new Date().toISOString(),
      });
    }

    // Fallback deterministic extraction for offline/demo simulation if GEMINI_API_KEY is not set
    const fallbackData = performDeterministicFallbackExtraction(documentText || fileName || 'rate_confirmation');
    return res.json({
      success: true,
      extractedData: fallbackData,
      source: 'deterministic-demo-engine',
      extractedAt: new Date().toISOString(),
      notice: 'Extracted via deterministic fallback parser (GEMINI_API_KEY not configured).',
    });
  } catch (error: any) {
    console.error('Document extraction error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract rate confirmation details.',
    });
  }
});

// Helper for deterministic parsing when API key is offline or for seeded sample docs
function performDeterministicFallbackExtraction(textOrName: string) {
  const lower = (textOrName || '').toLowerCase();
  
  if (lower.includes('blue ridge') || lower.includes('steel') || lower.includes('flatbed')) {
    return {
      broker: {
        company_name: 'Blue Ridge Freight Brokerage [Demo]',
        mc_number: '347592',
        dot_number: '556102',
        contact_name: 'Brandon Cole (Team 204)',
        contact_phone: '(800) 555-0188',
        contact_email: 'ops@blueridge-demo.test',
        payment_terms_days: 30,
        raw_text: 'Blue Ridge Freight Brokerage, MC 347592, Brandon Cole',
      },
      load_info: {
        load_number: 'BR-89412',
        rate: 3200.0,
        equipment_type: 'flatbed',
        commodity: 'Fabricated Structural Steel Beams',
        weight_lbs: 46000,
        special_instructions: 'Full 8ft tarps and minimum 8 grade-70 transport chains required. Hard hat & steel-toe boots mandatory at steel mill.',
        raw_text: 'Rate: $3,200.00 Flat All-In. Equipment: 48ft Flatbed. Weight: 46,000 lbs.',
      },
      origin: {
        facility_name: 'Midwest Steel Processing Plant #4',
        address: '1400 Industrial Parkway',
        city: 'Chicago',
        state: 'IL',
        zip: '60611',
        pickup_datetime: new Date(Date.now() + 36 * 3600000).toISOString(),
        pickup_window_start: '07:00 AM',
        pickup_window_end: '14:00 PM',
        raw_text: 'Midwest Steel Processing, Chicago, IL 60611',
      },
      destination: {
        facility_name: 'Lone Star Commercial Construction Yard',
        address: '8800 Trinity Blvd',
        city: 'Dallas',
        state: 'TX',
        zip: '75207',
        delivery_datetime: new Date(Date.now() + 84 * 3600000).toISOString(),
        delivery_window_start: '06:00 AM',
        delivery_window_end: '12:00 PM',
        raw_text: 'Lone Star Construction, Dallas, TX 75207',
      },
      accessorials: [
        { type: 'tarp_fee', amount: 150, notes: 'Included in flat total rate' },
        { type: 'detention', amount: 75, notes: '$75/hr after 2 hours free time with in/out times stamped on BOL' },
      ],
      confidence_scores: {
        overall: 96,
        broker: 98,
        load_number: 95,
        rate: 99,
        origin: 97,
        destination: 96,
        equipment_type: 99,
        commodity: 94,
        dates: 92,
      },
      warnings: [],
    };
  }

  if (lower.includes('horizon') || lower.includes('dairy') || lower.includes('reefer') || lower.includes('yogurt')) {
    return {
      broker: {
        company_name: 'Horizon Express Logistics [Demo]',
        mc_number: '561230',
        dot_number: '774109',
        contact_name: 'Amanda Cross',
        contact_phone: '(877) 555-0193',
        contact_email: 'loads@horizon-demo.test',
        payment_terms_days: 21,
        raw_text: 'Horizon Express Logistics, Amanda Cross, MC 561230',
      },
      load_info: {
        load_number: 'HZ-44910',
        rate: 2850.0,
        equipment_type: 'reefer',
        commodity: 'Chilled Dairy & Specialty Yogurt (36°F Continuous)',
        weight_lbs: 41200,
        special_instructions: 'Maintain Reefer set point at 36°F Continuous mode. Download temperature log at destination receiver dock. 2 hours free time for loading/unloading.',
        raw_text: 'Total Carrier Flat Rate: $2,850.00. Continuous 36°F reefer.',
      },
      origin: {
        facility_name: 'Delta Cold Storage & Distribution',
        address: '2200 Riverport Road',
        city: 'Memphis',
        state: 'TN',
        zip: '38103',
        pickup_datetime: new Date(Date.now() + 12 * 3600000).toISOString(),
        pickup_window_start: '08:00 AM',
        pickup_window_end: '12:00 PM',
        raw_text: 'Delta Cold Storage, Memphis, TN 38103',
      },
      destination: {
        facility_name: 'Piedmont Grocers Distribution Center',
        address: '5400 Statesville Rd',
        city: 'Charlotte',
        state: 'NC',
        zip: '28202',
        delivery_datetime: new Date(Date.now() + 38 * 3600000).toISOString(),
        delivery_window_start: '06:00 AM',
        delivery_window_end: '10:00 AM',
        raw_text: 'Piedmont Grocers DC, Charlotte, NC 28202',
      },
      accessorials: [
        { type: 'detention', amount: 65, notes: '$65/hr after 2 hrs free time; requires GPS check-in' },
        { type: 'lumper', amount: 0, notes: 'Reimbursed with stamped receipt and signed BOL' },
      ],
      confidence_scores: {
        overall: 95,
        broker: 97,
        load_number: 96,
        rate: 99,
        origin: 95,
        destination: 96,
        equipment_type: 98,
        commodity: 94,
        dates: 91,
      },
      warnings: [],
    };
  }

  // Default Apex Freight Demo extraction
  return {
    broker: {
      company_name: 'Apex Freight Logistics [Demo]',
      mc_number: '084729',
      dot_number: '221458',
      contact_name: 'Sarah Jenkins (Midwest Fleet)',
      contact_phone: '(800) 555-0142',
      contact_email: 'dispatch@apex-demo-freight.test',
      payment_terms_days: 30,
      raw_text: 'Apex Freight Logistics, MC# 084729, Sarah Jenkins',
    },
    load_info: {
      load_number: 'APX-77312',
      rate: 2450.0,
      equipment_type: 'dry_van',
      commodity: 'Packaged Consumer Electronics',
      weight_lbs: 38500,
      special_instructions: 'Driver must check in at Gate 4 with Broker PO #CH-88219. High-value freight; lock trailer with security seal #89921.',
      raw_text: 'Rate: $2,450.00 Net 30. Equipment: 53ft Dry Van.',
    },
    origin: {
      facility_name: 'Lone Star Logistics Distribution Center #3',
      address: '3200 Regal Row',
      city: 'Dallas',
      state: 'TX',
      zip: '75207',
      pickup_datetime: new Date(Date.now() + 18 * 3600000).toISOString(),
      pickup_window_start: '09:00 AM',
      pickup_window_end: '13:00 PM',
      raw_text: 'Lone Star Logistics, Dallas, TX 75207',
    },
    destination: {
      facility_name: 'Southeast Fulfillment Hub Gate 12',
      address: '4100 Fulton Industrial Blvd',
      city: 'Atlanta',
      state: 'GA',
      zip: '30301',
      delivery_datetime: new Date(Date.now() + 48 * 3600000).toISOString(),
      delivery_window_start: '08:00 AM',
      delivery_window_end: '14:00 PM',
      raw_text: 'Southeast Fulfillment Hub, Atlanta, GA 30301',
    },
    accessorials: [
      { type: 'detention', amount: 60, notes: '$60/hr after 2 hours free time' },
      { type: 'fuel_surcharge', amount: 0, notes: 'Included in linehaul gross rate' },
    ],
    confidence_scores: {
      overall: 97,
      broker: 99,
      load_number: 96,
      rate: 98,
      origin: 98,
      destination: 97,
      equipment_type: 99,
      commodity: 95,
      dates: 94,
    },
    warnings: [],
  };
}

// Start server with Vite middleware in dev mode or static file serving in production
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' &&
      fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html')));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DispatcherDesk full-stack server running on http://0.0.0.0:${PORT} (PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV || 'unset'})`);
  });
}

startServer();
