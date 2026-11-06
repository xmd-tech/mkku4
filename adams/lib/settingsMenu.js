const { enabled } = require('./settingsView');
const on = value => enabled(value) ? '✅ ON' : '❌ OFF';
const mode = value => !value || value === 'off' ? '❌ OFF' : `✅ ${value.toUpperCase()}`;
const sessions = new WeakMap();

function displayValue(key, value) {
    if (key === 'url' && typeof value === 'string' && !value.startsWith('http')) {
        return value.startsWith('data:') ? 'Custom uploaded image' : 'Local/default image';
    }
    const text = String(value ?? 'Not set');
    return text.length > 160 ? text.slice(0, 160) + '…' : text;
}

function registerSettingsReply(client, from, original, handler) {
    const emitter = client.ev;
    if (!sessions.has(emitter)) sessions.set(emitter, new Map());
    const active = sessions.get(emitter);
    const owner = original.key?.participant || original.key?.remoteJid || '';
    const key = `${from}:${!!original.key?.fromMe}:${owner}`;
    const previous = active.get(key);
    if (previous) {
        emitter.off('messages.upsert', previous.listener);
        clearTimeout(previous.timer);
    }
    const listener = async update => {
        const message = update.messages?.[0];
        if (!message || !!message.key?.fromMe !== !!original.key?.fromMe) return;
        if (original.key?.participant && message.key?.participant !== original.key.participant) return;
        return handler(update);
    };
    const timer = setTimeout(() => {
        emitter.off('messages.upsert', listener);
        if (active.get(key)?.listener === listener) active.delete(key);
    }, 300000);
    timer.unref();
    active.set(key, { listener, timer });
    emitter.on('messages.upsert', listener);
}

// The same catalog drives numbering, summaries, detail selection and bounds.
const SETTINGS_ITEMS = [
    { label: 'Bot Config', command: 'settings', section: 1, summary: s => `${s.bot.botname} | ${s.bot.mode}` },
    { label: 'Anti-Link', command: 'antilink', section: 2, summary: s => mode(s.group.antilinkStatus) },
    { label: 'Anti-Tag', command: 'antistatusmention', section: 3, summary: s => mode(s.group.antitagStatus) },
    { label: 'Anti-Delete', command: 'antidelete', section: 4, summary: s => `Master: ${on(s.antiDelete.status)}${s.isGroup ? ` | This group: ${on(s.group.antideleteEnabled)}` : ''}` },
    { label: 'Status Anti-Delete', command: 'statusantidelete', section: 5, summary: s => on(s.global.statusAntideleteEnabled) },
    { label: 'Anti-Call', command: 'anticall', section: 6, summary: s => on(s.antiCall.status) },
    { label: 'Group Events', command: 'events', section: 7, summary: s => on(s.events ? s.events.enabled : s.group.eventsEnabled) },
    { label: 'Presence', command: 'presence', section: 8, summary: s => `DM: ${s.presence.privateChat} | Group: ${s.isSubBot ? s.presence.groupChat : s.group.presenceStatus}` },
    { label: 'Auto View Status', command: 'autoviewstatus', section: 9, summary: s => on(s.status.autoviewStatus) },
    { label: 'Auto Reply Status', command: 'autoreplystatus', section: 10, summary: s => on(s.status.autoReplyStatus) },
    {
        label: 'Auto Like / React Status', command: 'autoreactstatus', section: 18,
        summary: s => on(s.status.autoLikeStatus)
    },
    { label: 'Auto Read', command: 'autoread', section: 11, summary: s => on(s.read.status) },
    { label: 'Auto Bio', command: 'autobio', section: 12, summary: s => on(s.bio.status) },
    { label: 'Chatbot (AI)', command: 'chatbot', section: 13, summary: s => on(s.chatbot.status) },
    { label: 'Greet (DM Auto-Reply)', command: 'greet', section: 14, summary: s => on(s.greet.enabled) },
    { label: 'Auto React Messages', command: 'autoreact', section: 15, summary: s => `DM: ${on(s.react.dmStatus)} | Group: ${on(s.group.autoreactEnabled)}` },
    { label: 'Anti-Edit', command: 'antiedit', section: 17, summary: s => `Master: ${on(s.antiEdit.status)}${s.isGroup ? ` | This group: ${on(s.group.antieditEnabled)}` : ''}` },
    { label: 'View Once', command: 'viewonce', section: 19, summary: s => on(s.group.viewonceEnabled) },
    { label: 'Hide View Channel', key: 'hideViewChannel', command: 'hideviewchannel', usage: 'on/off', summary: s => on(s.bot.hideViewChannel) },
    { label: 'Bot Name', key: 'botname', command: 'botname', usage: '<name>' },
    { label: 'Bot Mode', key: 'mode', command: 'mode', usage: 'public/private' },
    { label: 'Device Mode', key: 'deviceMode', command: 'devicemode', usage: 'iphone/android' },
    { label: 'Command Prefix', key: 'prefix', command: 'prefix', usage: '<symbol>' },
    { label: 'Sticker Pack Name', key: 'packname', command: 'packname', usage: '<name>' },
    { label: 'Sticker Author', key: 'author', command: 'author', usage: '<name>', hidden: true },
    { label: 'Timezone', key: 'timezone', command: 'timezone', usage: '<zone>' },
    { label: 'Bot Picture', key: 'url', command: 'botpic', usage: '<image URL> (or reply to an image)' },
    { label: 'Bot Source URL', key: 'gurl', command: 'boturl', usage: '<URL>', hidden: true },
    { label: 'Menu Style', key: 'menuStyle', command: 'menustyle', usage: '1/2/3' },
    { label: 'Session Name', key: 'sessionName', command: 'setvar', usage: 'sessionname=<name>', hidden: true },
    { label: 'Other Commands', commands: ['syncsettings', 'allvar', 'getvar', 'setvar', 'systeminfo'], section: 16, summary: () => 'Variables, reset settings and system info' }
];

function getSettingsItem(number) {
    const item = SETTINGS_ITEMS[number - 1];
    return item && !item.hidden ? item : null;
}

function renderSettingsMenu(state, prefix) {
    return `*⚙️ BWM-XMD SETTINGS*\n━━━━━━━━━━━━━━━━━━\n\n` +
        `_Reply with a listed number to see full details:_\n` +
        `_${state.isGroup ? 'Group values refer to this group' : 'Group values refer to all-group defaults'}._\n\n` +
        SETTINGS_ITEMS.map((item, index) => {
            if (item.hidden) return null;
            const value = item.summary ? item.summary(state) : state.bot[item.key];
            return `*${index + 1}.* ${item.label} — ${displayValue(item.key, value)}` +
                (item.hint ? `\n   ${item.hint(state, prefix)}` : '');
        }).filter(Boolean).join('\n') +
        `\n\n_Use the command prefix to change a setting, e.g. ${prefix}botname My Bot._`;
}

module.exports = { SETTINGS_ITEMS, getSettingsItem, renderSettingsMenu, registerSettingsReply, displayValue, on };
