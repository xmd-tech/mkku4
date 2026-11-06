'use strict';

const PN_SUFFIX = '@s.whatsapp.net';
const LID_SUFFIX = '@lid';

function isDirectJid(jid) {
    return typeof jid === 'string' &&
        (jid.endsWith(PN_SUFFIX) || jid.endsWith(LID_SUFFIX));
}

function positiveLimit(value, fallback) {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return Math.floor(number);
}

function hasPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    return Object.keys(payload).length > 0;
}

function cacheKey(chat, id) {
    return JSON.stringify([chat, id]);
}

/**
 * Creates the delivery state for one socket.
 *
 * observe() records the exact keys and PN/LID relationship seen on incoming
 * messages. prepare() returns safe arguments for sendMessage. remember() keeps
 * message payloads for Baileys' getMessage callback, and getMessage() retrieves
 * them without ever falling back to a global message-id search.
 */
function createMessageDelivery({ maxMessages = 1000, maxChats = 1000 } = {}) {
    maxMessages = positiveLimit(maxMessages, 1000);
    maxChats = positiveLimit(maxChats, 1000);

    const observedKeys = new Map();
    const observedAliases = new Map();
    const messages = new Map();
    const messageAliases = new Map();
    const routes = new Map();

    function removeReferences(map, target) {
        for (const [key, value] of map) {
            if (value === target) map.delete(key);
        }
    }

    function boundedSet(map, key, value, limit, references) {
        if (limit === 0) return;
        if (map.has(key)) map.delete(key);
        map.set(key, value);
        while (map.size > limit) {
            const oldest = map.keys().next().value;
            map.delete(oldest);
            if (references) removeReferences(references, oldest);
        }
    }

    function linkChats(original, alternate) {
        if (!isDirectJid(original) || !isDirectJid(alternate) ||
            original === alternate) return;

        // Whichever address WhatsApp most recently used is the canonical route.
        boundedSet(routes, original, original, maxChats);
        boundedSet(routes, alternate, original, maxChats);
    }

    function addAlias(aliasMap, alias, target) {
        if (alias === target) return;
        boundedSet(aliasMap, alias, target, maxMessages);
    }

    function observe(message) {
        const key = message && message.key;
        const chat = key && key.remoteJid;
        const id = key && key.id;
        if (typeof chat !== 'string' || !id) return message;

        const exact = cacheKey(chat, id);
        const originalKey = { ...key };
        boundedSet(observedKeys, exact, originalKey, maxMessages, observedAliases);

        const alternate = key.remoteJidAlt || message.remoteJidAlt;
        if (isDirectJid(chat) && isDirectJid(alternate) && chat !== alternate) {
            linkChats(chat, alternate);
            addAlias(observedAliases, cacheKey(alternate, id), exact);
        }

        return message;
    }

    function findObservedKey(chat, id) {
        if (typeof chat !== 'string' || !id) return undefined;
        const exact = cacheKey(chat, id);
        const direct = observedKeys.get(exact);
        if (direct) return direct;

        const target = observedAliases.get(exact);
        return target ? observedKeys.get(target) : undefined;
    }

    function prepare(jid, content, options) {
        const routedJid = isDirectJid(jid) ? (routes.get(jid) || jid) : jid;
        let preparedContent = content;

        const reaction = content && content.react;
        const reactionKey = reaction && reaction.key;
        if (reactionKey && reactionKey.id) {
            const reactionChat = reactionKey.remoteJid || jid;
            const originalKey = findObservedKey(reactionChat, reactionKey.id);
            if (originalKey) {
                preparedContent = {
                    ...content,
                    react: {
                        ...reaction,
                        key: { ...originalKey }
                    }
                };
            }
        }

        return { jid: routedJid, content: preparedContent, options };
    }

    function remember(message) {
        const key = message && message.key;
        const chat = key && key.remoteJid;
        const id = key && key.id;
        const payload = message && message.message;
        if (typeof chat !== 'string' || !id || !hasPayload(payload)) return message;

        const exact = cacheKey(chat, id);
        boundedSet(messages, exact, payload, maxMessages, messageAliases);

        const alternate = key.remoteJidAlt || message.remoteJidAlt;
        if (isDirectJid(chat) && isDirectJid(alternate) && chat !== alternate) {
            linkChats(chat, alternate);
            addAlias(messageAliases, cacheKey(alternate, id), exact);
        }

        return message;
    }

    function getMessage(key) {
        const chat = key && key.remoteJid;
        const id = key && key.id;
        if (typeof chat !== 'string' || !id) return undefined;

        const exact = cacheKey(chat, id);
        if (messages.has(exact)) return messages.get(exact);

        const aliasTarget = messageAliases.get(exact);
        if (aliasTarget && messages.has(aliasTarget)) {
            return messages.get(aliasTarget);
        }

        // A route is an explicit PN/LID relationship learned by observe().
        if (isDirectJid(chat)) {
            const routedChat = routes.get(chat);
            if (routedChat && routedChat !== chat) {
                return messages.get(cacheKey(routedChat, id));
            }
        }
        return undefined;
    }

    return { observe, prepare, remember, getMessage };
}

module.exports = { createMessageDelivery };