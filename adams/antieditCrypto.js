// Shared AntiEdit helpers — used by the main bot (index.js) and sub-bots (subBotManager.js)

// Decode a messageSecret that was stored via JSON (base64 string / Buffer JSON / Uint8Array)
function decodeStoredSecret(sec) {
    if (!sec) return null;
    try {
        if (typeof sec === 'string') return Buffer.from(sec, 'base64');
        if (Buffer.isBuffer(sec) || sec instanceof Uint8Array) return Buffer.from(sec);
        if (sec.type === 'Buffer' && Array.isArray(sec.data)) return Buffer.from(sec.data);
        if (typeof sec === 'object') {
            const vals = Object.values(sec);
            if (vals.length && vals.every(v => typeof v === 'number')) return Buffer.from(vals);
        }
    } catch (e) {}
    return null;
}

// Decrypt a secretEncryptedMessage MESSAGE_EDIT payload using the original message's
// messageSecret (same HKDF-style scheme Baileys uses for poll votes / event responses).
function tryDecryptMessageEdit(sem, { origId, senderJids, editorJids, secret }) {
    try {
        const { hmacSign, aesDecryptGCM, proto: WAP } = require("@whiskeysockets/baileys");
        const toBuf = (v) => {
            if (!v) return null;
            if (Buffer.isBuffer(v) || v instanceof Uint8Array) return Buffer.from(v);
            if (typeof v === 'string') return Buffer.from(v, 'base64');
            if (v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data);
            return null;
        };
        const payload = toBuf(sem.encPayload);
        const iv = toBuf(sem.encIv);
        if (!payload || !iv || !secret) return null;
        const infos = ['Message Edit', 'Msg Edit', 'Edit Message'];
        for (const info of infos) {
            for (const os of senderJids) {
                for (const ed of editorJids) {
                    try {
                        const sign = Buffer.concat([
                            Buffer.from(origId), Buffer.from(os), Buffer.from(ed),
                            Buffer.from(info), Buffer.from([1])
                        ]);
                        const key0 = hmacSign(secret, Buffer.alloc(32), 'sha256');
                        const decKey = hmacSign(sign, key0, 'sha256');
                        const aad = Buffer.from(`${origId}\u0000${ed}`);
                        const dec = aesDecryptGCM(payload, decKey, iv, aad);
                        const decoded = WAP.Message.decode(dec);
                        return decoded.protocolMessage?.editedMessage || decoded;
                    } catch (e) { /* wrong combo — GCM auth fails, try next */ }
                }
            }
        }
    } catch (e) {}
    return null;
}

// Strip a JID to bare user@server (no device part)
function bareJid(jid) {
    if (!jid || !jid.includes('@')) return null;
    const [userPart, server] = jid.split('@');
    return userPart.split(':')[0] + '@' + server;
}

// Extract text / caption / media info from a message body (unwraps ephemeral & viewOnce)
function extractMsgParts(msgBody) {
    if (!msgBody) return { text: '', caption: '', media: null, mediaType: null };
    const inner = msgBody.ephemeralMessage?.message ||
                  msgBody.viewOnceMessage?.message ||
                  msgBody.viewOnceMessageV2?.message ||
                  msgBody;
    const text = inner.conversation || inner.extendedTextMessage?.text || '';
    let media = null, mediaType = null, caption = '';
    if (inner.imageMessage) { media = inner.imageMessage; mediaType = 'image'; caption = inner.imageMessage.caption || ''; }
    else if (inner.videoMessage) { media = inner.videoMessage; mediaType = 'video'; caption = inner.videoMessage.caption || ''; }
    else if (inner.documentMessage) { media = inner.documentMessage; mediaType = 'document'; caption = inner.documentMessage.caption || ''; }
    return { text, caption, media, mediaType };
}

module.exports = { decodeStoredSecret, tryDecryptMessageEdit, bareJid, extractMsgParts };
