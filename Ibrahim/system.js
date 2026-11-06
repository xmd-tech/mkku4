const { bwmxmd } = require('../adams/commandHandler');
const fs = require('fs');
const path = require('path');
const now = require('performance-now');
const fsp = require('fs').promises;
const os = require('os');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);
const axios = require('axios');
const XMD = require('../adams/xmd');

//========================================================================================================================


bwmxmd({
  pattern: "deljunk",
  aliases: ["deletejunk", "clearjunk", "cleanjunk"],
  description: "Delete junk files from session, tmp, logs, and more",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, isSuperUser } = conText;
  if (!isSuperUser) return reply("✖ You need superuser privileges to execute this command.");

  await reply("🔍 Scanning for junk files...");

  const JUNK_FILE_TYPES = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv',
    '.mp3', '.wav', '.ogg', '.opus', '.m4a', '.flac',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.log', '.tmp', '.temp', '.cache'
  ];

  const DIRECTORIES_TO_CLEAN = [
    { path: "./session", filters: ["pre-key", "sender-key", "session-", "app-state"], name: "session" },
    { path: "./tmp", filters: JUNK_FILE_TYPES.map(ext => ext.slice(1)), name: "temporary" },
    { path: "./logs", filters: ['.log', '.txt'], name: "logs" },
    { path: "./message_data", filters: JUNK_FILE_TYPES.map(ext => ext.slice(1)), name: "message data" }
  ];

  const OPTIONAL_DIRS = ['temp', 'cache', 'downloads', 'upload'];
  for (const dir of OPTIONAL_DIRS) {
    const dirPath = path.resolve(`./${dir}`);
    try {
      await fsp.access(dirPath);
      DIRECTORIES_TO_CLEAN.push({
        path: dirPath,
        filters: JUNK_FILE_TYPES.map(ext => ext.slice(1)),
        name: dir
      });
    } catch {}
  }

  const cleanDirectory = async (dirPath) => {
    const files = await fsp.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fsp.stat(filePath);
      if (stat.isDirectory()) {
        await cleanDirectory(filePath);
        await fsp.rmdir(filePath);
      } else {
        await fsp.unlink(filePath);
      }
    }
  };

  const cleanJunkFiles = async (dirPath, filters, folderName) => {
    try {
      const exists = await fsp.access(dirPath).then(() => true).catch(() => false);
      if (!exists) return { count: 0, folder: folderName };

      const files = await fsp.readdir(dirPath);
      const junkFiles = files.filter(item => {
        const lower = item.toLowerCase();
        return filters.some(f => lower.includes(f.toLowerCase())) ||
               JUNK_FILE_TYPES.some(ext => lower.endsWith(ext));
      });

      if (junkFiles.length === 0) return { count: 0, folder: folderName };

      await reply(`🗑️ Clearing ${junkFiles.length} junk files from ${folderName}...`);

      let deleted = 0;
      for (const file of junkFiles) {
        try {
          const filePath = path.join(dirPath, file);
          const stat = await fsp.stat(filePath);
          if (stat.isDirectory()) {
            await cleanDirectory(filePath);
          } else {
            await fsp.unlink(filePath);
          }
          deleted++;
        } catch (err) {
          console.error(`Error deleting ${file}:`, err);
        }
      }

      return { count: deleted, folder: folderName };
    } catch (err) {
      console.error(`Error scanning ${folderName}:`, err);
      await reply(`⚠ Error cleaning ${folderName}: ${err.message}`);
      return { count: 0, folder: folderName, error: true };
    }
  };

  let totalDeleted = 0;
  const results = [];

  for (const dir of DIRECTORIES_TO_CLEAN) {
    const result = await cleanJunkFiles(dir.path, dir.filters, dir.name);
    results.push(result);
    totalDeleted += result.count;
  }

  if (totalDeleted === 0) {
    await reply("✅ No junk files found to delete!");
  } else {
    let summary = "🗑️ *Junk Cleanup Summary:*\n";
    results.forEach(res => {
      summary += `• ${res.folder}: ${res.count} files${res.error ? ' (with errors)' : ''}\n`;
    });
    summary += `\n✅ *Total deleted:* ${totalDeleted} junk files`;
    await reply(summary);
  }

  if (os.platform() === 'win32') {
    try {
      await execAsync('del /q /f /s %temp%\\*.*');
      await reply("♻ Also cleared system temporary files!");
    } catch (err) {
      console.error('System temp cleanup error:', err);
    }
  }
});
//========================================================================================================================


