// ai-tools.js
const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const mime = require('mime-types');
const https = require('https');
const XMD = require('../adams/xmd');
const { safeChatAnswer, requestVisionAnswer, cleanAIText } = require('../adams/lib/chatbotApi');
const { requestGeneratedMedia, isMedia } = require('../adams/lib/aiMedia');

// ---------------------------------------------------------------------------

bwmxmd({
  pattern: "gpt",
  aliases: ["ai", "ask", "chatgpt", "unlimitedai"],
  category: "AI",
  description: "Ask AI a question with automatic provider fallback",
  filename: __filename
}, async (from, client, conText) => {
  const { q, quotedMsg, reply, api } = conText;

  let query = q;
  if (!query && quotedMsg) {
    query = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
  }

  if (!query) {
    return reply("📌 Usage: .gpt <question>\nExample: .gpt What is JavaScript?");
  }

  try {
    await reply(await safeChatAnswer(query));

  } catch (err) {
    console.warn('AI reply delivery unavailable');
  }
});
// Generic AI model query commands (mistral, wormgpt, claudeai, bard, etc.)
// ---------------------------------------------------------------------------
const aiModels = [
  "chatgpt4", "perplexity"];

for (const pattern of aiModels) {
  bwmxmd({
    pattern: pattern,
    category: "Ai",
    description: `Query via ${pattern} API`
  }, async (from, client, conText) => {
    const { q, reply, api } = conText;
    if (!q) return reply("❌ Provide a query");

    try {
      await reply(await safeChatAnswer(q, axios, { preferred: pattern }));
    } catch (err) {
      console.warn('AI reply delivery unavailable');
    }
  });
}

// ---------------------------------------------------------------------------
// Image upscaler helper (imgupscaler.ai)
// ---------------------------------------------------------------------------
function genSerial() {
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

async function upscaleImage(buffer) {
  const serial = genSerial();

  const form = new FormData();
  form.append("original_image_file", buffer, "image.jpg");
  form.append("upscale_type", "8");

  // Create job
  const createRes = await axios.post(
    XMD.API.AI.UPSCALER_CREATE,
    form,
    {
      headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
        "product-serial": serial,
        timezone: "Asia/Jakarta",
        origin: XMD.API.AI.UPSCALER_ORIGIN,
        referer: XMD.API.AI.UPSCALER_ORIGIN + '/'
      }
    }
  );

  const create = createRes.data;
  if (create.code !== 100000) throw new Error("❌ Failed to create upscale job");

  const jobId = create.result.job_id;

  // Poll until job completes
  while (true) {
    await new Promise(r => setTimeout(r, 3000));

    const res = await axios.get(
      XMD.API.AI.UPSCALER_JOB(jobId),
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
          "product-serial": serial,
          origin: XMD.API.AI.UPSCALER_ORIGIN,
          referer: XMD.API.AI.UPSCALER_ORIGIN + '/'
        }
      }
    );

    const json = res.data;
    if (
      json.code === 100000 &&
      json.message?.en === "Image generated successfully."
    ) {
      return json.result.output_url;
    }
  }
}

//========================================================================================================================

