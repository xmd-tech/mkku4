const { DataTypes } = require('sequelize');
const { database } = require('../../config'); 
const { findSingleton } = require('./singletonSettings');
const { displaySettings } = require('../lib/responseBranding');

const SettingsDB = database.define('settings', {
    bot_id: {
        type: DataTypes.STRING,
        defaultValue: "main",
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
        type: DataTypes.STRING,
        defaultValue: "./adams/public/bot-image.jpg",
        allowNull: false
    },
    gurl: {
        type: DataTypes.STRING,
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
    sessionName: {
        type: DataTypes.STRING,
        defaultValue: "BWM-XMD",
        allowNull: false
    },
    deviceMode: {
        type: DataTypes.STRING,
        defaultValue: "Android",
        allowNull: false
    },
    menuStyle: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    hideViewChannel: {
        type: DataTypes.STRING,
        defaultValue: "off",
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'bot_settings'
});

async function initSettingsDB() {
    try {
        await SettingsDB.sync({ alter: true });
        console.log('Settings table ready');
    } catch (error) {
        console.error('Error initializing Settings table:', error);
        throw error;
    }
}

async function getSettings(botId = 'main') {
    try {
        let settings = await findSingleton(SettingsDB, { bot_id: botId });
        
        // If no record for this bot_id, try finding one without bot_id (migration)
        if (!settings && botId === 'main') {
            settings = await findSingleton(SettingsDB);
            if (settings && !settings.bot_id) {
                await settings.update({ bot_id: 'main' });
            }
        }
        
        // If still no record exists, create one using env vars as initial defaults ONLY for first time
        if (!settings) {
            settings = await SettingsDB.create({
                bot_id: botId,
                prefix: process.env.PREFIX || ".",
                author: process.env.AUTHOR || "Ibrahim Adams",
                url: process.env.BOT_URL || "./adams/public/bot-image.jpg",
                gurl: process.env.GURL || "https://github.com/Bwmxmdgo/BWM-XMD-GO-V2",
                timezone: process.env.TIMEZONE || "Africa/Nairobi",
                botname: process.env.BOT_NAME || "BWM-XMD",
                packname: process.env.PACKNAME || "BWM-XMD",
                mode: process.env.MODE || "public",
                sessionName: process.env.SESSION_NAME || "BWM-XMD",
                deviceMode: process.env.DEVICE_MODE || "Android"
            });
        }
        
        const dbSettings = settings.toJSON();
        
        // Database values ALWAYS take priority - never fall back to env vars after first creation
        return {
            prefix: dbSettings.prefix || ".",
            author: dbSettings.author || "Ibrahim Adams",
            url: dbSettings.url || "./adams/public/bot-image.jpg",
            gurl: dbSettings.gurl || "https://github.com/Bwmxmdgo/BWM-XMD-GO-V2",
            timezone: dbSettings.timezone || "Africa/Nairobi",
            botname: dbSettings.botname || "BWM-XMD",
            packname: dbSettings.packname || "BWM-XMD",
            mode: dbSettings.mode || "public",
            sessionName: dbSettings.sessionName || "BWM-XMD",
            deviceMode: dbSettings.deviceMode || "Android",
            menuStyle: dbSettings.menuStyle || 1,
            hideViewChannel: dbSettings.hideViewChannel || "off"
        };
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            prefix: ".",
            author: "Ibrahim Adams",
            url: "./adams/public/bot-image.jpg",
            gurl: "https://github.com/Bwmxmdgo/BWM-XMD-GO-V2",
            timezone: "Africa/Nairobi",
            botname: "BWM-XMD",
            packname: "BWM-XMD",
            mode: "public",
            sessionName: "BWM-XMD",
            deviceMode: "Android",
            menuStyle: 1,
            hideViewChannel: "off"
        };
    }
}

// Sync settings from env vars - DEPRECATED: DB settings now always take priority
// Only creates initial settings if none exist, never overwrites existing DB values
async function syncSettingsFromEnv() {
    try {
        let settings = await findSingleton(SettingsDB, { bot_id: 'main' });
        if (!settings) {
            settings = await findSingleton(SettingsDB);
        }
        if (!settings) {
            const updates = {
                bot_id: 'main',
                prefix: process.env.PREFIX || ".",
                author: process.env.AUTHOR || "Ibrahim Adams",
                url: process.env.BOT_URL || "./adams/public/bot-image.jpg",
                gurl: process.env.GURL || "https://github.com/Bwmxmdgo/BWM-XMD-GO-V2",
                timezone: process.env.TIMEZONE || "Africa/Nairobi",
                botname: process.env.BOT_NAME || "BWM-XMD",
                packname: process.env.PACKNAME || "BWM-XMD",
                mode: process.env.MODE || "public",
                sessionName: process.env.SESSION_NAME || "BWM-XMD",
                deviceMode: process.env.DEVICE_MODE || "Android"
            };
            settings = await SettingsDB.create(updates);
            return updates;
        }
        // Settings already exist in DB - return them as-is, never overwrite
        return settings.toJSON();
    } catch (error) {
        console.error('Error syncing settings from env:', error);
        return null;
    }
}

async function updateSettings(updates, botId = 'main') {
    try {
        let settings = await findSingleton(SettingsDB, { bot_id: botId });
        if (!settings) {
            settings = await SettingsDB.create({ bot_id: botId, ...updates });
        } else {
            await settings.update(updates);
        }
        return settings;
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

async function getSetting(key, botId = 'main') {
    try {
        const settings = await getSettings(botId);
        return settings[key];
    } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return null;
    }
}

module.exports = {
    initSettingsDB,
    getSettings: async (...args) => displaySettings(await getSettings(...args)),
    updateSettings,
    getSetting,
    syncSettingsFromEnv,
    SettingsDB
};
