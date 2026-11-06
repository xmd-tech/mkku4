const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AutoBioDB = database.define('autobio', {
    status: {
        type: DataTypes.ENUM('on', 'off'),
        defaultValue: 'off',
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        defaultValue: 'BWM-XMD Always active!',
        allowNull: false
    }
}, {
    timestamps: true
});

async function initAutoBioDB() {
    try {
        await AutoBioDB.sync({ alter: true });
        console.log('AutoBio table ready');
    } catch (error) {
        console.error('Error initializing AutoBio table:', error);
        throw error;
    }
}

async function getAutoBioSettings() {
    try {
        let settings = await findSingleton(AutoBioDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.AUTO_BIO;
            const envMessage = process.env.AUTO_BIO_MSG;
            
            const initialStatus = envStatus !== undefined 
                ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') 
                : 'off';
            
            settings = await createSingleton(AutoBioDB, {
                status: initialStatus,
                message: envMessage || 'BWM-XMD Always active!'
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status || 'off',
            message: settings.message || 'BWM-XMD Always active!'
        };
    } catch (error) {
        console.error('Error getting AutoBio settings:', error);
        const envStatus = process.env.AUTO_BIO;
        const envMessage = process.env.AUTO_BIO_MSG;
        return { 
            status: envStatus ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') : 'off', 
            message: envMessage || 'BWM-XMD Always active!' 
        };
    }
}

// Sync settings from Heroku env vars
async function syncAutoBioFromEnv() {
    try {
        const envStatus = process.env.AUTO_BIO;
        const envMessage = process.env.AUTO_BIO_MSG;
        
        const status = envStatus !== undefined 
            ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') 
            : 'on';
        const message = envMessage || 'BWM-XMD Always active!';
        
        let settings = await findSingleton(AutoBioDB);
        if (!settings) {
            settings = await createSingleton(AutoBioDB, { status, message });
        } else {
            await settings.update({ status, message });
        }
        return { status, message };
    } catch (error) {
        console.error('Error syncing autobio from env:', error);
        return null;
    }
}

async function updateAutoBioSettings(updates) {
    try {
        let settings = await findSingleton(AutoBioDB);
        if (!settings) {
            settings = await createSingleton(AutoBioDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating AutoBio settings:', error);
        throw error;
    }
}

module.exports = {
    initAutoBioDB,
    getAutoBioSettings,
    updateAutoBioSettings,
    syncAutoBioFromEnv,
    AutoBioDB
};
