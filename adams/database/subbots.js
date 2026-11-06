const { Sequelize, DataTypes } = require('sequelize');
const { database } = require('../../config');

const SubBot = database.define('SubBot', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    session: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_connected: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'subbots',
    timestamps: false
});

async function initSubBotsDB() {
    try {
        await SubBot.sync();
        console.log('SubBots table ready');
        await cleanupDuplicateSessions();
        await deleteExpiredSubBots();
    } catch (error) {
        console.error('SubBots DB init error:', error);
    }
}

async function checkSessionExists(session) {
    try {
        const existing = await SubBot.findOne({
            where: { session: session }
        });
        return existing;
    } catch (error) {
        console.error('Error checking session:', error);
        return null;
    }
}

async function addSubBot(session, daysValid = 7) {
    try {
        const existing = await checkSessionExists(session);
        if (existing) {
            console.log(`[SubBot] Session already exists with ID: ${existing.id}, skipping duplicate`);
            return { ...existing.dataValues, alreadyExists: true };
        }
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysValid);
        
        const subbot = await SubBot.create({
            session,
            expires_at: expiresAt,
            status: 'pending'
        });
        return { ...subbot.dataValues, alreadyExists: false };
    } catch (error) {
        console.error('Error adding subbot:', error);
        throw error;
    }
}

async function getSubBot(id) {
    try {
        return await SubBot.findByPk(id);
    } catch (error) {
        console.error('Error getting subbot:', error);
        return null;
    }
}

async function getAllActiveSubBots() {
    try {
        return await SubBot.findAll({
            where: {
                status: 'connected',
                expires_at: {
                    [Sequelize.Op.gt]: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error getting active subbots:', error);
        return [];
    }
}

async function getAllSubBots() {
    try {
        return await SubBot.findAll();
    } catch (error) {
        console.error('Error getting all subbots:', error);
        return [];
    }
}

async function updateSubBotStatus(id, status, phone = null) {
    try {
        const updateData = { status, last_connected: new Date() };
        if (phone) updateData.phone = phone;
        await SubBot.update(updateData, { where: { id } });
    } catch (error) {
        console.error('Error updating subbot status:', error);
    }
}

async function deleteSubBot(id) {
    try {
        await SubBot.destroy({ where: { id } });
    } catch (error) {
        console.error('Error deleting subbot:', error);
    }
}

async function deleteExpiredSubBots() {
    try {
        const deleted = await SubBot.destroy({
            where: {
                expires_at: {
                    [Sequelize.Op.lt]: new Date()
                }
            }
        });
        if (deleted > 0) {
            console.log(`Deleted ${deleted} expired subbots`);
        }
        return deleted;
    } catch (error) {
        console.error('Error deleting expired subbots:', error);
        return 0;
    }
}

async function cleanupDuplicateSessions() {
    try {
        const allBots = await SubBot.findAll({
            order: [['id', 'ASC']]
        });
        
        const sessionMap = new Map();
        const duplicateIds = [];
        
        for (const bot of allBots) {
            const session = bot.session;
            if (sessionMap.has(session)) {
                duplicateIds.push(bot.id);
            } else {
                sessionMap.set(session, bot.id);
            }
        }
        
        if (duplicateIds.length > 0) {
            await SubBot.destroy({
                where: {
                    id: {
                        [Sequelize.Op.in]: duplicateIds
                    }
                }
            });
            console.log(`[SubBot] Cleaned up ${duplicateIds.length} duplicate session(s)`);
        }
        
        return duplicateIds.length;
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        return 0;
    }
}

module.exports = {
    SubBot,
    initSubBotsDB,
    addSubBot,
    checkSessionExists,
    getSubBot,
    getAllActiveSubBots,
    getAllSubBots,
    updateSubBotStatus,
    deleteSubBot,
    deleteExpiredSubBots,
    cleanupDuplicateSessions
};
