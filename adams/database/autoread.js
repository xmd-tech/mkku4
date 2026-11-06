const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AutoReadDB = database.define('autoread', {
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    chatTypes: {
        type: DataTypes.JSON,
        defaultValue: ['private', 'group'],
        allowNull: false
    }
}, {
    timestamps: true
});

async function initAutoReadDB() {
    try {
        await AutoReadDB.sync({ alter: true });
        console.log('AutoRead table ready');
    } catch (error) {
        console.error('Error initializing AutoRead table:', error);
        throw error;
    }
}

async function getAutoReadSettings() {
    try {
        let settings = await findSingleton(AutoReadDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.AUTO_READ;
            const initialStatus = envStatus !== undefined 
                ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
                : false;
            
            settings = await createSingleton(AutoReadDB, {
                status: initialStatus,
                chatTypes: ['private', 'group']
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status,
            chatTypes: settings.chatTypes || ['private', 'group']
        };
    } catch (error) {
        console.error('Error getting auto-read settings:', error);
        const envStatus = process.env.AUTO_READ;
        return { 
            status: envStatus ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') : false, 
            chatTypes: ['private', 'group'] 
        };
    }
}

// Sync settings from Heroku env vars
async function syncAutoReadFromEnv() {
    try {
        const envStatus = process.env.AUTO_READ;
        const status = envStatus !== undefined 
            ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
            : false;
        
        let settings = await findSingleton(AutoReadDB);
        if (!settings) {
            settings = await createSingleton(AutoReadDB, { status, chatTypes: ['private', 'group'] });
        } else {
            await settings.update({ status });
        }
        return { status, chatTypes: settings.chatTypes || ['private', 'group'] };
    } catch (error) {
        console.error('Error syncing auto-read from env:', error);
        return null;
    }
}

async function updateAutoReadSettings(updates) {
    try {
        let settings = await findSingleton(AutoReadDB);
        if (!settings) {
            settings = await createSingleton(AutoReadDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating auto-read settings:', error);
        throw error;
    }
}

module.exports = {
    initAutoReadDB,
    getAutoReadSettings,
    updateAutoReadSettings,
    syncAutoReadFromEnv,
    AutoReadDB
};