var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });

const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const util = require("util");
const zlib = require("zlib");
const os = require("os");
const sharp = require('sharp');
const { session } = require('../../config');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { Readable } = require('stream');
ffmpeg.setFfmpegPath(ffmpegPath);

const sessionDir = path.join(__dirname, "..", "..", "session");
const sessionPath = path.join(sessionDir, "creds.json");

async function stickerToImage(webpData, options = {}) {
    try {
        const {
            upscale = true,
            targetSize = 512, 
            framesToProcess = 200
        } = options;

        if (Buffer.isBuffer(webpData)) {
            const sharpInstance = sharp(webpData, {
                sequentialRead: true,
                animated: true,
                limitInputPixels: false,
                pages: framesToProcess 
            });

            const metadata = await sharpInstance.metadata();
            const isAnimated = metadata.pages > 1 || metadata.hasAlpha;

            if (isAnimated) {
                return await sharpInstance
                    .gif({
                        compressionLevel: 0,
                        quality: 100,
                        effort: 1, 
                        loop: 0 
                    })
                    .resize({
                        width: upscale ? targetSize : metadata.width,
                        height: upscale ? targetSize : metadata.height,
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: 'lanczos3' 
                    })
                    .toBuffer();
            } else {
                return await sharpInstance
                    .ensureAlpha()
                    .resize({
                        width: upscale ? targetSize : metadata.width,
                        height: upscale ? targetSize : metadata.height,
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: 'lanczos3'
                    })
                    .png({
                        compressionLevel: 0,
                        quality: 100,
                        progressive: false,
                        palette: true
                    })
                    .toBuffer();
            }
        }
        else if (typeof webpData === 'string') {
            const outputPath = webpData.replace(/\.webp$/, isAnimated ? '.gif' : '.png');
            const sharpInstance = sharp(webpData, {
                sequentialRead: true,
                animated: true,
                limitInputPixels: false,
                pages: framesToProcess
            });

            const metadata = await sharpInstance.metadata();
            const isAnimated = metadata.pages > 1 || metadata.hasAlpha;

            if (isAnimated) {
                await sharpInstance
                    .gif({
                        compressionLevel: 0,
                        quality: 100,
                        effort: 1,
                        loop: 0
                    })
                    .resize({
                        width: upscale ? targetSize : metadata.width,
                        height: upscale ? targetSize : metadata.height,
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: 'lanczos3'
                    })
                    .toFile(outputPath);
            } else {
                await sharpInstance
                    .ensureAlpha()
                    .resize({
                        width: upscale ? targetSize : metadata.width,
                        height: upscale ? targetSize : metadata.height,
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: 'lanczos3'
                    })
                    .png({
                        compressionLevel: 0,
                        quality: 100,
                        progressive: false,
                        palette: true
                    })
                    .toFile(outputPath);
            }

            const imageBuffer = await fs.promises.readFile(outputPath);
            await fs.promises.unlink(outputPath);
            await fs.promises.unlink(webpData); 
            return imageBuffer;
        }
        else {
            throw new Error('Invalid input type for stickerToImage');
        }
    } catch (error) {
        console.error('Error in stickerToImage:', error);
        throw error;
    }
}

async function withTempFiles(inputBuffer, extension, processFn) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempInput = path.join(os.tmpdir(), `bwm_in_${id}`);
  const tempOutput = path.join(os.tmpdir(), `bwm_out_${id}.${extension}`);
  
  try {
    fs.writeFileSync(tempInput, inputBuffer);
    await processFn(tempInput, tempOutput);
    const outputBuffer = fs.readFileSync(tempOutput);
    return outputBuffer;
  } finally {
    try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
    try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
  }
}

async function toAudio(buffer) {
  return withTempFiles(buffer, 'mp3', (input, output) => {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(64)
        .audioChannels(1) 
        .toFormat('mp3')
        .on('error', reject)
        .on('end', resolve)
        .save(output);
    });
  });
}

