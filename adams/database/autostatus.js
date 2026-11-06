const { DataTypes } = require('sequelize');
const { database } = require('../../config');
const { findSingleton, createSingleton } = require('./singletonSettings');

const AutoStatusDB = database.define('autostatus', {
  autoviewStatus: {
    type: DataTypes.STRING,
    defaultValue: 'true',
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  autoLikeStatus: {
    type: DataTypes.STRING,
    defaultValue: 'false',
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  autoReplyStatus: {
    type: DataTypes.STRING,
    defaultValue: 'false',
    allowNull: false,
    validate: { isIn: [['true', 'false']] }
  },
  statusReplyText: {
    type: DataTypes.TEXT,
    defaultValue: '✅ Status Viewed By BWM-XMD',
    allowNull: false
  },
  statusLikeEmojis: {
    type: DataTypes.TEXT,
    defaultValue: '💛,❤️,💜,🤍,💙',
    allowNull: false
  }
}, {
  timestamps: true
});

async function initAutoStatusDB() {
  try {
    await AutoStatusDB.sync({ alter: true });
    console.log('AutoStatus table ready');
  } catch (error) {
    console.error('Error initializing AutoStatus table:', error);
    throw error;
  }
}

async function getAutoStatusSettings() {
  try {
    let settings = await findSingleton(AutoStatusDB);
    
    // If no record exists, create one using env vars as initial defaults
    if (!settings) {
      const envView = process.env.AUTO_STATUS_VIEW;
      const envLike = process.env.AUTO_STATUS_LIKE;
      const envReply = process.env.AUTO_STATUS_REPLY;
      const envReplyText = process.env.STATUS_REPLY_MSG;
      const envLikeEmojis = process.env.STATUS_LIKE_EMOJIS;
      
      settings = await createSingleton(AutoStatusDB, {
        autoviewStatus: envView ? ((envView.toLowerCase() === 'off' || envView.toLowerCase() === 'false') ? 'false' : 'true') : 'true',
        autoLikeStatus: envLike ? ((envLike.toLowerCase() === 'off' || envLike.toLowerCase() === 'false') ? 'false' : 'true') : 'false',
        autoReplyStatus: envReply ? ((envReply.toLowerCase() === 'on' || envReply.toLowerCase() === 'true') ? 'true' : 'false') : 'false',
        statusReplyText: envReplyText || '✅ Status Viewed By BWM-XMD',
        statusLikeEmojis: envLikeEmojis || '💛,❤️,💜,🤍,💙'
      });
    }
    
    return {
      autoviewStatus: settings.autoviewStatus || 'true',
      autoLikeStatus: settings.autoLikeStatus || 'false',
      autoReplyStatus: settings.autoReplyStatus || 'false',
      statusReplyText: settings.statusReplyText || '✅ Status Viewed By BWM-XMD',
      statusLikeEmojis: settings.statusLikeEmojis || '💛,❤️,💜,🤍,💙'
    };
  } catch (error) {
    console.error('Error getting auto status settings:', error);
    const envView = process.env.AUTO_STATUS_VIEW;
    const envLike = process.env.AUTO_STATUS_LIKE;
    const envReply = process.env.AUTO_STATUS_REPLY;
    const envReplyText = process.env.STATUS_REPLY_MSG;
    const envLikeEmojis = process.env.STATUS_LIKE_EMOJIS;
    return {
      autoviewStatus: envView ? ((envView.toLowerCase() === 'off' || envView.toLowerCase() === 'false') ? 'false' : 'true') : 'true',
      autoLikeStatus: envLike ? ((envLike.toLowerCase() === 'off' || envLike.toLowerCase() === 'false') ? 'false' : 'true') : 'false',
      autoReplyStatus: envReply ? ((envReply.toLowerCase() === 'on' || envReply.toLowerCase() === 'true') ? 'true' : 'false') : 'false',
      statusReplyText: envReplyText || '✅ Status Viewed By BWM-XMD',
      statusLikeEmojis: envLikeEmojis || '💛,❤️,💜,🤍,💙'
    };
  }
}

// Sync settings from Heroku env vars
async function syncAutoStatusFromEnv() {
  try {
    const envView = process.env.AUTO_STATUS_VIEW;
    const envLike = process.env.AUTO_STATUS_LIKE;
    const envReply = process.env.AUTO_STATUS_REPLY;
    const envReplyText = process.env.STATUS_REPLY_MSG;
    const envLikeEmojis = process.env.STATUS_LIKE_EMOJIS;
    
    const updates = {
      autoviewStatus: envView ? ((envView.toLowerCase() === 'off' || envView.toLowerCase() === 'false') ? 'false' : 'true') : 'true',
      autoLikeStatus: envLike ? ((envLike.toLowerCase() === 'off' || envLike.toLowerCase() === 'false') ? 'false' : 'true') : 'false',
      autoReplyStatus: envReply ? ((envReply.toLowerCase() === 'on' || envReply.toLowerCase() === 'true') ? 'true' : 'false') : 'false',
      statusReplyText: envReplyText || '✅ Status Viewed By BWM-XMD',
      statusLikeEmojis: envLikeEmojis || '💛,❤️,💜,🤍,💙'
    };
    
    let settings = await findSingleton(AutoStatusDB);
    if (!settings) {
      settings = await createSingleton(AutoStatusDB, updates);
    } else {
      await settings.update(updates);
    }
    return updates;
  } catch (error) {
    console.error('Error syncing auto status from env:', error);
    return null;
  }
}

async function updateAutoStatusSettings(updates) {
  try {
    let settings = await findSingleton(AutoStatusDB);
    if (!settings) {
      settings = await createSingleton(AutoStatusDB);
    }
    return await settings.update(updates);
  } catch (error) {
    console.error('Error updating auto status settings:', error);
    throw error;
  }
}

module.exports = {
  initAutoStatusDB,
  getAutoStatusSettings,
  updateAutoStatusSettings,
  syncAutoStatusFromEnv,
  AutoStatusDB
};
