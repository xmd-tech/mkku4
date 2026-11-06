const { bwmxmd } = require('../adams/commandHandler');
const fs = require("fs");
const { exec } = require("child_process");

// Generic processor
async function processAudio(client, from, mek, audioMessage, filter) {
  const mediaPath = await client.downloadAndSaveMediaMessage(audioMessage);
  const outPath = `tmp-${Date.now()}.mp3`;

  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${mediaPath} ${filter} ${outPath}`, (err) => {
      fs.unlinkSync(mediaPath);
      if (err) return reject(err);

      try {
        const buff = fs.readFileSync(outPath);
        client.sendMessage(from, { audio: buff, mimetype: "audio/mpeg" }, { quoted: mek });
        fs.unlinkSync(outPath);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Factory
function makeAudioCommand(name, filter) {
  bwmxmd({
    pattern: name,
    category: "Audio-Edit",
    description: `${name} audio effect`,
    filename: __filename
  }, async (from, client, { mek, reply, quoted, quotedMsg }) => {
    if (!quotedMsg) return reply("📌 Please reply to an audio message.");
    if (!quoted?.audioMessage) return reply("❌ This command only works with audio.");

    try {
      await processAudio(client, from, mek, quoted.audioMessage, filter);
    } catch (err) {
      console.error(`${name} error:`, err);
      reply("❌ Failed to process audio.");
    }
  });
}

makeAudioCommand("blown", "-af acrusher=.1:1:64:0:log");
makeAudioCommand("earrape", "-af volume=12");
makeAudioCommand("fat", '-filter:a "atempo=1.6,asetrate=22100"');
makeAudioCommand("robot", '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"');
makeAudioCommand("tupai", '-filter:a "atempo=0.5,asetrate=65100"');
makeAudioCommand("deep", "-af atempo=4/4,asetrate=44500*2/3");
makeAudioCommand("bass", "-af equalizer=f=18:width_type=o:width=2:g=14");
makeAudioCommand("reverse", '-filter_complex "areverse"');
makeAudioCommand("slow", '-filter:a "atempo=0.8,asetrate=44100"');
makeAudioCommand("tempo", '-filter:a "atempo=0.9,asetrate=65100"');
makeAudioCommand("nightcore", '-filter:a "atempo=1.07,asetrate=44100*1.20"');
makeAudioCommand("chipmunk", '-filter:a "atempo=1.5,asetrate=44100*1.25"');
makeAudioCommand("vaporwave", '-filter:a "atempo=0.8,asetrate=44100*0.9"');
makeAudioCommand("echo", '-af "aecho=0.8:0.9:1000:0.3"');
makeAudioCommand("reverb", '-af "aecho=0.8:0.9:60:0.4"');
makeAudioCommand("phaser", '-af "aphaser=in_gain=0.4:out_gain=0.74:delay=3:decay=0.4:speed=0.5"');
makeAudioCommand("flanger", '-af "flanger"');
makeAudioCommand("distort", '-af "acrusher=0.1:0.5:64:0:log"');
makeAudioCommand("surround", '-af "surround"');