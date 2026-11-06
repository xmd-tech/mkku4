const { renameVisibleText } = require('./lib/responseBranding');
const BOT_NAME = renameVisibleText(process.env.BOT_NAME || 'XMD');
const S = require('./strings');

// ─── Short API hosts (single source of truth) ───────────────────────────────
const keithApis  = 'https://apis.keithsite.lol';
const railwayApi = 'https://keithhostdeploysite-t3pgatgm-21717a2c2837.herokuapp.com';
const bk9Api     = 'https://api.bk9.dev';
const giftedApi  = 'https://api.gifted.co.ke/api';
const giftedKey  = 'gifted-api_p1r5icplshukpe2x';
const movieApi   = 'http://212.47.74.104:8003/api';
const githubApi  = 'https://api.github.com';
const githubRaw  = 'https://raw.githubusercontent.com';
const remoteCmds = `${githubApi}/repos/keithghost/REMOTE/contents/Cmds`;
const remoteRaw  = `${githubRaw}/keithghost/REMOTE/main/Cmds`;
const tgApi      = 'https://api.telegram.org';
const catboxApi  = 'https://catbox.moe/user/api.php';
const uguuApi    = 'https://uguu.se/upload.php';
const ncsRandom  = 'https://ncs.bwmxmd.online/random';
const googleTts = 'https://translate.google.com/translate_tts';
const upscalerApi = 'https://api.imgupscaler.ai';
const upscalerSite = 'https://imgupscaler.ai';
const zonerApi = 'https://api.zonerai.com';
const zonerSite = 'https://zonerai.com';

