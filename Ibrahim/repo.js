const { bwmxmd } = require('../adams/commandHandler');
const { sendButtons } = require('gifted-btns');
const axios = require('axios');
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const s = require(__dirname + "/../config");
const XMD = require('../adams/xmd');
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

const MEDIA_URLS = s.BOT_URL || [];
const BOT_NAME = s.BOT || 'BWM XMD';
const getGlobalContextInfo = (name) => XMD.getContextInfo(name);

const randomMedia = () => {
    if (!MEDIA_URLS || MEDIA_URLS.length === 0) return null;
    const url = MEDIA_URLS[Math.floor(Math.random() * MEDIA_URLS.length)];
    if (typeof url === 'string') {
        const trimmed = url.trim();
        return trimmed.startsWith('http') ? trimmed : null;
    }
    return null;
};



bwmxmd({
  pattern: "bwmgift",
  aliases: ["bwmapk", "siteapk"],
  description: "Send BWM-XMD APK",
  category: "General",
  filename: __filename
}, async (from, client, conText) => {
  const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';
  const { mek, botPic } = conText;

  const apkUrl = XMD.SUPABASE_APK;
  const fileName = "BWMGIFT5.5.apk";

  try {
    await client.sendMessage(from, {
      document: { url: apkUrl },
      mimetype: "application/vnd.android.package-archive",
      fileName,
      contextInfo: {
        ...getGlobalContextInfo(BOT_NAME),
        externalAdReply: {
          title: "BWMGIFT APK",
          body: "",
          mediaType: 1,
          sourceUrl: `https://zone.${XMD.WEB}`,
          thumbnailUrl: botPic,
          renderLargerThumbnail: false
        }
      }
    }, { quoted: mek });
  } catch (err) {
    console.error("bwmsite APK send error:", err);
    await client.sendMessage(from, { text: "❌ Failed to send APK. " + (err?.message || "Unknown error"), contextInfo: getGlobalContextInfo(BOT_NAME) }, { quoted: mek });
  }
});

bwmxmd({
  pattern: "pair",
  description: "Generate pairing code and copy it",
  category: "General",
  filename: __filename
}, async (from, client, conText) => {
  const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';
  const { mek, q, reply, botname, deviceMode } = conText;
  if (!q) {
    return reply("❌ Please provide a number to pair.\nExample: .pair 254123456378");
  }

  try {
    
    const urlsRes = await axios.get('https://ockvxxtnzryvsjtiakqi.supabase.co/functions/v1/pair-urls');
    const urls = urlsRes.data?.urls || [];
    if (urls.length === 0) {
      return reply("❌ No pairing servers available right now.");
    }
    const baseUrl = urls[Math.floor(Math.random() * urls.length)].replace(/\/$/, '');

    const response = await axios.get(`${baseUrl}/code?number=${q}`);
    const data = response.data;

    if (!data.code) {
      return reply("❌ Failed to generate pairing code.");
    }

    const code = data.code;
    const messageText =
      `🔑 *Pairing Code Generated*\n\n` +
      `• Number: ${q}\n` +
      `• Code: *${code}*\n\n` +
      `📋 Copy the code above and paste in WhatsApp pairing.`;

    if (deviceMode === 'iPhone') {
      await client.sendMessage(from, { text: messageText });
    } else {
      try {
        await sendButtons(client, from, {
          title: '',
          text: messageText + `\n\n_Tap button to copy._`,
          footer: `> *${botname}*`,
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Pairing Code",
                id: "copy_pair",
                copy_code: code
              })
            }
          ]
        }, { quoted: mek });
      } catch (btnErr) {
        await client.sendMessage(from, {
          text: messageText,
          contextInfo: getGlobalContextInfo(BOT_NAME)
        }, { quoted: mek });
      }
    }
  } catch (err) {
    console.error("pair error:", err);
    return reply("❌ Failed to fetch pairing code. Error: " + err.message);
  }
});

bwmxmd({
  pattern: "location",
  aliases: ["pinlocation", "getlocation"],
  category: "General",
  description: "Send a location pin by name",
  filename: __filename
}, async (from, client, conText) => {
  const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';
  const { mek, q, reply } = conText;

  if (!q) {
    return reply("📌 Usage: `.location Nairobi, Kenya`");
  }

  try {
    const apiUrl = XMD.API.TOOLS.LOCATION(q);
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data.status || !data.result?.results?.length) {
      return reply(`❌ Could not find location for: ${q}`);
    }

    const loc = data.result.results[0];
    const { lat, lng } = loc.geometry;
    const formatted = loc.formatted || q;

    await client.sendMessage(
      from,
      {
        location: {
          degreesLatitude: lat,
          degreesLongitude: lng,
          name: formatted
        },
        contextInfo: getGlobalContextInfo(BOT_NAME)
      },
      { quoted: mek }
    );
  } catch (err) {
    console.error("Location error:", err);
    reply("❌ Failed to fetch location.");
  }
});

