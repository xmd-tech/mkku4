// Apply presentation rules at the socket, not separately in every command.
// Native media, reactions, edits, deletion keys and transport options remain
// functional; iPhone mode removes only rich message presentation.
const { brandResponse, renameVisibleText } = require('./responseBranding');
const installed = Symbol('deviceModeDelivery');
const decoration = [
    'contextInfo', 'externalAdReply', 'quoted', 'buttons', 'templateButtons', 'interactiveButtons',
    'sections', 'footer', 'footerText', 'headerType', 'viewOnce',
    'jpegThumbnail', 'thumbnail', 'thumbnailUrl', 'thumbnailDirectPath',
    'thumbnailSha256', 'thumbnailEncSha256', 'thumbnailHeight', 'thumbnailWidth',
    'isForwarded', 'forwardingScore', 'presentationOnly'
];

function isIPhone(mode) {
    return /^(?:iphone|ios|apple)$/i.test(String(mode || '').trim());
}

function withoutDecoration(value) {
    const result = { ...value };
    for (const key of decoration) delete result[key];
    // Mentions are functional group tags, not newsletter/advertisement cards.
    if (Array.isArray(value.contextInfo?.mentionedJid) && value.contextInfo.mentionedJid.length) {
        result.contextInfo = { mentionedJid: [...value.contextInfo.mentionedJid] };
    }
    return result;
}

function choiceText(choice, index) {
    let params = {};
    try { params = JSON.parse(choice.buttonParamsJson || '{}'); } catch { /* Malformed optional UI data. */ }
    const button = choice.quickReplyButton || choice.urlButton || choice.callButton || choice;
    const label = params.display_text || params.title || button.buttonText?.displayText ||
        button.displayText || button.title || button.text;
    const link = params.url || button.url || button.phoneNumber;
    const command = choice.rowId || choice.buttonId || params.id || button.id;
    const action = typeof command === 'string' && /^[^a-z\d\s]/i.test(command) ? command : '';
    return [label ? `${index + 1}. ${label}` : '', link || action].filter(Boolean).join(' — ');
}

function interactiveText(value) {
    if (!value || typeof value !== 'object') return '';
    const parts = [
        value.header?.title, value.header?.subtitle, value.hydratedTitleText, value.title,
        value.text || value.caption || value.body?.text || value.contentText ||
            value.hydratedContentText || value.description
    ].filter(part => typeof part === 'string' && part.trim());
    const choices = value.buttons || value.templateButtons || value.interactiveButtons || value.hydratedButtons ||
        value.nativeFlowMessage?.buttons || [];
    parts.push(...choices.map(choiceText).filter(Boolean));
    for (const section of value.sections || []) {
        if (section.title) parts.push(section.title);
        parts.push(...(section.rows || []).map(choiceText).filter(Boolean));
    }
    for (const card of value.carouselMessage?.cards || []) parts.push(interactiveText(card));
    return [...new Set(parts)].join('\n').trim();
}

function interactivePayload(message) {
    return message.interactiveMessage || message.buttonsMessage || message.listMessage ||
        message.templateMessage?.hydratedTemplate || message.templateMessage?.hydratedFourRowTemplate ||
        message.templateMessage?.fourRowTemplate;
}

