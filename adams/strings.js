const NL = '\n';
const NL2 = '\n\n';

const S = {

    NL:  NL,
    NL2: NL2,

    // ── Startup / Connected ──────────────────────────────────────────────────

    XMD_AI_CONNECTED: 'XMD AI CONNECTED SUCCESSFULLY',

    CONNECTED_MSG: function(mode, device, deviceEmoji, prefix, totalCommands, ownerNum, currentTime) {
        return '*\u2705 XMD CONNECTED*' + NL2 +
            '\uD83E\uDD16 *Bot:* XMD' + NL +
            '\uD83C\uDF10 *Mode:* ' + mode + NL +
            deviceEmoji + ' *Device:* ' + device + NL +
            '\u2699\uFE0F *Prefix:* [ ' + prefix + ' ]' + NL +
            '\uD83D\uDCE6 *Commands:* ' + totalCommands + NL +
            '\uD83D\uDC64 *Owner:* ' + ownerNum + NL +
            '\uD83D\uDD50 *Time:* ' + currentTime + NL2 +
            '_\u23F3 Commands may take up to 5 minutes to sync. Please be patient while the bot initializes._' + NL2 +
            '*Bot deployment site*' + NL + '> pro.bwmxmd.co.ke ' + NL2 +
            '*To set up your bot settings use*' + NL + '> ' + prefix + ' settings ' + NL +
            '\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC';
    },

    SUBBOT_CONNECTED_MSG: function(mode, subPrefix, commandCount, phone, currentTime) {
        return '*\u2705 XMD SUB-BOT CONNECTED*' + NL2 +
            '\uD83E\uDD16 *Bot:* XMD Sub-Bot' + NL +
            '\uD83C\uDF10 *Mode:* ' + mode + NL +
            '\u2699\uFE0F *Prefix:* [ ' + subPrefix + ' ]' + NL +
            '\uD83D\uDCE6 *Commands:* ' + commandCount + NL +
            '\uD83D\uDC64 *Owner:* ' + phone + NL +
            '\uD83D\uDD50 *Time:* ' + currentTime + NL2 +
            '_\u23F3 Commands may take up to 5 minutes to sync. Please be patient while the bot initializes._' + NL2 +
            '*Bot deployment site*' + NL + '> pro.bwmxmd.co.ke ' + NL2 +
            '*To set up your bot settings use*' + NL + '> ' + subPrefix + ' settings ' + NL +
            '\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC';
    },

    // ── Session / Boot messages ──────────────────────────────────────────────

    SESSION_ERROR_TITLE:   ' \u2716 SESSION ERROR',
    SESSION_GET_FROM:      ' Get session from:',
    SESSION_SCAN_URL:      ' https://main.bwmxmd.co.ke/scan',
    SESSION_WEB_CONTINUE:  ' Web server will continue running. Set SESSION env var and restart.',
    SESSION_NOT_FOUND_ERR: 'SESSION_NOT_FOUND',

    BOT_SETTINGS_LOADED:   'Bot settings loaded',
    ALL_DATABASES_SYNCED:  'All databases synced',
    ALL_PLUGINS_LOADED:    'All plugins loaded',
    WEB_SERVER_STARTED:    'Web server started on port ',
    CONNECTING_WA:         'Connecting to WhatsApp...',
    SYNCING_DATABASES:     'Syncing databases...',
    STARTING_WEB_SERVER:   'Starting web server...',
    SESSION_FILES_EXIST:   'Session files already exist',
    SUDO_ALREADY:          'Sudo number already',
    BOT_IDENTITY_SET:      'Bot identity set',

    // ── AI Chatbot ───────────────────────────────────────────────────────────

    AI_SYSTEM_PROMPT: '[System: You are XMD, a WhatsApp AI assistant made by Ibrahim Adams. You are NOT Keith AI and NOT made by Keithkeizzah. Only mention your name or creator if the user asks who you are or who made you. Otherwise just reply naturally without introducing yourself.]' + NL,

    AI_CONV_ITEM: function(userText, aiText) {
        return 'User: ' + userText + NL + 'AI: ' + aiText;
    },

    VISION_ANALYSIS: function(response) {
        return '\uD83D\uDD0D Vision Analysis:' + NL2 + response;
    },

    AI_CHAT_TITLE:    'AI Chat Assistant',
    AI_VOICE_TITLE:   'AI Voice Assistant',
    AI_VIDEO_TITLE:   'AI Video Assistant',
    AI_MESSAGE_TITLE: 'AI Message Assistant',
    AI_VISION_TITLE:  'AI Vision Assistant',
    BOT_SUPPORT_BODY: 'XMD Bot Support',
    BOT_THUMBNAIL:    'https://files.catbox.moe/bkuj17.jpg',
    GITHUB_REPO:      'https://github.com/Bwmxmdgo/BWM-XMD-GO-V2',

    // ── Anti-Delete ──────────────────────────────────────────────────────────

    GROUP_INFO_LINE: function(subject) {
        return NL + 'Group: ' + subject;
    },

    AD_NOTIF: function(header, senderDisplay, groupInfo, deleterDisplay, chatType) {
        return header + NL +
            'Deleted by: @' + deleterDisplay + NL +
            'Original sender: @' + senderDisplay + NL +
            groupInfo + NL +
            'Chat type: ' + chatType;
    },

    AD_NOTIF_SUBBOT: function(header, senderDisplay, groupInfo, deleterDisplay, msgType) {
        return header + NL +
            'From: ' + senderDisplay + groupInfo + NL +
            'Deleted by: ' + deleterDisplay + NL +
            'Type: ' + msgType;
    },

    AD_DEFAULT_HEADER: '\uD83D\uDDD1\uFE0F *Message Deleted*',

    AD_NO_CONTENT: function(notification) {
        return notification + NL2 + '\uD83D\uDCDD *Deleted message content not captured*' + NL + '_(Message was sent before being tracked or was a bot echo)_';
    },

    AD_TEXT: function(notification, text) {
        return notification + NL2 + '\uD83D\uDCDD *Deleted Text:*' + NL + text;
    },

    AD_CONTENT: function(notification, text) {
        return notification + NL2 + '\uD83D\uDCDD Content: ' + text;
    },

    AD_FULL_CAPTION: function(notification, caption) {
        return notification + (caption ? NL2 + '\uD83D\uDCDD Caption: ' + caption : '');
    },

    AD_UNKNOWN_TYPE: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F A media message was deleted (unknown type)';
    },

    AD_UNKNOWN_TYPE_SUBBOT: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F Unknown media type deleted';
    },

    AD_MEDIA_FAIL: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F A media message was deleted but could not be retrieved';
    },

    AD_MEDIA_FAIL_SUBBOT: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F Media could not be retrieved';
    },

    AD_MEDIA_DISABLED: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F A media message was deleted (media capture is disabled)';
    },

    AD_MEDIA_DISABLED_SUBBOT: function(notification) {
        return notification + NL2 + '\u26A0\uFE0F Media deleted (capture disabled)';
    },

    // ── AntiEdit ─────────────────────────────────────────────────────────────
    AE_NOTIF: function(header, senderDisplay, groupInfo, chatType) {
        return header + NL +
            'Edited by: @' + senderDisplay + NL +
            groupInfo + NL +
            'Chat type: ' + chatType;
    },

    AE_DEFAULT_HEADER: '\uD83D\uDCDD *Message Edited*',

    AE_NO_ORIGINAL: function(notification) {
        return notification + NL2 + '\uD83D\uDCDD *Original message not captured*' + NL + '_(Message was sent before being tracked)_';
    },

    AE_TEXT: function(notification, oldText, newText) {
        return notification + NL2 +
            '\uD83D\uDCDD *Original:*' + NL + oldText;
    },

    AE_CAPTION: function(notification, oldCap, newCap) {
        return notification + NL2 +
            '\uD83D\uDCDD *Original caption:*' + NL + (oldCap || '_(none)_');
    },

    // ── ViewOnce ─────────────────────────────────────────────────────────────

    VIEWONCE_SOURCE: function(senderName) {
        return '\uD83D\uDCE9 *ViewOnce from:* ' + senderName;
    },

    VIEWONCE_GROUP: function(subject) {
        return NL + '\uD83D\uDCCD *Group:* ' + subject;
    },

    VIEWONCE_MEDIA_CAPTION: function(sourceInfo, caption) {
        return sourceInfo + (caption ? NL2 + '\uD83D\uDCDD ' + caption : '');
    },

    VIEWONCE_CAPTION_SUBBOT: function(senderName, groupName, caption) {
        return '\uD83D\uDC41\uFE0F *ViewOnce Message*' + NL +
            'From: ' + senderName +
            (groupName ? NL + 'Group: ' + groupName : '') +
            (caption  ? NL + 'Caption: ' + caption  : '');
    },

    // ── Greeting / Greet update ──────────────────────────────────────────────

    GREET_UPDATED: function(newMessage) {
        return 'Greet message has been updated to:' + NL + '"' + newMessage + '"';
    },

    GREET_DEFAULT:        'Hello @user \uD83D\uDC4B' + NL + 'Welcome to my chat!' + NL + 'How can I help you today?',
    GREET_FALLBACK:       'Hello @user \uD83D\uDC4B' + NL + 'Welcome to my chat!',
    GREET_SUBBOT_DEFAULT: 'Hello! Thanks for messaging.',

    AUTOBIO_DEFAULT: 'XMD Always active!',

    // ── Group Events ─────────────────────────────────────────────────────────

    WELCOME_MESSAGES: [
        '\uD83C\uDF89 *Welcome @{num} to {group}!* We\'re so glad you\'re here! \uD83D\uDE4C',
        '\uD83D\uDC4B Hey @{num}! Welcome to *{group}*! Make yourself at home! \uD83C\uDFE0',
        '\uD83C\uDF1F A big welcome to @{num}! Great to have you in *{group}*! \u2728',
        '\uD83C\uDF8A Everyone say hi to @{num}! Welcome to the family at *{group}*! \uD83D\uDCAB',
        '\uD83D\uDD25 Look who just arrived! @{num} is now part of *{group}*! Let\'s gooo! \uD83D\uDE80',
        '\uD83D\uDC8E Welcome @{num}! Enjoy your stay in *{group}*! \uD83C\uDFAF',
        '\uD83C\uDF08 Hello @{num}! You\'ve just joined *{group}*! We\'re happy to have you! \uD83D\uDC9C',
        '\u26A1 @{num} just hopped aboard *{group}*! Welcome! \uD83D\uDEF3\uFE0F',
        '\uD83C\uDF81 *{group}* just got better with @{num} joining! Welcome! \uD83C\uDF3A',
        '\uD83D\uDE4F Welcome to *{group}*, @{num}! Feel free to introduce yourself! \uD83D\uDCAC'
    ],

    GOODBYE_MESSAGES: [
        '\uD83D\uDC4B Goodbye @{num}! We\'ll miss you! Take care! \uD83D\uDC94',
        '\uD83D\uDE22 @{num} has left the group. Wishing you all the best! \uD83C\uDF1F',
        '\uD83D\uDEAA @{num} just left. Hope to see you again soon! \uD83D\uDC40',
        '\uD83D\uDCAB Farewell @{num}! Thanks for being part of us! \uD83D\uDE4F',
        '\uD83C\uDF19 @{num} has departed. Safe travels, friend! \u2728',
        '\uD83D\uDE14 Sad to see you go, @{num}! All the best! \uD83D\uDCAA',
        '\uD83C\uDF42 @{num} left the group. Until we meet again! \uD83E\uDD1D',
        '\uD83D\uDC9C Goodbye @{num}! You\'ll always be remembered! \uD83C\uDF08',
        '\uD83C\uDF3A @{num} has exited. Take care out there! \uD83D\uDEE1\uFE0F',
        '\uD83C\uDFAD @{num} is no longer with us. Best wishes! \uD83C\uDF3B'
    ],

    PROMOTE_MESSAGES: [
        '\uD83C\uDF89 @{num} has been promoted to admin! Congrats! \uD83C\uDFC6',
        '\uD83D\uDC51 New admin alert! @{num} just powered up! \u26A1',
        '\uD83C\uDF1F Big news! @{num} is now an admin! \uD83D\uDE4C'
    ],

    DEMOTE_MESSAGES: [
        '\u26A0\uFE0F @{num} has been demoted from admin.',
        '\uD83D\uDCC9 Admin rights have been removed from @{num}.',
        '\uD83D\uDD3B @{num} is no longer an admin.'
    ],

    // ── Anti-link / Anti-status ──────────────────────────────────────────────

    ANTILINK_REMOVED:    function(num) { return '@' + num + ' removed for sending links!'; },
    ANTILINK_WARNING:    function(num) { return '\u26A0\uFE0F @' + num + ' Warning for sending links!'; },
    ANTILINK_DELETED:    function(num) { return '\uD83D\uDEAB Links not allowed! Message from @' + num + ' deleted.'; },
    ANTILINK_NEEDS_ADMIN:function(num) { return 'Link detected from @' + num + '! Promote me to admin to take action.'; },
    ANTILINK_DETECT_WARN:'\u26A0\uFE0F Link detected! Promote me to admin to take action.',

    ANTISTATUS_NEEDS_ADMIN: '\u26A0\uFE0F Status mention detected! Promote me to admin to take action.',
    ANTISTATUS_REMOVED:     '\uD83D\uDEAB A member was removed for sending status mention!',
    ANTISTATUS_DELETED:     '\uD83D\uDDD1\uFE0F Status mention deleted!',
    ANTISTATUS_REMOVED_WARNS: function(count, limit) {
        return '\uD83D\uDEAB A member was removed after ' + count + ' warnings for status mentions!';
    },
    ANTISTATUS_WARNING: function(count, limit) {
        return '\u26A0\uFE0F Warning ' + count + '/' + limit + '! No status mentions allowed!';
    },

    ANTILINK_REMOVED_GLOBAL: '\uD83D\uDEAB A member was removed for sending links!',
    ANTILINK_LINK_DELETED:   '\uD83D\uDDD1\uFE0F Link deleted!',
    ANTILINK_REMOVED_WARNS:  function(count) {
        return '\uD83D\uDEAB A member was removed after ' + count + ' warnings for sending links!';
    },
    ANTILINK_WARN: function(count, limit) {
        return '\u26A0\uFE0F Warning ' + count + '/' + limit + '! No links allowed!';
    },

    // ── Bot Days ─────────────────────────────────────────────────────────────

    BOTDAYS_NOT_FOUND: '*Bot Days Info*' + NL2 + 'We did not found your app, may be this bot was deployed outside bwm xmd main deployment site' + NL2 + '*Main deployment site*' + NL + 'pro.bwmxmd.co.ke',

    BOTDAYS_RESULT: function(remainingDays, expiryDate) {
        return '*Bot Days Info*' + NL2 +
            'Remaining days: ' + remainingDays + ' day(s)' + NL +
            'Expires on: ' + expiryDate + NL2 +
            '_Deployed from main site_' + NL + 'pro.bwmxmd.co.ke';
    },

    BOTDAYS_SERVER_ERROR: '*Bot Days Info*' + NL2 + 'Could not reach the server. Please try again later.',

    // ── vCard ────────────────────────────────────────────────────────────────

    VCARD: function(contactName, sender) {
        return 'BEGIN:VCARD' + NL +
            'VERSION:3.0' + NL +
            'N:;a,;;;' + NL +
            'FN:' + contactName + NL +
            'item1.TEL;waid=' + sender + ':' + sender + NL +
            'item1.X-ABLabel:Ponsel' + NL +
            'END:VCARD';
    },

    // ── Reconnect reasons ────────────────────────────────────────────────────

    RECONNECT_BAD_SESSION:    'Bad session file, reloading session...',
    RECONNECT_CLOSED:         'Connection closed, reconnecting...',
    RECONNECT_LOST:           'Connection lost from server, reconnecting...',
    RECONNECT_REPLACED:       'Connection replaced, waiting 10s before retry...',
    RECONNECT_LOGGED_OUT:     'Device logged out. Attempting to reload session from SESSION env var...',
    RECONNECT_RESTART:        'Restart required, restarting...',
    RECONNECT_TIMEOUT:        'Connection timed out, reconnecting...',
    RECONNECT_SESSION_RELOAD: 'Session reloaded from SESSION env var, reconnecting...',
    RECONNECT_UNKNOWN:        function(reason) { return 'Unknown disconnect reason: ' + reason + ', attempting reconnection...'; },

    // ── Misc URLs / constants ────────────────────────────────────────────────

    DEPLOYMENT_SITE:  'pro.bwmxmd.co.ke',
    CHANNEL_URL:      'https://whatsapp.com/channel/0029VbAuCjELtOj5n8Lv9h3d',
    GROUP_URL:        'https://chat.whatsapp.com/GrX5H3NWjChLautznslLm6',
    WEB:              'bwmxmd.co.ke',
    GURL:             'https://github.com/Bwmxmdgo/BWM-XMD-GO-V2',
    BOT_PROFILE_PIC:  './adams/public/bot-image.jpg',
    DEFAULT_PP:       'https://telegra.ph/file/95680cd03e012bb08b9e6.jpg',
    OWNER_PP:         'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg',
    CATBOX_THUMBNAIL: 'https://files.catbox.moe/jn4mzk.jpg',
};

module.exports = S;
