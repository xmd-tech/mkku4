const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AntiDeleteDB = database.define('antidelete', {
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    notification: {
        type: DataTypes.STRING,
        defaultValue: '🗑️ *BWM-XMD AntiDelete*',
        allowNull: false
    },
    includeGroupInfo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    sendToOwner: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    includeMedia: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    sendToDmChat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    timestamps: true
});

async function initAntiDeleteDB() {
    try {
        await AntiDeleteDB.sync({ alter: true });
        console.log('AntiDelete table ready');
    } catch (error) {
        console.error('Error initializing AntiDelete table:', error);
        throw error;
    }
}

async function getAntiDeleteSettings() {
    try {
        let settings = await findSingleton(AntiDeleteDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.ANTI_DELETE;
            const initialStatus = envStatus !== undefined 
                ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
                : true;
            
            settings = await createSingleton(AntiDeleteDB, {
                status: initialStatus,
                notification: '🗑️ *BWM-XMD AntiDelete*',
                includeGroupInfo: true,
                sendToOwner: true,
                includeMedia: true,
                sendToDmChat: false
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status,
            notification: settings.notification || '🗑️ *BWM-XMD AntiDelete*',
            includeGroupInfo: settings.includeGroupInfo ?? true,
            sendToOwner: settings.sendToOwner ?? true,
            includeMedia: settings.includeMedia ?? true,
            sendToDmChat: settings.sendToDmChat ?? true
        };
    } catch (error) {
        console.error('Error getting anti-delete settings:', error);
        const envStatus = process.env.ANTI_DELETE;
        return { 
            status: envStatus ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') : true, 
            notification: '🗑️ *BWM-XMD AntiDelete*',
            includeGroupInfo: true,
            sendToOwner: true,
            includeMedia: true,
            sendToDmChat: false
        };
    }
}

// Sync settings from Heroku env vars
async function syncAntiDeleteFromEnv() {
    try {
        const envStatus = process.env.ANTI_DELETE;
        const status = envStatus !== undefined 
            ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
            : true;
        
        let settings = await findSingleton(AntiDeleteDB);
        if (!settings) {
            settings = await createSingleton(AntiDeleteDB, { status });
        } else {
            await settings.update({ status });
        }
        return { status, notification: settings.notification, includeGroupInfo: settings.includeGroupInfo, sendToOwner: settings.sendToOwner, includeMedia: settings.includeMedia };
    } catch (error) {
        console.error('Error syncing anti-delete from env:', error);
        return null;
    }
}

async function updateAntiDeleteSettings(updates) {
    try {
        const settings = await findSingleton(AntiDeleteDB) || await createSingleton(AntiDeleteDB);
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-delete settings:', error);
        throw error;
    }
}

module.exports = {
    initAntiDeleteDB,
    getAntiDeleteSettings,
    updateAntiDeleteSettings,
    syncAntiDeleteFromEnv,
    AntiDeleteDB
};
