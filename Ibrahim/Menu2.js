const { bwmxmd } = require("../adams/commandHandler");
const moment = require("moment-timezone");
const s = require(__dirname + "/../config");
const XMD = require("../adams/xmd");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { getSettings } = require("../adams/database/settings");
const readMore = String.fromCharCode(8206).repeat(4000);

const PREFIX = s.PREFIX || ".";
const BOT_NAME = s.BOT || 'BWM XMD';
const MEDIA_URLS = s.BOT_URL || [];

// ─────────────────────────────────────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────────────────────────────────────
const fetchWithRetry = async (url, retries = 2) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await axios.head(url, { timeout: 5000 });
            if (res.status === 200) return url;
        } catch (e) {
            if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Menu styles
// ─────────────────────────────────────────────────────────────────────────────
const MENU_STYLES = {
    1: {
        top: "*┌─❖*",
        botName: "*│",
        bottomLeft: "*└┬❖*",
        greeting: "   *│",
        divider: "   *└────────┈❖*",
        mid: "▬▬▬▬▬▬▬▬▬▬",
        user: "> 🕵️",
        date: "> 📅",
        time: "> ⏰",
        stats: "> ⭐",
        bottom: "▬▬▬▬▬▬▬▬▬▬"
    },
    2: {
        top: "╔═❖",
        botName: "║ *",
        bottomLeft: "╠═❖",
        greeting: "╟ *",
        divider: "╚═══════❖",
        mid: "",
        user: "║🕵️ ",
        date: "║📅 ",
        time: "║⏰ ",
        stats: "║⭐ ",
        bottom: "╚═════════════❖"
    },
    3: {
        top: "┏━━❖",
        botName: "┃ *",
        bottomLeft: "┣━━❖",
        greeting: "┃ *",
        divider: "┗━━━━━━━━❖",
        mid: "",
        user: "┃🕵️ ",
        date: "┃📅 ",
        time: "┃⏰ ",
        stats: "┃⭐ ",
        bottom: "┗━━━━━━━━━━━━❖"
    }
};

const WEB = XMD.WEB;
const GURL = XMD.CHANNEL_URL;
const getGlobalContextInfo = (name) => XMD.getContextInfo(name);
const getContactMsg = (contactName, sender) =>
    XMD.getContactMsg(contactName, sender);

const randomMedia = () => {
    if (!MEDIA_URLS || MEDIA_URLS.length === 0) return null;
    const url = MEDIA_URLS[Math.floor(Math.random() * MEDIA_URLS.length)];
    if (typeof url === "string") {
        const trimmed = url.trim();
        return trimmed.startsWith("http") ? trimmed : null;
    }
    return null;
};

const fetchGitHubStats = async () => {
    try {
        const response = await axios.get(XMD.GITHUB_REPO_API, {
            headers: { "User-Agent": "BWM-XMD-BOT" },
            timeout: 5000,
        });
        const forks = response.data.forks_count || 0;
        const stars = response.data.stargazers_count || 0;
        return forks * 2 + stars * 2;
    } catch (error) {
        return Math.floor(Math.random() * 1000) + 500;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 Dynamic category builder — uses category names EXACTLY as written
// ─────────────────────────────────────────────────────────────────────────────
const SKIP_CATEGORIES = new Set(["owner", "system"]); // hide sensitive categories

function buildCommandIndex() {
    const commands = require("../adams/commandHandler").commands;

    // { catKeyLower: { key, label, commands: Set } }
    const index = {};

    commands.forEach((cmd) => {
        if (cmd.dontAddCommandList) return;
        if (!cmd.pattern) return;

        const rawCat = (cmd.category || "general").toLowerCase();
        if (SKIP_CATEGORIES.has(rawCat)) return;

        if (!index[rawCat]) {
            // Use the original (non-lowercased) label as-is from the command definition
            const originalLabel = cmd.category || "General";
            index[rawCat] = {
                key: rawCat,
                label: originalLabel.toUpperCase(),
                commands: new Set()
            };
        }
        index[rawCat].commands.add(cmd.pattern);
    });

    // Sort categories alphabetically and commands alphabetically
    return Object.values(index)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((c) => ({
            ...c,
            commands: Array.from(c.commands).sort()
        }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU COMMAND
// ─────────────────────────────────────────────────────────────────────────────
bwmxmd(
    {
        pattern: "menu",
        aliases: ["help", "list", "allmenu"],
        category: "general",
        description: "Interactive category-based menu"
    },
    async (from, client, conText) => {
        const { mek, pushName, reply, sender, deviceMode, botPic } = conText;
        const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';

        try {
            const categories = buildCommandIndex();

            if (categories.length === 0) {
                return reply("❌ No commands loaded. Make sure your command files are registered.");
            }

            const MAX_INDEX = categories.length + 2; // 1=web, 2=updates, 3+ = categories

            let dbSettings = conText.botSettings || {};
            try {
                if (conText.getSettings) dbSettings = await conText.getSettings();
                else dbSettings = await getSettings();
            } catch (e) {
                console.error("[menu] getSettings error:", e.message);
            }
            const tz = dbSettings.timezone || s.TZ || "Africa/Nairobi";
            moment.tz.setDefault(tz);

            const date = moment().format("DD/MM/YYYY");
            const time = moment().format("HH:mm:ss");
            const contactName = pushName || "User";

            const styleNum = dbSettings.menuStyle || 1;
            const sym = MENU_STYLES[styleNum] || MENU_STYLES[1];

            let contactMessage;
            try {
                contactMessage = getContactMsg(contactName, sender?.split("@")[0] || "0");
            } catch (e) {
                contactMessage = mek;
            }

            let githubStats = 500;
            try {
                githubStats = await fetchGitHubStats();
            } catch (e) {
                console.log("GitHub stats fetch failed, using default");
            }

            const hour = moment().hour();
            let greeting = "🌙 Good Night 😴";
            if (hour >= 5 && hour < 12) greeting = "🌅 Good Morning 🤗";
            else if (hour >= 12 && hour < 18) greeting = "☀️ Good Afternoon 😊";
            else if (hour >= 18 && hour < 22) greeting = "🌆 Good Evening 🤠";

            // 🔹 Build menu options — plain numbered list, no emoji prefix added
            let menuOptions = `\n*📋 MENU OPTIONS*\n\n`;
            menuOptions += `*1.* OUR WEB\n\n`;
            menuOptions += `*2.* UPDATES\n\n`;

            categories.forEach((cat, i) => {
                const num = i + 3;
                menuOptions += `*${num}.* ${cat.label}\n\n`;
            });

            menuOptions += `_Reply with a number (1-${MAX_INDEX}) to access that section_`;

            const midLine = sym.mid ? `\n${sym.mid}` : '';
            const menuHeader = `${sym.top}
${sym.botName}${BOT_NAME}*    
${sym.bottomLeft}
${sym.greeting}${greeting}*
${sym.divider}${midLine}
${sym.user}ᴜsᴇʀ ɴᴀᴍᴇ: ${contactName}
${sym.date}ᴅᴀᴛᴇ: ${date}
${sym.time}ᴛɪᴍᴇ: ${time}       
${sym.stats}ᴜsᴇʀs: ${githubStats}       
${sym.bottom}`;

            const fullMenuText = `${menuHeader}\n\n${readMore}\n${menuOptions}`;

            const botPicUrl = (botPic && typeof botPic === 'string' && botPic.startsWith('http')) ? botPic : null;
            const rawMedia = botPicUrl || randomMedia();
            const selectedMedia = rawMedia ? await fetchWithRetry(rawMedia) : null;
            let mainMenuMsg;

            if (deviceMode === 'iPhone') {
                mainMenuMsg = await client.sendMessage(from, { text: fullMenuText });
            } else if (selectedMedia) {
                try {
                    if (selectedMedia.match(/\.(mp4|gif)$/i)) {
                        mainMenuMsg = await client.sendMessage(from, {
                            presentationOnly: true,
                            video: { url: selectedMedia },
                            gifPlayback: true,
                            width: 800,
                            height: 800,
                            caption: fullMenuText,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                    } else {
                        mainMenuMsg = await client.sendMessage(from, {
                            presentationOnly: true,
                            image: { url: selectedMedia },
                            caption: fullMenuText,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                    }
                } catch (mediaErr) {
                    console.error("Menu media error:", mediaErr.message);
                    mainMenuMsg = await client.sendMessage(from, {
                        text: fullMenuText,
                        contextInfo: getGlobalContextInfo(BOT_NAME),
                    }, { quoted: contactMessage });
                }
            } else {
                mainMenuMsg = await client.sendMessage(from, {
                    text: fullMenuText,
                    contextInfo: getGlobalContextInfo(BOT_NAME)
                }, { quoted: contactMessage });
            }

            const cleanup = () => client.ev.off("messages.upsert", handleReply);

            const menuMessageIds = new Set();
            menuMessageIds.add(mainMenuMsg.key.id);

            const sendAndTrack = async (destChat, content, options) => {
                const sent = await client.sendMessage(destChat, content, options);
                if (sent?.key?.id) menuMessageIds.add(sent.key.id);
                return sent;
            };

            const sendMainMenu = async (destChat) => {
                const media = randomMedia();
                if (media) {
                    try {
                        if (media.match(/\.(mp4|gif)$/i)) {
                            await sendAndTrack(destChat, {
                                video: { url: media },
                                gifPlayback: true,
                                width: 800,
                                height: 800,
                                caption: fullMenuText,
                                contextInfo: getGlobalContextInfo(BOT_NAME),
                            }, { quoted: contactMessage });
                        } else {
                            await sendAndTrack(destChat, {
                                image: { url: media },
                                caption: fullMenuText,
                                contextInfo: getGlobalContextInfo(BOT_NAME),
                            }, { quoted: contactMessage });
                        }
                    } catch (e) {
                        await sendAndTrack(destChat, {
                            text: fullMenuText,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                    }
                } else {
                    await sendAndTrack(destChat, {
                        text: fullMenuText,
                        contextInfo: getGlobalContextInfo(BOT_NAME),
                    }, { quoted: contactMessage });
                }
            };

            const handleReply = async (update) => {
                const message = update.messages[0];
                if (!message?.message) return;

                const destChat = message.key.remoteJid;
                const fromResolved = conText.resolvedJid || from;
                if (destChat !== from && destChat !== fromResolved) return;

                const quotedStanzaId =
                    message.message.extendedTextMessage?.contextInfo?.stanzaId;

                const responseText =
                    message.message.extendedTextMessage?.text?.trim() ||
                    message.message.conversation?.trim();

                if (!responseText) return;

                const isNumber = /^\d+$/.test(responseText) &&
                    parseInt(responseText) >= 0 &&
                    parseInt(responseText) <= MAX_INDEX;

                if (quotedStanzaId) {
                    if (!menuMessageIds.has(quotedStanzaId)) return;
                } else if (isNumber && (conText.deviceMode === 'iPhone' || !destChat.endsWith('@g.us'))) {
                    // iPhone or DM: accept plain numbers
                } else {
                    return;
                }

                const selectedIndex = parseInt(responseText);
                if (isNaN(selectedIndex)) return;

                const menuReactions = {
                    0: '🔄', 1: '🌐', 2: '📢'
                };

                try {
                    const emoji = selectedIndex >= 3 ? '📋' : (menuReactions[selectedIndex] || '📋');
                    await client.sendMessage(destChat, { react: { text: emoji, key: message.key } });
                } catch (e) {}

                try {
                    if (selectedIndex === 0) {
                        await sendMainMenu(destChat);
                        return;
                    }

                    if (selectedIndex === 1) {
                        await sendAndTrack(destChat, {
                            text: `🌐 *${BOT_NAME} WEB APP*\n\nVisit our official website here:\n${WEB}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                        return;
                    }

                    if (selectedIndex === 2) {
                        await sendAndTrack(destChat, {
                            text: `📢 *${BOT_NAME} UPDATES CHANNEL*\n\nJoin our official updates channel:\n${GURL}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                        return;
                    }

                    const catIndex = selectedIndex - 3;
                    const cat = categories[catIndex];

                    if (!cat) {
                        await sendAndTrack(destChat, {
                            text: `*❌ Invalid number. Please select between 1-${MAX_INDEX}.*\n\n_Reply *0* to go back to main menu_`,
                            contextInfo: getGlobalContextInfo(BOT_NAME),
                        }, { quoted: contactMessage });
                        return;
                    }

                    const cmdList = cat.commands.map((c) => `• ${PREFIX}${c}`).join("\n");

                    await sendAndTrack(destChat, {
                        text: cmdList
                            ? `📋 *${cat.label}*\n\n${cmdList}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`
                            : `📋 *${cat.label}*\n\nNo commands available in this category\n\n_Reply *0* to go back to main menu_`,
                        contextInfo: getGlobalContextInfo(BOT_NAME),
                    }, { quoted: contactMessage });

                } catch (error) {
                    console.error("Menu reply error:", error);
                }
            };

            client.ev.on("messages.upsert", handleReply);
            setTimeout(cleanup, 300000);

        } catch (err) {
            console.error("Menu error:", err);
            try {
                const categories = buildCommandIndex();
                const simpleMenu =
                    `*📋 ${BOT_NAME} MENU*\n\n` +
                    `*1.* OUR WEB\n` +
                    `*2.* UPDATES\n` +
                    categories.map((c, i) => `*${i + 3}.* ${c.label}`).join("\n") +
                    `\n\n_Reply with a number_`;
                await client.sendMessage(from, { text: simpleMenu }, { quoted: mek });
            } catch (fallbackErr) {
                reply("Menu is temporarily unavailable. Try .help instead.");
            }
        }
    },
);
