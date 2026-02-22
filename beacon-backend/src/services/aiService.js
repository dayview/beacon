import AIInsight from '../models/AIInsight.js';

/**
 * Multi-provider AI service for session analysis.
 */

// ── Provider API calls ───────────────────────────────────────

async function callOpenAI(apiKey, prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4',
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
    const cost = estimateOpenAICost(data.usage);
    return { content, cost };
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
    const cost = estimateAnthropicCost(data.usage);
    return { content, cost };
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

// ── Cost estimation helpers ──────────────────────────────────

function estimateOpenAICost(usage) {
    if (!usage) return 0;
    // Approximate GPT-4 pricing: $0.03/1K input, $0.06/1K output
    const inputCost = (usage.prompt_tokens / 1000) * 0.03;
    const outputCost = (usage.completion_tokens / 1000) * 0.06;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
}

function estimateAnthropicCost(usage) {
    if (!usage) return 0;
    // Approximate Claude 3.5 Sonnet pricing: $3/M input, $15/M output
    const inputCost = (usage.input_tokens / 1_000_000) * 3;
    const outputCost = (usage.output_tokens / 1_000_000) * 15;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
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
            throw new Error('Platform AI key not configured. Contact support.');
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
