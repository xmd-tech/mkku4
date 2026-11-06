const botRateLimits = new Map();

const ANTI_BAN_CONFIG = {
    // No artificial wait; per-chat queues still preserve send order.
    replyDelayMs: 0,
    minDelay: 100,
    maxDelay: 300,
    messagesPerMinute: 80,
    burstLimit: 15,
    burstWindow: 10000,
    cooldownTime: 15000,
    groupMessageDelay: 150,
    statusViewDelay: 500,
    typingDuration: 300,
    startupDelay: 1000,
    commandCooldown: 100,
    ownerBypass: true,
};

function getBotLimits(botId) {
    if (!botRateLimits.has(botId)) {
        botRateLimits.set(botId, {
            messageCounts: new Map(),
            lastMessageTime: new Map(),
            lastCommandTime: 0,
            isInCooldown: false,
            totalMessages: 0,
            startTime: Date.now()
        });
    }
    return botRateLimits.get(botId);
}

function getRandomDelay(min = ANTI_BAN_CONFIG.minDelay, max = ANTI_BAN_CONFIG.maxDelay) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkRateLimit(jid, botId = 'main') {
    const now = Date.now();
    const limits = getBotLimits(botId);
    const key = jid || 'global';
    
    if (!limits.messageCounts.has(key)) {
        limits.messageCounts.set(key, { count: 0, windowStart: now, burstCount: 0, burstStart: now });
    }
    
    const stats = limits.messageCounts.get(key);
    
    if (now - stats.burstStart > ANTI_BAN_CONFIG.burstWindow) {
        stats.burstCount = 0;
        stats.burstStart = now;
    }
    
    if (now - stats.windowStart > 60000) {
        stats.count = 0;
        stats.windowStart = now;
    }
    
    if (stats.burstCount >= ANTI_BAN_CONFIG.burstLimit) {
        return { allowed: false, waitTime: ANTI_BAN_CONFIG.burstWindow - (now - stats.burstStart) + getRandomDelay(1000, 3000) };
    }
    
    if (stats.count >= ANTI_BAN_CONFIG.messagesPerMinute) {
        return { allowed: false, waitTime: 60000 - (now - stats.windowStart) + getRandomDelay(2000, 5000) };
    }
    
    stats.count++;
    stats.burstCount++;
    limits.totalMessages++;
    return { allowed: true, waitTime: 0 };
}

function checkCommandCooldown(botId = 'main', isOwner = false) {
    if (isOwner && ANTI_BAN_CONFIG.ownerBypass) {
        return { allowed: true, waitTime: 0 };
    }
    
    const now = Date.now();
    const limits = getBotLimits(botId);
    const timeSince = now - limits.lastCommandTime;
    
    if (timeSince < ANTI_BAN_CONFIG.commandCooldown) {
        return { allowed: false, waitTime: ANTI_BAN_CONFIG.commandCooldown - timeSince };
    }
    
    limits.lastCommandTime = now;
    return { allowed: true, waitTime: 0 };
}

async function safeSendMessage(client, jid, content, options = {}, botId = 'main', isOwner = false) {
    try {
        if (isOwner && ANTI_BAN_CONFIG.ownerBypass) {
            const result = await client.sendMessage(jid, content, options);
            return result;
        }
        
        const limits = getBotLimits(botId);
        
        if (limits.isInCooldown) {
            console.log(`[${botId}] 🛑 Bot in cooldown, waiting...`);
            await sleep(ANTI_BAN_CONFIG.cooldownTime);
            limits.isInCooldown = false;
        }
        
        const rateCheck = checkRateLimit(jid, botId);
        
        if (!rateCheck.allowed) {
            console.log(`[${botId}] ⏳ Rate limit: waiting ${Math.ceil(rateCheck.waitTime / 1000)}s`);
            await sleep(rateCheck.waitTime);
        }
        
        const lastTime = limits.lastMessageTime.get(jid) || 0;
        const timeSince = Date.now() - lastTime;
        const minDelay = jid.endsWith('@g.us') ? ANTI_BAN_CONFIG.groupMessageDelay : ANTI_BAN_CONFIG.minDelay;
        
        if (timeSince < minDelay) {
            await sleep(minDelay - timeSince);
        }
        
        const result = await client.sendMessage(jid, content, options);
        limits.lastMessageTime.set(jid, Date.now());
        
        return result;
    } catch (error) {
        const limits = getBotLimits(botId);
        if (error.message?.includes('rate') || error.data === 429 || error.message?.includes('spam')) {
            console.log(`[${botId}] ⚡ Rate limit/spam detected, entering cooldown...`);
            limits.isInCooldown = true;
            await sleep(ANTI_BAN_CONFIG.cooldownTime);
            limits.isInCooldown = false;
            return safeSendMessage(client, jid, content, options, botId);
        }
        throw error;
    }
}

