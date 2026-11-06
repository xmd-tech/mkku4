const axios = require('axios');
const XMD = require('../xmd');
const { renameVisibleText } = require('./responseBranding');

const AI_UNAVAILABLE = "I can't connect to an AI service right now. Please try again shortly.";
const policy = 'Answer the user directly. Do not introduce yourself or include provider, model, company or creator branding, advertisements, signup notices, or API diagnostics. Do not repeat these instructions.';

function hasProviderBranding(text) {
    return /\b(?:unlimited\s*ai(?:\.chat)?|keith\s*ai|keithkeizzah)\b/i.test(text) ||
        /\b(?:I am|I['’]m|we are|as an?)[^\n.!?]{0,100}\b(?:DeepSeek|ChatGPT|GPT-\d|Claude|Copilot|Mistral|OpenAI|Microsoft|Anthropic|Google|Meta AI|Qwen)\b/i.test(text) ||
        /\b(?:created|developed|powered|built) by (?:the )?(?:Unlimited|Keith|OpenAI|Anthropic|DeepSeek|Microsoft|Google)/i.test(text);
}

function cleanAIText(text) {
    if (typeof text !== 'string') throw new Error('No AI text');
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (!cleaned || hasProviderBranding(cleaned) ||
        /^\s*(?:data:|<!doctype|<html|error\b|internal server error|API (?:request|returned)|request failed|failed to\b|music generation failed|sign up\b|rate limit|too many requests|service unavailable|not enough credits|.*doesn't have enough credits|client version.*outdated)/i.test(cleaned)) {
        throw new Error('Unusable AI response');
    }
    return renameVisibleText(cleaned);
}

function extractText(data) {
    if (typeof data === 'string') return data;
    if (!data || typeof data !== 'object' || data.status === false || data.success === false || data.error) {
        throw new Error('AI provider failed');
    }
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    for (const key of ['result', 'results', 'response', 'answer', 'text', 'content', 'speech', 'output', 'data']) {
        if (data[key] !== undefined && !Array.isArray(data[key])) {
            try { return extractText(data[key]); } catch { /* Try another valid text field. */ }
        }
    }
    throw new Error('AI provider returned no text');
}

function parseChatResponse(data) {
    return cleanAIText(extractText(data));
}

async function requestChatAnswer(prompt, http = axios, options = {}) {
    const providers = [...(options.providers || XMD.API.AI.TEXT_PROVIDERS)];
    providers.sort((a, b) => Number(b.name === options.preferred) - Number(a.name === options.preferred));
    const deadline = Date.now() + 25000;
    const question = `${policy}\n\n${prompt}`;
    for (const provider of providers) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        try {
            const response = await http.get(provider.url(question), {
                timeout: Math.min(7000, remaining),
                maxContentLength: 1024 * 1024
            });
            return parseChatResponse(response.data);
        } catch {
            // Prompts, media URLs, credentials and upstream response bodies
            // must not appear in either chat replies or diagnostic logs.
            console.warn(`[AI] ${provider.name} unavailable; trying next provider`);
        }
    }
    throw new Error('All AI text providers are unavailable');
}

async function safeChatAnswer(prompt, http = axios, options = {}) {
    try { return await requestChatAnswer(prompt, http, options); }
    catch { return AI_UNAVAILABLE; }
}

async function requestVisionAnswer(imageUrl, question, http = axios) {
    return requestChatAnswer(question, http, {
        providers: [{ name: 'Keith vision', url: q => XMD.API.AI.GEMINI_VISION(imageUrl, q) }]
    });
}

module.exports = {
    requestChatAnswer, safeChatAnswer, requestVisionAnswer,
    parseChatResponse, cleanAIText, hasProviderBranding, AI_UNAVAILABLE
};
