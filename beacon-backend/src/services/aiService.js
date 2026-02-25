import AIInsight from '../models/AIInsight.js';

/**
 * Multi-provider AI service for session analysis.
 */

// ── Provider API calls ───────────────────────────────────────

async function callOpenAI(apiKey, prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://beacon-4rtv.onrender.com/',
            'X-Title': 'Beacon',
        },
        body: JSON.stringify({
            model: 'stepfun/step-3.5-flash:free',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { content, cost: 0 };
}

async function callAnthropic(apiKey, prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    return { content, cost: 0 };
}

async function callCustom(endpoint, headers, prompt) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Custom AI API error: ${err}`);
    }

    const data = await response.json();
    // Try to extract content from common response formats
    const content =
        data.choices?.[0]?.message?.content ||
        data.content?.[0]?.text ||
        data.response ||
        JSON.stringify(data);
    return { content, cost: 0 };
}

import mongoose from 'mongoose';

// ── Helpers for Context & Hotspots ───────────────────────────

async function fetchMiroBoardContext(miroId) {
    const token = process.env.MIRO_ACCESS_TOKEN;
    if (!token) return [];

    try {
        const res = await fetch(`https://api.miro.com/v2/boards/${miroId}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.data || [];

        // Extract widgets
        const widgets = items.map(item => {
            let content = '';
            if (item.data?.content) {
                // simple strip HTML tags
                content = item.data.content.replace(/<[^>]*>?/gm, '').trim();
            } else if (item.data?.text) {
                content = item.data.text.replace(/<[^>]*>?/gm, '').trim();
            } else if (item.data?.title) {
                content = item.data.title;
            }

            return {
                id: item.id,
                type: item.type,
                content: content,
                x: item.position?.x || 0,
                y: item.position?.y || 0,
                width: item.geometry?.width || 0,
                height: item.geometry?.height || 0
            };
        });

        // Normalize to 1200x800
        if (widgets.length === 0) return [];

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const w of widgets) {
            const left = w.x - w.width / 2;
            const right = w.x + w.width / 2;
            const top = w.y - w.height / 2;
            const bottom = w.y + w.height / 2;

            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;
        }

        const boardWidth = maxX - minX || 1;
        const boardHeight = maxY - minY || 1;

        // Fit into 1200x800 viewport mapping
        const scale = Math.min(1200 / boardWidth, 800 / boardHeight);

        return widgets.map(w => ({
            id: w.id,
            type: w.type,
            content: w.content || `[${w.type} without text]`,
            x: Math.round((w.x - minX) * scale),
            y: Math.round((w.y - minY) * scale),
            width: Math.round(w.width * scale),
            height: Math.round(w.height * scale)
        }));
    } catch {
        return [];
    }
}

function calculateHotspots(events) {
    const clicks = events.filter(e => e.type === 'click' && e.coordinates?.x !== undefined);

    // Simple grid-based clustering (80x80 cells)
    const gridSize = 80;
    const grid = new Map();

    for (const click of clicks) {
        const cx = Math.floor(click.coordinates.x / gridSize);
        const cy = Math.floor(click.coordinates.y / gridSize);
        const key = `${cx},${cy}`;

        if (!grid.has(key)) {
            grid.set(key, { clicks: 0, sumX: 0, sumY: 0 });
        }
        const cell = grid.get(key);
        cell.clicks++;
        cell.sumX += click.coordinates.x;
        cell.sumY += click.coordinates.y;
    }

    const clusters = Array.from(grid.values()).map(cell => ({
        centerX: Math.round(cell.sumX / cell.clicks),
        centerY: Math.round(cell.sumY / cell.clicks),
        radius: Math.min(40, 10 + cell.clicks * 2),
        intensity: cell.clicks
    }));

    clusters.sort((a, b) => b.intensity - a.intensity);
    return clusters.slice(0, 5); // top 5
}

// ── Prompt builder ───────────────────────────────────────────

