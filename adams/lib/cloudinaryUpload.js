const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const FormData = require('form-data');
const mime = require('mime-types');
const XMD = require('../xmd');

function resourceType(type, mimetype = '') {
    // Files sent as documents must remain unmodified, regardless of their MIME
    // type. Raw delivery supports archives, JSON, office files and custom types.
    if (type === 'document') return 'raw';
    if (type === 'image' || type === 'sticker' || mimetype.startsWith('image/')) return 'image';
    // Cloudinary uses its video resource type for audio too, including voice notes.
    if (type === 'video' || type === 'audio' || /^(?:video|audio)\//.test(mimetype)) return 'video';
    return 'raw';
}

async function uploadToCloudinary(input, {
    type = 'image', mimetype, filename, prefix = 'upload'
} = {}, http = axios) {
    const declaredType = mimetype?.split(';')[0].trim().toLowerCase();
    const inferredType = (filename && mime.lookup(filename)) || (typeof input === 'string' && mime.lookup(input));
    const contentType = ((declaredType && declaredType !== 'application/octet-stream' ? declaredType : inferredType) || declaredType ||
        ({ image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', sticker: 'image/webp' })[type] ||
        'application/octet-stream');
    const basename = path.basename((filename || (typeof input === 'string' ? input :
        `media.${mime.extension(contentType) || 'bin'}`)).replace(/\\/g, '/'))
        .replace(/[\x00-\x1f\x7f?&#%<>+":]/g, '_');
    const name = !basename || basename === '.' || basename === '..'
        ? `media.${mime.extension(contentType) || 'bin'}` : basename;
    const resource = resourceType(type, contentType);
    const id = `${prefix}-${crypto.randomUUID()}`;
    const source = typeof input === 'string' ? fs.createReadStream(input) : input;
    const form = new FormData();
    form.append('file', source, { filename: name, contentType });
    form.append('upload_preset', XMD.CLOUDINARY.UPLOAD_PRESET);
    form.append('folder', XMD.CLOUDINARY.FOLDER);
    // Cloudinary does not append extensions for raw files. A unique parent
    // directory preserves the original basename and compound extensions.
    form.append('public_id', resource === 'raw' ? `${id}/${name}` : id);
    try {
        const response = await http.post(XMD.CLOUDINARY.UPLOAD(resource), form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: type === 'image' || type === 'sticker' ? 30000 : 60000
        });
        const url = response.data?.secure_url;
        if (typeof url !== 'string' || new URL(url).protocol !== 'https:') {
            throw new Error('Cloudinary did not return a secure URL');
        }
        return url;
    } finally {
        // Stream directly; no new temporary upload files or lingering readers.
        if (typeof source?.destroy === 'function') source.destroy();
    }
}

function findQuotedMedia(context) {
    const quotedType = context.quoted?.mtype || context.quoted?.type;
    const serializedQuote = context.quoted?.msg && typeof quotedType === 'string'
        ? { [quotedType.endsWith('Message') ? quotedType : `${quotedType}Message`]: context.quoted.msg }
        : context.quoted?.msg;
    const candidates = [
        context.quotedMsg, context.quoted?.message, serializedQuote, context.quoted,
        context.mek?.message?.extendedTextMessage?.contextInfo?.quotedMessage,
        context.mek?.message
    ];
    for (let message of candidates) {
        for (let depth = 0; message && depth < 8; depth++) {
            for (const type of ['image', 'video', 'audio', 'sticker', 'document']) {
                if (message[`${type}Message`]) return { type, node: message[`${type}Message`] };
            }
            const wrapped = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2',
                'viewOnceMessageV2Extension', 'documentWithCaptionMessage'].find(key => message[key]?.message);
            if (wrapped) message = message[wrapped].message;
            else if (message.message) message = message.message;
            else {
                const kind = message.mimetype?.split('/')[0];
                if (['image', 'video', 'audio'].includes(kind)) return { type: kind, node: message };
                if (message.fileName || message.mimetype) return { type: 'document', node: message };
                break;
            }
        }
    }
    return null;
}

async function publicFileAccessible(url, http = axios) {
    try {
        await http.head(url, { timeout: 15000 });
        return true;
    } catch (error) {
        if ([401, 403].includes(error.response?.status)) return false;
        throw error;
    }
}

module.exports = { uploadToCloudinary, resourceType, findQuotedMedia, publicFileAccessible };
