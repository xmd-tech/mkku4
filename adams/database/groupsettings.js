const { DataTypes } = require('sequelize');
const { database } = require('../../config');

const GLOBAL_KEY = '__all__';

const GroupSettingsDB = database.define('groupsettings', {
    groupId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    antilinkStatus: {
        type: DataTypes.STRING,
        defaultValue: 'off',
        allowNull: false
    },
    antilinkAction: {
        type: DataTypes.STRING,
        defaultValue: 'warn',
        allowNull: false
    },
    antilinkWarnLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    antitagStatus: {
        type: DataTypes.STRING,
        defaultValue: 'off',
        allowNull: false
    },
    antitagAction: {
        type: DataTypes.STRING,
        defaultValue: 'warn',
        allowNull: false
    },
    antitagWarnLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
    },
    presenceStatus: {
        type: DataTypes.STRING,
        defaultValue: 'off',
        allowNull: false
    },
    eventsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    welcomeMessage: {
        type: DataTypes.TEXT,
        defaultValue: '',
        allowNull: false
    },
    goodbyeMessage: {
        type: DataTypes.TEXT,
        defaultValue: '',
        allowNull: false
    },
    showPromotions: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    antideleteEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antideleteSendToChat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antieditEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    antieditSendToChat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    viewonceEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    statusAntideleteEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    autoreactEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    autoreactEmojis: {
        type: DataTypes.TEXT,
        defaultValue: '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎',
        allowNull: false
    }
}, {
    timestamps: true,
    freezeTableName: true
});

const groupWarnCounts = new Map();
const groupTagWarnCounts = new Map();

async function initGroupSettingsDB() {
    try {
        await GroupSettingsDB.sync({ alter: true });
        console.log('GroupSettings table ready');
    } catch (error) {
        console.error('Error initializing GroupSettings table:', error);
        throw error;
    }
}

function defaultSettings(groupId) {
    return {
        groupId,
        antilinkStatus: 'off',
        antilinkAction: 'warn',
        antilinkWarnLimit: 3,
        antitagStatus: 'off',
        antitagAction: 'warn',
        antitagWarnLimit: 3,
        presenceStatus: 'off',
        eventsEnabled: false,
        welcomeMessage: '',
        goodbyeMessage: '',
        showPromotions: true,
        antideleteEnabled: false,
        antideleteSendToChat: false,
        antieditEnabled: false,
        antieditSendToChat: false,
        viewonceEnabled: false,
        statusAntideleteEnabled: false,
        autoreactEnabled: false,
        autoreactEmojis: '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎'
    };
}

function settingsToObj(settings) {
    return {
        groupId: settings.groupId,
        antilinkStatus: settings.antilinkStatus || 'off',
        antilinkAction: settings.antilinkAction || 'warn',
        antilinkWarnLimit: settings.antilinkWarnLimit || 3,
        antitagStatus: settings.antitagStatus || 'off',
        antitagAction: settings.antitagAction || 'warn',
        antitagWarnLimit: settings.antitagWarnLimit || 3,
        presenceStatus: settings.presenceStatus || 'off',
        eventsEnabled: settings.eventsEnabled || false,
        welcomeMessage: settings.welcomeMessage || '',
        goodbyeMessage: settings.goodbyeMessage || '',
        showPromotions: settings.showPromotions !== false,
        antideleteEnabled: settings.antideleteEnabled || false,
        antideleteSendToChat: settings.antideleteSendToChat || false,
        antieditEnabled: settings.antieditEnabled || false,
        antieditSendToChat: settings.antieditSendToChat || false,
        viewonceEnabled: settings.viewonceEnabled || false,
        statusAntideleteEnabled: settings.statusAntideleteEnabled || false,
        autoreactEnabled: settings.autoreactEnabled || false,
        autoreactEmojis: settings.autoreactEmojis || '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎'
    };
}

async function getGroupSettings(groupId) {
    try {
        let settings = await GroupSettingsDB.findByPk(groupId);
        if (settings) return settingsToObj(settings);

        const globalSettings = await GroupSettingsDB.findByPk(GLOBAL_KEY);
        if (globalSettings) {
            const obj = settingsToObj(globalSettings);
            obj.groupId = groupId;
            return obj;
        }

        return defaultSettings(groupId);
    } catch (error) {
        console.error('Error getting group settings:', error);
        return defaultSettings(groupId);
    }
}