function buildAnalysisPrompt(session, test, boardContext, hotspots) {
    const hotspotsSummary = JSON.stringify(hotspots, null, 2);

    const boardContextSummary = JSON.stringify(boardContext.map(w => ({
        id: w.id,
        type: w.type,
        label: w.content,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height
    })), null, 2);

    return `SYSTEM:
You are a UX analyst specializing in usability testing and interface clarity. 
You are given: (a) a list of elements on a Miro board with their positions and labels, (b) real user click heatmap hotspots from a usability test session.

Your job is to identify specific board regions that are likely confusing to users based on heatmap clustering, element density, overlapping decision paths, or ambiguous labels — then suggest a concrete fix for each.

RULES:
- Only reference elements that exist in the board_context provided.
- Each confusion zone must have a bounding box (x, y, width, height) in the 1200x800 coordinate space that corresponds to real board elements.
- Do not fabricate element names or positions.
- Return a valid JSON object only. No markdown, no commentary.

USER:
Board context: ${boardContextSummary}
Heatmap hotspots: ${hotspotsSummary}

Return a JSON object with this exact shape:
{
  "summary": "string",
  "patterns": ["string"],
  "recommendations": ["string"],
  "sentiment": "positive" | "negative" | "neutral",
  "confusionZones": [
    {
      "id": "string (uuid)",
      "label": "string (short name of the zone, e.g. 'Dense Decision Cluster')",
      "problem": "string (1-2 sentences describing why this area is confusing)",
      "fix": "string (1-2 sentences with a specific actionable suggestion)",
      "severity": "low" | "medium" | "high",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "relatedElementIds": ["string"]
    }
  ]
}`;
}

// ── Main analysis function ───────────────────────────────────

/**
 * Analyze a session using the appropriate AI provider.
 *
 * @param {Object} session - Session document with events and metrics
 * @param {Object} test - Test document with tasks and name
 * @param {Object} user - User document with plan info
 * @param {string} [providerOverride] - Force a specific provider
 * @returns {Object} AIInsight document
 */
export async function analyzeSession(session, test, user, providerOverride) {
    let boardContext = [];
    if (test.board) {
        let boardModel;
        // Use populated doc or fetch it
        if (test.board.miroId) {
            boardModel = test.board;
        } else {
            // Lazy load the board model inline without importing it at top level if it's already an ObjectId
            boardModel = await mongoose.model('Board').findById(test.board);
        }
        if (boardModel && boardModel.miroId) {
            boardContext = await fetchMiroBoardContext(boardModel.miroId);
        }
    }

    const hotspots = calculateHotspots(session.events || []);
    const prompt = buildAnalysisPrompt(session, test, boardContext, hotspots);

    // Determine provider and API key
    let provider;
    let apiKey;

    if (user.plan.tier === 'free') {
        // Free tier: use platform's pooled OpenAI key
        provider = 'openai';
        apiKey = process.env.BEACON_OPENAI_KEY;
        if (!apiKey) {
            const err = new Error('Add your own OpenRouter key in Settings to generate insights');
            err.status = 422;
            throw err;
        }
    } else {
        // Pro / Enterprise: use user's own key
        provider = providerOverride || user.plan.aiProvider || 'openai';
        apiKey = user.getAiApiKey();
        if (!apiKey) {
            throw new Error(
                'No AI API key configured. Add your key in Settings → AI Provider.'
            );
        }
    }

    // Call the appropriate provider
    let result;
    switch (provider) {
        case 'openai':
            result = await callOpenAI(apiKey, prompt);
            break;
        case 'anthropic':
            result = await callAnthropic(apiKey, prompt);
            break;
        case 'custom':
            result = await callCustom(apiKey, {}, prompt); // apiKey used as endpoint for custom
            break;
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Parse the AI response
    let insights;
    try {
        // Try to extract JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            summary: result.content,
            patterns: [],
            recommendations: [],
            sentiment: 'neutral',
            confusionZones: []
        };
    } catch {
        insights = {
            summary: result.content,
            patterns: [],
            recommendations: [],
            sentiment: 'neutral',
            confusionZones: []
        };
    }

    if (!insights.confusionZones || !Array.isArray(insights.confusionZones)) {
        console.warn('AI omitted confusionZones; defaulting to empty array');
        insights.confusionZones = [];
    }

    // Validate bounds
    insights.confusionZones = insights.confusionZones.map(zone => {
        if (!zone.boundingBox) return zone;
        const bb = zone.boundingBox;
        let clamped = false;

        let x = bb.x || 0;
        let y = bb.y || 0;
        let width = bb.width || 0;
        let height = bb.height || 0;

        if (x < 0) { x = 0; clamped = true; }
        if (y < 0) { y = 0; clamped = true; }
        if (x + width > 1200) { width = 1200 - x; clamped = true; }
        if (y + height > 800) { height = 800 - y; clamped = true; }

        if (width < 0) width = 0;
        if (height < 0) height = 0;

        return {
            ...zone,
            boundingBox: { x, y, width, height },
            clamped: clamped || undefined
        };
    });

    // Validation for hallucinated elements setting low_confidence
    let lowConfidence = false;
    const allText = (insights.summary || '') + ' ' + (insights.patterns?.join(' ') || '') + ' ' + (insights.recommendations?.join(' ') || '');

    // We check if the AI cites elements explicitly by quoting them. E.g "Sign In" button.
    // We extract double quoted phrases and see if they exist in boardContext.
    // (This is a simplified programmatic heuristic)
    const quotes = allText.match(/"([^"]+)"/g);
    if (quotes && boardContext.length > 0) {
        for (const quoteMatch of quotes) {
            const word = quoteMatch.replace(/"/g, '').trim().toLowerCase();
            if (word.length > 3) {
                const found = boardContext.some(w => w.content && w.content.toLowerCase().includes(word));
                if (!found && !allText.toLowerCase().includes('no text')) {
                    lowConfidence = true;
                    break;
                }
            }
        }
    }

    // Save to database
    const aiInsight = await AIInsight.create({
        test: test._id,
        session: session._id,
        provider,
        prompt,
        insights: {
            summary: insights.summary || '',
            patterns: insights.patterns || [],
            recommendations: insights.recommendations || [],
            sentiment: insights.sentiment || 'neutral',
            confusionZones: insights.confusionZones || [],
        },
        lowConfidence: lowConfidence,
        cost: result.cost,
    });

    return aiInsight;
}

