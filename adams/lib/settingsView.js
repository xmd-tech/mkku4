const enabled = value => value === true || value === 'true' || value === 'on';

function shouldAutoRead(settings, key) {
    if (!enabled(settings.status) || key.fromMe) return false;
    const jid = key.remoteJid || '';
    const type = jid.endsWith('@g.us') ? 'group' :
        jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid') ? 'private' : null;
    const types = settings.chatTypes ||
        (settings.mode === 'all' ? ['private', 'group'] : [settings.mode]);
    return type !== null && types.includes(type);
}

// Read the same storage as the command that owns the setting. In particular,
// never substitute the main bot's auto-status row for a sub-bot's settings.
function createSettingsView(context, main) {
    const view = { ...main, getSettings: context.getSettings || main.getSettings };
    if (!context.isSubBot) return view;

    const read = context.getSettings || (async () => context.botSettings);
    for (const method of ['getGlobalGroupSettings', 'getGroupSettings']) {
        if (!main[method]) continue;
        view[method] = async (...args) => {
            const [group, own] = await Promise.all([main[method](...args), read()]);
            return {
                ...group,
                antilinkStatus: own.antilinkStatus,
                antilinkAction: own.antilinkAction,
                antilinkWarnLimit: own.antilinkWarnLimit,
                eventsEnabled: own.groupEventsEnabled,
                welcomeMessage: own.welcomeMessage,
                goodbyeMessage: own.goodbyeMessage,
                showPromotions: own.showPromotions,
                presenceStatus: own.presenceGroupChat,
                antideleteEnabled: own.antideleteStatus,
                antieditEnabled: own.antieditStatus
            };
        };
    }
    const fields = {
        getAutoStatusSettings: {
            autoviewStatus: 'autoviewStatus', autoLikeStatus: 'autoLikeStatus',
            autoReplyStatus: 'autoReplyStatus', statusReplyText: 'statusReplyText',
            statusLikeEmojis: 'statusLikeEmojis'
        },
        getAntiCallSettings: { status: 'anticallStatus', action: 'anticallAction', message: 'anticallMessage' },
        getGreetSettings: { enabled: 'greetEnabled', message: 'greetMessage' },
        getPresenceSettings: { privateChat: 'presencePrivateChat', groupChat: 'presenceGroupChat' },
        getAntiDeleteSettings: {
            status: 'antideleteStatus', includeGroupInfo: 'antideleteIncludeGroupInfo',
            includeMedia: 'antideleteIncludeMedia', sendToOwner: 'antideleteSendToOwner',
            notification: 'antideleteNotification'
        },
        getAntiEditSettings: {
            status: 'antieditStatus', includeGroupInfo: 'antieditIncludeGroupInfo',
            includeMedia: 'antieditIncludeMedia', sendToOwner: 'antieditSendToOwner',
            sendToDmChat: 'antieditSendToDmChat', notification: 'antieditNotification'
        }
    };
    for (const [method, mapping] of Object.entries(fields)) {
        view[method] = async () => {
            const settings = await read();
            return Object.fromEntries(Object.entries(mapping).map(([key, field]) => [key, settings[field]]));
        };
        view[method.replace(/^get/, 'update')] = async updates => {
            const mapped = {};
            for (const [key, value] of Object.entries(updates)) {
                if (!mapping[key]) throw new Error(`Unsupported sub-bot setting: ${key}`);
                mapped[mapping[key]] = value;
            }
            const saved = await context.updateSubBotSettings(mapped);
            if (!saved) throw new Error('Could not save settings. Please try again.');
            return saved;
        };
    }
    view.getAutoReadSettings = async () => {
        const settings = await read();
        const mode = settings.autoreadMode || 'all';
        return {
            status: enabled(settings.autoreadStatus),
            chatTypes: mode === 'all' ? ['private', 'group'] : mode === 'none' ? [] : [mode]
        };
    };
    view.updateAutoReadSettings = async updates => {
        const mapped = {};
        if ('status' in updates) mapped.autoreadStatus = enabled(updates.status) ? 'on' : 'off';
        if (updates.chatTypes) {
            mapped.autoreadMode = updates.chatTypes.length === 2 ? 'all' : updates.chatTypes[0] || 'none';
        }
        const saved = await context.updateSubBotSettings(mapped);
        if (!saved) throw new Error('Could not save auto-read settings. Please try again.');
        return saved;
    };
    return view;
}

module.exports = { createSettingsView, enabled, shouldAutoRead };
