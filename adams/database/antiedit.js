const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AntiEditDB = database.define('antiedit', {
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    notification: {
        type: DataTypes.STRING,
        defaultValue: '📝 *BWM-XMD AntiEdit*',
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

async function initAntiEditDB() {
    try {
        await AntiEditDB.sync({ alter: true });
        console.log('AntiEdit table ready');
    } catch (error) {
        console.error('Error initializing AntiEdit table:', error);
        throw error;
    }
}

async function getAntiEditSettings() {
    try {
        let settings = await findSingleton(AntiEditDB);

        if (!settings) {
            const envStatus = process.env.ANTI_EDIT;
            const initialStatus = envStatus !== undefined
                ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
                : true;

            settings = await createSingleton(AntiEditDB, {
                status: initialStatus,
                notification: '📝 *BWM-XMD AntiEdit*',
                includeGroupInfo: true,
                sendToOwner: true,
                includeMedia: true,
                sendToDmChat: false
            });
        }

        return {
            status: settings.status,
            notification: settings.notification || '📝 *BWM-XMD AntiEdit*',
            includeGroupInfo: settings.includeGroupInfo ?? true,
            sendToOwner: settings.sendToOwner ?? true,
            includeMedia: settings.includeMedia ?? true,
            sendToDmChat: settings.sendToDmChat ?? false
        };
    } catch (error) {
        console.error('Error getting anti-edit settings:', error);
        const envStatus = process.env.ANTI_EDIT;
        return {
            status: envStatus ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') : true,
            notification: '📝 *BWM-XMD AntiEdit*',
            includeGroupInfo: true,
            sendToOwner: true,
            includeMedia: true,
            sendToDmChat: false
        };
    }
}

async function syncAntiEditFromEnv() {
    try {
        const envStatus = process.env.ANTI_EDIT;
        const status = envStatus !== undefined
            ? (envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true')
            : true;

        let settings = await findSingleton(AntiEditDB);
        if (!settings) {
            settings = await createSingleton(AntiEditDB, { status });
        } else {
            await settings.update({ status });
        }
        return { status, notification: settings.notification, includeGroupInfo: settings.includeGroupInfo, sendToOwner: settings.sendToOwner, includeMedia: settings.includeMedia };
    } catch (error) {
        console.error('Error syncing anti-edit from env:', error);
        return null;
    }
}

async function updateAntiEditSettings(updates) {
    try {
        const settings = await findSingleton(AntiEditDB) || await createSingleton(AntiEditDB);
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating anti-edit settings:', error);
        throw error;
    }
}

module.exports = {
    initAntiEditDB,
    getAntiEditSettings,
    updateAntiEditSettings,
    syncAntiEditFromEnv,
    AntiEditDB
};
