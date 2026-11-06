// Preserve the successful original-chat route, without media or synthetic quotes.
async function sendMenuReply(client, jid, text, {
    contextInfo = {}, mentions, deviceMode, linkPreview
} = {}) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const characters = Array.from(text);
    let sent;
    for (let start = 0; start < characters.length; start += 16000) {
        const content = { text: characters.slice(start, start + 16000).join('') };
        if (linkPreview !== undefined) content.linkPreview = linkPreview;
        if (mentions) content.mentions = mentions;
        if (deviceMode !== 'iPhone') {
            content.contextInfo = { ...contextInfo };
            if (mentions) content.contextInfo.mentionedJid = mentions;
        }
        sent = await client.sendMessage(jid, content);
    }
    return sent;
}

async function sendCommandReaction(client, originalKey, emoji) {
    if (typeof emoji !== 'string' || !originalKey?.remoteJid || !originalKey?.id) return;
    return client.sendMessage(originalKey.remoteJid, {
        react: { key: { ...originalKey }, text: emoji }
    });
}

module.exports = { sendMenuReply, sendCommandReaction };