const { Op } = require('sequelize');

const CLEANUP_INTERVALS = {
    EXPIRED_SUBBOTS: 24 * 60 * 60 * 1000,
    OLD_CHATBOT_MSGS: 7 * 24 * 60 * 60 * 1000,
    OLD_GPT_CONVOS: 3 * 24 * 60 * 60 * 1000,
};

async function cleanupExpiredSubBots(SubBots) {
    try {
        const now = new Date();
        const deleted = await SubBots.destroy({
            where: {
                expiresAt: { [Op.lt]: now },
                status: { [Op.ne]: 'expired' }
            }
        });
        
        const expired = await SubBots.update(
            { status: 'expired' },
            { where: { expiresAt: { [Op.lt]: now } } }
        );
        
        if (deleted > 0 || expired[0] > 0) {
            console.log(`[CLEANUP] Expired sub-bots: ${expired[0]} marked, ${deleted} deleted`);
        }
        return { deleted, expired: expired[0] };
    } catch (err) {
        console.error('[CLEANUP] Sub-bots error:', err.message);
        return { deleted: 0, expired: 0 };
    }
}

async function cleanupOldChatbotMessages(ChatbotMessages, daysOld = 7) {
    try {
        if (!ChatbotMessages) return { deleted: 0 };
        
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const deleted = await ChatbotMessages.destroy({
            where: {
                createdAt: { [Op.lt]: cutoff }
            }
        });
        
        if (deleted > 0) {
            console.log(`[CLEANUP] Old chatbot messages: ${deleted} deleted`);
        }
        return { deleted };
    } catch (err) {
        console.error('[CLEANUP] Chatbot messages error:', err.message);
        return { deleted: 0 };
    }
}

async function cleanupOldGPTConversations(GPTConversation, daysOld = 3) {
    try {
        if (!GPTConversation) return { deleted: 0 };
        
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const deleted = await GPTConversation.destroy({
            where: {
                updatedAt: { [Op.lt]: cutoff }
            }
        });
        
        if (deleted > 0) {
            console.log(`[CLEANUP] Old GPT conversations: ${deleted} deleted`);
        }
        return { deleted };
    } catch (err) {
        console.error('[CLEANUP] GPT conversations error:', err.message);
        return { deleted: 0 };
    }
}

async function cleanupOldSubBotSettings(SubBotSettings, SubBots) {
    try {
        if (!SubBotSettings || !SubBots) return { deleted: 0 };
        
        const activeBotIds = await SubBots.findAll({
            attributes: ['id'],
            where: { status: 'active' }
        });
        const activeIds = activeBotIds.map(b => b.id);
        
        const deleted = await SubBotSettings.destroy({
            where: {
                subBotId: { [Op.notIn]: activeIds.length > 0 ? activeIds : [0] }
            }
        });
        
        if (deleted > 0) {
            console.log(`[CLEANUP] Orphaned sub-bot settings: ${deleted} deleted`);
        }
        return { deleted };
    } catch (err) {
        console.error('[CLEANUP] Sub-bot settings error:', err.message);
        return { deleted: 0 };
    }
}

async function cleanupSessionFiles() {
    try {
        const fs = require('fs-extra');
        const path = require('path');
        const sessionsDir = path.join(__dirname, '../subbots_sessions');
        
        if (!fs.existsSync(sessionsDir)) return { deleted: 0 };
        
        const folders = await fs.readdir(sessionsDir);
        let deleted = 0;
        
        for (const folder of folders) {
            const folderPath = path.join(sessionsDir, folder);
            const stat = await fs.stat(folderPath);
            
            if (stat.isDirectory()) {
                const daysSinceModified = (Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000);
                if (daysSinceModified > 10) {
                    await fs.remove(folderPath);
                    deleted++;
                }
            }
        }
        
        if (deleted > 0) {
            console.log(`[CLEANUP] Old session folders: ${deleted} deleted`);
        }
        return { deleted };
    } catch (err) {
        console.error('[CLEANUP] Session files error:', err.message);
        return { deleted: 0 };
    }
}

async function cleanupTmpFiles() {
    try {
        const fs = require('fs-extra');
        const path = require('path');
        const tmpDir = path.join(__dirname, '../../tmp');
        
        if (!fs.existsSync(tmpDir)) return { deleted: 0 };
        
        const files = await fs.readdir(tmpDir);
        let deleted = 0;
        
        for (const file of files) {
            const filePath = path.join(tmpDir, file);
            const stat = await fs.stat(filePath);
            
            const daysSinceModified = (Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000);
            if (daysSinceModified > 1) {
                await fs.remove(filePath);
                deleted++;
            }
        }
        
        if (deleted > 0) {
            console.log(`[CLEANUP] Tmp files: ${deleted} deleted`);
        }
        return { deleted };
    } catch (err) {
        console.error('[CLEANUP] Tmp files error:', err.message);
        return { deleted: 0 };
    }
}

async function runFullCleanup(models = {}) {
    console.log('[CLEANUP] Starting database cleanup...');
    
    const results = {
        subBots: { deleted: 0, expired: 0 },
        chatbotMessages: { deleted: 0 },
        gptConversations: { deleted: 0 },
        subBotSettings: { deleted: 0 },
        sessionFiles: { deleted: 0 },
        tmpFiles: { deleted: 0 }
    };
    
    if (models.SubBots) {
        results.subBots = await cleanupExpiredSubBots(models.SubBots);
    }
    if (models.ChatbotMessages) {
        results.chatbotMessages = await cleanupOldChatbotMessages(models.ChatbotMessages);
    }
    if (models.GPTConversation) {
        results.gptConversations = await cleanupOldGPTConversations(models.GPTConversation);
    }
    if (models.SubBots && models.SubBotSettings) {
        results.subBotSettings = await cleanupOldSubBotSettings(models.SubBotSettings, models.SubBots);
    }
    
    results.sessionFiles = await cleanupSessionFiles();
    results.tmpFiles = await cleanupTmpFiles();
    
    console.log('[CLEANUP] Cleanup completed:', JSON.stringify(results));
    return results;
}

function startCleanupScheduler(models = {}, intervalHours = 6) {
    console.log(`[CLEANUP] Scheduler started (every ${intervalHours} hours)`);
    
    runFullCleanup(models);
    
    setInterval(() => {
        runFullCleanup(models);
    }, intervalHours * 60 * 60 * 1000);
}

module.exports = {
    cleanupExpiredSubBots,
    cleanupOldChatbotMessages,
    cleanupOldGPTConversations,
    cleanupOldSubBotSettings,
    cleanupSessionFiles,
    cleanupTmpFiles,
    runFullCleanup,
    startCleanupScheduler
};
