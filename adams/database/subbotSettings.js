const { DataTypes } = require('sequelize');
const { displaySettings } = require('../lib/responseBranding');
const { database } = require('../../config');
const { getSettings } = require('./settings');

const SubBotSettingsDB = database.define('subbot_settings', {
    botId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    prefix: {
        type: DataTypes.STRING,
        defaultValue: ".",
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        defaultValue: "Ibrahim Adams",
        allowNull: false
    },
    url: {
        type: DataTypes.TEXT,
        defaultValue: "./adams/public/bot-image.jpg",
        allowNull: false
    },
    gurl: {
        type: DataTypes.TEXT,
        defaultValue: "https://github.com/Bwmxmdgo/BWM-XMD-GO-V2",
        allowNull: false
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: "Africa/Nairobi",
        allowNull: false
    },
    botname: {
        type: DataTypes.STRING,
        defaultValue: "BWM-XMD",
        allowNull: false
    },
    packname: {
        type: DataTypes.STRING,
        defaultValue: "BWM-XMD",
        allowNull: false
    },
    mode: {
        type: DataTypes.STRING,
        defaultValue: "public",
        allowNull: false
    },
    deviceMode: {
        type: DataTypes.STRING,
        defaultValue: "Android",
        allowNull: false
    },
    sessionName: {
        type: DataTypes.STRING,
        defaultValue: "BWM-XMD",
        allowNull: false
    },
    // Antilink settings
    antilinkStatus: {
        type: DataTypes.STRING,
        defaultValue: "off",
        allowNull: false
    },
    antilinkAction: {
        type: DataTypes.STRING,
        defaultValue: "delete",
        allowNull: false
    },
    antilinkWarnLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    // Greet settings
    greetEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    greetMessage: {
        type: DataTypes.TEXT,
        defaultValue: "Hello @user! Thanks for messaging.",
        allowNull: false
    },
    // Presence settings
    presencePrivateChat: {
        type: DataTypes.STRING,
        defaultValue: "off",
        allowNull: false
    },
    presenceGroupChat: {
        type: DataTypes.STRING,
        defaultValue: "off",
        allowNull: false
    },
    // Auto status settings
    autoviewStatus: {
        type: DataTypes.STRING,
        defaultValue: "false",
        allowNull: false
    },
    autoLikeStatus: {
        type: DataTypes.STRING,
        defaultValue: "false",
        allowNull: false
    },
    autoReplyStatus: {
        type: DataTypes.STRING,
        defaultValue: "false",
        allowNull: false
    },
    statusLikeEmojis: {
        type: DataTypes.STRING,
        defaultValue: "❤️,😍,🔥,👏,😂",
        allowNull: false
    },
    statusReplyText: {
        type: DataTypes.TEXT,
        defaultValue: "Nice status!",
        allowNull: false
    },
    // Anti-edit settings
    antieditStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antieditIncludeGroupInfo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antieditIncludeMedia: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antieditSendToOwner: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antieditSendToDmChat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antieditNotification: {
        type: DataTypes.TEXT,
        defaultValue: '📝 *Message Edited*',
        allowNull: false
    },
    // Anti-delete settings
    antideleteStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antideleteIncludeGroupInfo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antideleteIncludeMedia: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antideleteSendToOwner: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antideleteNotification: {
        type: DataTypes.TEXT,
        defaultValue: "🗑️ *Message Deleted*",
        allowNull: false
    },
    // Auto-read settings
    autoreadStatus: {
        type: DataTypes.STRING,
        defaultValue: "off",
        allowNull: false
    },
    autoreadMode: {
        type: DataTypes.STRING,
        defaultValue: "all",
        allowNull: false
    },
    // AntiCall settings
    anticallStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    anticallAction: {
        type: DataTypes.STRING,
        defaultValue: "reject",
        allowNull: false
    },
    anticallMessage: {
        type: DataTypes.TEXT,
        defaultValue: "⚠️ *Calls are not allowed!*\n\nPlease send a message instead.",
        allowNull: false
    },
    // Group Events settings
    groupEventsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    welcomeMessage: {
        type: DataTypes.TEXT,
        defaultValue: "👋 Welcome @user to {group}!\n\nYou are member number {count}.\n\n📝 Description: {desc}",
        allowNull: false
    },
    goodbyeMessage: {
        type: DataTypes.TEXT,
        defaultValue: "👋 Goodbye @user!\n\nWe now have {count} members.",
        allowNull: false
    },
    showPromotions: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    menuStyle: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    hideViewChannel: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'subbot_settings'
});

async function initSubBotSettingsDB() {
    try {
        await SubBotSettingsDB.sync({ alter: true });
        console.log('SubBot Settings table ready');
    } catch (error) {
        console.error('Error initializing SubBot Settings table:', error);
        throw error;
    }
}

async function getSubBotSettings(botId) {
    try {
        let settings = await SubBotSettingsDB.findByPk(botId);
        if (!settings) {
            const mainSettings = await getSettings();
            settings = await SubBotSettingsDB.create({
                botId,
                prefix: mainSettings.prefix || '.',
                author: mainSettings.author || 'Ibrahim Adams',
                url: mainSettings.url || './adams/public/bot-image.jpg',
                gurl: mainSettings.gurl || 'https://github.com/Bwmxmdgo/BWM-XMD-GO-V2',
                timezone: mainSettings.timezone || 'Africa/Nairobi',
                botname: mainSettings.botname || 'BWM-XMD',
                packname: mainSettings.packname || 'BWM-XMD',
                mode: mainSettings.mode || 'public',
                deviceMode: mainSettings.deviceMode || 'Android',
                sessionName: mainSettings.sessionName || 'BWM-XMD'
            });
        }
        return settings.toJSON();
    } catch (error) {
        console.error('Error getting sub-bot settings:', error);
        const mainSettings = await getSettings();
        return { botId, ...mainSettings };
    }
}

