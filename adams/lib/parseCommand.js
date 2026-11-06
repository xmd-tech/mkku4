// Match whole emoji tokens, not ordinary words containing an emoji or bare
// digits/#/*. Include skin tones, ZWJ sequences, flags, keycaps and tag flags.
const emojiBase = String.raw`\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?`;
const emojiSequence = `${emojiBase}(?:\\u200D${emojiBase})*(?:[\\u{E0020}-\\u{E007E}]+\\u{E007F})?`;
const emojiToken = new RegExp(
    `(?:${emojiSequence}|\\p{Regional_Indicator}|\\p{Emoji_Modifier}|[#*0-9]\\uFE0F?\\u20E3)`, 'uy'
);

function isEmojiCommand(command) {
    if (!command) return false;
    // Scan consecutive tokens without an outer repeated regex that could
    // backtrack excessively on long emoji input ending with ordinary text.
    emojiToken.lastIndex = 0;
    while (emojiToken.lastIndex < command.length) {
        if (!emojiToken.exec(command)) return false;
    }
    return true;
}

function parseCommand(text, prefix) {
    if (typeof text !== 'string' || !prefix || !text.startsWith(prefix)) {
        return { isCommand: false, command: '', args: [] };
    }
    const tokens = text.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
    const command = (tokens.shift() || '').toLowerCase();
    return {
        isCommand: Boolean(command),
        command: isEmojiCommand(command) ? 'vv2' : command,
        args: tokens
    };
}

module.exports = { parseCommand };
