const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const PresenceDB = database.define('presence', {
    privateChat: {
        type: DataTypes.STRING,
        defaultValue: 'off',
        allowNull: false,
        validate: {
            isIn: [['off', 'online', 'typing', 'recording']]
        }
    },
    groupChat: {
        type: DataTypes.STRING,
        defaultValue: 'off',
        allowNull: false,
        validate: {
            isIn: [['off', 'online', 'typing', 'recording']]
        }
    }
}, {
    timestamps: true
});

async function initPresenceDB() {
    try {
        await PresenceDB.sync({ alter: true });
        console.log('Presence table ready');
    } catch (error) {
        console.error('Error initializing Presence table:', error);
        throw error;
    }
}

async function getPresenceSettings() {
    try {
        let settings = await findSingleton(PresenceDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envPrivate = process.env.PRESENCE_PRIVATE;
            const envGroup = process.env.PRESENCE_GROUP;
            
            const privateChat = envPrivate && ['off', 'online', 'typing', 'recording'].includes(envPrivate.toLowerCase()) 
                ? envPrivate.toLowerCase() : 'off';
            const groupChat = envGroup && ['off', 'online', 'typing', 'recording'].includes(envGroup.toLowerCase()) 
                ? envGroup.toLowerCase() : 'off';
            
            settings = await createSingleton(PresenceDB, { privateChat, groupChat });
        }
        
        // Database values take priority (commands override env vars)
        return { 
            privateChat: settings.privateChat || 'off', 
            groupChat: settings.groupChat || 'off' 
        };
    } catch (error) {
        console.error('Error getting presence settings:', error);
        const envPrivate = process.env.PRESENCE_PRIVATE;
        const envGroup = process.env.PRESENCE_GROUP;
        return { 
            privateChat: envPrivate && ['off', 'online', 'typing', 'recording'].includes(envPrivate.toLowerCase()) ? envPrivate.toLowerCase() : 'off', 
            groupChat: envGroup && ['off', 'online', 'typing', 'recording'].includes(envGroup.toLowerCase()) ? envGroup.toLowerCase() : 'off' 
        };
    }
}

// Sync settings from Heroku env vars
async function syncPresenceFromEnv() {
    try {
        const envPrivate = process.env.PRESENCE_PRIVATE;
        const envGroup = process.env.PRESENCE_GROUP;
        
        const privateChat = envPrivate && ['off', 'online', 'typing', 'recording'].includes(envPrivate.toLowerCase()) 
            ? envPrivate.toLowerCase() : 'off';
        const groupChat = envGroup && ['off', 'online', 'typing', 'recording'].includes(envGroup.toLowerCase()) 
            ? envGroup.toLowerCase() : 'off';
        
        let settings = await findSingleton(PresenceDB);
        if (!settings) {
            settings = await createSingleton(PresenceDB, { privateChat, groupChat });
        } else {
            await settings.update({ privateChat, groupChat });
        }
        return { privateChat, groupChat };
    } catch (error) {
        console.error('Error syncing presence from env:', error);
        return null;
    }
}

async function updatePresenceSettings(updates) {
    try {
        let settings = await findSingleton(PresenceDB);
        if (!settings) {
            settings = await createSingleton(PresenceDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating presence settings:', error);
        throw error;
    }
}

module.exports = {
    initPresenceDB,
    getPresenceSettings,
    updatePresenceSettings,
    syncPresenceFromEnv,
    PresenceDB
};