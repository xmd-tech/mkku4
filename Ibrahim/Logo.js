const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const mime = require('mime-types');

//========================================================================================================================
// Ephoto styles loader
//========================================================================================================================
const fetchLogoUrl = async (url, texts, api) => {
  try {
    const params = texts.map((t, i) => `text${i + 1}=${encodeURIComponent(t)}`).join("&");
    const response = await axios.get(`${api}/logo/ephoto?url=${encodeURIComponent(url)}&${params}`);
    return response.data?.result?.download_url || null;
  } catch (error) {
    console.error("Error fetching logo:", error.message);
    return null;
  }
};

const loadStyles = async () => {
  try {
    const stylesRes = await axios.get("https://raw.githubusercontent.com/kkeizzahB/RAW/refs/heads/main/Cmds/style.json");
    const styles = stylesRes.data || {};

    for (const [pattern, url] of Object.entries(styles)) {
      bwmxmd({
        pattern,
        category: "ephoto",
        description: `Generate logo using Ephoto style: ${pattern}`,
        filename: __filename
      },
      async (from, client, { q, mek, reply, api }) => {
        if (!q) {
          return reply(`_Please provide text(s) to create logo_\nUsage: .${pattern} <text1>|<text2>|<text3> or just single text`);
        }

        const texts = q.split("|").map(s => s.trim()).filter(Boolean);
        if (!texts.length) {
          return reply("_At least one text is required._");
        }

        try {
          const logoUrl = await fetchLogoUrl(url, texts, api);
          if (logoUrl) {
            await client.sendMessage(from, { image: { url: logoUrl } }, { quoted: mek });
          } else {
            reply("_Unable to fetch logo. Please try again later._");
          }
        } catch (error) {
          console.error(`${pattern} logo command error:`, error);
          reply(`❌ An error occurred:\n${error.message}`);
        }
      });
    }
  } catch (err) {
    console.error("Error loading styles:", err.message);
  }
};

loadStyles();

//========================================================================================================================
// Photofunia helpers
//========================================================================================================================
function getMediaType(quoted) {
  if (quoted.imageMessage) return "image";
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
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  const form = new FormData();
  form.append('files[]', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
    contentType: mimeType
  });

  const response = await axios.post('https://uguu.se/upload.php', form, {
    headers: {
      ...form.getHeaders(),
      'origin': 'https://uguu.se',
      'referer': 'https://uguu.se/',
      'user-agent': 'Mozilla/5.0'
    }
  });

  const result = response.data;
  if (result.success && result.files?.[0]?.url) {
    return result.files[0].url;
  } else {
    throw new Error("Uguu upload failed");
  }
}

const fetchPhotoFuniaUrl = async (effectUrl, imageUrl, texts, api) => {
  try {
    let params = `effect=${encodeURIComponent(effectUrl)}`;
    if (imageUrl) params += `&url=${encodeURIComponent(imageUrl)}`;
    if (texts?.length) {
      params += "&" + texts.map((t, i) => `text${i + 1}=${encodeURIComponent(t)}`).join("&");
    }

    const response = await axios.get(`${api}/logo/photofunia?${params}`);
    const result = response.data?.result || [];
    const large = result.find(r => r.size === "Large");
    const regular = result.find(r => r.size === "Regular");
    return (large?.url || regular?.url) || null;
  } catch (error) {
    console.error("Photofunia fetch error:", error.message);
    return null;
  }
};

//========================================================================================================================
// Photofunia styles loader
//========================================================================================================================
const loadPhotoFuniaStyles = async () => {
  try {
    const stylesRes = await axios.get("https://raw.githubusercontent.com/kkeizzahB/RAW/refs/heads/main/Cmds/photofunia.json");
    const styles = stylesRes.data || {};

    for (const [pattern, effectUrl] of Object.entries(styles)) {
      bwmxmd({
        pattern,
        category: "photofunia",
        description: `Generate logo using Photofunia effect: ${pattern}`,
        filename: __filename
      },
      async (from, client, { q, mek, reply, api, quoted, quotedMsg }) => {
        const texts = q ? q.split("|").map(s => s.trim()).filter(Boolean) : [];

        let imageUrl = null;
        let filePath;

        if (quotedMsg && getMediaType(quotedMsg) === "image") {
          try {
            filePath = await saveMediaToTemp(client, quoted.imageMessage, "image");
            imageUrl = await uploadToUguu(filePath);
          } catch (err) {
            console.error("Image upload error:", err);
            return reply("❌ Failed to process quoted image.");
          } finally {
            if (filePath && fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch {}
            }
          }
        }

        if (!texts.length && !imageUrl) {
          return reply(`📌 Usage:\n.${pattern} <text1>|<text2> or reply with an image plus optional text`);
        }

        try {
          const logoUrl = await fetchPhotoFuniaUrl(effectUrl, imageUrl, texts, api);
          if (logoUrl) {
            await client.sendMessage(from, { image: { url: logoUrl } }, { quoted: mek });
          } else {
            reply("❌ Unable to fetch Photofunia result.");
          }
        } catch (error) {
          console.error(`${pattern} Photofunia command error:`, error);
          reply(`❌ An error occurred:\n${error.message}`);
        }
      });
    }
  } catch (err) {
    console.error("Error loading Photofunia styles:", err.message);
  }
};

loadPhotoFuniaStyles();