async function toVideo(buffer) {
  return withTempFiles(buffer, 'mp4', (input, output) => {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=black:s=640x360:r=1') 
        .inputOptions([
          '-f lavfi'
        ])
        .input(input)
        .outputOptions([
          '-shortest',
          '-preset ultrafast',
          '-movflags faststart',
          '-pix_fmt yuv420p'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .toFormat('mp4')
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .on('end', resolve)
        .save(output);
    });
  });
}

async function toPtt(buffer) {
  return withTempFiles(buffer, 'ogg', (input, output) => {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .audioCodec('libopus')
        .audioBitrate(24) 
        .audioChannels(1)
        .audioFrequency(16000) 
        .toFormat('ogg')
        .on('error', reject)
        .on('end', resolve)
        .save(output);
    });
  });
}

async function formatAudio(buffer) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempInput = path.join(os.tmpdir(), `bwm_ain_${id}`);
  const tempOutput = path.join(os.tmpdir(), `bwm_aout_${id}.mp3`);
  const cleanup = () => {
    try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
    try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
  };

  return new Promise((resolve, reject) => {
    fs.writeFileSync(tempInput, buffer);

    ffmpeg()
      .input(tempInput)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .audioChannels(2)
      .outputOptions([
        '-fflags +genpts',
        '-id3v2_version 3',
        '-write_xing 0'
      ])
      .toFormat('mp3')
      .on('error', (err) => {
        cleanup();
        reject(err);
      })
      .on('end', () => {
        try {
          const outputBuffer = fs.readFileSync(tempOutput);
          cleanup();
          resolve(outputBuffer);
        } catch (readErr) {
          cleanup();
          reject(readErr);
        }
      })
      .save(tempOutput);
  });
}

async function formatVideo(buffer) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempInput = path.join(os.tmpdir(), `bwm_vin_${id}`);
  const tempOutput = path.join(os.tmpdir(), `bwm_vout_${id}.mp4`);
  const cleanup = () => {
    try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
    try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
  };

  return new Promise((resolve, reject) => {
    fs.writeFileSync(tempInput, buffer);

    ffmpeg()
      .input(tempInput)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-movflags +faststart',
        '-pix_fmt yuv420p'
      ])
      .size('640x?')
      .toFormat('mp4')
      .on('error', (err) => {
        cleanup();
        reject(err);
      })
      .on('end', () => {
        try {
          const outputBuffer = fs.readFileSync(tempOutput);
          cleanup();
          resolve(outputBuffer);
        } catch (readErr) {
          cleanup();
          reject(readErr);
        }
      })
      .save(tempOutput);
  });
}

function monospace(input) {
    const boldz = {
         'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶',
        'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽',
        'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄',
        'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉',
        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔',
        '7': '𝟕', '8': '𝟖', '9': '𝟗',
        ' ': ' ' 
    };
    return input.split('').map(char => boldz[char] || char).join('');
}

const byteToKB = 1 / 1024;
const byteToMB = byteToKB / 1024;
const byteToGB = byteToMB / 1024;

function formatBytes(bytes) {
  if (bytes >= Math.pow(1024, 3)) {
    return (bytes * byteToGB).toFixed(2) + ' GB';
  } else if (bytes >= Math.pow(1024, 2)) {
    return (bytes * byteToMB).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes * byteToKB).toFixed(2) + ' KB';
  } else {
    return bytes.toFixed(2) + ' bytes';
  }
}

