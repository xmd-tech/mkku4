const { randomBytes } = require('node:crypto');
const { accountJid, phoneJid } = require('./authorization');

const STATUS_JID = 'status@broadcast';
const DAY = 24 * 60 * 60 * 1000;
const enabled = value => value === true || value === 'true' || value === 'on';

function describeStatusError(error) {
    const code = error?.output?.statusCode || error?.statusCode || error?.code || 'SEND_FAILED';
    const message = error?.message || (typeof error === 'string' ? error : 'Unknown send error');
    const location = typeof error?.stack === 'string' ? error.stack.split('\n')[1]?.trim() : '';
    return `${code}: ${message}${location ? ` (${location})` : ''}`
        .replace(/https?:\/\/[^\s)]+/gi, '[url]')
        .replace(/\b\d+(?::\d+)?@(?:s\.whatsapp\.net|c\.us|lid)\b/g, '[account]')
        .replace(/\b\d{5,}\b/g, '[number]')
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 300);
}

function statusPayload(message) {
    for (let depth = 0; message && depth < 5; depth++) {
        const wrapped = message.ephemeralMessage || message.viewOnceMessage || message.viewOnceMessageV2;
        if (!wrapped) break;
        message = wrapped.message;
    }
    const control = new Set(['protocolMessage', 'reactionMessage', 'senderKeyDistributionMessage', 'messageContextInfo']);
    return message && Object.entries(message).some(([type, value]) => value != null && !control.has(type));
}

