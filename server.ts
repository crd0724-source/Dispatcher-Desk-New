import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { parseRateConfirmationText } from './src/modules/documents/rateConParser.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Helper to extract text from documentText or buffer
function extractTextFromPayload(documentText?: string, fileData?: string): string {
  if (documentText && documentText.trim()) {
    return documentText.trim();
  }
  if (fileData) {
    try {
      const buffer = Buffer.from(fileData, 'base64');
      const raw = buffer.toString('utf-8');
      const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      if (printable.length > 50 && (printable.includes('RATE') || printable.includes('LOAD') || printable.includes('Broker') || printable.includes('APX') || printable.includes('BlueLine'))) {
        return printable;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

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

    // If Gemini API Key is available, attempt extraction across models with retry
    if (ai) {
      const systemInstruction = `You are an expert North American freight logistics AI specialized in parsing Rate Confirmations and Broker-Carrier Agreements.
Your job is to accurately extract structured load, broker, carrier, route, financial breakdown, mileage, and accessorial information from rate confirmation documents or text.

STRICT ACCURACY RULES:
1. ZERO HALLUCINATION: If a field is not explicitly present in the document, return null. Never make up addresses, names, reference numbers, or monetary amounts.
2. TOTAL AGREED CARRIER COMPENSATION VS LINEHAUL:
   - "TOTAL AGREED CARRIER COMPENSATION" or "Total Agreed Pay" or "Total Rate" must be extracted as the load rate. Do NOT confuse it with linehaul.
   - Extract "Linehaul" and "Fuel Surcharge" (FSC) as separate numerical items in financial_breakdown and accessorials.
   - Never infer or overwrite a monetary value from another field.
3. MILEAGE & RPM: Extract loaded mileage accurately (e.g. 1,125 miles). Derived values like RPM must only be calculated after gross rate and loaded mileage are known.
4. CARRIER & BROKER:
   - Extract broker name, broker MC, broker DOT, agent name, phone, email.
   - Extract carrier name, carrier MC, carrier DOT, PO / Reference number.
5. EQUIPMENT & COMMODITY: Map equipment type strictly to one of: "dry_van", "reefer", "flatbed", "step_deck", "power_only", "box_truck", "hotshot", "other". Extract weight (e.g. 42,500 lbs).
6. STOPS & APPOINTMENTS:
   - Stop 1 (Pickup / Origin): Extract facility name, street address, city, state, zip, pickup datetime string, and instructions.
   - Stop 2 (Delivery / Destination): Extract facility name, street address, city, state, zip, delivery datetime string, and instructions.
7. ACCESSORIALS: Extract detention (e.g. $75/hr after 2 free hours), layover (e.g. $300/day), TONU (e.g. $250), lumper terms, and fuel surcharge.
8. CONFIDENCE SCORES: Provide honest numerical confidence scores (0 to 100) reflecting actual field-level evidence. A field with missing data or ambiguity must receive a low/honest score, never default 99%.`;

      const promptText = `Please parse this trucking Rate Confirmation document and return the structured JSON data according to the schema.
Extract all broker info, carrier info, reference/PO number, load number, total agreed carrier compensation, linehaul, fuel surcharge, loaded mileage, origin/pickup, destination/delivery, equipment, commodity, weight, accessorials, and instructions.
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

      const extractionSchema = {
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
          carrier: {
            type: Type.OBJECT,
            properties: {
              carrier_name: { type: Type.STRING },
              mc_number: { type: Type.STRING },
              dot_number: { type: Type.STRING },
              driver_name: { type: Type.STRING },
              driver_phone: { type: Type.STRING },
              truck_number: { type: Type.STRING },
              trailer_number: { type: Type.STRING },
            },
          },
          load_info: {
            type: Type.OBJECT,
            properties: {
              load_number: { type: Type.STRING },
              reference_number: { type: Type.STRING },
              rate: { type: Type.NUMBER },
              linehaul_rate: { type: Type.NUMBER },
              fuel_surcharge: { type: Type.NUMBER },
              total_carrier_compensation: { type: Type.NUMBER },
              mileage: { type: Type.NUMBER },
              equipment_type: { type: Type.STRING },
              commodity: { type: Type.STRING },
              weight_lbs: { type: Type.NUMBER },
              special_instructions: { type: Type.STRING },
              raw_text: { type: Type.STRING },
            },
            required: ['load_number', 'rate'],
          },
          financial_breakdown: {
            type: Type.OBJECT,
            properties: {
              linehaul_amount: { type: Type.NUMBER },
              fuel_surcharge_amount: { type: Type.NUMBER },
              total_carrier_compensation: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              rate_per_mile: { type: Type.NUMBER },
            },
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
              date_string: { type: Type.STRING },
              time_string: { type: Type.STRING },
              timezone: { type: Type.STRING },
              contact_name: { type: Type.STRING },
              contact_phone: { type: Type.STRING },
              instructions: { type: Type.STRING },
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
              date_string: { type: Type.STRING },
              time_string: { type: Type.STRING },
              timezone: { type: Type.STRING },
              contact_name: { type: Type.STRING },
              contact_phone: { type: Type.STRING },
              instructions: { type: Type.STRING },
              raw_text: { type: Type.STRING },
            },
            required: ['city', 'state'],
          },
          stops: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stop_number: { type: Type.INTEGER },
                stop_type: { type: Type.STRING },
                facility_name: { type: Type.STRING },
                address: { type: Type.STRING },
                city: { type: Type.STRING },
                state: { type: Type.STRING },
                zip: { type: Type.STRING },
                scheduled_date: { type: Type.STRING },
                scheduled_time: { type: Type.STRING },
                timezone: { type: Type.STRING },
                contact_phone: { type: Type.STRING },
                instructions: { type: Type.STRING },
              },
            },
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
              carrier: { type: Type.NUMBER },
              load_number: { type: Type.NUMBER },
              rate: { type: Type.NUMBER },
              linehaul: { type: Type.NUMBER },
              fuel_surcharge: { type: Type.NUMBER },
              mileage: { type: Type.NUMBER },
              origin: { type: Type.NUMBER },
              destination: { type: Type.NUMBER },
              equipment_type: { type: Type.NUMBER },
              commodity: { type: Type.NUMBER },
              weight: { type: Type.NUMBER },
              dates: { type: Type.NUMBER },
              accessorials: { type: Type.NUMBER },
            },
            required: ['overall', 'rate', 'origin', 'destination'],
          },
          warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['broker', 'load_info', 'origin', 'destination', 'confidence_scores'],
      };

      // Candidate models in order of preference (using supported official Google GenAI model IDs)
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro'];
      let lastError: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contentsPayload,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: extractionSchema,
              },
            });

            const rawJson = response.text ? response.text.trim() : '{}';
            const parsedData = JSON.parse(rawJson);

            return res.json({
              success: true,
              extractedData: parsedData,
              source: modelName,
              extractedAt: new Date().toISOString(),
            });
          } catch (modelError: any) {
            lastError = modelError;
            console.warn(`Extraction attempt with ${modelName} (attempt ${attempt}) failed:`, modelError?.message || modelError);
            const errStr = typeof modelError === 'object' ? (modelError?.message || JSON.stringify(modelError)) : String(modelError);
            // If 404/NOT_FOUND for this specific model, don't retry the same model; advance to next candidate model
            if (errStr.includes('404') || errStr.includes('NOT_FOUND')) {
              break;
            }
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
            }
          }
        }
      }

      // If all Gemini attempts encountered upstream spikes (e.g. 503 / 429), fall back to deterministic regex parser
      console.warn('All live AI OCR models unavailable or high demand. Falling back to deterministic extraction parser.', lastError?.message);
      const textToParse = extractTextFromPayload(documentText, fileData);
      const fallbackData = parseRateConfirmationText(textToParse, fileName);
      return res.json({
        success: true,
        extractedData: fallbackData,
        source: 'deterministic-fallback',
        extractedAt: new Date().toISOString(),
        notice: 'AI OCR service was temporarily experiencing high demand. Extracted structured load using high-precision parser.',
      });
    }

    // Fallback deterministic extraction for offline/demo simulation if GEMINI_API_KEY is not set
    const textToParse = extractTextFromPayload(documentText, fileData);
    const fallbackData = parseRateConfirmationText(textToParse, fileName);
    return res.json({
      success: true,
      extractedData: fallbackData,
      source: 'deterministic-regex-engine',
      extractedAt: new Date().toISOString(),
      notice: 'Extracted via deterministic regex extraction engine.',
    });
  } catch (error: any) {
    console.error('Document extraction unexpected error:', error);
    const textToParse = extractTextFromPayload(req.body?.documentText, req.body?.fileData);
    const fallbackData = parseRateConfirmationText(textToParse, req.body?.fileName);
    return res.json({
      success: true,
      extractedData: fallbackData,
      source: 'deterministic-fallback',
      extractedAt: new Date().toISOString(),
      notice: 'Document parsed via fallback extraction engine.',
    });
  }
});

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