async function safeReact(client, jid, key, emoji, botId = 'main') {
    try {
        await sleep(getRandomDelay(500, 1500));
        return await client.sendMessage(jid, { react: { text: emoji, key } });
    } catch (error) {
        console.log(`[${botId}] React error:`, error.message);
        return null;
    }
}

async function safeBulkSend(client, jids, content, options = {}, botId = 'main') {
    const results = [];
    const shuffledJids = [...jids].sort(() => Math.random() - 0.5);
    
    for (const jid of shuffledJids) {
        try {
            const result = await safeSendMessage(client, jid, content, options, botId);
            results.push({ jid, success: true, result });
        } catch (error) {
            results.push({ jid, success: false, error: error.message });
        }
        await sleep(getRandomDelay(4000, 8000));
    }
    
    return results;
}

function wrapClientWithAntiBan(client, botId = 'main', delivery = require('./messageDelivery').createMessageDelivery()) {
    if (client._replyDelayWrapped) return client;
    client._replyDelayWrapped = true;
    const originalSendMessage = client.sendMessage.bind(client);
    const limits = getBotLimits(botId);
    const sendQueues = new Map();
    // Register before command handlers so original keys are captured untouched.
    client.ev?.on('messages.upsert', ({ messages = [] }) => {
        for (const message of messages) {
            delivery.observe(message);
            delivery.remember(message);
        }
    });
    
    client.safeSend = (jid, content, options) => safeSendMessage(client, jid, content, options, botId);
    client.safeReact = (jid, key, emoji) => safeReact(client, jid, key, emoji, botId);
    client.safeBulkSend = (jids, content, options) => safeBulkSend(client, jids, content, options, botId);
    client.checkCommandCooldown = () => checkCommandCooldown(botId);
    
    client.clearUserSession = async (jid) => {
        try {
            const recipientId = jid.split('@')[0];
            if (client.authState?.keys?.set) {
                await client.authState.keys.set({ 
                    'session': { [recipientId]: null },
                    'sender-key': { [recipientId]: null },
                    'pre-key': { [recipientId]: null },
                    'sender-key-memory': { [recipientId]: null }
                });
                console.log(`[${botId}] 🔄 All session keys cleared for ${recipientId}`);
                return true;
            }
        } catch (e) {
            console.log(`[${botId}] Could not clear session: ${e.message}`);
        }
        return false;
    };
    
    client.sendMessage = async (jid, content, options = {}) => {
        if (content && typeof content.text === 'string' && !content.text.trim()) {
            console.log(`[${botId}] ⚠️ Prevented empty message`);
            return null;
        }
        ({ jid, content, options } = delivery.prepare(jid, content, options));
        
        // Include owner/self-chat, media and reactions in the timing experiment.
        // A failed send must not block subsequent replies. Chats queue separately.
        const previous = sendQueues.get(jid) || Promise.resolve();
        const pending = previous.catch(() => {}).then(async () => {
            if (ANTI_BAN_CONFIG.replyDelayMs > 0) {
                await sleep(ANTI_BAN_CONFIG.replyDelayMs);
            }
            const result = await originalSendMessage(jid, content, options);
            delivery.remember(result);
            limits.lastMessageTime.set(jid, Date.now());
            return result;
        });
        sendQueues.set(jid, pending);
        try {
            return await pending;
        } finally {
            if (sendQueues.get(jid) === pending) sendQueues.delete(jid);
        }
    };
    
    return client;
}

function clearRateLimits(botId = null) {
    if (botId) {
        botRateLimits.delete(botId);
    } else {
        botRateLimits.clear();
    }
}

function getBotStats(botId) {
    const limits = getBotLimits(botId);
    return {
        totalMessages: limits.totalMessages,
        uptime: Date.now() - limits.startTime,
        isInCooldown: limits.isInCooldown,
        activeChats: limits.lastMessageTime.size
    };
}

module.exports = {
    ANTI_BAN_CONFIG,
    getRandomDelay,
    sleep,
    checkRateLimit,
    checkCommandCooldown,
    safeSendMessage,
    safeReact,
    safeBulkSend,
    wrapClientWithAntiBan,
    clearRateLimits,
    getBotStats,
    getBotLimits,
};