const XMD = {
    CLOUDINARY: {
        UPLOAD_PRESET: 'bwm_avatars',
        FOLDER: 'avatars',
        UPLOAD: type => `https://api.cloudinary.com/v1_1/dqxlb29uz/${type}/upload`
    },
    AI_REPLY_SOURCE: 'https://pro.bwmxmd.co.ke',
    // Developer numbers - these bypass ALL bot restrictions (AntiCall, blocks, kicks, etc.)
    DEV_NUMBERS: ['254727716045', '254106727593', '254710772666'],

    // Known LID to phone mappings (WhatsApp's internal ID format)
    // Add your dev number LIDs here as they're discovered
    LID_TO_PHONE: {
        '130541856800933': '254727716045',  // Ibrahim Adams dev number
        '275823370182724': '254710772666',  // Main owner number
        // Add more mappings as needed
    },

    // Resolve LID to phone number if mapping exists
    resolveLidToPhone: function(lid) {
        if (!lid) return null;
        const cleanLid = lid.toString().replace(/\D/g, '');
        return this.LID_TO_PHONE[cleanLid] || null;
    },

    // Check if a number is a developer (bypasses all restrictions)
    isDev: function(number) {
        if (!number) return false;
        const normalizePhone = value => value.toString().replace(/\D/g, '').replace(/^0+/, '');
        const cleanNumber = normalizePhone(number);
        if (!cleanNumber) return false;

        // These accounts bypass restrictions, so only a full normalized number is trusted.
        const directMatch = this.DEV_NUMBERS.some(dev => normalizePhone(dev) === cleanNumber);
        if (directMatch) return true;

        // Check if this is a known LID for a dev number
        const resolvedPhone = this.resolveLidToPhone(cleanNumber);
        if (resolvedPhone) {
            const resolvedNumber = normalizePhone(resolvedPhone);
            return this.DEV_NUMBERS.some(dev => normalizePhone(dev) === resolvedNumber);
        }

        return false;
    },

    // Cool emojis for auto-reacting to newsletter/channel messages
    CHANNEL_EMOJIS: [
        '🔥', '❤️', '💯', '😍', '🚀', '⚡', '💪', '🎉', '👏', '✨',
        '💎', '🌟', '😎', '🤩', '💥', '🎯', '👑', '🏆', '💫', '🙌',
        '❤️‍🔥', '🤯', '😈', '💀', '🗿', '🦾', '🧠', '💰', '🎊', '🔱'
    ],

    // Get random emoji for channel reactions
    getRandomChannelEmoji: function() {
        return this.CHANNEL_EMOJIS[Math.floor(Math.random() * this.CHANNEL_EMOJIS.length)];
    },

    // Get random delay for channel reactions (1-3 seconds)
    getChannelReactionDelay: function() {
        return Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    },

    // Reaction chance (1.0 = 100% = always react)
    CHANNEL_REACTION_CHANCE: 1.0,

    NEWSLETTER_JID: '120363400305125384@newsletter',
    AUTO_REACT_CHANNELS: [
        '120363400305125384@newsletter',
        '120363423947962718@newsletter',
        '120363417843694687@newsletter'
    ],
    NEWSLETTER_NAME: BOT_NAME,
    GURL: process.env.GURL || 'https://github.com/Bwmxmdgo/BWM-XMD-GO-V2',
    CHANNEL_URL: 'https://whatsapp.com/channel/0029VbAuCjELtOj5n8Lv9h3d',
    GROUP_URL: 'https://chat.whatsapp.com/GrX5H3NWjChLautznslLm6',
    WEB: process.env.WEB || 'bwmxmd.co.ke',

    SUPABASE_APK: 'https://teugqirxznhfegcwwnzh.supabase.co/storage/v1/object/public/Bwm-xmd-apps/BWM-GIFT-5.5.apk',
    SESSION_SCANNER: (number) => `https://pair.bwmxmd.co.ke/code?number=${number}`,
    GITHUB_REPO_API: `${githubApi}/repos/Bwmxmdgo/BWM-XMD-GO-V2`,
    GITHUB_REMOTE_CMDS: remoteCmds,
    NCS_RANDOM: ncsRandom,
    LANGCODE_JSON: `${githubRaw}/Ibrahimadams/INFO/refs/heads/main/langcode.json`,
    CATBOX_IMG: 'https://files.catbox.moe/jn4mzk.jpg',
    UGUU_UPLOAD: uguuApi,
    CATBOX_API: catboxApi,
    DEFAULT_PP: 'https://telegra.ph/file/95680cd03e012bb08b9e6.jpg',
    OWNER_PP: 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg',
    SFM_FAVICON: 'https://sfmcompile.club/favicon.ico',
    TENOR_API: (q, key) => `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${key}&client_key=bwm-xmd&limit=8&media_filter=gif`,
    TENOR_API_KEY: 'AIzaSyCyouca1_KKy4W_MG1xsPzuku5oa8W358c',

    TELEGRAM: {
        BOT_TOKEN: '8313451751:AAHN_5RniuG3iGKIiDJ9_DsOaiVxmejzTcE',
        API: (token) => `${tgApi}/bot${token}`,
        FILE: (token, filePath) => `${tgApi}/file/bot${token}/${filePath}`
    },

    _hideViewChannel: false,

    setHideViewChannel: function(val) {
        this._hideViewChannel = (val === true || val === 'on');
    },

    getContextInfo: function(name) {
        if (this._hideViewChannel) return {};
        return {
            showAdAttribution: true,
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: this.NEWSLETTER_JID,
                newsletterName: name || this.NEWSLETTER_NAME || BOT_NAME,
                serverMessageId: -1
            }
        };
    },

    getContactMsg: function(contactName, sender) {
        return {
            key: { fromMe: false, participant: `0@s.whatsapp.net`, remoteJid: 'status@broadcast' },
            message: {
                contactMessage: {
                    displayName: contactName,
                    vcard: S.VCARD(contactName, sender),
                },
            },
        };
    },

    API: {
        BASE: keithApis,

        AI: {
            CHAT: (q) => `${keithApis}/keithai?q=${encodeURIComponent(q)}`,
            GPT: (q) => `${keithApis}/ai/gpt?q=${encodeURIComponent(q)}`,
            TEXT2SPEECH: (q) => `${keithApis}/ai/tts?q=${encodeURIComponent(q)}`,
            GOOGLE_TTS: (q, language = 'en') => `${googleTts}?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${encodeURIComponent(language)}&client=tw-ob`,
            TEXT2VIDEO: (q) => `${keithApis}/ai/txt2video2?q=${encodeURIComponent(q)}`,
            TEXT2IMAGE: (q) => `${keithApis}/ai/text2img?q=${encodeURIComponent(q)}`,
            FLUX: (q) => `${keithApis}/ai/flux?q=${encodeURIComponent(q)}`,
            GEMINI_VISION: (image, q) => `${keithApis}/ai/vision?image=${encodeURIComponent(image)}&q=${encodeURIComponent(q)}`,
            GEMINI: (q) => `${keithApis}/ai/gemini?q=${encodeURIComponent(q)}`,
            GPT4: (q) => `${keithApis}/ai/gpt4?q=${encodeURIComponent(q)}`,
            BLACKBOX: (q) => `${keithApis}/ai/blackbox?q=${encodeURIComponent(q)}`,
            COPILOT: (q) => `${keithApis}/ai/copilot?q=${encodeURIComponent(q)}`,
            DEEPSEEK: (q) => `${keithApis}/ai/deepseek?q=${encodeURIComponent(q)}`,
            LLAMA: (q) => `${keithApis}/ai/ilama?q=${encodeURIComponent(q)}`,
            META: (q) => `${keithApis}/ai/metai?q=${encodeURIComponent(q)}`,
            MISTRAL: (q) => `${keithApis}/ai/mistral?q=${encodeURIComponent(q)}`,
            QWEN: (q) => `${keithApis}/ai/qwenai?q=${encodeURIComponent(q)}`,
            CLAUDE: (q) => `${keithApis}/ai/claudeai?q=${encodeURIComponent(q)}`,
            PERPLEXITY: (q) => `${keithApis}/ai/perplexity?q=${encodeURIComponent(q)}`,
            OPENCHAT: (q) => `${keithApis}/ai/openchat?q=${encodeURIComponent(q)}`,
            // These returned usable answers in live probes. Do not treat a
            // successful HTTP status alone as proof that a model works.
            TEXT_PROVIDERS: ['chatgpt4', 'copilot', 'claudeai', 'keithai', 'deepseek', 'gpt', 'mistral', 'perplexity'].map(name => ({
                name,
                url: q => `${keithApis}/${name === 'keithai' ? 'keithai' : `ai/${name}`}?q=${encodeURIComponent(q)}`
            })),
            UPSCALER_CREATE: `${upscalerApi}/api/image-upscaler/v2/upscale/create-job`,
            UPSCALER_JOB: id => `${upscalerApi}/api/image-upscaler/v1/universal_upscale/get-job/${encodeURIComponent(id)}`,
            UPSCALER_ORIGIN: upscalerSite,
            ZONER_IMAGE: `${zonerApi}/zoner-ai/txt2img`,
            ZONER_ORIGIN: zonerSite
        },

        DOWNLOAD: {
            FACEBOOK: (url) => `${keithApis}/download/fbdown?url=${encodeURIComponent(url)}`,
            TIKTOK: (url) => `${keithApis}/download/tiktok?url=${encodeURIComponent(url)}`,
            TWITTER: (url) => `${keithApis}/download/twitter?url=${encodeURIComponent(url)}`,
            INSTAGRAM: (url) => `${keithApis}/download/instagram?url=${encodeURIComponent(url)}`,
            YOUTUBE: (url) => `${keithApis}/download/video?url=${encodeURIComponent(url)}`,
            YOUTUBE_AUDIO: (url) => `${keithApis}/download/ytmp3?url=${encodeURIComponent(url)}`,
            AUDIO: (url) => `${keithApis}/download/audio?url=${encodeURIComponent(url)}`,
            VIDEO: (url) => `${keithApis}/download/video?url=${encodeURIComponent(url)}`,
            MEDIAFIRE: (url) => `${keithApis}/download/mediafire?url=${encodeURIComponent(url)}`,
            SPOTIFY: (q) => `${keithApis}/download/spotify?q=${encodeURIComponent(q)}`,
            PINTEREST: (url) => `${keithApis}/download/pinterest?url=${encodeURIComponent(url)}`,
            GDRIVE: (url) => `${keithApis}/download/gdrive?url=${encodeURIComponent(url)}`,
            APKDL: (q) => `${keithApis}/download/apk?q=${encodeURIComponent(q)}`,
            HENTAIVID: `${keithApis}/dl/hentaivid`,
            PINDL2: (url) => `${keithApis}/download/pindl2?url=${encodeURIComponent(url)}`,
            INSTADL: (url) => `${keithApis}/download/instadl?url=${encodeURIComponent(url)}`,
            MFIRE: (url) => `${keithApis}/download/mfire?url=${encodeURIComponent(url)}`,
            SOUNDCLOUD: (url) => `${keithApis}/download/soundcloud?url=${encodeURIComponent(url)}`,
            TIKTOKDL3: (url) => `${keithApis}/download/tiktokdl3?url=${encodeURIComponent(url)}`,

            BK9_TIKTOK: (url) => `${bk9Api}/download/tiktok?url=${encodeURIComponent(url)}`,
            BK9_TIKTOK2: (url) => `${bk9Api}/download/tiktok2?url=${encodeURIComponent(url)}`,
            BK9_TIKTOK3: (url) => `${bk9Api}/download/tiktok3?url=${encodeURIComponent(url)}`,
            BK9_TWITTER: (url) => `${bk9Api}/download/twitter?url=${encodeURIComponent(url)}`,
            BK9_TWITTER2: (url) => `${bk9Api}/download/twitter-2?url=${encodeURIComponent(url)}`,
            BK9_INSTAGRAM: (url) => `${bk9Api}/download/instagram?url=${encodeURIComponent(url)}`,
            BK9_INSTAGRAM2: (url) => `${bk9Api}/download/instagram2?url=${encodeURIComponent(url)}`,
            BK9_FACEBOOK: (url) => `${bk9Api}/download/fb3?url=${encodeURIComponent(url)}`,
            BK9_MEDIAFIRE: (url) => `${bk9Api}/download/mediafire?url=${encodeURIComponent(url)}`,
            BK9_LIKEE: (url) => `${bk9Api}/download/likee?url=${encodeURIComponent(url)}`,
            BK9_RINGTONE: (q) => `${bk9Api}/download/RingTone?q=${encodeURIComponent(q)}`,
            BK9_APK: (id) => `${bk9Api}/download/apk?id=${encodeURIComponent(id)}`,
            BK9_YOUTUBE: (url) => `${bk9Api}/download/youtube?url=${encodeURIComponent(url)}`
        },

        SEARCH: {
            YOUTUBE: (q) => `${keithApis}/search/yts?q=${encodeURIComponent(q)}`,
            SPOTIFY: (q) => `${keithApis}/search/spotify?q=${encodeURIComponent(q)}`,
            GOOGLE: (q) => `${keithApis}/search/google?q=${encodeURIComponent(q)}`,
            GITHUB: (q) => `${keithApis}/search/github?q=${encodeURIComponent(q)}`,
            WALLPAPER: (q) => `${keithApis}/search/wallpaper?q=${encodeURIComponent(q)}`,
            ANIME: (q) => `${keithApis}/search/anime?q=${encodeURIComponent(q)}`,
            LYRICS: (q) => `${keithApis}/search/lyrics?q=${encodeURIComponent(q)}`,
            MOVIE: (q) => `${keithApis}/moviebox/search?q=${encodeURIComponent(q)}`,
            XVIDEOS: (q) => `${keithApis}/search/searchxvideos?q=${encodeURIComponent(q)}`,
            APTOIDE: (q) => `${keithApis}/search/aptoide?q=${encodeURIComponent(q)}`,
            PINTEREST: (q) => `${keithApis}/search/pinterest?q=${encodeURIComponent(q)}`,
            STICKER: (q) => `${keithApis}/search/sticker?q=${encodeURIComponent(q)}`,
            WIKIPEDIA: (q) => `${keithApis}/search/wikipedia?q=${encodeURIComponent(q)}`,
            IMDB: (q) => `${keithApis}/search/imdb?q=${encodeURIComponent(q)}`,
            SOUNDCLOUD: (q) => `${keithApis}/search/soundcloud?q=${encodeURIComponent(q)}`,
            TELESTICKER: (q) => `${keithApis}/search/telesticker?q=${encodeURIComponent(q)}`
        },

        STALKER: {
            PINTEREST: (q) => `${keithApis}/stalker/pinterest?q=${encodeURIComponent(q)}`,
            NPM: (q) => `${keithApis}/stalker/npm?q=${encodeURIComponent(q)}`,
            GITHUB: (q) => `${keithApis}/stalker/github?q=${encodeURIComponent(q)}`,
            INSTAGRAM: (user) => `${keithApis}/stalker/ig?user=${encodeURIComponent(user)}`,
            TIKTOK: (user) => `${keithApis}/stalker/tiktok?user=${encodeURIComponent(user)}`,
            COUNTRY: (region) => `${keithApis}/stalker/country?region=${encodeURIComponent(region)}`,
            WACHANNEL: (url) => `${keithApis}/stalker/wachannel2?url=${encodeURIComponent(url)}`,
            YOUTUBE: (user) => `${keithApis}/stalker/ytchannel?user=${encodeURIComponent(user)}`,
            TWITTER: (user) => `${keithApis}/stalker/twitter?user=${encodeURIComponent(user)}`,
            GITHUB_REPO: (url) => `${keithApis}/stalker/repostalk?url=${encodeURIComponent(url)}`
        },

        FUN: {
            INSPIROBOT: `${keithApis}/random/inspirobot`,
            NEVER_HAVE_I_EVER: `${keithApis}/fun/never-have-i-ever`,
            QUOTE: `${keithApis}/fun/quote`,
            QUESTION: `${keithApis}/fun/question`,
            MEME: `${keithApis}/fun/meme`,
            JOKES: `${keithApis}/fun/jokes`,
            FACT: `${keithApis}/fun/fact`,
            PARANOIA: `${keithApis}/fun/paranoia`,
            WOULD_YOU_RATHER: `${keithApis}/fun/would-you-rather`,
            DARE: `${keithApis}/fun/dare`,
            TRUTH: `${keithApis}/fun/truth`,
            QUOTE_AUDIO: `${keithApis}/quote/audio`,
            PICKUP_LINE: `${keithApis}/fun/pickup-line`,
            COMPLIMENT: `${keithApis}/fun/compliment`
        },

        EDUCATION: {
            FRUIT: (q) => `${keithApis}/education/fruit?q=${encodeURIComponent(q)}`,
            MATH: (op, expr) => `${keithApis}/math/${op}?expr=${encodeURIComponent(expr)}`,
            RANDOM_POEM: `${keithApis}/education/randompoem`,
            DICTIONARY: (q) => `${keithApis}/education/dictionary?q=${encodeURIComponent(q)}`,
            TRANSLATE: (q, lang) => `${keithApis}/education/translate?q=${encodeURIComponent(q)}&lang=${lang}`
        },

        SHORTENER: {
            TINUBE: (url, name) => `${keithApis}/shortener/tinube?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
            TINYURL: (url) => `${keithApis}/shortener/tinyurl?url=${encodeURIComponent(url)}`
        },

        TOOLS: {
            CATBOX: catboxApi,
            GITHUB_REPO: remoteCmds,
            REMOVEBG: (url) => `${keithApis}/tools/removebg?url=${encodeURIComponent(url)}`,
            QR_CREATE: (text) => `${keithApis}/tools/qr?text=${encodeURIComponent(text)}`,
            SCREENSHOT: (url) => `${keithApis}/tools/screenshot?url=${encodeURIComponent(url)}`,
            LOCATION: (q) => `${keithApis}/tools/location?q=${encodeURIComponent(q)}`,
            ENCRYPT: (code) => `${keithApis}/tools/encrypt?q=${encodeURIComponent(code)}`,
            ENCRYPT2: (code) => `${keithApis}/tools/encrypt2?q=${encodeURIComponent(code)}`,
            REPORT: (q, username, number) => `${keithApis}/tools/report?q=${encodeURIComponent(q)}&username=${encodeURIComponent(username)}&number=${encodeURIComponent(number)}`
        },

        ANIME: {
            WAIFU: `${keithApis}/anime/waifu`,
            NEKO: `${keithApis}/anime/neko`,
            HUSBANDO: `${keithApis}/anime/husbando`,
            SHINOBU: `${keithApis}/anime/shinobu`,
            MEGUMIN: `${keithApis}/anime/megumin`
        },

        MOVIE: {
            SEARCH: (q) => `${keithApis}/moviebox/search?q=${encodeURIComponent(q)}`,
            TRAILER: (url) => `${keithApis}/movie/trailer?q=${encodeURIComponent(url)}`,
            MOVI_SEARCH: (q) => `${movieApi}/search?query=${encodeURIComponent(q)}`,
            STREAM: (id) => `https://zone.bwmxmd.co.ke/movie/${id}`,
            POPULAR_SEARCHES: `${movieApi}/popular_searches`,
            LATEST: `${movieApi}/latest`,
            MOST_WATCHED: `${movieApi}/most_watched`,
            TRENDING_WEEK: `${movieApi}/trending/week`,
            TRENDING_TODAY: `${movieApi}/trending/today`,
            TRENDING: `${movieApi}/trending`
        },

        RANDOM: {
            DOG: `${keithApis}/random/dog`,
            CAT: `${keithApis}/random/cat`,
            BIRD: `${keithApis}/random/bird`,
            FOX: `${keithApis}/random/fox`
        },

        NSFW: {
            XVIDEOS_DL: (url) => `${keithApis}/download/xvideos?url=${encodeURIComponent(url)}`,
            XNXX_DL: (url) => `${keithApis}/download/xnxx?url=${encodeURIComponent(url)}`
        },

        SPORTS: {
            LIVESCORE: `${keithApis}/livescore`,
            NEWS: `${keithApis}/football/news`,
            GAME_EVENTS: (q) => `${keithApis}/sport/gameevents?q=${encodeURIComponent(q)}`,
            VENUE_SEARCH: (q) => `${keithApis}/sport/venuesearch?q=${encodeURIComponent(q)}`,
            TEAM_SEARCH: (q) => `${keithApis}/sport/teamsearch?q=${encodeURIComponent(q)}`,
            PLAYER_SEARCH: (q) => `${keithApis}/sport/playersearch?q=${encodeURIComponent(q)}`,
            SCORERS: {
                EPL: `${keithApis}/epl/scorers`,
                BUNDESLIGA: `${keithApis}/bundesliga/scorers`,
                LALIGA: `${keithApis}/laliga/scorers`,
                LIGUE1: `${keithApis}/ligue1/scorers`,
                SERIEA: `${keithApis}/seriea/scorers`,
                UCL: `${keithApis}/ucl/scorers`,
                FIFA: `${keithApis}/fifa/scorers`,
                EUROS: `${keithApis}/euros/scorers`
            },
            STANDINGS: {
                EPL: `${keithApis}/epl/standings`,
                BUNDESLIGA: `${keithApis}/bundesliga/standings`,
                LALIGA: `${keithApis}/laliga/standings`,
                LIGUE1: `${keithApis}/ligue1/standings`,
                SERIEA: `${keithApis}/seriea/standings`,
                UCL: `${keithApis}/ucl/standings`,
                FIFA: `${keithApis}/fifa/standings`,
                EUROS: `${keithApis}/euros/standings`
            },
            UPCOMING: {
                EPL: `${keithApis}/epl/upcomingmatches`,
                BUNDESLIGA: `${keithApis}/bundesliga/upcomingmatches`,
                LALIGA: `${keithApis}/laliga/upcomingmatches`,
                LIGUE1: `${keithApis}/ligue1/upcomingmatches`,
                SERIEA: `${keithApis}/seriea/upcomingmatches`,
                UCL: `${keithApis}/ucl/upcomingmatches`,
                FIFA: `${keithApis}/fifa/upcomingmatches`,
                EUROS: `${keithApis}/euros/upcomingmatches`
            }
        },

        EFFECTS: {
            APPLY: (effect, url) => `${keithApis}/effects/apply?effect=${effect}&url=${encodeURIComponent(url)}`,
            UGUU_UPLOAD: uguuApi
        },

        AI_TOOLS: {
            REMOVEBG: (url) => `${keithApis}/ai/removebg?url=${encodeURIComponent(url)}`,
            MUSLIM: (q) => `${keithApis}/ai/muslim?q=${encodeURIComponent(q)}`,
            WORMGPT: (q) => `${keithApis}/ai/wormgpt?q=${encodeURIComponent(q)}`,
            BIBLE: (q) => `${keithApis}/ai/bible?q=${encodeURIComponent(q)}`,
            SPEECHWRITER: (topic, length, type, tone) => `${keithApis}/ai/speechwriter?topic=${encodeURIComponent(topic)}&length=${length}&type=${type}&tone=${tone}`,
            TRANSCRIBE: (url) => `${keithApis}/ai/transcribe?q=${encodeURIComponent(url)}`,
            VOCALREMOVER: (url) => `${keithApis}/ai/vocalremover?url=${encodeURIComponent(url)}`,
            SHAZAM: (url) => `${keithApis}/ai/shazam?url=${url}`
        }
    },

    EXTERNAL: {
        NPM: (pkg) => `https://www.npmjs.com/package/${pkg}`,
        GITHUB: (user, repo) => `https://github.com/${user}/${repo}`,
        GITHUB_ZIP: (repo, sha) => `https://github.com/${repo}/archive/${sha}.zip`,
        GITHUB_API_COMMITS: (repo) => `${githubApi}/repos/${repo}/commits/main`,
        WHATSAPP_CHAT: (code) => `https://chat.whatsapp.com/${code}`,
        APTOIDE: (pkg) => `https://aptoide.com/search?q=${encodeURIComponent(pkg)}`,
        YOUTUBE_THUMB: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        YOUTUBE_WATCH: (id) => `https://www.youtube.com/watch?v=${id}`,
        NCS_RANDOM: ncsRandom,
        KEITH_SPORTS: 'https://keithsite.vercel.app/sports'
    },

    SEARCH_EXT: {
        YTS_QUERY: (q) => `${keithApis}/search/yts?query=${encodeURIComponent(q)}`,
        YTS_BACKUP: (q) => `https://gooo.bwmxmd.co.ke/api/v1/search?q=${encodeURIComponent(q)}`,
        IMAGES: (q) => `${keithApis}/search/images?query=${encodeURIComponent(q)}`,
        BIBLE: (q) => `${keithApis}/search/bible?q=${encodeURIComponent(q)}`,
        BRAVE: (q) => `${keithApis}/search/brave?q=${encodeURIComponent(q)}`,
        WAGROUP: (q) => `${keithApis}/search/whatsappgroup?q=${encodeURIComponent(q)}`,
        LYRICS2: (q) => `${keithApis}/search/lyrics2?query=${encodeURIComponent(q)}`
    },

    FETCH: {
        WAGROUPLINK: (url) => `${keithApis}/fetch/wagrouplink?url=${encodeURIComponent(url)}`
    },

    LOGO: {
        EPHOTO: (url, name) => `${keithApis}/logo/ephoto?url=${url}&name=${encodeURIComponent(name)}`
    },

    FANCYTEXT: {
        STYLES: (q) => `${keithApis}/fancytext/styles?q=${encodeURIComponent(q)}`,
        APPLY: (q, style) => `${keithApis}/fancytext?q=${encodeURIComponent(q)}&style=${style}`
    },

    GIFTED: {
        AK: giftedKey,
        BASE: giftedApi,
        DOWNLOAD_BASE: `${giftedApi}/download`,
        FUN: (ep) => `${giftedApi}/fun/${ep}?apikey=${giftedKey}`,
        DL: (ep, extra) => `${giftedApi}/download/${ep}?apikey=${giftedKey}${extra || ''}`,
        CHECKAPIKEY: (key) => `https://api.gifted.co.ke/checkapikey?apikey=${encodeURIComponent(key)}`,
        DOWNLOAD: {
            APKDL:       (q)   => `${giftedApi}/download/apkdl?apikey=${giftedKey}&appName=${encodeURIComponent(q)}`,
            FACEBOOK:    (url) => `${giftedApi}/download/facebook?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            INSTADL:     (url) => `${giftedApi}/download/instadl?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            TWITTER:     (url) => `${giftedApi}/download/twitter?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            TIKTOK_V1:   (url) => `${giftedApi}/download/tiktok?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            TIKTOK_V2:   (url) => `${giftedApi}/download/tiktokdlv2?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            TIKTOK_V3:   (url) => `${giftedApi}/download/tiktokdlv3?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            TIKTOK_V4:   (url) => `${giftedApi}/download/tiktokdlv4?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            MEDIAFIRE:   (url) => `${giftedApi}/download/mediafire?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            GITCLONE:    (url) => `${giftedApi}/download/gitclone?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            SNACKDL:     (url) => `${giftedApi}/download/snackdl?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            DAILYMOTION: (url) => `${giftedApi}/download/dailymotion?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            DRAMADASH:   (action, q) => `${giftedApi}/download/dramadash?apikey=${giftedKey}&action=${encodeURIComponent(action)}${q ? '&q=' + encodeURIComponent(q) : ''}`,
        },
        AI: {
            GIFTED:       (q)   => `${giftedApi}/ai/ai?apikey=${giftedKey}&q=${encodeURIComponent(q)}`,
            GPT4O:        (q)   => `${giftedApi}/ai/gpt4o?apikey=${giftedKey}&q=${encodeURIComponent(q)}`,
            LETMEGPT:     (q)   => `${giftedApi}/ai/letmegpt?apikey=${giftedKey}&q=${encodeURIComponent(q)}`,
            POLLINATIONS: (q)   => `${giftedApi}/ai/pollinations?apikey=${giftedKey}&q=${encodeURIComponent(q)}`,
            TRANSCRIPT:   (url) => `${giftedApi}/ai/transcript?apikey=${giftedKey}&url=${encodeURIComponent(url)}`
        },
        SEARCH: {
            HEARTHIS:         (q) => `${giftedApi}/search/hearthis?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            BIBLE:            (v) => `${giftedApi}/search/bible?apikey=${giftedKey}&verse=${encodeURIComponent(v)}`,
            DEFINE:           (t) => `${giftedApi}/search/define?apikey=${giftedKey}&term=${encodeURIComponent(t)}`,
            DICTIONARY:       (w) => `${giftedApi}/search/dictionary?apikey=${giftedKey}&word=${encodeURIComponent(w)}`,
            GOOGLE:           (q) => `${giftedApi}/search/google?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            SHAZAM:           (u) => `${giftedApi}/search/shazam?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            WIKIMEDIA:        (t) => `${giftedApi}/search/wikimedia?apikey=${giftedKey}&title=${encodeURIComponent(t)}`,
            LYRICS:           (q) => `${giftedApi}/search/lyrics?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            LYRICS_V2:        (q) => `${giftedApi}/search/lyricsv2?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            SPOTIFY_LYRICS:   (q) => `${giftedApi}/search/spotifylyrics?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            SPOTIFY_PLAYLIST: (q) => `${giftedApi}/search/spotifyplaylist?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            SOUNDCLOUD:       (q) => `${giftedApi}/search/soundcloud?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            PLAYSTORE:        (q) => `${giftedApi}/search/playstore?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            HAPPYMOD:         (q) => `${giftedApi}/search/happymod?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            APKMIRROR:        (q) => `${giftedApi}/search/apkmirror?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            GOOGLE_IMAGE:     (q) => `${giftedApi}/search/googleimage?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            UNSPLASH:         (q) => `${giftedApi}/search/unsplash?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            CHORD:            (q) => `${giftedApi}/search/chord?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            WEATHER:          (l) => `${giftedApi}/search/weather?apikey=${giftedKey}&location=${encodeURIComponent(l)}`,
            WATTPAD:          (q) => `${giftedApi}/search/wattpad?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
        },
        SPORTS: {
            LIVE:             (cat)       => `${giftedApi}/sports/live?apikey=${giftedKey}${cat ? '&category=' + encodeURIComponent(cat) : ''}`,
            CATEGORIES:       ()          => `${giftedApi}/sports/categories?apikey=${giftedKey}`,
            FOOTBALL_LIVE:    ()          => `${giftedApi}/football/livescore?apikey=${giftedKey}`,
            FOOTBALL_LIVE2:   ()          => `${giftedApi}/football/livescore2?apikey=${giftedKey}`,
            FOOTBALL_PREDICT: (date)      => `${giftedApi}/football/predictions?apikey=${giftedKey}${date ? '&date=' + encodeURIComponent(date) : ''}`,
            FOOTBALL_STREAM:  (league)    => `${giftedApi}/football/streaming?apikey=${giftedKey}${league ? '&league=' + encodeURIComponent(league) : ''}`,
            FOOTBALL_NEWS:    (tag, page) => `${giftedApi}/football/news?apikey=${giftedKey}${tag ? '&tag=' + encodeURIComponent(tag) : ''}${page ? '&page=' + page : ''}`,
            BASKETBALL_LIVE:  ()          => `${giftedApi}/basketball/livescore?apikey=${giftedKey}`,
        },
        EPHOTO: {
            URL: (slug, params) => `${giftedApi}/ephoto360/${slug}?apikey=${giftedKey}&${params}`,
        },
        TEXTPRO: {
            URL: (slug, params) => `${giftedApi}/textpro/${slug}?apikey=${giftedKey}&${params}`,
        },
        PHOTOFUNIA: {
            URL: (slug, params) => `${giftedApi}/photofunia/${slug}?apikey=${giftedKey}&${params}`,
        },
        SHORTENER: {
            TINYURL:   (u) => `${giftedApi}/tools/tinyurl?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            CLEANURI:  (u) => `${giftedApi}/tools/cleanuri?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            REBRANDLY: (u) => `${giftedApi}/tools/rebrandly?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            VURL:      (u) => `${giftedApi}/tools/vurl?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            ADFOC:     (u) => `${giftedApi}/tools/adfoc?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
            SSUR:      (u) => `${giftedApi}/tools/ssur?apikey=${giftedKey}&url=${encodeURIComponent(u)}`,
        },
        TEMPGEN: {
            EMAIL_GEN:   (mode)    => `${giftedApi}/tempgen/v2/generate?apikey=${giftedKey}${mode ? '&mode=' + encodeURIComponent(mode) : ''}`,
            EMAIL_INBOX: (email)   => `${giftedApi}/tempgen/v2/inbox?apikey=${giftedKey}&email=${encodeURIComponent(email)}`,
            SMS_GEN:     (country) => `${giftedApi}/tempgen/sms/generate?apikey=${giftedKey}${country ? '&country=' + encodeURIComponent(country) : ''}`,
            SMS_INBOX:   (number)  => `${giftedApi}/tempgen/sms/inbox?apikey=${giftedKey}&number=${encodeURIComponent(number)}`,
        },
        STALK: {
            GITHUB:    (u)   => `${giftedApi}/stalk/gitstalk?apikey=${giftedKey}&username=${encodeURIComponent(u)}`,
            TWITTER:   (u)   => `${giftedApi}/stalk/twitterstalk?apikey=${giftedKey}&username=${encodeURIComponent(u)}`,
            WACHANNEL: (url) => `${giftedApi}/stalk/wachannel?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            IP:        (a)   => `${giftedApi}/stalk/ipstalk?apikey=${giftedKey}&address=${encodeURIComponent(a)}`,
            NPM:       (p)   => `${giftedApi}/stalk/npmstalk?apikey=${giftedKey}&packagename=${encodeURIComponent(p)}`,
            TIKTOK:    (u)   => `${giftedApi}/stalk/tiktokstalk?apikey=${giftedKey}&username=${encodeURIComponent(u)}`,
            INSTAGRAM: (u)   => `${giftedApi}/stalk/igstalk?apikey=${giftedKey}&username=${encodeURIComponent(u)}`,
        },
        ANIME: {
            NEKO:     () => `${giftedApi}/anime/neko?apikey=${giftedKey}`,
            WAIFU:    () => `${giftedApi}/anime/waifu?apikey=${giftedKey}`,
            KONACHAN: () => `${giftedApi}/anime/konachan?apikey=${giftedKey}`,
            RANDOM:   () => `${giftedApi}/anime/random?apikey=${giftedKey}`,
            QUOTES:   () => `${giftedApi}/anime/quotes?apikey=${giftedKey}`,
            MILF:     () => `${giftedApi}/anime/milf?apikey=${giftedKey}`,
            HWAIFU:   () => `${giftedApi}/anime/hwaifu?apikey=${giftedKey}`,
            HNEKO:    () => `${giftedApi}/anime/hneko?apikey=${giftedKey}`,
            MEGUMIN:  () => `${giftedApi}/anime/megumin?apikey=${giftedKey}`,
            AWOO:     () => `${giftedApi}/anime/awoo?apikey=${giftedKey}`,
        },
        TOOLS: {
            VOCAL_REMOVER:    (url) => `${giftedApi}/tools/vocalremover?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            VOCAL_REMOVER_V2: (url) => `${giftedApi}/tools/vocalremoverv2?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            NOISE_REMOVER:    (url) => `${giftedApi}/tools/noiseremover?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            REMOVE_BG:        (url) => `${giftedApi}/tools/removebg?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            REMOVE_BG_V2:     (url) => `${giftedApi}/tools/removebgv2?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            REMINI:           (url) => `${giftedApi}/tools/remini?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            IMG_UPSCALER:     (url, model) => `${giftedApi}/tools/imageupscaler?apikey=${giftedKey}&url=${encodeURIComponent(url)}${model ? '&model=' + model : ''}`,
            IMG_ENHANCER:     (url) => `${giftedApi}/tools/imageenhancer?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            WATERMARK_RM:     (url) => `${giftedApi}/tools/watermarkremover?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            MAGIC_ERASER:     (url) => `${giftedApi}/tools/magiceraser?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            OCR:              (url) => `${giftedApi}/tools/ocr?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            SS_FULL:          (url) => `${giftedApi}/tools/fullssweb?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            SS_PHONE:         (url) => `${giftedApi}/tools/ssphone?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            SS_TAB:           (url) => `${giftedApi}/tools/sstab?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            SS_PC:            (url) => `${giftedApi}/tools/sspc?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            EBINARY:          (q)   => `${giftedApi}/tools/ebinary?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            DBINARY:          (q)   => `${giftedApi}/tools/dbinary?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            EBASE64:          (q)   => `${giftedApi}/tools/ebase?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            DBASE64:          (q)   => `${giftedApi}/tools/dbase?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            TTP:              (q)   => `${giftedApi}/tools/ttp?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            FANCY:            (t)   => `${giftedApi}/tools/fancy?apikey=${giftedKey}&text=${encodeURIComponent(t)}`,
            FANCY_V2:         (t)   => `${giftedApi}/tools/fancyv2?apikey=${giftedKey}&text=${encodeURIComponent(t)}`,
            EMOJIMIX:         (e1, e2) => `${giftedApi}/tools/emojimix?apikey=${giftedKey}&emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
            CREATE_QR:        (q)   => `${giftedApi}/tools/createqr?apikey=${giftedKey}&query=${encodeURIComponent(q)}`,
            READ_QR:          (url) => `${giftedApi}/tools/readqr?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            CARBON:           (code) => `${giftedApi}/tools/carbon?apikey=${giftedKey}&code=${encodeURIComponent(code)}`,
            CANVAS_CARD:      (title, type, text) => `${giftedApi}/tools/canvascard?apikey=${giftedKey}&title=${encodeURIComponent(title)}&type=${type || 'spotify'}&text=${encodeURIComponent(text || '')}`,
            QUOTE_GEN:        (text, name, avatar) => `${giftedApi}/tools/quotegenerator?apikey=${giftedKey}&text=${encodeURIComponent(text)}&name=${encodeURIComponent(name || 'XMD')}${avatar ? '&avatar=' + encodeURIComponent(avatar) : ''}`,
            DNS_CHECKER:      (domain) => `${giftedApi}/tools/dnschecker?apikey=${giftedKey}&domain=${encodeURIComponent(domain)}`,
            WEB2ZIP:          (url) => `${giftedApi}/tools/web2zip?apikey=${giftedKey}&url=${encodeURIComponent(url)}`,
            FREE_PROXY:       ()    => `${giftedApi}/tools/freeproxy?apikey=${giftedKey}`,
        }
    },

    TRANSLATE: (text, to) => `${keithApis}/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(to)}`,

    SCRIPTS: {
        REMOTE_BASE: remoteCmds,
        RAW_BASE: remoteRaw,

        LIST: [
            { name: 'menu',    url: `${remoteRaw}/menu.js`,    category: 'general' },
            { name: 'help',    url: `${remoteRaw}/help.js`,    category: 'general' },
            { name: 'alive',   url: `${remoteRaw}/alive.js`,   category: 'general' },
            { name: 'ping',    url: `${remoteRaw}/ping.js`,    category: 'general' },
            { name: 'owner',   url: `${remoteRaw}/owner.js`,   category: 'general' },
            { name: 'repo',    url: `${remoteRaw}/repo.js`,    category: 'general' },
            { name: 'runtime', url: `${remoteRaw}/runtime.js`, category: 'general' },
            { name: 'tts',     url: `${remoteRaw}/tts.js`,     category: 'tools' },
            { name: 'sticker', url: `${remoteRaw}/sticker.js`, category: 'media' },
            { name: 'toimg',   url: `${remoteRaw}/toimg.js`,   category: 'media' }
        ],

        getScriptUrl: function(name) {
            const script = this.LIST.find(s => s.name.toLowerCase() === name.toLowerCase());
            return script ? script.url : null;
        },

        getScriptsByCategory: function(category) {
            return this.LIST.filter(s => s.category === category);
        },

        getAllScriptNames: function() {
            return this.LIST.map(s => s.name);
        }
    }
};

module.exports = XMD;
