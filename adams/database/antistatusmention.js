const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AntiStatusMentionDB = database.define('antistatusmention', {
    status: {
        type: DataTypes.ENUM('off', 'warn', 'delete', 'remove'),
        defaultValue: 'off',
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('warn', 'delete', 'remove'),
        defaultValue: 'warn',
        allowNull: false
    },
    warn_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    }
}, {
    timestamps: true
});

// Store warn counts in memory
const statusWarnCounts = new Map();

async function initAntiStatusMentionDB() {
    try {
        await AntiStatusMentionDB.sync({ alter: true });
        console.log('AntiStatusMention table ready');
    } catch (error) {
        console.error('Error initializing AntiStatusMention table:', error);
        throw error;
    }
}

async function getAntiStatusMentionSettings() {
    try {
        let settings = await findSingleton(AntiStatusMentionDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.ANTI_TAG;
            const envWarnLimit = process.env.WARN_LIMIT;
            
            let initialStatus = 'off';
            if (envStatus !== undefined) {
                const val = envStatus.toLowerCase();
                if (val === 'on' || val === 'true' || val === 'warn') initialStatus = 'warn';
                else if (val === 'delete') initialStatus = 'delete';
                else if (val === 'remove') initialStatus = 'remove';
            }
            const initialWarnLimit = envWarnLimit ? parseInt(envWarnLimit) || 3 : 3;
            
            settings = await createSingleton(AntiStatusMentionDB, {
                status: initialStatus,
                action: 'warn',
                warn_limit: initialWarnLimit
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status || 'off',
            action: settings.action || 'warn',
            warn_limit: settings.warn_limit || 3
        };
    } catch (error) {
        console.error('Error getting anti-status-mention settings:', error);
        const envStatus = process.env.ANTI_TAG;
        const envWarnLimit = process.env.WARN_LIMIT;
        let status = 'off';
        if (envStatus) {
            const val = envStatus.toLowerCase();
            if (val === 'on' || val === 'true' || val === 'warn') status = 'warn';
            else if (val === 'delete') status = 'delete';
            else if (val === 'remove') status = 'remove';
        }
        return { 
            status, 
            action: 'warn', 
            warn_limit: envWarnLimit ? parseInt(envWarnLimit) || 3 : 3
        };
    }
}

// Sync settings from Heroku env vars
async function syncAntiStatusMentionFromEnv() {
    try {
        const envStatus = process.env.ANTI_TAG;
        const envWarnLimit = process.env.WARN_LIMIT;
        
        let status = 'off';
        if (envStatus !== undefined) {
            const val = envStatus.toLowerCase();
            if (val === 'on' || val === 'true' || val === 'warn') status = 'warn';
            else if (val === 'delete') status = 'delete';
            else if (val === 'remove') status = 'remove';
        }
        const warn_limit = envWarnLimit ? parseInt(envWarnLimit) || 3 : 3;
        
        let settings = await findSingleton(AntiStatusMentionDB);
        if (!settings) {
            settings = await createSingleton(AntiStatusMentionDB, { status, warn_limit });
        } else {
            await settings.update({ status, warn_limit });
        }
        return { status, action: settings.action, warn_limit };
    } catch (error) {
        console.error('Error syncing anti-status-mention from env:', error);
        return null;
    }
}

async function updateAntiStatusMentionSettings(updates) {
    try {
        const settings = await findSingleton(AntiStatusMentionDB) || await createSingleton(AntiStatusMentionDB);
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-status-mention settings:', error);
        throw error;
    }
}

function getStatusWarnCount(userJid) {
    return statusWarnCounts.get(userJid) || 0;
}

function incrementStatusWarnCount(userJid) {
    const current = getStatusWarnCount(userJid);
    statusWarnCounts.set(userJid, current + 1);
    return current + 1;
}

function resetStatusWarnCount(userJid) {
    statusWarnCounts.delete(userJid);
}

function clearAllStatusWarns() {
    statusWarnCounts.clear();
}

module.exports = {
    initAntiStatusMentionDB,
    getAntiStatusMentionSettings,
    updateAntiStatusMentionSettings,
    syncAntiStatusMentionFromEnv,
    getStatusWarnCount,
    incrementStatusWarnCount,
    resetStatusWarnCount,
    clearAllStatusWarns,
    AntiStatusMentionDB
};
