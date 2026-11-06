const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');
const { DataTypes } = require('sequelize');

// Define chatbot conversation table
const ChatbotConversationDB = database.define('chatbot_conversations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_jid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    ai_response: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    response_type: {
        type: DataTypes.ENUM('text', 'audio', 'image', 'video', 'vision'),
        defaultValue: 'text',
        allowNull: false
    },
    media_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
});

// Define chatbot settings table
const ChatbotSettingsDB = database.define('chatbot_settings', {
    status: {
        type: DataTypes.ENUM('on', 'off'),
        defaultValue: 'off',
        allowNull: false
    },
    mode: {
        type: DataTypes.ENUM('private', 'group', 'both'),
        defaultValue: 'private',
        allowNull: false
    },
    trigger: {
        type: DataTypes.STRING,
        defaultValue: 'dm',
        allowNull: false
    },
    default_response: {
        type: DataTypes.ENUM('text', 'audio'),
        defaultValue: 'text',
        allowNull: false
    },
    voice: {
        type: DataTypes.STRING,
        defaultValue: 'Kimberly',
        allowNull: false
    }
}, {
    timestamps: true
});

// Available voices
const availableVoices = [
    'Kimberly', 'Salli', 'Joey', 'Justin', 'Matthew', 'Ivy', 'Joanna', 'Kendra',
    'Amy', 'Brian', 'Emma', 'Aditi', 'Raveena', 'Nicole', 'Russell'
];

// Initialize both tables
async function initChatbotDB() {
    try {
        await ChatbotConversationDB.sync({ alter: true });
        await ChatbotSettingsDB.sync({ alter: true });
        console.log('Chatbot tables ready');
    } catch (error) {
        console.error('Error initializing Chatbot tables:', error);
        throw error;
    }
}

// ===== CONVERSATION FUNCTIONS =====

// Save conversation to database
async function saveConversation(userJid, userMessage, aiResponse, responseType = 'text', mediaUrl = null) {
    try {
        await ChatbotConversationDB.create({
            user_jid: userJid,
            user_message: userMessage,
            ai_response: aiResponse,
            response_type: responseType,
            media_url: mediaUrl
        });
        return true;
    } catch (error) {
        console.error('Error saving conversation:', error);
        return false;
    }
}

