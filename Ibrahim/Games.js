const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');

async function sendGame(from, client, mek, url, label, idPrefix, trusted = ["github.com","raw.githubusercontent.com"]) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000
  });
  const html = response.data;
  const responseId = `${idPrefix}-${Date.now()}`;

  const content = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: { messageDisclaimerText: "", botResponseId: responseId }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: label }],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
              response_id: responseId,
              sections: [{
                view_model: {
                  primitive: {
                    __typename: "GenAIaeacdsnwHtmlPrimitive",
                    payload: html,
                    trusted_sources: trusted
                  },
                  __typename: "GenAISingleLayoutViewModel"
                }
              }]
            })).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  await client.relayMessage(from, content, {});
}

// Game configs with aliases
const games = {
  bubble: {
    url: "https://raw.githubusercontent.com/kkeizzahB/RAW/refs/heads/main/Cmds/games/bubbleshooter.html",
    label: "🎮 Bubble Shooter",
    id: "bubblegame",
    aliases: ["bubbleshooter","bubblegame","shootbubble"]
  },
  tictactoe: {
    url: "https://raw.githubusercontent.com/kkeizzahB/RAW/refs/heads/main/Cmds/games/tictactoe.html",
    label: "🎮 Tic Tac Toe",
    id: "tictactoe",
    aliases: ["ttt","ttc","xoxo"]
  },
  hillclimber: {
    url: "https://raw.githubusercontent.com/kkeizzahB/RAW/refs/heads/main/Cmds/games/hillclimber.html",
    label: "🏔️ Hill Climber",
    id: "hillclimber",
    aliases: ["hillclimb","hcr","climber"],
    trusted: ["github.com","raw.githubusercontent.com","keithkeizzah.site"]
  },
  turborace: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/turborace.html",
    label: "🏎️ Turbo Race",
    id: "turbo",
    aliases: ["turbo","carrace","racingcar"],
    trusted: ["github.com","raw.githubusercontent.com","keithkeizzah.site"]
  },
  blockbuster: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/blockbuster.html",
    label: "🎬 Blockbuster",
    id: "blockbuster",
    aliases: ["block","buster","moviegame"]
  },
  cardriver: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/cardriver.html",
    label: "🚗 Car Driver",
    id: "cardriver",
    aliases: ["driver","car","drivegame"]
  },
  chess: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/chess.html",
    label: "♟️ Chess",
    id: "chess",
    aliases: ["chessgame","boardchess"]
  },
  fruitmatch: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/fruitmatch.html",
    label: "🍓 Fruit Match",
    id: "fruitmatch",
    aliases: ["fruit","matchfruit","fruitgame"]
  },
  geometrydash: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/geometrydash.html",
    label: "📐 Geometry Dash",
    id: "geometrydash",
    aliases: ["geo","dash","gdash"]
  },
  plane: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/plane.html",
    label: "✈️ Plane Game",
    id: "plane",
    aliases: ["plane","fly","airgame"]
  },
  tetris: {
    url: "https://github.com/kkeizzahB/RAW/raw/refs/heads/main/Cmds/games/tetris.html",
    label: "🧩 Tetris",
    id: "tetris",
    aliases: ["tet","blocks","tetrisgame"]
  }
};

// Auto-register each game
for (const [pattern, cfg] of Object.entries(games)) {
  bwmxmd({
    pattern,
    aliases: cfg.aliases,
    category: "Game",
    description: `Play ${cfg.label.replace(/^[^ ]+ /,'')}`,
    filename: __filename
  }, async (from, client, { mek, reply }) => {
    try {
      await sendGame(from, client, mek, cfg.url, cfg.label, cfg.id, cfg.trusted);
    } catch (err) {
      reply(`❌ Error: ${err.message}`);
    }
  });
}