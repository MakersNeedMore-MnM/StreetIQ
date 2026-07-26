import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import axios from 'axios';
import { logger } from './middleware/logger';
import { RouteRequestSchema, GeocodeQuerySchema } from './middleware/validate';
import { getRoute } from './services/routing';
import { geocode } from './services/geocoding';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://streetiq-rose.vercel.app'];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'OPTIONS'], credentials: true }));
app.use(compression());
app.use(express.json({ limit: '50kb' }));
app.set('trust proxy', 1);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'request');
  next();
});

const apiLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.post('/api/route', async (req: Request, res: Response): Promise<void> => {
  const parsed = RouteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const { start, end } = parsed.data;
  if (start[0] === end[0] && start[1] === end[1]) {
    res.status(400).json({ error: 'Start and end must be different' });
    return;
  }
  try {
    const result = await getRoute(start, end);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Routing failed';
    logger.error({ err, start, end }, 'route computation failed');
    res.status(msg.includes('No route') ? 404 : 503).json({ error: msg });
  }
});

app.get('/api/geocode', async (req: Request, res: Response): Promise<void> => {
  const parsed = GeocodeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const results = await geocode(parsed.data.q, parsed.data.limit);
    res.json(results);
  } catch (err) {
    logger.error({ err }, 'geocoding failed');
    res.status(503).json({ error: 'Geocoding service unavailable' });
  }
});

app.post('/api/gemini-analyze', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No image provided' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set - returning unavailable');
    res.json({ detected: false, unavailable: true, type: 'pothole', severity: 1, confidence: 0, description: '', boundingBox: null });
    return;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const mimeType = req.file.mimetype || 'image/jpeg';
    const intent = req.body.intent;
    
    let prompt = `You are an expert road hazard detection AI. Look carefully at this road image.\n\n`;
    if (intent) {
      prompt += `The user explicitly reported the following via voice: "${intent}". Verify if the image confirms this report.\n\n`;
    }
    
    prompt += `Your task: detect if there is a road hazard visible.

You MUST respond with ONLY this JSON (no markdown fences, no extra text):
{"detected":true,"type":"fallen tree","severity":4,"confidence":0.92,"description":"Fallen tree blocking the road","boundingBox":{"x":0.2,"y":0.3,"w":0.4,"h":0.3}}

Rules:
- detected: true if ANY road damage or hazard is visible (or if user intent is clearly confirmed), false only if road is perfectly fine
- type: dynamically extract the exact hazard (e.g., "pothole", "fallen tree", "broken streetlight"). Keep it concise (1-3 words).
- severity: 1=minor scratch, 5=vehicle-damaging/blocking
- confidence: your certainty 0.0-1.0
- boundingBox: approximate location of hazard (0-1 scale), null if unsure
- If detected is false, still return all fields with type="none", severity=1, confidence=0, boundingBox=null`;

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();
    
    logger.info({ rawText: text }, 'gemini raw response');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ text }, 'no json found in gemini response');
      res.json({ detected: false, unavailable: true, type: 'pothole', severity: 1, confidence: 0, description: 'Failed to parse AI response', boundingBox: null });
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err: unknown) {
    logger.error({ err }, 'image analysis failed');
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.json({ detected: false, unavailable: true, type: 'pothole', severity: 1, confidence: 0, description: errorMessage, boundingBox: null });
  }
});

const clients = new Map<string, WebSocket>();

wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url!, `http://localhost`).searchParams.get('session') || crypto.randomUUID();
  clients.set(sessionId, ws);
  logger.info({ sessionId }, 'WS client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'location_update') {
        const payload = JSON.stringify({ type: 'location_broadcast', sessionId, ...msg });
        clients.forEach((client, id) => {
          if (id !== sessionId && client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    } catch {
      logger.warn('malformed WS message');
    }
  });

  ws.on('close', () => {
    clients.delete(sessionId);
    logger.info({ sessionId }, 'WS client disconnected');
  });

  ws.send(JSON.stringify({ type: 'connected', sessionId }));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'StreetIQ backend running');
});

export default app;
