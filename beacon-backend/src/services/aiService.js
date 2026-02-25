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

// ── Prompt builder ───────────────────────────────────────────

function buildAnalysisPrompt(session, test) {
    const eventSequence = session.events
        .slice(0, 200) // Limit to 200 events to control token usage
        .map(
            (e) =>
                `[${e.type}] at (${e.coordinates?.x || 0}, ${e.coordinates?.y || 0}) on "${e.element || 'unknown'}" @ ${e.timestamp}`
        )
        .join('\n');

    return `Analyze this usability test session:

Test Details:
- Test Name: ${test.name}
- Tasks: ${JSON.stringify(test.tasks.map((t) => t.description))}

Session Metrics:
- Task Completion Rate: ${session.metrics?.taskCompletionRate || 0}%
- Total Click Count: ${session.metrics?.clickCount || 0}
- Time on Task: ${JSON.stringify(session.metrics?.timeOnTask || {})}
- Path Efficiency: ${session.metrics?.pathEfficiency || 0}

Event Sequence (first 200):
${eventSequence}

Provide:
1. Summary of user behavior
2. Identified patterns and pain points
3. UX recommendations
4. Sentiment analysis (positive/neutral/negative)

Format response as JSON:
{
  "summary": "...",
  "patterns": ["...", "..."],
  "recommendations": ["...", "..."],
  "sentiment": "..."
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
    const prompt = buildAnalysisPrompt(session, test);

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
        };
    } catch {
        insights = {
            summary: result.content,
            patterns: [],
            recommendations: [],
            sentiment: 'neutral',
        };
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
        },
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
