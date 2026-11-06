let currentBotId = null;

function setBotId(botId) {
    if (botId) {
        currentBotId = botId.split('@')[0].split(':')[0];
        console.log(`[BOT CONTEXT] Bot ID set to: ${currentBotId}`);
    }
}

function getBotId() {
    return currentBotId || process.env.BOT_ID || 'default';
}

function clearBotId() {
    currentBotId = null;
}

module.exports = {
    setBotId,
    getBotId,
    clearBotId
};