/**
 * Predict user behavior using the appropriate AI provider.
 *
 * @param {Object} test - Test document with tasks and name
 * @param {Object} user - User document with plan info
 * @returns {Object} predictions and summary
 */
export async function predictBehavior(test, user) {
    const prompt = `You are an expert UX researcher and interaction designer.

Analyze the following usability test and predict where users are
most likely to interact with the board, based on UX heuristics:
Gestalt principles, Fitts's Law, F-pattern/Z-pattern reading,
visual hierarchy, contrast, and cognitive load theory.

Test Details:
- Name: ${test.name}
- Participant Tasks: ${test.tasks.map(t => t.description).join('; ')}

Board Viewport: 1200 x 800 pixels

Generate 15 to 25 predicted interaction points. Distribute them 
across the full viewport. For each point, specify:
  - x: integer (0–1200) — horizontal coordinate
  - y: integer (0–800) — vertical coordinate
  - intensity: float (0.01–1.0) — prediction confidence
  - type: "click" | "attention" | "friction"
    click     = user will likely click here intentionally
    attention = user eye will dwell here (high visual weight)
    friction  = user may click here by mistake / get confused
  - reason: string — one sentence explaining the UX heuristic

Also provide a summary of the overall predicted UX behavior.

Respond ONLY with valid JSON in this exact format:
{
  "predictions": [
    { "x": 0, "y": 0, "intensity": 0.0, 
      "type": "click", "reason": "..." }
  ],
  "summary": "..."
}`;

    // Determine provider and API key
    let provider;
    let apiKey;

    if (user.plan.tier === 'free') {
        // Free tier: use platform's pooled OpenAI key
        provider = 'openai';
        apiKey = process.env.BEACON_OPENAI_KEY;
        if (!apiKey) {
            const err = new Error('Add your own OpenRouter key in Settings to generate insights');
            err.status = 422;
            throw err;
        }
    } else {
        // Pro / Enterprise: use user's own key
        provider = user.plan.aiProvider || 'openai';
        apiKey = user.getAiApiKey();
        if (!apiKey) {
            throw new Error(
                'No AI API key configured. Add your key in Settings → AI Provider.'
            );
        }
    }

    // Call the appropriate provider
    let result;
    switch (provider) {
        case 'openai':
            result = await callOpenAI(apiKey, prompt);
            break;
        case 'anthropic':
            result = await callAnthropic(apiKey, prompt);
            break;
        case 'custom':
            result = await callCustom(apiKey, {}, prompt); // apiKey used as endpoint for custom
            break;
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Parse the AI response
    let parsed;
    try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { predictions: [], summary: result.content };
    } catch {
        parsed = { predictions: [], summary: result.content };
    }

    if (!Array.isArray(parsed.predictions)) {
        parsed.predictions = [];
    }

    // Validate predictions array
    const validPredictions = parsed.predictions
        .filter(p => p.x !== undefined && p.y !== undefined && p.intensity !== undefined)
        .map(p => ({
            ...p,
            x: Math.max(0, Math.min(1200, Math.round(p.x))),
            y: Math.max(0, Math.min(800, Math.round(p.y))),
            intensity: Math.max(0, Math.min(1, parseFloat(p.intensity)))
        }));

    if (validPredictions.length < 3) {
        throw new Error('AI returned insufficient prediction data. Retry.');
    }

    return {
        predictions: validPredictions,
        summary: parsed.summary || 'Summary not available.',
        cost: result.cost
    };
}