bwmxmd({
  pattern: "hd",
  aliases: ["upscale", "enhance", "hdimage", "superres"],
  description: "Upscale quoted image to HD",
  category: "Ai",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply } = conText;

  if (!quotedMsg) return reply("📌 Reply to an image message to upscale it.");
  if (!quoted?.imageMessage) return reply("❌ Only image messages are supported.");

  let filePath;
  try {
    // Save quoted image locally
    filePath = await client.downloadAndSaveMediaMessage(quoted.imageMessage);
    const buffer = await fs.readFile(filePath);

    // Upscale
    const upscaledUrl = await upscaleImage(buffer);

    // Send back upscaled image
    await client.sendMessage(from, { image: { url: upscaledUrl }, caption: "🔼 HD Upscaled" }, { quoted: mek });

  } catch (err) {
    console.error("HD Upscale error:", err);
    await reply("❌ Failed to upscale image. Try again.");
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "speechwriter",
  aliases: ["speech", "writer"],
  category: "education",
  description: "Generate a speech using the Speechwriter API"
},
async (from, client, conText) => {
  const { q, reply, api } = conText;

  if (!q) {
    return reply("❌ Provide a topic, e.g. .speechwriter how to pass exam");
  }

  try {
    // Defaults
    const length = "short";
    const type = "dedication";
    const tone = "serious";

    // Build API URL with defaults
    const url = XMD.API.AI_TOOLS.SPEECHWRITER(q, length, type, tone);

    // Call API
    const res = await axios.get(url, { timeout: 7000 });

    if (!res.data || !res.data.status || !res.data.result?.data?.data?.speech) {
      throw new Error('Speech provider unavailable');
    }

    const speech = res.data.result.data.data.speech;

    // Reply with the speech
    await reply(cleanAIText(speech));
  } catch (err) {
    await reply(await safeChatAnswer(`Write a short, serious dedication speech about: ${q}`));
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "muslimai",
  aliases: ["muslim", "quranai"],
  category: "Religion",
  description: "Query MuslimAI API for Qur'anic references"
},
async (from, client, conText) => {
  const { q, reply, api } = conText;

  if (!q) return reply("❌ Provide a query, e.g. .muslimai who is Allah");

  try {
    // Call MuslimAI API
    const res = await axios.get(XMD.API.AI_TOOLS.MUSLIM(q), { timeout: 7000 });

    if (!res.data || !res.data.status || !res.data.result) {
      throw new Error('Reference provider unavailable');
    }

    const results = res.data.result.results;

    if (!Array.isArray(results)) throw new Error('Reference provider returned no valid results');
    if (results.length === 0) {
      return reply("ℹ️ No relevant verses found.");
    }

    // Format top 3 results
    let output = `📖 *MuslimAI Results for:* ${res.data.result.query}\n\n`;
    results.slice(0, 3).forEach((r, i) => {
      output += `*${i + 1}. Surah ${r.surah_title}*\n${r.content.trim()}\n🔗 ${r.surah_url}\n\n`;
    });

    await reply(cleanAIText(output.trim()));
  } catch (err) {
    await reply(await safeChatAnswer(`Answer this Islamic question carefully. Do not invent Quranic references; state uncertainty when needed: ${q}`));
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "bibleai",
  aliases: ["aibible", "scripture"],
  description: "Ask Bible-based questions and get answers with references",
  category: "Religion",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek, api } = conText;

  if (!q) return reply("📖 Ask a Bible question.\n\nExample: bibleai what is faith");

  try {
    const res = await axios.get(XMD.API.AI_TOOLS.BIBLE(q), { timeout: 7000 });
    const data = res.data;

    if (!data.status || !data.result?.results?.data?.answer) {
      throw new Error('Reference provider unavailable');
    }

    const answer = cleanAIText(data.result.results.data.answer);
    const sources = data.result.results.data.sources;

    const caption = `📖 *${q}*\n\n${answer}\n\n📌 *Sources:* Reply with a number to view\n` +
      sources.map((src, i) => {
        if (src.type === "verse") return `${i + 1}. 📜 ${src.text}`;
        if (src.type === "article") return `${i + 1}. 📘 ${src.title}`;
      }).join("\n");

    const sent = await client.sendMessage(from, { text: caption }, { quoted: mek });
    const messageId = sent.key.id;

    client.ev.on("messages.upsert", async (update) => {
      const msg = update.messages[0];
      if (!msg.message) return;

      const responseText = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;
      const chatId = msg.key.remoteJid;

      if (!isReply) return;

      const index = parseInt(responseText.trim()) - 1;
      const selected = sources[index];

      if (!selected) {
        return client.sendMessage(chatId, {
          text: "❌ Invalid number. Reply with a valid source number.",
          quoted: msg
        });
      }

      await client.sendMessage(chatId, { react: { text: "📖", key: msg.key } });

      if (selected.type === "verse") {
        const ref = selected.bcv.referenceLong.replace(/\s+/g, "").replace(":", ":");
        try {
          const verseRes = await axios.get(XMD.SEARCH_EXT.BIBLE(ref));
          const verseData = verseRes.data;

          if (!verseData.status || !verseData.result?.verses) {
            return client.sendMessage(chatId, {
              text: `❌ Couldn't fetch verse: ${selected.text}`,
              quoted: msg
            });
          }

          const verses = verseData.result.verses.map(v =>
            `📖 *${v.book} ${v.chapter}:${v.verse}*\n${v.text}`
          ).join("\n\n");

          await client.sendMessage(chatId, { text: verses }, { quoted: msg });
        } catch (err) {
          console.error("Verse fetch error:", err);
          await client.sendMessage(chatId, {
            text: "❌ Error fetching verse text.",
            quoted: msg
          });
        }
      } else if (selected.type === "article") {
        await client.sendMessage(chatId, {
          image: { url: selected.image },
          caption: `📘 *${selected.title}*\n\n${selected.text}\n\n🔗 ${selected.url}`
        }, { quoted: msg });
      }
    });
  } catch (err) {
    await reply(await safeChatAnswer(`Answer this Bible question carefully. Do not invent verse references; state uncertainty when needed: ${q}`));
  }
});

//========================================================================================================================

function getMediaType(quoted) {
  if (quoted.imageMessage) return "image";
  if (quoted.videoMessage) return "video";
  if (quoted.stickerMessage) return "sticker";
  if (quoted.audioMessage) return "audio";
  if (quoted.documentMessage) return "document";
  return "unknown";
}

async function saveMediaToTemp(client, quotedMedia, type) {
  const tmpDir = path.join(__dirname, "..", "tmp");
  await fs.ensureDir(tmpDir);
  const fileName = `${type}-${Date.now()}`;
  const filePath = path.join(tmpDir, fileName);
  const savedPath = await client.downloadAndSaveMediaMessage(quotedMedia, filePath);
  return savedPath;
}

async function uploadToUguu(filePath) {
  if (!fs.existsSync(filePath)) throw new Error("File does not exist");

  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  const form = new FormData();
  form.append('files[]', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mimeType
  });

  const response = await axios.post(XMD.API.EFFECTS.UGUU_UPLOAD, form, {
    headers: {
      ...form.getHeaders(),
      'origin': new URL(XMD.API.EFFECTS.UGUU_UPLOAD).origin,
      'referer': new URL(XMD.API.EFFECTS.UGUU_UPLOAD).origin + '/',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
    }
  });

  const result = response.data;
  if (result.success && result.files?.[0]?.url) {
    return result.files[0].url;
  } else {
    throw new Error("Uguu upload failed or malformed response");
  }
}