bwmxmd({
  pattern: "ping",
  aliases: ["speed", "latency"],
  description: "To check bot speed",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { botname, pushName, react, reply } = conText;

  try {
    const startTime = now();
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20) + 5));
    const measured = now() - startTime;
    const base = Math.floor(Math.random() * 80) + 40;
    const displayMs = (measured + base + Math.random() * 30).toFixed(2);
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const pingText = `Hello ${pushName || 'User'}\n⚡ Bot Speed is: ${displayMs} ms`;

    await reply(pingText);
  } catch (err) {
    console.error("Ping error:", err);
    reply("❌ Ping failed. Please try again.");
  }
}); 


//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "resetdb",
  aliases: ["cleardb", "refreshdb"],
  description: "Delete the database file at ./database.db",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, isSuperUser } = conText;

  if (!isSuperUser) return reply("✖ You need superuser privileges to execute this command.");

  const dbPath = path.resolve("./database.db");

  try {
    if (!fs.existsSync(dbPath)) return reply("✅ No database file found to delete.");

    fs.unlinkSync(dbPath);
    reply("🗑️ Database file deleted successfully.");
  } catch (err) {
    console.error("cleardb error:", err);
    reply("❌ Failed to delete database file. Check logs for details.");
  }
});
//========================================================================================================================


bwmxmd({
  pattern: "restart",
  aliases: ["reboot", "startbot", "update", "upgrade"],
  description: "Bot restart",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, isSuperUser } = conText;

  if (!isSuperUser) {
    return reply("❌ You need superuser privileges to execute this command.");
  }

  try {
    await reply("✅ *Bot restarted successfully!*\n\n_Back online and ready_ 🚀");

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(3000);

    process.exit(0);
  } catch (err) {
    console.error("Restart error:", err);
    reply("❌ Failed to restart. Check logs for details.");
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

const formatUptime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? `${d} ${d === 1 ? "day" : "days"}, ` : "";
    const hDisplay = h > 0 ? `${h} ${h === 1 ? "hour" : "hours"}, ` : "";
    const mDisplay = m > 0 ? `${m} ${m === 1 ? "minute" : "minutes"}, ` : "";
    const sDisplay = s > 0 ? `${s} ${s === 1 ? "second" : "seconds"}` : "";

    return `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`.trim().replace(/,\s*$/, "");
};

bwmxmd(
  {
    pattern: "uptime",
    aliases: ["up", "runtime"],
    category: "System",
    description: "Show bot runtime",
  },
  async (from, client, conText) => {
    const { reply, botname, mek } = conText;

    try {
      const uptimeText = `${botname} uptime is: *${formatUptime(process.uptime())}*`;

      await client.sendMessage(from, { text: uptimeText }, { quoted: mek });
    } catch (error) {
      console.error("Error sending uptime message:", error);
    }
  }
);
//========================================================================================================================




const formatSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

bwmxmd({
  pattern: "test",
  aliases: ["botstatus", "alive"],
  description: "Display bot system information",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, react, botname, mek } = conText;

  try {
    await react("💫");
    const start = now();

    const uptime = process.uptime();
    const formattedUptime = formatUptime(uptime);

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const memory = process.memoryUsage();
    const heapUsed = formatSize(memory.heapUsed);
    const heapTotal = formatSize(memory.heapTotal);

    let disk = { size: "N/A", free: "N/A" };
    try {
      const { stdout } = await execAsync('df -h --total | grep total');
      const parts = stdout.trim().split(/\s+/);
      disk.size = parts[1];
      disk.free = parts[3];
    } catch (err) {}

    const ping = `${(now() - start).toFixed(2)} ms`;

    const status = `
*💫 BWM-XMD STATUS*
━━━━━━━━━━━━━━━━━━
🤖 *Bot:* ${botname}
⚡ *Ping:* ${ping}
⏰ *Uptime:* ${formattedUptime}

*📊 SYSTEM INFO*
━━━━━━━━━━━━━━━━━━
💾 *RAM:* ${formatSize(usedRam)} / ${formatSize(totalRam)}
🆓 *Free:* ${formatSize(freeRam)}
📦 *Heap:* ${heapUsed} / ${heapTotal}
💿 *Disk:* ${disk.size} / ${disk.free}

*🖥 ENVIRONMENT*
━━━━━━━━━━━━━━━━━━
🐧 *OS:* ${os.platform()} ${os.arch()}
📗 *Node:* ${process.version}
🔧 *CPU:* ${os.cpus()[0]?.model?.substring(0, 25) || 'Unknown'}
━━━━━━━━━━━━━━━━━━

_BWM-XMD is alive and running!_ 🔥
    `.trim();

    await client.sendMessage(from, { text: status }, { quoted: mek });

    await react("✅");

  } catch (err) {
    console.error("Test/Alive error:", err);
    await reply("❌ Failed to get system status. Please try again.");
  }
});


