const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const nCyan = chalk.hex('#00FFFF');
const nMagenta = chalk.hex('#FF00FF');
const nGreen = chalk.hex('#39FF14');
const nPink = chalk.hex('#FF6EC7');
const nBlue = chalk.hex('#00BFFF');
const nPurple = chalk.hex('#BF40FF');
const nOrange = chalk.hex('#FF6600');
const nRed = chalk.hex('#FF3131');
const nYellow = chalk.hex('#FFFF33');
const nWhite = chalk.hex('#F0F0F0');

const dim = chalk.dim;
const divider = () => nPurple('  ═══════════════════════════════════');
const miniDiv = () => nPurple('  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Single unified live log — tailed by the workflow so output is always visible
const liveLogFile = path.join(logsDir, 'live.log');

function live(line) {
    try {
        fs.appendFileSync(liveLogFile, line + '\n');
    } catch (_) {}
}

function timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function typeLabel(mtype) {
    if (!mtype) return 'Message';
    if (mtype.includes('image')) return 'Image';
    if (mtype.includes('video')) return 'Video';
    if (mtype.includes('audio')) return 'Audio';
    if (mtype.includes('sticker')) return 'Sticker';
    if (mtype.includes('document')) return 'Document';
    if (mtype.includes('contact')) return 'Contact';
    if (mtype.includes('location')) return 'Location';
    if (mtype.includes('reaction')) return 'Reaction';
    if (mtype.includes('poll')) return 'Poll';
    if (mtype.includes('extendedText')) return 'Text';
    if (mtype.includes('conversation')) return 'Text';
    return 'Message';
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

class BwmLogger {
    static setClientInstance(clientInstance) {
        this.client = clientInstance;
    }

    static _clearSpinner() {}
    static _resumeSpinner() {}
    static startSpinner(message) {
        if (message) live(`[${timestamp()}] ... ${message}`);
    }
    static stopSpinner(doneMessage) {
        if (doneMessage) live(`[${timestamp()}] ✔  ${doneMessage}`);
    }

    static async logMessage(m) {
        try {
            if (!this.client) return;

            const isGroup = m.isGroup;
            const isBroadcast = m.isBroadcast || false;
            const isFromMe = m.fromMe || false;

            if (isBroadcast) return;
            if (!isFromMe) return;

            const messageType = m.mtype || 'Unknown';
            const text = m.text || '';
            const remoteJid = m.remoteJid || '';

            const type = typeLabel(messageType);

            let target = '';
            if (isGroup && remoteJid) {
                try {
                    const meta = await this.client.groupMetadata(remoteJid).catch(() => null);
                    target = meta?.subject || 'Group';
                } catch (e) {
                    target = 'Group';
                }
            } else if (remoteJid) {
                target = remoteJid.split('@')[0];
            }

            const preview = truncate(text, 40);
            const loc = isGroup ? `GROUP:${truncate(target,20)}` : `DM:${truncate(target,20)}`;
            live(`[${timestamp()}] SENT  ${loc}  |  ${type}${preview ? '  |  ' + preview : ''}`);

            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(logsDir, `messages_${today}.log`);
            const logEntry = `[${new Date().toISOString()}] SENT ${loc} | ${messageType} | ${text}\n`;
            fs.appendFileSync(logFile, logEntry);

        } catch (error) {}
    }

    static error(message, error) {
        const detail = error ? ` — ${error.message || error}` : '';
        live(`[${timestamp()}] ERROR  ${message}${detail}`);

        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `errors_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [ERROR] ${message}\n${error ? (error.stack || error.message || '') : ''}\n`;
        fs.appendFileSync(logFile, logEntry);
    }

    static success(message) {
        live(`[${timestamp()}] ✔  ${message}`);

        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `success_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [SUCCESS] ${message}\n`;
        fs.appendFileSync(logFile, logEntry);
    }

    static warning(message) {
        live(`[${timestamp()}] WARN   ${message}`);

        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `warnings_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [WARNING] ${message}\n`;
        fs.appendFileSync(logFile, logEntry);
    }

    static info(message) {
        live(`[${timestamp()}] INFO   ${message}`);

        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `info_${today}.log`);
        const logEntry = `[${new Date().toISOString()}] [INFO] ${message}\n`;
        fs.appendFileSync(logFile, logEntry);
    }

    static connection(status, detail) {
        live(`[${timestamp()}] CONN   [${status.toUpperCase()}] ${detail}`);
    }

    static db(message) {
        live(`[${timestamp()}] DB     ${message}`);
    }

    static plugin(message) {
        live(`[${timestamp()}] PLUGIN ${message}`);
    }

    static incoming(text, sender, isCmd) {
        const kind = isCmd ? 'CMD' : 'MSG';
        live(`[${timestamp()}] ${kind}    ${truncate(sender,20)}  →  ${truncate(text,50)}`);
    }

    static cmdDone(cmd) {
        live(`[${timestamp()}] DONE   ${cmd}`);
    }

    static typing(message) {
        live(`[${timestamp()}] ▸  ${message}`);
        return Promise.resolve();
    }
}

module.exports = BwmLogger;