async function updateSubBotSettings(botId, newSettings) {
    try {
        let settings = await SubBotSettingsDB.findByPk(botId);
        if (!settings) {
            const mainSettings = await getSettings();
            settings = await SubBotSettingsDB.create({
                botId,
                prefix: mainSettings.prefix || '.',
                author: mainSettings.author || 'Ibrahim Adams',
                url: mainSettings.url || './adams/public/bot-image.jpg',
                gurl: mainSettings.gurl || 'https://github.com/Bwmxmdgo/BWM-XMD-GO-V2',
                timezone: mainSettings.timezone || 'Africa/Nairobi',
                botname: mainSettings.botname || 'BWM-XMD',
                packname: mainSettings.packname || 'BWM-XMD',
                mode: mainSettings.mode || 'public',
                deviceMode: mainSettings.deviceMode || 'Android',
                sessionName: mainSettings.sessionName || 'BWM-XMD'
            });
        }
        
        await settings.update(newSettings);
        return settings.toJSON();
    } catch (error) {
        console.error('Error updating sub-bot settings:', error);
        throw error;
    }
}

async function deleteSubBotSettings(botId) {
    try {
        await SubBotSettingsDB.destroy({ where: { botId } });
        return true;
    } catch (error) {
        console.error('Error deleting sub-bot settings:', error);
        return false;
    }
}

// Helper functions to get specific listener settings for sub-bots
function getSubBotAntiLinkSettings(settings) {
    return {
        status: settings.antilinkStatus || 'off',
        action: settings.antilinkAction || 'delete',
        warn_limit: settings.antilinkWarnLimit || 3
    };
}

function getSubBotGreetSettings(settings) {
    return {
        enabled: settings.greetEnabled || false,
        message: settings.greetMessage || 'Hello @user! Thanks for messaging.'
    };
}

function getSubBotPresenceSettings(settings) {
    return {
        privateChat: settings.presencePrivateChat || 'off',
        groupChat: settings.presenceGroupChat || 'off'
    };
}

function getSubBotAutoStatusSettings(settings) {
    return {
        autoviewStatus: settings.autoviewStatus || 'false',
        autoLikeStatus: settings.autoLikeStatus || 'false',
        autoReplyStatus: settings.autoReplyStatus || 'false',
        statusLikeEmojis: settings.statusLikeEmojis || '❤️,😍,🔥,👏,😂',
        statusReplyText: settings.statusReplyText || 'Nice status!'
    };
}

function getSubBotAntiDeleteSettings(settings) {
    return {
        status: settings.antideleteStatus || false,
        includeGroupInfo: settings.antideleteIncludeGroupInfo !== false,
        includeMedia: settings.antideleteIncludeMedia !== false,
        sendToOwner: settings.antideleteSendToOwner !== false,
        notification: settings.antideleteNotification || '🗑️ *Message Deleted*'
    };
}

function getSubBotAntiEditSettings(settings) {
    return {
        status: settings.antieditStatus || false,
        includeGroupInfo: settings.antieditIncludeGroupInfo !== false,
        includeMedia: settings.antieditIncludeMedia !== false,
        sendToOwner: settings.antieditSendToOwner !== false,
        sendToDmChat: settings.antieditSendToDmChat === true,
        notification: settings.antieditNotification || '📝 *Message Edited*'
    };
}

function getSubBotAutoReadSettings(settings) {
    return {
        status: settings.autoreadStatus || 'off',
        mode: settings.autoreadMode || 'all'
    };
}

function getSubBotAntiCallSettings(settings) {
    return {
        status: settings.anticallStatus || false,
        action: settings.anticallAction || 'reject',
        message: settings.anticallMessage || '⚠️ *Calls are not allowed!*\n\nPlease send a message instead.'
    };
}

function getSubBotGroupEventsSettings(settings) {
    return {
        enabled: settings.groupEventsEnabled || false,
        welcomeMessage: settings.welcomeMessage || '👋 Welcome @user to {group}!\n\nYou are member number {count}.\n\n📝 Description: {desc}',
        goodbyeMessage: settings.goodbyeMessage || '👋 Goodbye @user!\n\nWe now have {count} members.',
        showPromotions: settings.showPromotions !== false
    };
}

module.exports = {
    SubBotSettingsDB,
    initSubBotSettingsDB,
    getSubBotSettings: async (...args) => displaySettings(await getSubBotSettings(...args)),
    updateSubBotSettings,
    deleteSubBotSettings,
    getSubBotAntiLinkSettings,
    getSubBotGreetSettings,
    getSubBotPresenceSettings,
    getSubBotAutoStatusSettings,
    getSubBotAntiDeleteSettings,
    getSubBotAntiEditSettings,
    getSubBotAutoReadSettings,
    getSubBotAntiCallSettings,
    getSubBotGroupEventsSettings
};