// One queue per socket. Completed reactions can be shared across reconnects;
// failed sends are never marked complete and may be retried on redelivery.
function createStatusReactor(client, {
    getSettings, state = new Map(),
    now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    random = Math.random, onError = () => {},
    minInterval = 2000, maxPerMinute = 15, maxAttempts = 3, ackTimeout = 15000
}) {
    const pending = new Map();
    const acknowledgements = new Map();
    const sentAt = [];
    let tail = Promise.resolve();
    let stopped = false;
    let lastAttempt = null;

    // Baileys resolves sendMessage after writing the stanza, BEFORE WhatsApp
    // acknowledges it. A returned message alone is not proof of acceptance.
    const canObserveAcks = typeof client.ws?.on === 'function';
    function handleAck({ attrs = {} } = {}) {
        const waiter = acknowledgements.get(attrs.id);
        if (!waiter) return;
        const code = Number(attrs.error || 0);
        if (code) {
            waiter.reject(Object.assign(new Error(`WhatsApp rejected the status reaction (${code})`), {
                code: `STATUS_ACK_${code}`, statusCode: code
            }));
        } else {
            waiter.resolve();
        }
    }
    if (canObserveAcks) client.ws.on('CB:ack,class:message', handleAck);

    function expectAck(id) {
        if (!canObserveAcks) return { promise: Promise.resolve(), cancel() {} };
        let timer;
        const promise = new Promise((resolve, reject) => {
            const finish = fn => value => {
                clearTimeout(timer);
                acknowledgements.delete(id);
                fn(value);
            };
            const waiter = { resolve: finish(resolve), reject: finish(reject) };
            acknowledgements.set(id, waiter);
            timer = setTimeout(() => waiter.reject(Object.assign(
                new Error('WhatsApp did not acknowledge the status reaction in time'),
                { code: 'STATUS_ACK_TIMEOUT' }
            )), ackTimeout);
        });
        // A rejection can arrive before sendMessage itself has returned.
        promise.catch(() => {});
        return { promise, cancel() { clearTimeout(timer); acknowledgements.delete(id); } };
    }

    function prune() {
        for (const [id, record] of state) {
            if (!pending.has(id) && (record.expires <= now() || state.size > 2000)) state.delete(id);
        }
    }

    async function pace() {
        while (!stopped) {
            while (sentAt.length && now() - sentAt[0] >= 60000) sentAt.shift();
            const wait = Math.max(
                0,
                lastAttempt === null ? 0 : lastAttempt + minInterval - now(),
                sentAt.length >= maxPerMinute ? sentAt[0] + 60000 - now() : 0
            );
            if (!wait) return;
            await sleep(wait);
        }
    }

    async function refreshSessions(target, self) {
        if (typeof client.getUSyncDevices !== 'function' || typeof client.assertSessions !== 'function') return;
        // This fork builds status participant nodes with PN addresses. Only
        // request sessions for known PNs, never reinterpret LID digits as PNs.
        const recipients = [...new Set([phoneJid(target), phoneJid(self)].filter(Boolean))];
        const users = new Set(recipients.map(jid => jid.split('@')[0]));
        const devices = await client.getUSyncDevices(recipients, false, false);
        const jids = devices.filter(({ user }) => users.has(user)).map(({ user, device }) =>
            `${user}${device ? `:${device}` : ''}@s.whatsapp.net`
        );
        if (jids.length) await client.assertSessions([...new Set(jids)], true);
    }

    async function react(key, author, recipient, record) {
        if (stopped || record.done || record.expires <= now()) return;
        let settings;
        try {
            settings = await getSettings();
        } catch (error) {
            onError(error, 'settings');
            return;
        }
        if (!enabled(settings.autoLikeStatus)) return;
        const own = accountJid(client.user?.id) || accountJid(client.user?.lid);
        const ownLid = accountJid(client.user?.lid);
        if (author === own || author === ownLid || recipient === own) return;

        for (let attempt = 1; attempt <= maxAttempts && !stopped; attempt++) {
            let acknowledgement;
            let target = recipient;
            try {
                await pace();
                if (stopped || record.expires <= now()) return;
                // Turning the setting off also cancels work already queued.
                settings = await getSettings();
                if (!enabled(settings.autoLikeStatus)) return;
                const self = accountJid(client.user?.id) || accountJid(client.user?.lid);
                if (!self) throw Object.assign(new Error('Bot not ready'), { code: 'BOT_NOT_READY' });
                // Status broadcasts can put the author's PN in remoteJidAlt,
                // rather than participantAlt. If absent, use a verified local
                // LID mapping for delivery only; never rewrite the reaction key.
                if (target.endsWith('@lid')) {
                    target = phoneJid(await client.signalRepository?.lidMapping?.getPNForLID?.(target)) || target;
                }
                const emojis = String(settings.statusLikeEmojis || '👍')
                    .split(',').map(emoji => emoji.trim()).filter(Boolean);
                if (!record.emoji) record.emoji = emojis[Math.floor(random() * emojis.length)] || '👍';
                lastAttempt = now();
                sentAt.push(lastAttempt);
                acknowledgement = expectAck(record.messageId);
                const result = await client.sendMessage(STATUS_JID, {
                    react: { key: { ...key }, text: record.emoji }
                }, {
                    statusJidList: [...new Set([target, self])],
                    messageId: record.messageId
                });
                if (!result) throw Object.assign(new Error('Empty send result'), { code: 'EMPTY_SEND_RESULT' });
                await acknowledgement.promise;
                record.done = true;
                return;
            } catch (error) {
                if (stopped) return;
                // Cancel this attempt's waiter before repairing/retrying.
                acknowledgement?.cancel();
                const code = Number(error.output?.statusCode || error.statusCode);
                if ([400, 401, 403, 404, 405, 410, 422].includes(code) || attempt === maxAttempts) {
                    onError(error, 'reaction');
                    return;
                }
                if (/no (?:open )?sessions?/i.test(error.message || '')) {
                    try {
                        await refreshSessions(target, accountJid(client.user?.id));
                    } catch (refreshError) {
                        onError(refreshError, 'session refresh');
                    }
                }
                await sleep(attempt * 1000);
            } finally {
                acknowledgement?.cancel();
            }
        }
    }

    function handleUpsert({ messages = [] } = {}) {
        if (stopped) return Promise.resolve();
        prune();
        const jobs = [];
        for (const msg of messages) {
            if (msg?.key?.remoteJid !== STATUS_JID || msg.key.fromMe || !msg.key.id) continue;
            if (!statusPayload(msg.message)) continue;
            const rawAuthor = msg.key.participant || msg.participant || msg.key.participantPn;
            const author = accountJid(rawAuthor);
            if (!author) continue;
            const timestamp = Number(msg.messageTimestamp || 0) * 1000;
            const expires = timestamp > 0 ? timestamp + DAY : now() + DAY;
            if (expires <= now()) continue;
            const id = JSON.stringify([author, msg.key.id]);
            if (pending.has(id)) {
                jobs.push(pending.get(id));
                continue;
            }
            let record = state.get(id);
            if (record?.done) continue;
            if (!record) {
                record = { expires, done: false, messageId: randomBytes(16).toString('hex').toUpperCase() };
                state.set(id, record);
            }
            // Alternate PN fields may help encryption/routing, but never
            // replace the original participant in the status reaction key.
            const recipient = phoneJid(msg.key.participantPn) ||
                phoneJid(msg.key.participantAlt) || phoneJid(msg.key.remoteJidAlt) ||
                phoneJid(msg.key.senderPn) || author;
            const key = { ...msg.key };
            if (!key.participant) key.participant = rawAuthor;
            const job = tail.catch(() => {}).then(() => react(key, author, recipient, record))
                .finally(() => { pending.delete(id); prune(); });
            pending.set(id, job);
            tail = job;
            jobs.push(job);
        }
        return Promise.allSettled(jobs);
    }

    return {
        handleUpsert,
        stop() {
            stopped = true;
            if (typeof client.ws?.off === 'function') client.ws.off('CB:ack,class:message', handleAck);
            else client.ws?.removeListener?.('CB:ack,class:message', handleAck);
            for (const waiter of [...acknowledgements.values()]) {
                waiter.reject(Object.assign(new Error('Socket disconnected'), { code: 'STATUS_STOPPED' }));
            }
        }
    };
}

module.exports = { createStatusReactor, describeStatusError };
