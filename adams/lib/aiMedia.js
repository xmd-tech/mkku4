const axios = require('axios');
const { spawn } = require('node:child_process');
const FormData = require('form-data');
const XMD = require('../xmd');
const { cleanAIText } = require('./chatbotApi');

function assertSuccess(data) {
    if (!data || typeof data !== 'object') return;
    if (data.status === false || data.success === false || data.error) throw new Error('Media provider failed');
    if (data.result && typeof data.result === 'object') assertSuccess(data.result);
}

function mediaUrl(data) {
    if (typeof data === 'string') return /^https?:\/\//i.test(data) ? data : null;
    if (!data || typeof data !== 'object') return null;
    assertSuccess(data);
    for (const key of ['url', 'URL', 'audio_url', 'video_url', 'image_url', 'download_url', 'video', 'image', 'result', 'results', 'data']) {
        const url = mediaUrl(data[key]);
        if (url) return url;
    }
    return null;
}

function isMedia(buffer, type) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    if (type === 'image') return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
        buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
    if (type === 'video') return buffer.toString('ascii', 4, 8) === 'ftyp' ||
        buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    return buffer.toString('ascii', 0, 3) === 'ID3' ||
        (buffer[0] === 255 && (buffer[1] & 224) === 224) ||
        buffer.toString('ascii', 0, 4) === 'OggS' ||
        (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE');
}

async function fetchMedia(url, type, http = axios) {
    const response = await http.get(url, {
        responseType: 'arraybuffer', timeout: 15000, maxContentLength: 25 * 1024 * 1024
    });
    const buffer = Buffer.from(response.data);
    if (!isMedia(buffer, type)) throw new Error('Provider did not return playable media');
    return buffer;
}

function toMp3(buffer) {
    if (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 255 && (buffer[1] & 224) === 224)) {
        return Promise.resolve(buffer);
    }
    return new Promise((resolve, reject) => {
        const child = spawn(require('@ffmpeg-installer/ffmpeg').path,
            ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 'mp3', 'pipe:1']);
        const chunks = [];
        let size = 0;
        const timeout = setTimeout(() => child.kill(), 15000);
        child.stderr.resume();
        child.stdin.on('error', () => {});
        child.stdout.on('data', chunk => {
            size += chunk.length;
            if (size > 10 * 1024 * 1024) child.kill();
            else chunks.push(chunk);
        });
        child.on('error', () => {
            clearTimeout(timeout);
            reject(new Error('Audio conversion unavailable'));
        });
        child.on('close', code => {
            clearTimeout(timeout);
            const result = Buffer.concat(chunks);
            if (code === 0 && isMedia(result, 'audio')) resolve(result);
            else reject(new Error('Audio conversion failed'));
        });
        child.stdin.end(buffer);
    });
}

async function requestSpeech(text, voice = 'en', http = axios) {
    const answer = cleanAIText(text);
    try {
        const response = await http.get(XMD.API.AI.TEXT2SPEECH(answer), { timeout: 15000 });
        assertSuccess(response.data);
        const voices = response.data?.result?.voices || [];
        const selected = voices.find(item => item.voice_id === voice || item.voice_name === voice) ||
            voices.find(item => item.voice_name === 'Ana(Female)');
        const url = selected?.audio_url || mediaUrl(response.data);
        if (!url) throw new Error('No speech URL');
        return { buffer: await toMp3(await fetchMedia(url, 'audio', http)), text: answer, mimetype: 'audio/mpeg' };
    } catch {
        console.warn('[AI] Keith speech unavailable; trying speech fallback');
    }
    // Google returns native MP3. Split at word boundaries instead of silently
    // truncating the spoken answer to its first 200 characters.
    if (answer.length > 1200) throw new Error('Speech too long; use text response');
    const chunks = answer.match(/.{1,180}(?:\s|$)|\S{1,180}/g) || [answer];
    const buffers = [];
    const language = /^[a-z]{2}(?:-[A-Z]{2})?$/.test(voice) ? voice : 'en';
    for (const chunk of chunks) {
        buffers.push(await fetchMedia(XMD.API.AI.GOOGLE_TTS(chunk.trim(), language), 'audio', http));
    }
    return { buffer: Buffer.concat(buffers), text: answer, mimetype: 'audio/mpeg' };
}

async function requestGeneratedMedia(type, prompt, http = axios) {
    const providers = type === 'image' ? [XMD.API.AI.TEXT2IMAGE, XMD.API.AI.FLUX] : [XMD.API.AI.TEXT2VIDEO];
    for (const provider of providers) {
        try {
            const response = await http.get(provider(prompt), {
                responseType: 'arraybuffer', timeout: 15000, maxContentLength: 25 * 1024 * 1024
            });
            let data = response.data;
            if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
                const buffer = Buffer.from(data);
                if (isMedia(buffer, type)) return { buffer, text: `Generated ${type} for: ${prompt}` };
                data = JSON.parse(buffer.toString('utf8'));
            }
            const url = mediaUrl(data);
            if (!url) throw new Error('No generated media');
            return { buffer: await fetchMedia(url, type, http), url, text: `Generated ${type} for: ${prompt}` };
        } catch {
            console.warn(`[AI] ${type} generation unavailable; trying next option`);
        }
    }
    return null;
}

async function uploadAIImage(buffer, http = axios) {
    const form = new FormData();
    form.append('files[]', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const response = await http.post(XMD.API.EFFECTS.UGUU_UPLOAD, form, {
        headers: form.getHeaders(), timeout: 15000, maxBodyLength: 15 * 1024 * 1024
    });
    const url = response.data?.success && response.data.files?.[0]?.url;
    if (!url) throw new Error('Image upload unavailable');
    return url;
}

module.exports = { requestSpeech, requestGeneratedMedia, uploadAIImage, fetchMedia, isMedia };