//========================================================================================================================

bwmxmd({
  pattern: "vision",
  aliases: ["imgai", "analyze", "geminivision"],
  description: "Analyze quoted image using Gemini Vision AI",
  category: "Ai",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply, q, api } = conText;

  if (!quotedMsg) return reply("📌 Reply to an image message to analyze it");
  if (!q || typeof q !== "string") return reply("❌ Missing query. Use q='your question'");

  const type = getMediaType(quotedMsg);
  if (type !== "image") return reply("❌ Only image messages are supported");

  const mediaNode = quoted?.imageMessage;
  if (!mediaNode) return reply("❌ Could not extract image content");

  let filePath;
  try {
    filePath = await saveMediaToTemp(client, mediaNode, type);
    const imageUrl = await uploadToUguu(filePath);

    await reply(await requestVisionAnswer(imageUrl, q));

  } catch (err) {
    await reply("I can't inspect this image right now. Please send a text description so I can help.");
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "vocalremover",
  aliases: ["removevocal", "aivocal", "extractvocal"],
  description: "Extract vocals from quoted audio or video",
  category: "Ai",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply, botname, botPic, api } = conText;

  if (!quotedMsg) return reply("📌 Reply to an audio or video message to extract vocals");

  const type = getMediaType(quotedMsg);
  if (type === "unknown") return reply("❌ Unsupported media type");

  const mediaNode = quoted?.[`${type}Message`];
  if (!mediaNode) return reply("❌ Could not extract media content");

  let filePath;
  try {
    filePath = await saveMediaToTemp(client, mediaNode, type);
    const mediaUrl = await uploadToUguu(filePath);

    const { data: result } = await axios.get(XMD.API.AI_TOOLS.VOCALREMOVER(mediaUrl), { timeout: 15000 });
    if (!result?.status || !result?.result?.vocal) return reply("❌ No vocal track found");

    const vocalUrl = result.result.vocal;

    await client.sendMessage(from, {
      audio: { url: vocalUrl },
      mimetype: "audio/mpeg",
      fileName: "vocal.mp3",
      ptt: false
    }, { quoted: mek });

  } catch (err) {
    console.error("VocalRemover error:", err);
    await reply("❌ Failed to extract vocals. Try with a shorter or fresh clip.");
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "transcribe",
  aliases: ["speech", "audio2text", "whisper"],
  description: "Transcribe quoted audio or video to text",
  category: "Ai",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply, api } = conText;

  if (!quotedMsg) return reply("📌 Reply to an audio or video message to transcribe it");

  const type = getMediaType(quotedMsg);
  if (type === "unknown") return reply("❌ Unsupported media type");

  const mediaNode = quoted?.[`${type}Message`];
  if (!mediaNode) return reply("❌ Could not extract media content");

  let filePath;
  try {
    filePath = await saveMediaToTemp(client, mediaNode, type);
    const mediaUrl = await uploadToUguu(filePath);

    const { data: result } = await axios.get(XMD.API.AI_TOOLS.TRANSCRIBE(mediaUrl), { timeout: 15000 });
    if (!result?.status || !result?.result?.text) return reply("❌ No transcription found");

    await reply(cleanAIText(result.result.text));

  } catch (err) {
    console.error("Transcription error:", err);
    await reply("❌ Failed to transcribe. Try a shorter or clearer clip.");
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

//========================================================================================================================

bwmxmd({
  pattern: "shazam",
  aliases: ["identify", "whatmusic", "whatsong"],
  description: "Identify music from quoted audio or video",
  category: "Ai",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply, botname, api } = conText;

  if (!quotedMsg) return reply("📌 Reply to an audio or video message to identify music");

  const type = getMediaType(quotedMsg);
  if (type === "unknown") return reply("❌ Unsupported media type");

  const mediaNode = quoted?.[`${type}Message`];
  if (!mediaNode) return reply("❌ Could not extract media content");

  let filePath;
  try {
    filePath = await saveMediaToTemp(client, mediaNode, type);
    const mediaUrl = await uploadToUguu(filePath);

    const { data: result } = await axios.get(XMD.API.AI_TOOLS.SHAZAM(mediaUrl), { timeout: 15000 });
    if (!result?.status || !result?.result?.title) return reply("❌ No music info found");

    const { title, artists, album, release_date } = result.result;

    let txt = `*${botname} Music ID*\n\n`;
    txt += `*Title:* ${title}\n`;
    if (artists?.length) txt += `*Artists:* ${artists.join(', ')}\n`;
    if (album) txt += `*Album:* ${album}\n`;
    if (release_date) txt += `*Release Date:* ${release_date}`;

    await client.sendMessage(from, { text: txt }, { quoted: mek });

  } catch (err) {
    console.error("Shazam error:", err);
    await reply("❌ Failed to identify music. Try with a shorter or fresh clip.");
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});

//=========================================

bwmxmd({
  pattern: "dictionary",
  aliases: ["define", "meaning"],
  description: "Look up word definitions and phonetics",
  category: "Education",
  filename: __filename
}, async (from, client, conText) => {
  const { q, reply, mek, api } = conText;

  if (!q) return reply("📚 Type a word to define.\n\nExample: dictionary cat");

  try {
    const res = await axios.get(`${api}/education/dictionary?q=${encodeURIComponent(q)}`);
    const data = res.data;

    if (!data.status || !data.result?.meanings) {
      return reply("❌ No definition found.");
    }

    const { word, phonetics, meanings, sourceUrls } = data.result;

    const phoneticText = phonetics.map(p => p.text).filter(Boolean).join(", ");
    const audio = phonetics.find(p => p.audio)?.audio;

    const defs = meanings.map(m => {
      const defs = m.definitions.map((d, i) => `  ${i + 1}. ${d.definition}`).join("\n");
      return `📌 *${m.partOfSpeech}*\n${defs}`;
    }).join("\n\n");

    const caption = `📚 *${word}*\n🔊 Phonetics: ${phoneticText || "—"}\n\n${defs}\n\n🔗 Source: ${sourceUrls[0]}`;

    if (audio) {
      await client.sendMessage(from, {
        audio: { url: audio },
        mimetype: 'audio/mp4',
        ptt: false
      }, { quoted: mek });
    }

    await client.sendMessage(from, { text: caption }, { quoted: mek });
  } catch (err) {
    console.error("dictionary error:", err);
    await reply(await safeChatAnswer(`Give a clear dictionary-style definition of: ${q}`));
  }
});

//========================================================================================================================

const reso = {
  portrait: { width: 768, height: 1344 },
  landscape: { width: 1344, height: 768 },
  square: { width: 1024, height: 1024 },
  ultra: { width: 1536, height: 1536 },
  tall: { width: 832, height: 1344 },
  wide: { width: 1344, height: 832 }
};

bwmxmd({
  pattern: "bing",
  aliases: ["text2image", "text2img", "aiimage", "imggen"],
  category: "ai",
  description: "Generate AI image from text prompt"
}, async (from, client, conText) => {
  const { q, reply, mek } = conText;

  if (!q) {
    return reply(
      "Please provide a prompt and optional resolution.\n" +
      "Example:\n" +
      "• text2img cute cat\n" +
      "• text2img cute cat|square\n" +
      "• text2img cute cat|landscape\n" +
      "• text2img cute cat|tall\n" +
      "• text2img cute cat|ultra"
    );
  }

  // Parse arguments
  const queryParts = q.split("|");
  const prompt = queryParts[0].trim();
  const resolution = queryParts[1]?.trim().toLowerCase() || "portrait";
  const upscale = 2;

  if (!reso[resolution]) {
    const validResolutions = Object.keys(reso).join(", ");
    return reply(`Invalid resolution. Available options: ${validResolutions}`);
  }

  try {
    await reply(`🔄 Generating image for: *"${prompt}"* (${resolution})...`);

    const { width, height } = reso[resolution];

    const form = new FormData();
    form.append("Prompt", prompt);
    form.append("Language", "eng_Latn");
    form.append("Size", `${width}x${height}`);
    form.append("Upscale", upscale.toString());
    form.append("Batch_Index", "0");

    const generated = await requestGeneratedMedia('image', prompt);
    if (generated?.buffer) {
      return client.sendMessage(from, {
        image: generated.buffer,
        caption: `AI Generated Image\n\nPrompt: ${prompt}`
      }, { quoted: mek });
    }
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.post(
      XMD.API.AI.ZONER_IMAGE,
      form,
      {
        httpsAgent: agent,
        headers: {
          ...form.getHeaders(),
          Origin: XMD.API.AI.ZONER_ORIGIN,
          Referer: XMD.API.AI.ZONER_ORIGIN + '/',
          "User-Agent": "Mozilla/5.0"
        },
        responseType: "arraybuffer",
        timeout: 15000
      }
    );

    const buffer = Buffer.from(response.data);
    if (!isMedia(buffer, 'image')) throw new Error('No generated image');
    const caption = `🎨 AI Generated Image\n\n*Prompt:* ${prompt}\n*Resolution:* ${resolution} (${width}x${height})`;

    await client.sendMessage(from, {
      image: buffer,
      caption,
      mimetype: "image/jpeg"
    }, { quoted: mek });

  } catch (err) {
    await reply("Image generation is unavailable right now. Here is a text description instead:\n\n" +
      await safeChatAnswer(`Describe this image concept without claiming to generate or send an image: ${prompt}`));
  }
});