// Get conversation history for a user
async function getConversationHistory(userJid, limit = 10) {
    try {
        const history = await ChatbotConversationDB.findAll({
            where: { user_jid: userJid },
            order: [['timestamp', 'DESC']],
            limit: limit
        });
        return history.map(conv => ({
            user: conv.user_message,
            ai: conv.ai_response,
            type: conv.response_type,
            media: conv.media_url,
            time: conv.timestamp
        }));
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}

// Clear conversation history for a user
async function clearConversationHistory(userJid) {
    try {
        const deleted = await ChatbotConversationDB.destroy({
            where: { user_jid: userJid }
        });
        return deleted > 0;
    } catch (error) {
        console.error('Error clearing conversation history:', error);
        return false;
    }
}

// Get last conversation for context
async function getLastConversation(userJid) {
    try {
        const lastConv = await ChatbotConversationDB.findOne({
            where: { user_jid: userJid },
            order: [['timestamp', 'DESC']]
        });
        return lastConv ? {
            user: lastConv.user_message,
            ai: lastConv.ai_response,
            type: lastConv.response_type,
            media: lastConv.media_url
        } : null;
    } catch (error) {
        console.error('Error getting last conversation:', error);
        return null;
    }
}

// ===== SETTINGS FUNCTIONS =====

async function getChatbotSettings() {
    try {
        let settings = await findSingleton(ChatbotSettingsDB);
        
        // If no record exists, create one using env vars as initial defaults
        if (!settings) {
            const envStatus = process.env.CHATBOT;
            const envMode = process.env.CHATBOT_MODE;
            const envTrigger = process.env.CHATBOT_TRIGGER;
            const envResponse = process.env.CHATBOT_RESPONSE;
            const envVoice = process.env.CHATBOT_VOICE;
            
            const initialStatus = envStatus !== undefined 
                ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') 
                : 'off';
            
            let initialMode = 'private';
            if (envMode !== undefined) {
                const val = envMode.toLowerCase();
                if (val === 'private' || val === 'group' || val === 'both') {
                    initialMode = val;
                }
            }
            
            let initialResponse = 'text';
            if (envResponse !== undefined) {
                const val = envResponse.toLowerCase();
                if (val === 'text' || val === 'audio') initialResponse = val;
            }
            
            settings = await createSingleton(ChatbotSettingsDB, {
                status: initialStatus,
                mode: initialMode,
                trigger: envTrigger || 'dm',
                default_response: initialResponse,
                voice: envVoice || 'Kimberly'
            });
        }
        
        // Database values take priority (commands override env vars)
        return {
            status: settings.status || 'off',
            mode: settings.mode || 'private',
            trigger: settings.trigger || 'dm',
            default_response: settings.default_response || 'text',
            voice: settings.voice || 'Kimberly'
        };
    } catch (error) {
        console.error('Error getting chatbot settings:', error);
        const envStatus = process.env.CHATBOT;
        const envMode = process.env.CHATBOT_MODE;
        const envTrigger = process.env.CHATBOT_TRIGGER;
        const envResponse = process.env.CHATBOT_RESPONSE;
        const envVoice = process.env.CHATBOT_VOICE;
        return { 
            status: envStatus ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') : 'off', 
            mode: envMode || 'private', 
            trigger: envTrigger || 'dm',
            default_response: envResponse && ['text', 'audio'].includes(envResponse.toLowerCase()) ? envResponse.toLowerCase() : 'text',
            voice: envVoice || 'Kimberly'
        };
    }
}

// Sync chatbot settings from Heroku env vars
async function syncChatbotFromEnv() {
    try {
        const envStatus = process.env.CHATBOT;
        const envMode = process.env.CHATBOT_MODE;
        const envTrigger = process.env.CHATBOT_TRIGGER;
        const envResponse = process.env.CHATBOT_RESPONSE;
        const envVoice = process.env.CHATBOT_VOICE;
        
        const status = envStatus !== undefined 
            ? ((envStatus.toLowerCase() === 'on' || envStatus.toLowerCase() === 'true') ? 'on' : 'off') 
            : 'off';
        
        let mode = 'private';
        if (envMode !== undefined) {
            const val = envMode.toLowerCase();
            if (val === 'private' || val === 'group' || val === 'both') {
                mode = val;
            }
        }
        
        let default_response = 'text';
        if (envResponse !== undefined) {
            const val = envResponse.toLowerCase();
            if (val === 'text' || val === 'audio') default_response = val;
        }
        
        const updates = {
            status,
            mode,
            trigger: envTrigger || 'dm',
            default_response,
            voice: envVoice || 'Kimberly'
        };
        
        let settings = await findSingleton(ChatbotSettingsDB);
        if (!settings) {
            settings = await createSingleton(ChatbotSettingsDB, updates);
        } else {
            await settings.update(updates);
        }
        return updates;
    } catch (error) {
        console.error('Error syncing chatbot from env:', error);
        return null;
    }
}

async function updateChatbotSettings(updates) {
    try {
        let settings = await findSingleton(ChatbotSettingsDB);
        if (!settings) {
            settings = await createSingleton(ChatbotSettingsDB);
        }
        return await settings.update(updates);
    } catch (error) {
        console.error('Error updating chatbot settings:', error);
        throw error;
    }
}

// Initialize database
initChatbotDB().catch(err => {
    console.error('❌ Failed to initialize Chatbot database:', err);
});

module.exports = {
    // Conversation functions
    saveConversation,
    getConversationHistory,
    clearConversationHistory,
    getLastConversation,
    
    // Settings functions
    getChatbotSettings,
    updateChatbotSettings,
    syncChatbotFromEnv,
    
    // Voices
    availableVoices,
    
    // Initialization
    initChatbotDB,
    
    // Models (for advanced use)
    ChatbotConversationDB,
    ChatbotSettingsDB
};