async function loadSession() {
    try {
        if (!session || typeof session !== 'string') {
            if (fs.existsSync(sessionPath)) {
                const _L = require('../logger');
                _L.stopSpinner('Session loaded successfully');
                return;
            }
            throw new Error("SESSION_NOT_FOUND");
        }

        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
        }

        let b64data;
        
        // New XMD format (starts with XMD, no prefix)
        if (session.startsWith('XMDI')) {
            // XMDI format: replace XMDI with H4sI
            b64data = 'H4sI' + session.slice(4);
        }
        else if (session.startsWith('XMDs')) {
            // XMDs format: treat 's' as typo for 'I', replace XMDs with H4sI  
            b64data = 'H4sI' + session.slice(4);
        }
        else if (session.startsWith('XMD')) {
            // XMD format: replace XMD with H4s
            b64data = 'H4s' + session.slice(3);
        }
        // Old format with BWM-XMD;;; prefix
        else if (session.includes(';;;')) {
            const [header, data] = session.split(';;;');
            if (header !== "BWM-XMD" || !data) {
                throw new Error("❌ Invalid session format");
            }
            b64data = data.replace('...', '');
        }
        else {
            throw new Error("❌ Invalid session format. Use XMD... or BWM-XMD;;;...");
        }

        const compressedData = Buffer.from(b64data, 'base64');
        const decompressedData = zlib.gunzipSync(compressedData);

        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        fs.writeFileSync(sessionPath, decompressedData, "utf8");
        const _L2 = require('../logger');
        _L2.stopSpinner('Session loaded successfully');

    } catch (e) {
        const _L3 = require('../logger');
        const chalk = require('chalk');
        _L3.stopSpinner();
        _L3._autoResume = false;
        const red = chalk.hex('#FF3131');
        const yellow = chalk.hex('#FFFF33');
        const cyan = chalk.hex('#00FFFF');
        console.log('');
        console.log(red.bold(' ✖ SESSION ERROR'));
        console.log(red('   ' + e.message));
        console.log('');
        console.log(yellow(' Get session from:'));
        console.log('');
        console.log(cyan.bold.underline(' https://main.bwmxmd.co.ke/scan'));
        console.log('');
        console.log(yellow(' Web server will continue running. Set SESSION env var and restart.'));
        console.log('');
    }
}

const runtime = (seconds) => {
        seconds = Number(seconds)
        var d = Math.floor(seconds / (3600 * 24))
        var h = Math.floor(seconds % (3600 * 24) / 3600)
        var m = Math.floor(seconds % 3600 / 60)
        var s = Math.floor(seconds % 60)
        var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
        var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
        var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
        var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
        return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
}