bwmxmd({
  pattern: "copy",
  aliases: ["copied", "cp"],
  description: "Copy quoted message text via button",
  category: "General",
  filename: __filename
}, async (from, client, conText) => {
  const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';
  const { mek, quotedMsg, reply, botname, deviceMode } = conText;

  if (!quotedMsg) {
    return reply("📌 Reply to a message with `.copy` to generate a copy button.");
  }

  const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
  if (!text) {
    return reply("❌ Could not extract quoted text.");
  }

  const plainText = `📋 *Text to Copy:*\n\n\`\`\`${text}\`\`\`\n\n_Long-press to copy._`;

  if (deviceMode === 'iPhone') {
    await client.sendMessage(from, { text: plainText });
  } else {
    try {
      await sendButtons(client, from, {
        title: "",
        text: plainText,
        footer: `> *${botname}*`,
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copy Text",
              id: "copy_text",
              copy_code: text
            })
          }
        ]
      }, { quoted: mek });
    } catch (err) {
      console.error("Copy button failed, sending plain text:", err.message);
      await client.sendMessage(from, {
        text: plainText,
        contextInfo: getGlobalContextInfo(BOT_NAME)
      }, { quoted: mek });
    }
  }
});

bwmxmd({
  pattern: "repo",
  aliases: ["script", "sc", "git"],
  description: "Send BWM-XMD repo information with random audio",
  category: "General",
  filename: __filename
}, async (from, client, conText) => {
  const BOT_NAME = conText.botname || s.BOT || 'BWM XMD';
  const { mek, author } = conText;

  const contextInfo = getGlobalContextInfo(BOT_NAME);

  try {
    const response = await axios.get(XMD.GITHUB_REPO_API, { timeout: 10000 });
    const repoData = response.data;
    const currentTime = moment().tz("Africa/Nairobi").format("DD/MM/YYYY HH:mm:ss");

    const createdDate = new Date(repoData.created_at).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric"
    });

    const lastUpdateDate = new Date(repoData.updated_at).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric"
    });

    const repoUrl = 'github.com/Bwmxmdgo/BWM-XMD-GO-V2';

    const messageText =
      `📌 *${BOT_NAME} REPO INFO*\n\n` +
      `⭐ Stars: ${repoData.stargazers_count * 2}\n` +
      `🍴 Forks: ${repoData.forks_count * 2}\n` +
      `📅 Created: ${createdDate}\n` +
      `🕰 Updated: ${lastUpdateDate}\n` +
      `👤 Owner: ${author}\n\n` +
      `🔗 Repo Url\n ${repoUrl}\n\n` +
      `▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> pro.bwmxmd.co.ke \n▬▬▬▬▬▬▬▬▬▬`;

    const botPicUrl = (conText.botPic && typeof conText.botPic === 'string' && conText.botPic.startsWith('http')) ? conText.botPic : null;
    const rawMedia = botPicUrl || randomMedia();
    const selectedMedia = rawMedia ? await fetchWithRetry(rawMedia) : null;
    let sentMsg;

    if (selectedMedia) {
      try {
        if (selectedMedia.match(/\.(mp4|gif)$/i)) {
          sentMsg = await client.sendMessage(from, {
            video: { url: selectedMedia },
            gifPlayback: true,
            width: 800,
            height: 800,
            caption: messageText,
            contextInfo
          }, { quoted: mek });
        } else {
          sentMsg = await client.sendMessage(from, {
            image: { url: selectedMedia },
            caption: messageText,
            contextInfo
          }, { quoted: mek });
        }
      } catch (mediaErr) {
        console.error("Repo media error:", mediaErr.message);
        sentMsg = await client.sendMessage(from, { text: messageText, contextInfo }, { quoted: mek });
      }
    } else {
      sentMsg = await client.sendMessage(from, { text: messageText, contextInfo }, { quoted: mek });
    }

  } catch (err) {
    console.error("❌ Repo fetch failed:", err);
    await client.sendMessage(from, {
      text: "❌ Failed to fetch repository information.",
      contextInfo
    }, { quoted: mek });
  }
});
