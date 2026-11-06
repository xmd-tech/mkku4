const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const GreetDB = database.define('greet', {
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        defaultValue: "Hello @user 👋\nWelcome to my chat!\nHow can I help you today?",
        allowNull: false
    }
}, {
    timestamps: true
});

// Store replied contacts in memory
const repliedContacts = new Set();

async function initGreetDB() {
    try {
        await GreetDB.sync({ alter: true });
        console.log('Greet table ready');
    } catch (error) {
        console.error('Error initializing Greet table:', error);
        throw error;
    }
}

async function getGreetSettings() {
    try {
        const settings = await findSingleton(GreetDB);
        if (!settings) {
            return await createSingleton(GreetDB);
        }
        return settings;
    } catch (error) {
        console.error('Error getting greet settings:', error);
        return { 
            enabled: false,
            message: "Hello @user 👋\nWelcome to my chat!"
        };
    }
}

async function updateGreetSettings(updates) {
    try {
        let settings = await findSingleton(GreetDB);
        if (!settings) {
            settings = await createSingleton(GreetDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating greet settings:', error);
        throw error;
    }
}

function clearRepliedContacts() {
    repliedContacts.clear();
}

module.exports = {
    initGreetDB,
    getGreetSettings,
    updateGreetSettings,
    clearRepliedContacts,
    repliedContacts,
    GreetDB
};