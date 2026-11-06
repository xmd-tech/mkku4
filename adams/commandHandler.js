/*Must Run*/

let commands = [];

const tabCmds = [];

// Sudo controls ordinary restricted features, not the process/configuration
// that enforces permissions. This covers every alias of these registrations.
const coreOwnerCommands = new Set([
    'eval', 'exec', 'shell', 'allvar', 'getvar', 'setvar',
    'logout', 'resetdb', 'restart'
]);
const evt = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach((callback) => callback(data));
        }
    },
};


const randomEmojis = [
    "😊", "😎", "🔥", "⭐", "💫", "✨", "🌟", "💥", "🚀", "🎯",
    "💯", "❤️", "💕", "💖", "💝", "🎉", "🎊", "🏆", "👑", "💎",
    "📌", "📍", "🛎️", "🔔", "🎵", "🎶", "📢", "🔊", "👀", "👁️",
    "🧠", "💡", "🔋", "🔌", "💻", "📱", "⌚", "📷", "🎥", "📹",
    "☀️", "🌙", "⭐", "🌟", "🌈", "☁️", "⚡", "🔥", "💧", "🌊",
    "🎮", "👾", "🕹️", "🎲", "♠️", "♥️", "♦️", "♣️", "🃏", "🀄",
    "🏀", "⚽", "🎾", "🏐", "🎱", "⚾", "🏈", "🎯", "🏹", "⛳",
    "🚗", "🚓", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚀", "✈️", "🛩️",
    "🍎", "🍌", "🍇", "🍓", "🍈", "🍒", "🍑", "🍍", "🥭", "🍉",
    "🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🎂", "🍰", "🍦", "🍩"
];


function getRandomEmoji() {
  
    return randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
}


function bwmxmd(obj, functions) {
    let infoComs = obj;

    if (!obj.category) infoComs.category = "General"; 

    
    if (!obj.react && obj.react !== false) infoComs.react = getRandomEmoji();

    if (!obj.dontAddCommandList) infoComs.dontAddCommandList = false; 
    
    const handler = String(infoComs.category).toLowerCase() === 'settings'
        ? async (from, client, context) => {
            // Do not enter any settings handler (or read settings) on an
            // unidentified sender or a merely truthy authorization value.
            if (context.isSuperUser !== true) return context.reply("*Owner only command*");
            if (context.getSettings) {
                context.botSettings = await context.getSettings();
            }
            try {
                return await functions(from, client, context);
            } finally {
                // Every settings entry point (including aliases and setvar) must
                // invalidate listener caches, not just the individual command.
                evt.emit('settings.updated');
                if (context.reloadSettings) await context.reloadSettings();
            }
        }
        : functions;

    const permittedHandler = coreOwnerCommands.has(infoComs.pattern)
        ? async (from, client, context) => {
            if (context.isSuperUser !== true ||
                !['owner', 'developer', 'self', 'connected-account'].includes(context.authorizationRole)) {
                return context.reply("❌ Bot owner/developer only. Sudo cannot execute code or change raw configuration/account state.");
            }
            return handler(from, client, context);
        } : handler;
    infoComs.function = async (from, client, context) => {
        try {
            return await permittedHandler(from, client, context);
        } catch (error) {
            if (error.code === 'PROTECTED_TARGET') return context.reply(error.message);
            throw error;
        }
    };
    const stack = new Error().stack;
   
    const filePath = stack.split('\n')[2].match(/\((.*):\d+:\d+\)/)[1];
   
    infoComs.filename = filePath;

    commands.push(infoComs);
    return infoComs;
}

module.exports = { bwmxmd, commands, evt, getRandomEmoji };

evt.commands = commands;
