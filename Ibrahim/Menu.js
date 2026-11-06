// menu.js
const { bwmxmd } = require("../adams/commandHandler");
const s = require(__dirname + "/../config");
const XMD = require("../adams/xmd");

const PREFIX = s.PREFIX || ".";
const BOT_NAME = s.BOT || 'BWM XMD';

// ─────────────────────────────────────────────────────────────────────────────
// Command listing (Keith menu2 style)
// ─────────────────────────────────────────────────────────────────────────────
const commandList = {};
let totalCommands = 0;

function initializeCommands() {
    if (Object.keys(commandList).length === 0) {
        const commands = require("../adams/commandHandler").commands;
        totalCommands = commands.filter(cmd => !cmd.dontAddCommandList).length;
        commands.forEach((cmd) => {
            if (cmd.dontAddCommandList) return;
            const category = cmd.category?.toUpperCase() || 'UNCATEGORIZED';
            if (!commandList[category]) commandList[category] = [];
            commandList[category].push(cmd.pattern);
        });
        Object.keys(commandList).forEach(cat => {
            commandList[cat].sort((a, b) => a.localeCompare(b));
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BWM helpers
// ─────────────────────────────────────────────────────────────────────────────
const getGlobalContextInfo = (name) => XMD.getContextInfo(name);

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND: menu — flat listing of all commands grouped by category
// ─────────────────────────────────────────────────────────────────────────────
bwmxmd({
    pattern: "menu2",
    aliases: ["help", "list", "commands", "allmenu"],
    category: "general",
    description: "Show all commands grouped by category"
}, async (from, client, conText) => {
    const { mek, sender, botname, botPic, pushName, deviceMode } = conText;

    const BOT_NAME = botname || s.BOT || 'BWM XMD';
    initializeCommands();

    const categories = Object.keys(commandList).sort((a, b) => a.localeCompare(b));

    let menuText =
        `Hey ${pushName || 'User'}\n\n` +
        `*${BOT_NAME} MENU*\n` +
        `Total Commands: ${totalCommands}\n\n`;

    categories.forEach(cat => {
        menuText += `*${cat}*\n`;
        menuText += commandList[cat].map(cmd => `° ${PREFIX}${cmd}`).join("\n");
        menuText += `\n\n`;
    });

    try {
        // iPhone: plain send
        if (deviceMode === 'iPhone') {
            await client.sendMessage(from, { text: menuText.trim(), mentions: [sender] });
            return;
        }

        // Non-iPhone: BWM contextInfo
        const payload = {
            presentationOnly: true,
            caption: menuText.trim(),
            mentions: [sender],
            contextInfo: getGlobalContextInfo(BOT_NAME)
        };
        if (botPic) payload.image = { url: botPic };
        else payload.text = menuText.trim();

        await client.sendMessage(from, payload, { quoted: mek });
    } catch (err) {
        console.error("menu send error:", err.message);
        await client.sendMessage(from, { text: menuText.trim() }, { quoted: mek });
    }
});