function bwmRandom(ext) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}_${random}${ext}`;
}

async function bwmFancy(text) {
    return new Promise((resolve, reject) => {
        axios.get('http://qaz.wtf/u/convert.cgi?text='+text)
        .then(({ data }) => {
            let $ = cheerio.load(data)
            let hasil = []
            $('table > tbody > tr').each(function (a, b) {
                hasil.push({ name: $(b).find('td:nth-child(1) > h6 > a').text(), result: $(b).find('td:nth-child(2)').text().trim() })
            }),
            resolve(hasil)
        })
    })
}

const bwmBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: "GET",
            url,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36",
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer',
            timeout: 960000 
        });
        
        if (!res.data || res.data.length === 0) {
            throw new Error("Empty response data");
        }
        
        return res.data;
    } catch (err) {
        console.error("bwmBuffer Error:", err);
        return err;
    }
};

const bwmJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                'Accept': 'application/json'
            },
            ...options,
            timeout: 2400000
        });
        
        if (!res.data) {
            throw new Error("Empty response data");
        }
        
        return res.data;
    } catch (err) {
        console.error("bwmJson Error:", err);
        return err;
    }
};

const latestWaVersion = async () => {
    const get = await bwmJson("https://web.whatsapp.com/check-update?version=1&platform=web");
    const version = [get.currentVersion.replace(/[.]/g, ", ")];
    return version;
};

const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'));
};

const isNumber = (number) => {
    const int = parseInt(number);
    return typeof int === 'number' && !isNaN(int);
};

function verifyJidState(jid) {
    if (!jid.endsWith('@s.whatsapp.net')) {
        console.error('Your verified', jid);
        return false;
    }
    console.log('Welcome to BWM-XMD', jid);
    return true;
}

async function eBase(str = '') {
  return Buffer.from(str).toString('base64');
}

async function dBase(base64Str) {
  return Buffer.from(base64Str, 'base64').toString('utf-8');
}

async function eBinary(str = '') {
  return str.split('').map(char => char.charCodeAt(0).toString(2)).join(' ');
}

async function dBinary(str) {
  let newBin = str.split(" ");
  let binCode = [];
  for (let i = 0; i < newBin.length; i++) {
    binCode.push(String.fromCharCode(parseInt(newBin[i], 2)));
  }
  return binCode.join("");
}

class bwmStore {
    constructor(isSubBot = false) {
        this.messages = new Map();
        this.contacts = new Map();
        this.chats = new Map();
        // RAM optimization: sub-bots use much smaller limits
        this.maxMessages = isSubBot ? 50 : 500;
        this.maxChats = isSubBot ? 25 : 200;
        this.cleanupInterval = setInterval(() => this.cleanup(), isSubBot ? 120000 : 300000);
    }

    loadMessage(jid, id) {
        const chatMessages = this.messages.get(jid);
        return chatMessages?.get(id) || null;
    }

    saveMessage(jid, message) {
        if (!this.messages.has(jid)) {
            this.messages.set(jid, new Map());
        }
        
        const chatMessages = this.messages.get(jid);
        // Don't let an empty/null follow-up update overwrite an already-stored message with real content
        const incomingEmpty = !message.message || Object.keys(message.message).length === 0;
        const existing = chatMessages.get(message.key.id);
        const existingHasContent = existing?.message && Object.keys(existing.message).length > 0;
        if (incomingEmpty && existingHasContent) {
            return;
        }
        chatMessages.set(message.key.id, message);
        
        if (chatMessages.size > this.maxMessages) {
            const firstKey = chatMessages.keys().next().value;
            chatMessages.delete(firstKey);
        }
    }

    cleanup() {
        try {
            if (this.messages.size > this.maxChats) {
                const chatsToDelete = this.messages.size - this.maxChats;
                const oldestChats = Array.from(this.messages.keys()).slice(0, chatsToDelete);
                oldestChats.forEach(jid => this.messages.delete(jid));
            }
        } catch (error) {
            console.error('Store cleanup error:', error);
        }
    }

    bind(ev) {
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                if (msg.key?.remoteJid && msg.key?.id) {
                    this.saveMessage(msg.key.remoteJid, msg);
                }
                if (msg.pushName) {
                    const senderJid = msg.key?.participant || msg.key?.remoteJid;
                    if (senderJid && !senderJid.endsWith('@g.us') && !senderJid.endsWith('@broadcast')) {
                        const existing = this.contacts.get(senderJid) || {};
                        this.contacts.set(senderJid, { ...existing, id: senderJid, notify: msg.pushName, name: msg.pushName });
                        if (msg.key?.participantPn && msg.key.participantPn !== senderJid) {
                            const existingPn = this.contacts.get(msg.key.participantPn) || {};
                            this.contacts.set(msg.key.participantPn, { ...existingPn, id: msg.key.participantPn, notify: msg.pushName, name: msg.pushName });
                        }
                    }
                }
            });
        });

        ev.on('chats.set', ({ chats }) => {
            chats.forEach(chat => {
                this.chats.set(chat.id, chat);
            });
        });

        ev.on('contacts.set', ({ contacts }) => {
            contacts.forEach(contact => {
                this.contacts.set(contact.id, contact);
            });
        });

        // Also capture contacts.upsert events (individual contact updates)
        ev.on('contacts.upsert', (contacts) => {
            contacts.forEach(contact => {
                this.contacts.set(contact.id, contact);
            });
        });

        // Capture group participant info when receiving group metadata
        ev.on('groups.upsert', (groups) => {
            groups.forEach(group => {
                if (group.participants) {
                    group.participants.forEach(p => {
                        if (p.notify) {
                            this.contacts.set(p.id, { id: p.id, notify: p.notify, name: p.notify });
                        }
                    });
                }
            });
        });
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.messages.clear();
        this.contacts.clear();
        this.chats.clear();
    }
}

module.exports = { dBinary, eBinary, dBase, eBase, runtime, sleep, bwmFancy, stickerToImage, toAudio, toVideo, toPtt, formatVideo, formatAudio, monospace, formatBytes, bwmBuffer, bwmJson, latestWaVersion, bwmRandom, isUrl, bwmStore, isNumber, loadSession, verifyJidState };