async function getGlobalGroupSettings() {
    try {
        let settings = await GroupSettingsDB.findByPk(GLOBAL_KEY);
        if (settings) return settingsToObj(settings);
        return defaultSettings(GLOBAL_KEY);
    } catch (error) {
        console.error('Error getting global group settings:', error);
        return defaultSettings(GLOBAL_KEY);
    }
}

async function updateGlobalGroupSettings(updates) {
    try {
        return await database.transaction(async transaction => {
            const [settings, created] = await GroupSettingsDB.findOrCreate({
                where: { groupId: GLOBAL_KEY },
                defaults: { groupId: GLOBAL_KEY, ...updates },
                transaction
            });
            if (!created) await settings.update(updates, { transaction });
            // "all" means existing groups too, not just groups without a row.
            // Update only the requested fields so unrelated preferences survive.
            await GroupSettingsDB.update(updates, { where: {}, transaction });
            return settings;
        });
    } catch (error) {
        console.error('Error updating global group settings:', error);
        throw error;
    }
}

async function updateGroupSettings(groupId, updates) {
    try {
        const inherited = await getGlobalGroupSettings();
        let [settings, created] = await GroupSettingsDB.findOrCreate({
            where: { groupId },
            // Customizing one feature must not turn all other global features off.
            defaults: { ...inherited, groupId, ...updates }
        });
        if (!created) {
            await settings.update(updates);
        }
        return settings;
    } catch (error) {
        console.error('Error updating group settings:', error);
        throw error;
    }
}

function getGroupWarnCount(groupId, userJid) {
    return groupWarnCounts.get(`${groupId}:${userJid}`) || 0;
}

function incrementGroupWarnCount(groupId, userJid) {
    const key = `${groupId}:${userJid}`;
    const current = groupWarnCounts.get(key) || 0;
    groupWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetGroupWarnCount(groupId, userJid) {
    groupWarnCounts.delete(`${groupId}:${userJid}`);
}

function clearGroupWarns(groupId) {
    for (const key of groupWarnCounts.keys()) {
        if (key.startsWith(`${groupId}:`)) {
            groupWarnCounts.delete(key);
        }
    }
}

function getGroupTagWarnCount(groupId, userJid) {
    return groupTagWarnCounts.get(`${groupId}:${userJid}`) || 0;
}

function incrementGroupTagWarnCount(groupId, userJid) {
    const key = `${groupId}:${userJid}`;
    const current = groupTagWarnCounts.get(key) || 0;
    groupTagWarnCounts.set(key, current + 1);
    return current + 1;
}

function resetGroupTagWarnCount(groupId, userJid) {
    groupTagWarnCounts.delete(`${groupId}:${userJid}`);
}

function clearGroupTagWarns(groupId) {
    for (const key of groupTagWarnCounts.keys()) {
        if (key.startsWith(`${groupId}:`)) {
            groupTagWarnCounts.delete(key);
        }
    }
}

async function getAllEnabledGroups(feature) {
    try {
        const where = {};
        switch (feature) {
            case 'antilink':
                where.antilinkStatus = { [require('sequelize').Op.ne]: 'off' };
                break;
            case 'antitag':
                where.antitagStatus = { [require('sequelize').Op.ne]: 'off' };
                break;
            case 'presence':
                where.presenceStatus = { [require('sequelize').Op.ne]: 'off' };
                break;
            case 'events':
                where.eventsEnabled = true;
                break;
            case 'antidelete':
                where.antideleteEnabled = true;
                break;
        }
        const groups = await GroupSettingsDB.findAll({ where });
        return groups.map(g => g.groupId);
    } catch (error) {
        console.error('Error getting enabled groups:', error);
        return [];
    }
}

module.exports = {
    GLOBAL_KEY,
    initGroupSettingsDB,
    getGroupSettings,
    getGlobalGroupSettings,
    updateGroupSettings,
    updateGlobalGroupSettings,
    getGroupWarnCount,
    incrementGroupWarnCount,
    resetGroupWarnCount,
    clearGroupWarns,
    getGroupTagWarnCount,
    incrementGroupTagWarnCount,
    resetGroupTagWarnCount,
    clearGroupTagWarns,
    getAllEnabledGroups,
    GroupSettingsDB
};