function plainProtocol(message) {
    if (!message || typeof message !== 'object') return message;
    if (message.botForwardedMessage?.message) return plainProtocol(message.botForwardedMessage.message);
    if (message.richResponseMessage) {
        const text = (message.richResponseMessage.submessages || []).map(part => part.messageText).filter(Boolean).join('\n');
        return { conversation: text || 'This interactive response is available in Android mode.' };
    }
    for (const wrapper of ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
        if (message[wrapper]?.message) return plainProtocol(message[wrapper].message);
    }
    const interactive = interactivePayload(message);
    if (interactive) return { conversation: interactiveText(interactive) || 'Please use the text command to continue.' };
    const result = { ...message };
    for (const [key, payload] of Object.entries(result)) {
        if (!payload || typeof payload !== 'object' || Buffer.isBuffer(payload)) continue;
        if (key === 'messageContextInfo') {
            result[key] = { ...payload };
            delete result[key].botMetadata;
        } else if (['ephemeralMessage', 'documentWithCaptionMessage', 'deviceSentMessage'].includes(key) && payload.message) {
            // Keep disappearing-message timers and device-sync information.
            result[key] = { ...payload, message: plainProtocol(payload.message) };
        } else if (key === 'protocolMessage') {
            result[key] = payload.editedMessage ? { ...payload, editedMessage: plainProtocol(payload.editedMessage) } : payload;
        } else {
            result[key] = withoutDecoration(payload);
            if (key === 'extendedTextMessage') {
                for (const field of ['canonicalUrl', 'matchedText', 'title', 'description', 'previewType', 'mediaKey', 'mediaKeyTimestamp']) {
                    delete result[key][field];
                }
                if (!result[key].contextInfo) {
                    delete result[key];
                    result.conversation = payload.text || '';
                }
            }
        }
    }
    return result;
}

function plainContent(content) {
    if (!content || typeof content !== 'object' || content.react || content.delete) return content;
    if (content.presentationOnly && (content.text || content.caption)) {
        return {
            text: content.text || content.caption, linkPreview: null,
            ...(content.mentions ? { mentions: content.mentions } : {})
        };
    }
    const interactive = interactivePayload(content);
    if (interactive || content.buttons || content.templateButtons || content.interactiveButtons || content.sections || content.nativeFlowMessage) {
        return {
            text: interactiveText(interactive || content) || 'Please use the text command to continue.',
            linkPreview: null,
            ...(content.mentions ? { mentions: content.mentions } : {})
        };
    }
    const result = withoutDecoration(content);
    // null explicitly suppresses Baileys' automatic URL preview generation.
    if (typeof result.text === 'string') result.linkPreview = null;
    if (result.forward?.message) {
        result.forward = {
            ...result.forward,
            key: { ...result.forward.key, fromMe: true },
            message: plainProtocol(result.forward.message)
        };
        // Baileys otherwise reintroduces forwarding badges after normalization.
        result.force = false;
    }
    return result;
}

function plainOptions(options) {
    if (!options) return options;
    const result = withoutDecoration(options);
    delete result.linkPreview;
    return result;
}

function installDeviceMode(client, getMode) {
    if (client[installed]) return client;
    client[installed] = true;
    let lastMode = 'Android';
    async function currentMode() {
        try { lastMode = await getMode() || lastMode; }
        catch { console.warn('[Device mode] Settings unavailable; retaining the last known mode'); }
        return isIPhone(lastMode);
    }
    const send = client.sendMessage;
    client.sendMessage = async function (jid, content, options, ...rest) {
        content = brandResponse(content);
        if (content?.react || content?.delete || !(await currentMode())) {
            if (content?.presentationOnly) {
                const native = { ...content };
                delete native.presentationOnly;
                return send.call(client, jid, native, options, ...rest);
            }
            return send.call(client, jid, content, options, ...rest);
        }
        return send.call(client, jid, plainContent(content), plainOptions(options), ...rest);
    };
    if (typeof client.relayMessage === 'function') {
        const relay = client.relayMessage;
        client.relayMessage = async function (jid, message, options, ...rest) {
            message = brandResponse(message);
            if (!(await currentMode())) return relay.call(client, jid, message, options, ...rest);
            return relay.call(client, jid, plainProtocol(message), plainOptions(options), ...rest);
        };
    }
    for (const method of ['updateProfileName', 'updateProfileStatus']) {
        if (typeof client[method] === 'function') {
            const original = client[method];
            client[method] = (text, ...args) => original.call(client, renameVisibleText(text), ...args);
        }
    }
    return client;
}

module.exports = { installDeviceMode, plainContent, plainProtocol, isIPhone };
