const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AntiCallDB = database.define('anticall', {
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        defaultValue: 'Call me later 🙏',
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('reject', 'block'),
        defaultValue: 'reject',
        allowNull: false
    }
}, {
    timestamps: true
});

async function initAntiCallDB() {
    try {
        await AntiCallDB.sync({ alter: true });
        console.log('AntiCall table ready');
    } catch (error) {
        console.error('Error initializing AntiCall table:', error);
        throw error;
    }
}

async function getAntiCallSettings() {
    try {
        let settings = await findSingleton(AntiCallDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.ANTI_CALL;
            const envAction = process.env.ANTI_CALL_ACTION;
            const envMessage = process.env.ANTI_CALL_MSG;
            
            const initialStatus = envStatus !== undefined 
                ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
                : false;
            const initialAction = envAction && ['reject', 'block'].includes(envAction.toLowerCase()) 
                ? envAction.toLowerCase() 
                : 'reject';
            const initialMessage = envMessage || 'Call me later 🙏';
            
            settings = await createSingleton(AntiCallDB, {
                status: initialStatus,
                action: initialAction,
                message: initialMessage
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status,
            message: settings.message || 'Call me later 🙏',
            action: settings.action || 'reject'
        };
    } catch (error) {
        console.error('Error getting anti-call settings:', error);
        const envStatus = process.env.ANTI_CALL;
        const envAction = process.env.ANTI_CALL_ACTION;
        const envMessage = process.env.ANTI_CALL_MSG;
        return { 
            status: envStatus ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') : false, 
            message: envMessage || 'Call me later 🙏', 
            action: envAction && ['reject', 'block'].includes(envAction.toLowerCase()) ? envAction.toLowerCase() : 'reject' 
        };
    }
}

// Sync settings from Heroku env vars (resets database to env values)
async function syncAntiCallFromEnv() {
    try {
        const envStatus = process.env.ANTI_CALL;
        const envAction = process.env.ANTI_CALL_ACTION;
        const envMessage = process.env.ANTI_CALL_MSG;
        
        const status = envStatus !== undefined 
            ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
            : false;
        const action = envAction && ['reject', 'block'].includes(envAction.toLowerCase()) 
            ? envAction.toLowerCase() 
            : 'reject';
        const message = envMessage || 'Call me later 🙏';
        
        let settings = await findSingleton(AntiCallDB);
        if (!settings) {
            settings = await createSingleton(AntiCallDB, { status, action, message });
        } else {
            await settings.update({ status, action, message });
        }
        return { status, action, message };
    } catch (error) {
        console.error('Error syncing anti-call from env:', error);
        return null;
    }
}

async function updateAntiCallSettings(updates) {
    try {
        let settings = await findSingleton(AntiCallDB);
        if (!settings) {
            settings = await createSingleton(AntiCallDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-call settings:', error);
        throw error;
    }
}

module.exports = {
    initAntiCallDB,
    getAntiCallSettings,
    updateAntiCallSettings,
    syncAntiCallFromEnv,
    AntiCallDB
};
