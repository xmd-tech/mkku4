const { bwmxmd } = require('../adams/commandHandler');
const FormData = require('form-data');
const fs = require('fs-extra');
const pathModule = require('path');
const mime = require('mime-types');
const { uploadToCloudinary } = require('../adams/lib/cloudinaryUpload');
const { getAntiDeleteSettings, updateAntiDeleteSettings, syncAntiDeleteFromEnv } = require('../adams/database/antidelete');
const { getAntiEditSettings, updateAntiEditSettings, syncAntiEditFromEnv } = require('../adams/database/antiedit');
const { getAntiLinkSettings, updateAntiLinkSettings, clearAllWarns, syncAntiLinkFromEnv } = require('../adams/database/antilink');
const { getAntiStatusMentionSettings, updateAntiStatusMentionSettings, clearAllStatusWarns, syncAntiStatusMentionFromEnv } = require('../adams/database/antistatusmention');
const { getAutoBioSettings, updateAutoBioSettings, syncAutoBioFromEnv } = require('../adams/database/autobio');
const { getAutoReadSettings, updateAutoReadSettings, syncAutoReadFromEnv } = require('../adams/database/autoread');
const { getAutoStatusSettings, updateAutoStatusSettings, syncAutoStatusFromEnv } = require('../adams/database/autostatus');
const { getChatbotSettings, updateChatbotSettings, clearConversationHistory, getConversationHistory, availableVoices, syncChatbotFromEnv } = require('../adams/database/chatbot');
const axios = require('axios');
const XMD = require('../adams/xmd');
const { getGreetSettings, updateGreetSettings, clearRepliedContacts } = require('../adams/database/greet');
const { getPresenceSettings, updatePresenceSettings, syncPresenceFromEnv } = require('../adams/database/presence');
const { updateSettings, getSettings, syncSettingsFromEnv } = require('../adams/database/settings');
const { getGroupEventsSettings, updateGroupEventsSettings } = require('../adams/database/groupevents');
const { getAntiCallSettings, updateAntiCallSettings, syncAntiCallFromEnv } = require('../adams/database/anticall');
const { getGroupSettings, updateGroupSettings, clearGroupWarns, clearGroupTagWarns, getGlobalGroupSettings, updateGlobalGroupSettings, GLOBAL_KEY } = require('../adams/database/groupsettings');
const { getAutoReactSettings, updateAutoReactSettings } = require('../adams/database/autoreact');
const { safeChatAnswer, requestChatAnswer } = require('../adams/lib/chatbotApi');
const { requestSpeech, requestGeneratedMedia } = require('../adams/lib/aiMedia');
const { createSettingsView } = require('../adams/lib/settingsView');
const { getSettingsItem, renderSettingsMenu, registerSettingsReply, displayValue, on: formatOn } = require('../adams/lib/settingsMenu');
const settingsReaders = {
  getSettings, getAutoStatusSettings, getAutoReadSettings, updateAutoReadSettings,
  getPresenceSettings, getAntiDeleteSettings, getAntiEditSettings,
  getAntiCallSettings, getAutoBioSettings, getChatbotSettings, getGreetSettings,
  getAutoReactSettings, updateAutoStatusSettings, updatePresenceSettings,
  updateAntiDeleteSettings, updateAntiCallSettings, getGlobalGroupSettings, getGroupSettings
};

//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "anticall",
  aliases: ["callset", "anticallsetting"],
  description: "Manage anti-call settings",
  category: "Settings",
  filename: __filename
}, async (from, client, conText) => {
  const { q, prefix, reply, isSuperUser, isSubBot, updateSubBotSettings, botSettings } = conText;

  if (!isSuperUser) {
    return reply("❌ You need superuser privileges to manage anti-call settings.");
  }

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ");
  
  // Get settings based on whether this is a sub-bot or main bot
  let settings;
  if (isSubBot && botSettings) {
    settings = {
      status: botSettings.anticallStatus || false,
      action: botSettings.anticallAction || 'reject',
      message: botSettings.anticallMessage || '⚠️ *Calls are not allowed!*\n\nPlease send a message instead.'
    };
  } else {
    settings = await getAntiCallSettings();
  }
  
  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  if (!subcommand) {
    const status = settings.status ? '✅ ON' : '❌ OFF';
    const action = settings.action === 'block' ? 'Block caller' : 'Reject call';
    const actionEmoji = settings.action === 'block' ? '🚫' : '❌';

    return reply(
      `*📜 Anti-Call Settings*\n\n` +
      `🔹 *Status:* ${status}\n` +
      `🔹 *Action:* ${actionEmoji} ${action}\n` +
      `🔹 *Message:* ${settings.message || '*No message set*'}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes\n` : '') + `\n` +
      `*🛠 Usage Instructions:*\n` +
      `▸ *${prefix}anticall on/off* - Toggle anti-call\n` +
      `▸ *${prefix}anticall message <text>* - Set rejection message\n` +
      `▸ *${prefix}anticall action reject/block* - Set call action\n\n` +
      `*💡 Action Differences:*\n` +
      `✔️ Reject: Declines call but allows future calls\n` +
      `🚫 Block: Declines and blocks the caller`
    );
  }

  switch (subcommand) {
    case 'on':
    case 'off': {
      const newStatus = subcommand === 'on';
      if (settings.status === newStatus) {
        return reply(`⚠️ Anti-call is already ${newStatus ? 'enabled' : 'disabled'}.`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ anticallStatus: newStatus });
      } else {
        await updateAntiCallSettings({ status: newStatus });
      }
      return reply(`✅ Anti-call has been ${newStatus ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    case 'message': {
      if (!value) return reply('❌ Please provide a message for anti-call rejection.');
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ anticallMessage: value });
      } else {
        await updateAntiCallSettings({ message: value });
      }
      return reply(`✅ Anti-call message updated successfully:\n\n"${value}"` + subBotNote);
    }

    case 'action': {
      const action = value.toLowerCase();
      if (!['reject', 'block'].includes(action)) {
        return reply(
          '❌ Invalid action. Use "reject" or "block".\n\n' +
          '*Reject:* Declines call but allows future calls\n' +
          '*Block:* Declines and permanently blocks the caller'
        );
      }
      if (settings.action === action) {
        return reply(`⚠️ Action is already set to "${action}".`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ anticallAction: action });
      } else {
        await updateAntiCallSettings({ action });
      }
      return reply(
        `🔹 Call action changed to: *${action}*\n\n` +
        (action === 'block'
          ? '🚫 Now blocking callers who try to call.'
          : '✔️ Calls will now be rejected without blocking.') + subBotNote
      );
    }

    default:
      return reply(
        '❌ Invalid subcommand. Available options:\n\n' +
        `▸ *${prefix}anticall on/off*\n` +
        `▸ *${prefix}anticall message <text>*\n` +
        `▸ *${prefix}anticall action reject/block*`
      );
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "events",
  aliases: ["gevents", "groupevents"],
  category: "Settings",
  description: "Manage group welcome/leave events"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, botSettings, isGroup } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const action = args[0]?.toLowerCase();
  const lastArg = args[args.length - 1]?.toLowerCase();
  const isAllScope = lastArg === 'all';
  const value = isAllScope ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");

  if (!isGroup && !isAllScope) return reply("❌ Use in a group or add 'all' for global!");

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      enabled: botSettings.groupEventsEnabled || false,
      welcomeMessage: botSettings.welcomeMessage || '👋 Welcome @user to {group}!\n\nYou are member number {count}.\n\n📝 Description: {desc}',
      goodbyeMessage: botSettings.goodbyeMessage || '👋 Goodbye @user!\n\nWe now have {count} members.',
      showPromotions: botSettings.showPromotions !== false
    };
  } else {
    const groupSettings = isGroup ? await getGroupSettings(from) : await getGlobalGroupSettings();
    settings = {
      enabled: groupSettings.eventsEnabled,
      welcomeMessage: groupSettings.welcomeMessage || '👋 Welcome @user to {group}!\n\nYou are member number {count}.\n\n📝 Description: {desc}',
      goodbyeMessage: groupSettings.goodbyeMessage || '👋 Goodbye @user!\n\nWe now have {count} members.',
      showPromotions: groupSettings.showPromotions
    };
  }
  
  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  if (!action) {
    const globalS = await getGlobalGroupSettings();
    return reply(
      `*🎉 Group Events Settings*\n\n` +
      `🔹 *Status:* ${settings.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *All Groups:* ${globalS.eventsEnabled ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Promotions:* ${settings.showPromotions ? '✅ ON' : '❌ OFF'}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes\n` : '') + `\n` +
      `*Welcome Message:*\n${settings.welcomeMessage}\n\n` +
      `*Goodbye Message:*\n${settings.goodbyeMessage}\n\n` +
      `*🛠 Usage:*\n` +
      `▸ events on/off\n` +
      `▸ events on/off all - Apply to all groups\n` +
      `▸ events promote on/off\n` +
      `▸ events welcome <message>\n` +
      `▸ events welcome <message> all\n` +
      `▸ events goodbye <message>\n` +
      `▸ events goodbye <message> all\n\n` +
      `*Placeholders:*\n` +
      `@user - Mention new member\n` +
      `{group} - Group name\n` +
      `{count} - Member count\n` +
      `{time} - Join time\n` +
      `{desc} - Group description`
    );
  }

  switch (action) {
    case 'on':
      if (isAllScope) {
        await updateGlobalGroupSettings({ eventsEnabled: true });
        return reply("✅ Group events enabled for all groups.");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ groupEventsEnabled: true });
      } else {
        await updateGroupSettings(from, { eventsEnabled: true });
      }
      return reply("✅ Group events enabled." + subBotNote);

    case 'off':
      if (isAllScope) {
        await updateGlobalGroupSettings({ eventsEnabled: false });
        return reply("✅ Group events disabled for all groups.");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ groupEventsEnabled: false });
      } else {
        await updateGroupSettings(from, { eventsEnabled: false });
      }
      return reply("✅ Group events disabled." + subBotNote);

    case 'promote':
      if (!['on', 'off'].includes(value)) return reply("❌ Use 'on' or 'off'.");
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ showPromotions: value === 'on' });
      } else {
        await updateGroupSettings(from, { showPromotions: value === 'on' });
      }
      return reply(`✅ Promotion notices ${value === 'on' ? 'enabled' : 'disabled'}.` + subBotNote);

    case 'welcome': {
      const welcomeMsg = isAllScope ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");
      if (!welcomeMsg) return reply("❌ Provide a welcome message.");
      if (isAllScope) {
        await updateGlobalGroupSettings({ welcomeMessage: welcomeMsg });
        return reply("✅ Welcome message updated for all groups.");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ welcomeMessage: welcomeMsg });
      } else {
        await updateGroupSettings(from, { welcomeMessage: welcomeMsg });
      }
      return reply("✅ Welcome message updated." + subBotNote);
    }

    case 'goodbye': {
      const goodbyeMsg = isAllScope ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");
      if (!goodbyeMsg) return reply("❌ Provide a goodbye message.");
      if (isAllScope) {
        await updateGlobalGroupSettings({ goodbyeMessage: goodbyeMsg });
        return reply("✅ Goodbye message updated for all groups.");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ goodbyeMessage: goodbyeMsg });
      } else {
        await updateGroupSettings(from, { goodbyeMessage: goodbyeMsg });
      }
      return reply("✅ Goodbye message updated." + subBotNote);
    }

    default:
      return reply(
        "❌ Invalid subcommand. Options:\n\n" +
        `▸ events on/off\n` +
        `▸ events on/off all\n` +
        `▸ events promote on/off\n` +
        `▸ events welcome <message>\n` +
        `▸ events welcome <message> all\n` +
        `▸ events goodbye <message>\n` +
        `▸ events goodbye <message> all`
      );
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "settings",
  aliases: ["config", "botconfig", "allsetting"],
  category: "Settings",
  description: "View all bot settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, prefix, isGroup, mek, sender, deviceMode, botSettings: viewBotSettings } = conText;

  if (!isSuperUser) return reply("*Owner only command*");

  const {
    getSettings, getAutoStatusSettings, getAutoReadSettings, getPresenceSettings,
    getAntiDeleteSettings, getAntiEditSettings, getAntiCallSettings,
    getAutoBioSettings, getChatbotSettings, getGreetSettings, getAutoReactSettings,
    getGlobalGroupSettings, getGroupSettings
  } = createSettingsView(conText, settingsReaders);
  const p = prefix;
  const o = formatOn;
  const s = (v) => v && v !== 'off' ? '✅ ' + v.toUpperCase() : '❌ OFF';
  const buildSectionMsg = async (selection) => {
    const item = getSettingsItem(selection);
    if (!item) return null;
    if (item.key) {
      const current = await getSettings();
      const value = item.key === 'hideViewChannel' ? o(current[item.key]) : displayValue(item.key, current[item.key]);
      return `*${item.label.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━\n\n` +
        `*Current:* ${value ?? 'Not set'}\n\n` +
        `*Command:* ${p}${item.command} ${item.usage}`;
    }
    const section = item.section;
    const globalS = await getGlobalGroupSettings();
    let grpS = null;
    if (isGroup) grpS = await getGroupSettings(from);

    if (section === 1) {
      const botSettings = await getSettings();
      const botImgUrl = botSettings.url && botSettings.url.startsWith('http') ? botSettings.url : 'Default';
      const styleNames = { 1: 'Style 1 — Lines', 2: 'Style 2 — Box', 3: 'Style 3 — Arrow' };
      let msg = `*🤖 BOT CONFIGURATION*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Customize your bot identity and behavior.\n\n`;
      msg += `🔹 *Name:* ${botSettings.botname}\n`;
      msg += `🔹 *Mode:* ${botSettings.mode}\n`;
      msg += `   _public = everyone can use, private = owner only_\n`;
      msg += `🔹 *Device:* ${botSettings.deviceMode}\n`;
      msg += `   _iPhone = plain text messages, Android = full features_\n`;
      msg += `🔹 *Prefix:* \`${botSettings.prefix}\`\n`;
      msg += `🔹 *Pack:* ${botSettings.packname}\n`;
      msg += `🔹 *Author:* ${botSettings.author}\n`;
      msg += `🔹 *Timezone:* ${botSettings.timezone}\n`;
      msg += `🔹 *Bot Image:* ${botImgUrl}\n`;
      msg += `🔹 *Menu Style:* ${styleNames[botSettings.menuStyle || 1]}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}botname <name> — Change bot name\n`;
      msg += `▸ ${p}mode public/private — Bot access mode\n`;
      msg += `▸ ${p}devicemode iphone/android — Message style\n`;
      msg += `▸ ${p}prefix <symbol> — Change prefix (e.g. ! or #)\n`;
      msg += `▸ ${p}packname <name> — Sticker pack name\n`;
      msg += `▸ ${p}author <name> — Sticker author name\n`;
      msg += `▸ ${p}timezone <zone> — e.g. Africa/Nairobi\n`;
      msg += `▸ ${p}botpic — Reply to image or video to set bot image\n`;
      msg += `▸ ${p}hideviewchannel on/off — Hide view channel & forwarded labels\n`;
      msg += `▸ ${p}menustyle 1/2/3 — Switch menu style`;
      return msg;
    }
    if (section === 2) {
      let msg = `*🔗 ANTI-LINK*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically detects and handles links posted in groups. You can set it for one specific group or all groups at once.\n\n`;
      if (isGroup) msg += `🔹 *This Group:* ${s(grpS.antilinkStatus)}\n`;
      msg += `🔹 *All Groups (global):* ${s(globalS.antilinkStatus)}\n`;
      msg += `🔹 *Warn Limit:* ${isGroup ? grpS.antilinkWarnLimit : globalS.antilinkWarnLimit}\n\n`;
      msg += `*Actions explained:*\n`;
      msg += `• *warn* — Warns the user. After reaching warn limit, they get removed\n`;
      msg += `• *delete* — Deletes the link message + warns the user\n`;
      msg += `• *remove* — Deletes the link + kicks the user immediately\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}antilink warn — Enable for this group (warn mode)\n`;
      msg += `▸ ${p}antilink delete — Enable for this group (delete mode)\n`;
      msg += `▸ ${p}antilink remove — Enable for this group (kick mode)\n`;
      msg += `▸ ${p}antilink off — Disable in this group\n`;
      msg += `▸ ${p}antilink warn all — Enable in ALL groups\n`;
      msg += `▸ ${p}antilink delete all — Delete in ALL groups\n`;
      msg += `▸ ${p}antilink remove all — Kick in ALL groups\n`;
      msg += `▸ ${p}antilink off all — Disable in ALL groups\n`;
      msg += `▸ ${p}antilink limit <1-10> — Set how many warns before kick\n`;
      msg += `▸ ${p}antilink resetwarns — Clear all warning counts`;
      return msg;
    }
    if (section === 3) {
      let msg = `*🏷️ ANTI-STATUS-MENTION (ANTITAG)*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Blocks users who send status mention/tag messages in groups. Set per-group or for all groups.\n\n`;
      if (isGroup) msg += `🔹 *This Group:* ${s(grpS.antitagStatus)}\n`;
      msg += `🔹 *All Groups (global):* ${s(globalS.antitagStatus)}\n`;
      msg += `🔹 *Warn Limit:* ${isGroup ? grpS.antitagWarnLimit : globalS.antitagWarnLimit}\n\n`;
      msg += `*Actions explained:*\n`;
      msg += `• *warn* — Warns the user, removes after limit\n`;
      msg += `• *delete* — Deletes the status mention + warns\n`;
      msg += `• *remove* — Deletes + kicks user immediately\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}antistatusmention warn\n`;
      msg += `▸ ${p}antistatusmention delete\n`;
      msg += `▸ ${p}antistatusmention remove\n`;
      msg += `▸ ${p}antistatusmention off\n`;
      msg += `▸ ${p}antistatusmention warn all — For ALL groups\n`;
      msg += `▸ ${p}antistatusmention delete all\n`;
      msg += `▸ ${p}antistatusmention remove all\n`;
      msg += `▸ ${p}antistatusmention off all\n`;
      msg += `▸ ${p}antistatusmention limit <1-10>\n`;
      msg += `▸ ${p}antistatusmention resetwarns`;
      return msg;
    }
    if (section === 4) {
      const antideleteSettings = await getAntiDeleteSettings();
      let msg = `*🗑️ ANTI-DELETE*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Recovers messages that someone deletes. You control where the recovered message goes.\n\n`;

      msg += `*📌 CURRENT STATUS:*\n`;
      msg += `🔹 *System (master switch):* ${o(antideleteSettings.status)}\n`;
      msg += `   _Must be ON for everything below to work_\n`;
      if (isGroup) {
        msg += `🔹 *This Group:* ${o(grpS.antideleteEnabled)}\n`;
        msg += `🔹 *Send to Chat (here):* ${o(grpS.antideleteSendToChat)}\n`;
      }
      msg += `🔹 *All Groups (global):* ${o(globalS.antideleteEnabled)}\n`;
      msg += `🔹 *Send to Chat (all):* ${o(globalS.antideleteSendToChat)}\n`;
      msg += `🔹 *Send to Owner DM:* ${o(antideleteSettings.sendToOwner)}\n`;
      msg += `🔹 *Include Media:* ${o(antideleteSettings.includeMedia)}\n`;
      msg += `🔹 *Include Group Info:* ${o(antideleteSettings.includeGroupInfo)}\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*💬 PRIVATE CHAT (DM):*\n`;
      msg += `When someone deletes a message in your DM, the bot recovers it.\n\n`;
      msg += `*Where does the recovered message go?*\n`;
      msg += `• If "Send to Owner DM" is ON → recovered msg is sent to your own DM (inbox)\n`;
      msg += `• If "Send to Owner DM" is OFF → recovered msg is sent back into the same private conversation\n\n`;
      msg += `*Commands (use in any private chat):*\n`;
      msg += `▸ ${p}antidelete on — Turn ON system (enables private chat recovery)\n`;
      msg += `▸ ${p}antidelete off — Turn OFF system (disables ALL recovery everywhere)\n`;
      msg += `▸ ${p}antidelete inbox on — Recovered msgs go to your DM inbox\n`;
      msg += `▸ ${p}antidelete inbox off — Recovered msgs go back to same conversation\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*👥 GROUP CHAT:*\n`;
      msg += `When someone deletes a message in a group, the bot recovers it.\n\n`;
      msg += `*Where does the recovered message go?*\n`;
      msg += `• If "Send to Chat" is ON → recovered msg is sent back into the group chat (everyone sees it)\n`;
      msg += `• If "Send to Owner DM" is ON → recovered msg is also sent to your DM inbox\n`;
      msg += `• Both can be ON at the same time (msg goes to group + your DM)\n`;
      msg += `• If both are OFF → recovered msg goes back to the group anyway\n\n`;
      msg += `*Commands (use inside a group):*\n`;
      msg += `▸ ${p}antidelete on — Enable recovery in this group\n`;
      msg += `▸ ${p}antidelete off — Disable recovery in this group\n`;
      msg += `▸ ${p}antidelete on all — Enable in ALL groups at once\n`;
      msg += `▸ ${p}antidelete off all — Disable in ALL groups at once\n`;
      msg += `▸ ${p}antidelete chat on — Send recovered msg back into this group\n`;
      msg += `▸ ${p}antidelete chat off — Stop sending recovered msgs back to this group\n`;
      msg += `▸ ${p}antidelete chat on all — Send back into ALL groups\n`;
      msg += `▸ ${p}antidelete chat off all — Stop sending back in ALL groups\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*⚙️ GENERAL OPTIONS (works for both):*\n`;
      msg += `▸ ${p}antidelete inbox on — Send recovered msgs to your DM inbox\n`;
      msg += `▸ ${p}antidelete inbox off — Stop sending to your DM inbox\n`;
      msg += `▸ ${p}antidelete media on/off — Include photos, videos, stickers, docs\n`;
      msg += `▸ ${p}antidelete groupinfo on/off — Show group name in notification\n`;
      msg += `▸ ${p}antidelete notification <text> — Custom notification text\n\n`;

      msg += `_📊 For Status (Stories) antidelete, see section *5*_`;
      return msg;
    }
    if (section === 5) {
      let msg = `*📊 STATUS ANTI-DELETE*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Recovers WhatsApp statuses/stories that contacts delete. When someone posts a status and then deletes it, the bot saves it and sends it to your inbox.\n\n`;
      msg += `🔹 *Status:* ${o(globalS.statusAntideleteEnabled)}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}statusantidelete on — Enable status recovery\n`;
      msg += `▸ ${p}statusantidelete off — Disable status recovery\n`;
      msg += `▸ ${p}statusantidelete status — Check current status\n\n`;
      msg += `_Note: The main anti-delete system must also be ON for this to work._`;
      return msg;
    }
    if (section === 6) {
      const anticallSettings = await getAntiCallSettings();
      let msg = `*📞 ANTI-CALL*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically handles incoming WhatsApp calls. Can either reject the call or block the caller entirely.\n\n`;
      msg += `🔹 *Status:* ${o(anticallSettings.status)}\n`;
      msg += `🔹 *Action:* ${anticallSettings.action === 'block' ? '🚫 Block (permanently blocks caller)' : '❌ Reject (declines but allows future calls)'}\n`;
      msg += `🔹 *Message:* ${anticallSettings.message || 'Default'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}anticall on — Enable anti-call\n`;
      msg += `▸ ${p}anticall off — Disable anti-call\n`;
      msg += `▸ ${p}anticall action reject — Just decline the call\n`;
      msg += `▸ ${p}anticall action block — Decline + block caller\n`;
      msg += `▸ ${p}anticall message <text> — Message sent to caller`;
      return msg;
    }
    if (section === 7) {
      let msg = `*🎉 GROUP EVENTS*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Sends welcome messages when new members join and goodbye messages when they leave. Also notifies about promotions/demotions. Set per-group or globally.\n\n`;
      if (isGroup) msg += `🔹 *This Group:* ${o(grpS.eventsEnabled)}\n`;
      msg += `🔹 *All Groups (global):* ${o(globalS.eventsEnabled)}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}events on — Enable in this group\n`;
      msg += `▸ ${p}events off — Disable in this group\n`;
      msg += `▸ ${p}events on all — Enable in ALL groups\n`;
      msg += `▸ ${p}events off all — Disable in ALL groups\n`;
      msg += `▸ ${p}events promote on/off — Show promotion notices\n`;
      msg += `▸ ${p}events welcome <message> — Set welcome message\n`;
      msg += `▸ ${p}events welcome <message> all — Set for all groups\n`;
      msg += `▸ ${p}events goodbye <message> — Set goodbye message\n`;
      msg += `▸ ${p}events goodbye <message> all — Set for all groups\n\n`;
      msg += `*Placeholders you can use in messages:*\n`;
      msg += `• @user — Mentions the new/leaving member\n`;
      msg += `• {group} — Group name\n`;
      msg += `• {count} — Current member count\n`;
      msg += `• {time} — Join/leave time\n`;
      msg += `• {desc} — Group description`;
      return msg;
    }
    if (section === 8) {
      const presenceSettings = await getPresenceSettings();
      let msg = `*🔄 PRESENCE*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Controls what status your bot shows in chats — like "typing...", "recording audio...", or "online". Has 2 layers:\n\n`;
      msg += `*1. Private Chat Presence:*\n`;
      msg += `Shows your chosen status in all private/DM conversations.\n`;
      msg += `🔹 *Current:* ${presenceSettings.privateChat === 'off' ? '❌ OFF' : '✅ ' + presenceSettings.privateChat.toUpperCase()}\n\n`;
      msg += `*2. Group Presence (per-group):*\n`;
      msg += `Shows your chosen status in groups. You can set it for one group or all groups.\n`;
      if (isGroup) {
        msg += `🔹 *This Group:* ${s(grpS.presenceStatus)}\n`;
      }
      msg += `🔹 *All Groups (global):* ${s(globalS.presenceStatus)}\n\n`;
      msg += `*Options:* off, online, typing, recording\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}presence private off — No presence in DMs\n`;
      msg += `▸ ${p}presence private online — Show online in DMs\n`;
      msg += `▸ ${p}presence private typing — Show typing in DMs\n`;
      msg += `▸ ${p}presence private recording — Show recording in DMs\n`;
      msg += `▸ ${p}presence group off — No presence in this group\n`;
      msg += `▸ ${p}presence group online — Show online in this group\n`;
      msg += `▸ ${p}presence group typing — Show typing in this group\n`;
      msg += `▸ ${p}presence group recording — Show recording in this group\n`;
      msg += `▸ ${p}presence group off all — Disable in ALL groups\n`;
      msg += `▸ ${p}presence group online all — Online in ALL groups\n`;
      msg += `▸ ${p}presence group typing all — Typing in ALL groups\n`;
      msg += `▸ ${p}presence group recording all — Recording in ALL groups`;
      return msg;
    }
    if (section === 9) {
      const statusSettings = await getAutoStatusSettings();
      let msg = `*👁️ AUTO VIEW STATUS*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically views all your contacts' WhatsApp statuses as soon as they post. They will see that you viewed their status.\n\n`;
      msg += `🔹 *Status:* ${o(statusSettings.autoviewStatus === 'true')}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autoviewstatus on — Start auto-viewing\n`;
      msg += `▸ ${p}autoviewstatus off — Stop auto-viewing`;
      return msg;
    }
    if (section === 10) {
      const statusSettings = await getAutoStatusSettings();
      let msg = `*💬 AUTO REPLY STATUS*\n━━━━━━━━━━━━━━━━━━\n\n`;

      msg += `*💬 AUTO REPLY STATUS*\n`;
      msg += `Automatically sends a reply message to contacts whose status you view.\n\n`;
      msg += `🔹 *Status:* ${o(statusSettings.autoReplyStatus === 'true')}\n`;
      msg += `🔹 *Reply Text:* ${statusSettings.statusReplyText || 'Nice status!'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autoreplystatus on — Enable auto-reply\n`;
      msg += `▸ ${p}autoreplystatus off — Disable auto-reply\n`;
      msg += `▸ ${p}autoreplystatus text <your message> — Set reply message\n\n`;

      return msg;
    }
    if (section === 18) {
      const statusSettings = await getAutoStatusSettings();
      let msg = `*😍 AUTO LIKE / REACT STATUS*\n━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `*😍 AUTO REACT STATUS*\n`;
      msg += `Automatically reacts with emojis or text to every status your contacts post. A random reaction is picked from your list each time.\n\n`;
      msg += `🔹 *Status:* ${o(statusSettings.autoLikeStatus === 'true')}\n`;
      msg += `🔹 *Reactions (emojis or text):* ${statusSettings.statusLikeEmojis || '👍,❤️,😍,🔥,😂'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autolikestatus on — Enable auto-react\n`;
      msg += `▸ ${p}autolikestatus off — Disable auto-react\n`;
      msg += `▸ ${p}autolikestatus emojis <list> — Set reaction emojis or text\n`;
      msg += `▸ ${p}autolikestatus emojis 👍,❤️,🔥 — Example reaction list\n`;
      msg += `▸ ${p}autolikestatus emojis xmd — Example text reaction\n`;
      msg += `▸ ${p}autolikestatus status — View current settings\n\n`;
      msg += `_Aliases: autoreactstatus, reactstatus, statusreact — all control this same setting._\n`;
      msg += `_Default is OFF. You can use emojis or text. Separate multiple reactions with commas — a random one is sent per status._`;
      return msg;
    }
    if (section === 19) {
      return `*VIEW ONCE*\n━━━━━━━━━━━━━━━━━━\n\n` +
        `*All groups/default:* ${o(globalS.viewonceEnabled)}\n` +
        (isGroup ? `*This group:* ${o(grpS.viewonceEnabled)}\n` : '') +
        `\n*Commands:*\n` +
        `▸ ${p}viewonce on/off — Change this group (or global defaults in DM)\n` +
        `▸ ${p}viewonce on/off all — Change all groups and private chats\n` +
        `▸ ${p}viewonce status — Show saved status`;
    }
    if (section === 11) {
      const readSettings = await getAutoReadSettings();
      let msg = `*👓 AUTO READ*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically marks all incoming messages as read (shows blue ticks). You can choose which chats: private only, groups only, or both.\n\n`;
      msg += `🔹 *Status:* ${o(readSettings.status)}\n`;
      msg += `🔹 *Chat Types:* ${readSettings.chatTypes?.join(', ') || 'Not set'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autoread on — Enable auto-read\n`;
      msg += `▸ ${p}autoread off — Disable auto-read\n`;
      msg += `▸ ${p}autoread types private — Only read DMs\n`;
      msg += `▸ ${p}autoread types group — Only read groups\n`;
      msg += `▸ ${p}autoread types both — Read everything\n`;
      msg += `▸ ${p}autoread addtype private/group\n`;
      msg += `▸ ${p}autoread removetype private/group`;
      return msg;
    }
    if (section === 12) {
      const autobioSettings = await getAutoBioSettings();
      let msg = `*📝 AUTO BIO*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically updates your WhatsApp profile bio every 30 seconds with your custom message.\n\n`;
      msg += `🔹 *Status:* ${o(autobioSettings.status === 'on')}\n`;
      msg += `🔹 *Message:* ${autobioSettings.message || 'Default'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autobio on — Start auto-updating bio\n`;
      msg += `▸ ${p}autobio off — Stop auto-updating\n`;
      msg += `▸ ${p}autobio set <message> — Set your custom bio text\n`;
      msg += `▸ ${p}autobio reset — Reset to default bio\n\n`;
      msg += `*Placeholders you can use in your message:*\n`;
      msg += `• {time} — Current time (e.g. 02:30:00 PM)\n`;
      msg += `• {date} — Current date (e.g. Wednesday, Feb 19, 2026)\n`;
      msg += `• {greeting} — Good Morning/Afternoon/Evening/Night\n`;
      msg += `• {emoji} — Greeting emoji (🌅/☀️/🌆/🌙)\n`;
      msg += `• {botname} — Your bot name\n`;
      msg += `• {quote} — Random emoji (🙏🏆🚀✨💎 etc)\n\n`;
      msg += `*Example:*\n`;
      msg += `▸ ${p}autobio set {emoji} {greeting}! {botname} | {time}\n`;
      msg += `   _Result: 🌅 Good Morning! BWM-XMD | 08:30:00 AM_`;
      return msg;
    }
    if (section === 13) {
      const chatbotSettings = await getChatbotSettings();
      let msg = `*🤖 CHATBOT (AI)*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `AI-powered chatbot that responds to messages. Can reply with text, voice audio, generate images, or videos.\n\n`;
      msg += `🔹 *Status:* ${chatbotSettings.status === 'on' || chatbotSettings.enabled ? '✅ ON' : '❌ OFF'}\n`;
      msg += `🔹 *Mode:* ${chatbotSettings.mode || 'private'}\n`;
      msg += `   _private = DMs only, group = groups only, both = everywhere_\n`;
      msg += `🔹 *Trigger:* ${chatbotSettings.trigger || 'dm'}\n`;
      msg += `   _dm = only responds when mentioned/tagged, all = responds to every message_\n`;
      msg += `🔹 *Response:* ${chatbotSettings.default_response || 'text'}\n`;
      msg += `🔹 *Voice:* ${chatbotSettings.voice || 'Default'}\n\n`;
      msg += `*How users interact:*\n`;
      msg += `• @bot hello — Text chat\n`;
      msg += `• @bot audio tell me a story — Voice response\n`;
      msg += `• @bot image a sunset — Generate image\n`;
      msg += `• @bot video a cat — Generate video\n`;
      msg += `• Send image + "analyze this" — AI vision\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}chatbot on/off — Toggle chatbot\n`;
      msg += `▸ ${p}chatbot mode private/group/both\n`;
      msg += `▸ ${p}chatbot trigger dm/all\n`;
      msg += `▸ ${p}chatbot response text/audio — Default response type\n`;
      msg += `▸ ${p}chatbot voice <name> — Set TTS voice\n`;
      msg += `▸ ${p}chatbot voices — List all available voices\n`;
      msg += `▸ ${p}chatbot clear — Clear conversation history\n`;
      msg += `▸ ${p}chatbot test <type> <message> — Test the chatbot`;
      return msg;
    }
    if (section === 14) {
      const greetSettings = await getGreetSettings();
      let msg = `*👋 GREET (DM AUTO-REPLY)*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Sends an automatic one-time greeting when someone messages you in private for the first time. Each contact only gets greeted once (until you clear the memory).\n\n`;
      msg += `🔹 *Status:* ${o(greetSettings.enabled)}\n`;
      msg += `🔹 *Message:* ${greetSettings.message || 'Hello @user! Thanks for messaging.'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}greet on — Enable greetings\n`;
      msg += `▸ ${p}greet off — Disable greetings\n`;
      msg += `▸ ${p}greet set <message> — Custom greeting message\n`;
      msg += `▸ ${p}greet clear — Reset memory (greet everyone again)`;
      return msg;
    }
    if (section === 15) {
      const reactSettings = await getAutoReactSettings();
      const globalS17 = await getGlobalGroupSettings();
      let grpReactStatus = null;
      if (conText?.isGroup) {
        const grpS17 = await getGroupSettings(from);
        grpReactStatus = grpS17.autoreactEnabled;
      }
      let msg = `*😍 AUTO REACT*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Automatically reacts to incoming messages with random emojis.\n\n`;
      msg += `*📩 Private Chats (DMs):*\n`;
      msg += `🔹 *Status:* ${o(reactSettings.dmStatus)}\n`;
      msg += `🔹 *Emojis:* ${reactSettings.dmEmojis}\n\n`;
      msg += `*👥 Group Chats:*\n`;
      if (grpReactStatus !== null) {
        msg += `🔹 *This Group:* ${o(grpReactStatus)}\n`;
      }
      msg += `🔹 *All Groups (global):* ${o(globalS17.autoreactEnabled)}\n`;
      msg += `🔹 *Group Emojis:* ${globalS17.autoreactEmojis || '❤️,😍,🔥,💯,😂,👍,✨,💪,🎉,😎'}\n\n`;
      msg += `*🛠 How to use:*\n`;
      msg += `▸ ${p}autoreact dm on — Enable in private chats\n`;
      msg += `▸ ${p}autoreact dm off — Disable in private chats\n`;
      msg += `▸ ${p}autoreact group on — Enable in this group\n`;
      msg += `▸ ${p}autoreact group off — Disable in this group\n`;
      msg += `▸ ${p}autoreact group on all — Enable in ALL groups\n`;
      msg += `▸ ${p}autoreact group off all — Disable in ALL groups\n`;
      msg += `▸ ${p}autoreact emojis dm ❤️,🔥,💯 — Set DM emojis\n`;
      msg += `▸ ${p}autoreact emojis group ❤️,🔥,💯 — Set group emojis (this group)\n`;
      msg += `▸ ${p}autoreact emojis group ❤️,🔥,💯 all — Set group emojis (all groups)`;
      return msg;
    }
    if (section === 16) {
      let msg = `*🔧 OTHER USEFUL COMMANDS*\n━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `▸ ${p}syncsettings all — Reset ALL settings to env var defaults\n`;
      msg += `▸ ${p}syncsettings <name> — Reset one setting (e.g. anticall, antidelete, autoread)\n`;
      msg += `▸ ${p}allvar — View all bot variables at once\n`;
      msg += `▸ ${p}getvar <key> — Get a specific variable value\n`;
      msg += `▸ ${p}setvar key=value — Change a variable directly\n`;
      msg += `▸ ${p}systeminfo — View system info (uptime, memory, version)\n`;
      msg += `▸ ${p}botpic — Set bot profile picture\n`;
      msg += `▸ ${p}boturl — Set bot URL`;
      return msg;
    }
    if (section === 17) {
      const antieditSettings = await getAntiEditSettings();
      let msg = `*📝 ANTI-EDIT*\n━━━━━━━━━━━━━━━━━━\n`;
      msg += `Catches messages that someone edits. Shows you the original text vs the edited text.\n\n`;

      msg += `*📌 CURRENT STATUS:*\n`;
      msg += `🔹 *System (master switch):* ${o(antieditSettings.status)}\n`;
      msg += `   _Must be ON for everything below to work_\n`;
      if (isGroup) {
        msg += `🔹 *This Group:* ${o(grpS.antieditEnabled)}\n`;
        msg += `🔹 *Send to Chat (here):* ${o(grpS.antieditSendToChat)}\n`;
      }
      msg += `🔹 *All Groups (global):* ${o(globalS.antieditEnabled)}\n`;
      msg += `🔹 *Send to Chat (all):* ${o(globalS.antieditSendToChat)}\n`;
      msg += `🔹 *Send to Owner DM:* ${o(antieditSettings.sendToOwner)}\n`;
      msg += `🔹 *Include Media:* ${o(antieditSettings.includeMedia)}\n`;
      msg += `🔹 *Include Group Info:* ${o(antieditSettings.includeGroupInfo)}\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*💬 PRIVATE CHAT (DM):*\n`;
      msg += `When someone edits a message in your DM, the bot captures it.\n\n`;
      msg += `▸ ${p}antiedit on — Turn ON system\n`;
      msg += `▸ ${p}antiedit off — Turn OFF system (disables ALL capture everywhere)\n`;
      msg += `▸ ${p}antiedit dm on/off — Send edited msg back into the same DM\n`;
      msg += `▸ ${p}antiedit inbox on/off — Also copy to your DM inbox\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*👥 GROUP CHAT:*\n`;
      msg += `▸ ${p}antiedit on — Enable in this group\n`;
      msg += `▸ ${p}antiedit off — Disable in this group\n`;
      msg += `▸ ${p}antiedit on all — Enable in ALL groups at once\n`;
      msg += `▸ ${p}antiedit off all — Disable in ALL groups at once\n`;
      msg += `▸ ${p}antiedit chat on/off — Post edited msg back into this group\n`;
      msg += `▸ ${p}antiedit chat on all / off all — All groups at once\n\n`;

      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `*⚙️ GENERAL OPTIONS:*\n`;
      msg += `▸ ${p}antiedit media on/off — Include edited media captions\n`;
      msg += `▸ ${p}antiedit groupinfo on/off — Show group name in notification\n`;
      msg += `▸ ${p}antiedit notification <text> — Custom notification text`;
      return msg;
    }
    return null;
  };

  try {
    if (q?.trim()) {
      const section = /^\d+$/.test(q.trim()) ? Number(q.trim()) : NaN;
      if (isNaN(section) || !getSettingsItem(section)) {
        return reply(`❌ Invalid number. Use ${p}settings and choose a listed number.`);
      }
      const sectionMsg = await buildSectionMsg(section);
      if (sectionMsg) {
        const sent = await client.sendMessage(from, { text: sectionMsg + `\n\n_Reply *0* to go back to settings menu_` }, { quoted: mek });
        const settingsIds = new Set();
        settingsIds.add(sent.key.id);

        const handleSettingsReply = async (update) => {
          const message = update.messages[0];
          if (!message?.message) return;
          if (message.key.remoteJid !== from) return;
          const quotedId = message.message.extendedTextMessage?.contextInfo?.stanzaId;
          const txt = message.message.extendedTextMessage?.text?.trim() || message.message.conversation?.trim();
          if (!txt) return;
          const isNum = /^\d+$/.test(txt);
          if (quotedId) {
            if (!settingsIds.has(quotedId)) return;
          } else if (isNum && (deviceMode === 'iPhone' || !isGroup)) {
          } else { return; }
          if (!isNum) return;
          const picked = Number(txt);
          try {
            if (picked === 0) {
              const menuMsg = await buildSettingsMenu();
              const s2 = await client.sendMessage(from, { text: menuMsg }, { quoted: mek });
              if (s2?.key?.id) settingsIds.add(s2.key.id);
              return;
            }
            if (!getSettingsItem(picked)) {
              await client.sendMessage(from, { text: `❌ Pick a listed number, or *0* for main menu.` }, { quoted: mek });
              return;
            }
            const detail = await buildSectionMsg(picked);
            if (detail) {
              const s3 = await client.sendMessage(from, { text: detail + `\n\n_Reply *0* to go back to settings menu_` }, { quoted: mek });
              if (s3?.key?.id) settingsIds.add(s3.key.id);
            }
          } catch (e) { console.error("Settings reply error:", e); }
        };
        registerSettingsReply(client, from, mek, handleSettingsReply);
        return;
      }
      return reply(`❌ Invalid number. Use ${p}settings and choose a listed number.`);
    }

    async function buildSettingsMenu() {
      const [bot, status, read, presence, antiDelete, antiEdit, antiCall, bio, chatbot, greet, react, globalS] = await Promise.all([
        getSettings(), getAutoStatusSettings(), getAutoReadSettings(), getPresenceSettings(),
        getAntiDeleteSettings(), getAntiEditSettings(), getAntiCallSettings(),
        getAutoBioSettings(), getChatbotSettings(), getGreetSettings(), getAutoReactSettings(),
        getGlobalGroupSettings()
      ]);
      const group = isGroup ? await getGroupSettings(from) : globalS;
      const own = conText.isSubBot ? await getSettings() : null;
      return renderSettingsMenu({
        bot, status, read, presence, antiDelete, antiEdit, antiCall, bio, chatbot, greet, react,
        global: globalS, group, isGroup, isSubBot: !!conText.isSubBot,
        events: own ? { enabled: own.groupEventsEnabled } : null
      }, p);
    }

    const menuText = await buildSettingsMenu();
    const mainMsg = await client.sendMessage(from, { text: menuText }, { quoted: mek });

    const settingsMessageIds = new Set();
    settingsMessageIds.add(mainMsg.key.id);

    const sendAndTrack = async (content) => {
      const sent = await client.sendMessage(from, content, { quoted: mek });
      if (sent?.key?.id) settingsMessageIds.add(sent.key.id);
      return sent;
    };

    const handleReply = async (update) => {
      const message = update.messages[0];
      if (!message?.message) return;
      const fromResolved = conText.resolvedJid || from;
      if (message.key.remoteJid !== from && message.key.remoteJid !== fromResolved) return;

      const quotedStanzaId = message.message.extendedTextMessage?.contextInfo?.stanzaId;
      const responseText = message.message.extendedTextMessage?.text?.trim() || message.message.conversation?.trim();
      if (!responseText) return;

      const isNumber = /^\d+$/.test(responseText);

      if (quotedStanzaId) {
        if (!settingsMessageIds.has(quotedStanzaId)) return;
      } else if (isNumber && (deviceMode === 'iPhone' || !from.endsWith('@g.us'))) {
        // iPhone mode OR private DM: accept plain number without quoting
      } else {
        return;
      }

      if (!isNumber) return;
      const selectedIndex = Number(responseText);

      try {
        if (selectedIndex === 0) {
          const refreshedMenu = await buildSettingsMenu();
          await sendAndTrack({ text: refreshedMenu });
          return;
        }

        if (!getSettingsItem(selectedIndex)) {
          await sendAndTrack({ text: `❌ Pick a listed number, or *0* for settings menu.` });
          return;
        }

        const sectionText = await buildSectionMsg(selectedIndex);
        if (sectionText) {
          await sendAndTrack({ text: sectionText + `\n\n_Reply *0* to go back to settings menu_` });
        }
      } catch (error) {
        console.error("Settings reply error:", error);
      }
    };

    registerSettingsReply(client, from, mek, handleReply);

  } catch (err) {
    console.error("Settings error:", err);
    return reply("*Failed to load settings*");
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "syncsettings",
  aliases: ["syncenv", "resetsettings", "syncheroku"],
  category: "Settings",
  description: "Reset all settings to Heroku environment variable values"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, prefix, isSubBot } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");
  
  if (isSubBot) {
    return reply("❌ This command is only for the main bot. Sub-bots use their own database settings.");
  }

  const args = q?.trim().toLowerCase();
  
  if (!args) {
    return reply(
      `*🔄 Sync Settings from Heroku*\n\n` +
      `This command resets your bot settings to match your Heroku environment variables.\n\n` +
      `*⚠️ Warning:* This will override any changes you made via bot commands!\n\n` +
      `*🛠 Usage:*\n` +
      `▸ ${prefix}syncsettings all - Reset ALL settings\n` +
      `▸ ${prefix}syncsettings anticall - Reset anti-call only\n` +
      `▸ ${prefix}syncsettings antidelete - Reset anti-delete only\n` +
      `▸ ${prefix}syncsettings antilink - Reset anti-link only\n` +
      `▸ ${prefix}syncsettings autostatus - Reset auto-status only\n` +
      `▸ ${prefix}syncsettings autoread - Reset auto-read only\n` +
      `▸ ${prefix}syncsettings autobio - Reset auto-bio only\n` +
      `▸ ${prefix}syncsettings presence - Reset presence only\n` +
      `▸ ${prefix}syncsettings chatbot - Reset chatbot only\n` +
      `▸ ${prefix}syncsettings bot - Reset bot config only\n\n` +
      `*💡 Tip:* Use this after changing Heroku vars to apply them!`
    );
  }

  try {
    let synced = [];
    
    if (args === 'all' || args === 'anticall') {
      await syncAntiCallFromEnv();
      synced.push('Anti-Call');
    }
    if (args === 'all' || args === 'antidelete') {
      await syncAntiDeleteFromEnv();
      synced.push('Anti-Delete');
    }
    if (args === 'all' || args === 'antiedit') {
      await syncAntiEditFromEnv();
      synced.push('Anti-Edit');
    }
    if (args === 'all' || args === 'antilink') {
      await syncAntiLinkFromEnv();
      synced.push('Anti-Link');
    }
    if (args === 'all' || args === 'autostatus') {
      await syncAutoStatusFromEnv();
      synced.push('Auto-Status');
    }
    if (args === 'all' || args === 'autoread') {
      await syncAutoReadFromEnv();
      synced.push('Auto-Read');
    }
    if (args === 'all' || args === 'autobio') {
      await syncAutoBioFromEnv();
      synced.push('Auto-Bio');
    }
    if (args === 'all' || args === 'presence') {
      await syncPresenceFromEnv();
      synced.push('Presence');
    }
    if (args === 'all' || args === 'antistatusmention' || args === 'antitag') {
      await syncAntiStatusMentionFromEnv();
      synced.push('Anti-Status-Mention');
    }
    if (args === 'all' || args === 'chatbot') {
      await syncChatbotFromEnv();
      synced.push('Chatbot');
    }
    if (args === 'all' || args === 'bot' || args === 'config') {
      await syncSettingsFromEnv();
      synced.push('Bot Config');
    }
    
    if (synced.length === 0) {
      return reply(
        `❌ Unknown setting: "${args}"\n\n` +
        `Available: all, anticall, antidelete, antiedit, antilink, autostatus, autoread, autobio, presence, antitag, chatbot, bot`
      );
    }
    
    return reply(
      `✅ *Settings Synced from Heroku!*\n\n` +
      `🔄 Updated: ${synced.join(', ')}\n\n` +
      `Your bot now uses the values from your Heroku environment variables.`
    );
  } catch (error) {
    console.error('Sync settings error:', error);
    return reply(`❌ Error syncing settings: ${error.message}`);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "hideviewchannel",
  aliases: ["hidechannel"],
  category: "Settings",
  description: "Hide or show view-channel and forwarded labels"
}, async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");
  const read = conText.getSettings || getSettings;
  const write = conText.updateSettings || updateSettings;
  const action = q?.trim().toLowerCase();
  if (!action || action === 'status') {
    const settings = await read();
    return reply(`*Hide View Channel:* ${formatOn(settings.hideViewChannel)}\n\n` +
      `Usage: ${conText.prefix}hideviewchannel on/off`);
  }
  if (!['on', 'off'].includes(action)) {
    return reply(`❌ Use ${conText.prefix}hideviewchannel on/off`);
  }
  await write({ hideViewChannel: isSubBot ? action === 'on' : action });
  if (!isSubBot) XMD.setHideViewChannel(action);
  return reply(`✅ Hide View Channel set to *${action.toUpperCase()}*.`);
});
//========================================================================================================================
bwmxmd({
  pattern: "devicemode",
  aliases: ["iphonemode", "iphone", "android", "device"],
  category: "Settings",
  description: "Set device mode - iPhone (plain text) or Android (full features)"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, botSettings, prefix, isSubBot, updateSubBotSettings, updateSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const currentMode = botSettings?.deviceMode || "Android";
  const args = q?.trim().toLowerCase();

  if (!args) {
    return reply(
      `📱 *Device Mode*\n\n` +
      `Current: ${currentMode === 'iPhone' ? '🍎 iPhone' : '🤖 Android'}\n\n` +
      `*🍎 iPhone Mode:*\n` +
      `• Plain text only (no buttons)\n` +
      `• No carousels or contextInfo\n` +
      `• ViewOnce media re-sent as normal\n` +
      `• Works for all iPhone users\n\n` +
      `*🤖 Android Mode:*\n` +
      `• Full features (buttons, carousels)\n` +
      `• Context info and thumbnails\n` +
      `• Quoted messages styled\n\n` +
      `*Usage:*\n` +
      `▸ ${prefix}devicemode iphone\n` +
      `▸ ${prefix}devicemode android`
    );
  }

  try {
    if (args === 'iphone' || args === 'ios' || args === 'apple') {
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ deviceMode: 'iPhone' });
      } else {
        await updateSettings({ deviceMode: 'iPhone' });
      }
      conText.botSettings.deviceMode = 'iPhone';
      return reply(
        `🍎 *Device Mode: iPhone*\n\n` +
        `Bot will now send iPhone-compatible messages:\n` +
        `• Plain text only\n` +
        `• No buttons or carousels\n` +
        `• ViewOnce sent as normal media\n\n` +
        `_All iPhone users can now see everything!_`
      );
    } else if (args === 'android' || args === 'full' || args === 'normal') {
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ deviceMode: 'Android' });
      } else {
        await updateSettings({ deviceMode: 'Android' });
      }
      conText.botSettings.deviceMode = 'Android';
      return reply(
        `🤖 *Device Mode: Android*\n\n` +
        `Bot will use full features:\n` +
        `• Buttons and carousels\n` +
        `• Context info and thumbnails\n` +
        `• Quoted messages\n\n` +
        `_Android users will see all features!_`
      );
    } else {
      return reply(`❌ Invalid option.\n\nUse:\n▸ ${prefix}devicemode iphone\n▸ ${prefix}devicemode android`);
    }
  } catch (error) {
    console.error('Device mode error:', error);
    return reply(`❌ Error: ${error.message}`);
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "botname",
  aliases: ["setbotname"],
  category: "Settings",
  description: "Change bot display name"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newName = q?.trim();

  if (!newName) {
    const settings = botSettings;
    return reply(
      `🤖 Bot Name\n\n` +
      `🔹 Current Name: ${settings.botname}\n` +
      (isSubBot ? `🔹 Sub-Bot: Yes (changes only affect this bot)\n\n` : '\n') +
      `Usage: ${settings.prefix}botname <new_name>`
    );
  }

  if (newName.length > 50) {
    return reply("❌ Bot name must be less than 50 characters!");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ botname: newName });
    } else {
      await updateSettings({ botname: newName });
    }
    conText.botSettings.botname = newName;
    return reply(`✅ Bot name changed to: ${newName}` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
  } catch (error) {
    return reply("❌ Failed to update bot name!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "author",
  aliases: ["setauthor"],
  category: "Settings",
  description: "Change bot author name"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newAuthor = q?.trim();

  if (!newAuthor) {
    const settings = botSettings;
    return reply(
      `👤 Bot Author\n\n` +
      `🔹 Current Author: ${settings.author}\n` +
      (isSubBot ? `🔹 Sub-Bot: Yes (changes only affect this bot)\n\n` : '\n') +
      `Usage: ${settings.prefix}author <new_author>`
    );
  }

  if (newAuthor.length > 30) {
    return reply("❌ Author name must be less than 30 characters!");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ author: newAuthor });
    } else {
      await updateSettings({ author: newAuthor });
    }
    conText.botSettings.author = newAuthor;
    return reply(`✅ Author changed to: ${newAuthor}` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
  } catch (error) {
    return reply("❌ Failed to update author!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "packname",
  aliases: ["setpackname"],
  category: "Settings",
  description: "Change sticker pack name"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newPackname = q?.trim();

  if (!newPackname) {
    const settings = botSettings;
    return reply(
      `🖼️ Sticker Pack Name\n\n` +
      `🔹 Current Packname: ${settings.packname}\n` +
      (isSubBot ? `🔹 Sub-Bot: Yes (changes only affect this bot)\n\n` : '\n') +
      `Usage: ${settings.prefix}packname <new_packname>`
    );
  }

  if (newPackname.length > 30) {
    return reply("❌ Packname must be less than 30 characters!");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ packname: newPackname });
    } else {
      await updateSettings({ packname: newPackname });
    }
    conText.botSettings.packname = newPackname;
    return reply(`✅ Packname changed to: ${newPackname}` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
  } catch (error) {
    return reply("❌ Failed to update packname!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "timezone",
  aliases: ["settimezone"],
  category: "Settings",
  description: "Change bot timezone"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newTimezone = q?.trim();

  if (!newTimezone) {
    let settings;
    if (isSubBot && botSettings) {
      settings = { timezone: botSettings.timezone || 'Africa/Nairobi', prefix: botSettings.prefix || '.' };
    } else {
      settings = botSettings;
    }
    return reply(
      `🌍 Bot Timezone\n\n` +
      `🔹 Current Timezone: ${settings.timezone}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\nUsage: ${settings.prefix}timezone <new_timezone>\n\n` +
      `Example: ${settings.prefix}timezone Africa/Nairobi`
    );
  }

  // Validate timezone using moment-timezone's own database
  const moment = require('moment-timezone');
  if (!moment.tz.zone(newTimezone)) {
    return reply(
      `❌ Unknown timezone: *${newTimezone}*\n\n` +
      `Use a valid IANA name, e.g.:\n` +
      `▸ Africa/Nairobi\n▸ Africa/Lagos\n▸ America/New_York\n▸ Asia/Dubai\n▸ Europe/London`
    );
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';
  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ timezone: newTimezone });
    } else {
      await updateSettings({ timezone: newTimezone });
    }
    conText.botSettings.timezone = newTimezone;
    return reply(`✅ Timezone changed to: ${newTimezone}` + subBotNote);
  } catch (error) {
    return reply("❌ Failed to update timezone!");
  }
});
//========================================================================================================================

async function uploadImageToCloudinary(filePath) {
  return uploadToCloudinary(filePath, { type: 'image', prefix: 'botpic' });
}

async function uploadVideoToCloudinary(filePath) {
  return uploadToCloudinary(filePath, { type: 'video', prefix: 'botpic' });
}

bwmxmd({
  pattern: "botpic",
  aliases: ["botprofile", "setbotimage"],
  category: "Settings",
  description: "Set bot image/video, or use botpic default to restore random default images"
},
async (from, client, conText) => {
  const { reply, q, mek, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings, quoted, quotedMsg } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  const requestedValue = q?.trim();
  // Reset before checking quoted media, so replying with "botpic default"
  // cannot accidentally upload the quoted image again.
  if (requestedValue?.toLowerCase() === 'default') {
    try {
      const saveSettings = isSubBot ? updateSubBotSettings : updateSettings;
      if (typeof saveSettings !== 'function') throw new Error('Settings updater unavailable');
      const defaultUrl = './adams/public/bot-image.jpg';
      await saveSettings({ url: defaultUrl });
      if (botSettings) botSettings.url = defaultUrl;
      return reply("✅ Default restored. Menus will randomly use the default images." + subBotNote);
    } catch (error) {
      return reply("❌ Failed to restore the default bot picture. Please try again.");
    }
  }

  // Check for quoted image or video
  const imageNode = quotedMsg?.imageMessage || quoted?.imageMessage;
  const videoNode = quotedMsg?.videoMessage || quoted?.videoMessage;
  const mediaNode = imageNode || videoNode;
  const isVideo = !!videoNode && !imageNode;

  if (mediaNode) {
    try {
      await reply(`⏳ Uploading ${isVideo ? 'video' : 'image'}...`);
      const tmpDir = pathModule.join(__dirname, '..', 'tmp');
      await fs.ensureDir(tmpDir);
      const ext = isVideo ? '.mp4' : '.jpg';
      const basePath = pathModule.join(tmpDir, `botpic-${Date.now()}${ext}`);
      const actualPath = await client.downloadAndSaveMediaMessage(mediaNode, basePath);
      const cloudUrl = isVideo
        ? await uploadVideoToCloudinary(actualPath)
        : await uploadImageToCloudinary(actualPath);
      try { fs.unlinkSync(actualPath); } catch (e) {}
      if (!cloudUrl || !cloudUrl.startsWith('http')) {
        return reply("❌ Upload failed. Try again or provide a direct URL.");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ url: cloudUrl });
      } else {
        await updateSettings({ url: cloudUrl });
      }
      if (conText.botSettings) conText.botSettings.url = cloudUrl;
      return reply(`✅ Set successfully` + subBotNote);
    } catch (err) {
      console.error('botpic upload error:', err);
      return reply("❌ Failed to upload: " + err.message);
    }
  }

  // No quoted media — check for URL or show current
  const newUrl = requestedValue;

  if (!newUrl) {
    let settings;
    if (isSubBot && botSettings) {
      settings = { url: botSettings.url || 'Not Set', prefix: botSettings.prefix || '.' };
    } else {
      settings = botSettings;
    }
    const currentUrl = settings.url && settings.url.startsWith('http') ? settings.url : 'Default (not set)';
    return reply(
      `🖼️ *Bot Image/Video*\n\n` +
      `🔹 *Current:* ${currentUrl}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes\n` : '') +
      `\n*How to set:*\n` +
      `▸ Reply to any *image* or *MP4* with *${settings.prefix}botpic*\n` +
      `▸ Or: *${settings.prefix}botpic <url>* to set a URL directly\n` +
      `▸ *${settings.prefix}botpic default* to restore random default images`
    );
  }

  // URL provided directly
  if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
    return reply("❌ Invalid URL! Must start with http:// or https://");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ url: newUrl });
    } else {
      await updateSettings({ url: newUrl });
    }
    if (conText.botSettings) conText.botSettings.url = newUrl;
    return reply(`✅ Set successfully` + subBotNote);
  } catch (error) {
    return reply("❌ Failed to update URL!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "menustyle",
  aliases: ["menudesign", "menutype"],
  category: "Settings",
  description: "Switch menu style (1, 2, or 3)"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, prefix, updateSettings, botSettings: menuBotSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const styleNum = parseInt(q?.trim());
  const current = menuBotSettings?.menuStyle || 1;

  if (!styleNum) {
    return reply(
      `*🎨 Menu Style*\n\n` +
      `🔹 *Current:* Style ${current}\n\n` +
      `*Available Styles:*\n` +
      `▸ Style *1* — Lines  (┌─❖ │ └┬❖)\n` +
      `▸ Style *2* — Box    (╔═❖ ║ ╠═❖)\n` +
      `▸ Style *3* — Arrow  (»─❖ » »─❖)\n\n` +
      `*Usage:* ${prefix}menustyle 1`
    );
  }

  if (![1, 2, 3].includes(styleNum)) {
    return reply(`❌ Invalid style. Choose 1, 2, or 3.\n\nUsage: ${prefix}menustyle 1`);
  }

  if (current === styleNum) {
    return reply(`⚠️ Menu is already on Style ${styleNum}.`);
  }

  try {
    await updateSettings({ menuStyle: styleNum });
    if (conText.botSettings) conText.botSettings.menuStyle = styleNum;
    if (conText.reloadSettings) await conText.reloadSettings();
    const styleNames = { 1: 'Lines (┌─❖)', 2: 'Box (╔═❖)', 3: 'Arrow (»─❖)' };
    return reply(`✅ Menu style changed to *Style ${styleNum}* — ${styleNames[styleNum]}\n\n_Send .menu to see the new style_`);
  } catch (error) {
    return reply("❌ Failed to update menu style!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "boturl",
  aliases: ["setboturl", "seturl"],
  category: "Settings",
  description: "Change bot GitHub/repo URL"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newGurl = q?.trim();

  if (!newGurl) {
    let settings;
    if (isSubBot && botSettings) {
      settings = { gurl: botSettings.gurl || 'Not Set', prefix: botSettings.prefix || '.' };
    } else {
      settings = botSettings;
    }
    return reply(
      `🔗 Bot URL\n\n` +
      `🔹 Current URL: ${settings.gurl || 'Not Set'}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\nUsage: ${settings.prefix}boturl <github_repo_url>`
    );
  }

  // Basic URL validation
  if (!newGurl.startsWith('http://') && !newGurl.startsWith('https://')) {
    return reply("❌ Invalid URL! Must start with http:// or https://");
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';
  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ gurl: newGurl });
    } else {
      await updateSettings({ gurl: newGurl });
    }
    conText.botSettings.gurl = newGurl;
    return reply(`✅ GitHub/Repo URL updated!` + subBotNote);
  } catch (error) {
    return reply("❌ Failed to update GitHub URL!");
  }
});
//========================================================================================================================
      
//========================================================================================================================
bwmxmd({
  pattern: "mode",
  aliases: ["setmode"],
  category: "Settings",
  description: "Change bot mode (public/private)"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newMode = q?.trim().toLowerCase();

  if (!newMode) {
    const settings = botSettings;
    return reply(
      `*🤖 Bot Mode*\n\n` +
      `🔹 *Current Mode:* ${settings.mode.toUpperCase()}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n\n` : '\n') +
      `*Available Modes:*\n` +
      `▸ public - Everyone can use commands\n` +
      `▸ private - Only owner/sudo can use commands\n\n` +
      `*Usage:* \`${settings.prefix}mode <public/private>\``
    );
  }

  if (!['public', 'private'].includes(newMode)) {
    return reply("❌ Invalid mode! Use: public or private");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ mode: newMode });
    } else {
      await updateSettings({ mode: newMode });
    }
    conText.botSettings.mode = newMode;
    return reply(`✅ Bot mode changed to: *${newMode.toUpperCase()}*` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
  } catch (error) {
    return reply("❌ Failed to update mode!");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "prefix",
  aliases: ["setprefix"],
  category: "Settings",
  description: "Change bot prefix"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const newPrefix = q?.trim();

  if (!newPrefix) {
    const settings = botSettings;
    return reply(`*🔧 Current Prefix:* \`${settings.prefix}\`` + 
      (isSubBot ? `\n🔹 *Sub-Bot:* Yes (changes only affect this bot)` : '') +
      `\n\n*Usage:* \`${settings.prefix}prefix <new_prefix>\``);
  }

  if (newPrefix.length > 3) {
    return reply("❌ Prefix must be 1-3 characters long!");
  }

  try {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ prefix: newPrefix });
    } else {
      await updateSettings({ prefix: newPrefix });
    }
    conText.botSettings.prefix = newPrefix;
    return reply(`✅ Prefix changed to: \`${newPrefix}\`` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
  } catch (error) {
    return reply("❌ Failed to update prefix!");
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "presence",
  aliases: ["setpresence", "mypresence"],
  category: "Settings",
  description: "Manage your presence settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const type = args[0]?.toLowerCase();
  const status = args[1]?.toLowerCase();

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      privateChat: botSettings.presencePrivateChat || 'off',
      groupChat: botSettings.presenceGroupChat || 'off'
    };
  } else {
    settings = await getPresenceSettings();
  }

  let groupPresence = null;
  if (conText.isGroup && !isSubBot) {
    const gs = await getGroupSettings(from);
    groupPresence = gs.presenceStatus || 'off';
  }

  if (!type) {
    const format = (s) => s === 'off' ? '❌ OFF' : `✅ ${s.toUpperCase()}`;
    let msg = `*🔄 Presence Settings*\n\n` +
      `🔹 *Private Chats:* ${format(settings.privateChat)}\n` +
      `🔹 *Group Chats (global):* ${format(settings.groupChat)}\n`;
    if (groupPresence !== null) {
      msg += `🔹 *This Group:* ${format(groupPresence)}\n`;
    }
    msg += (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ presence private [off/online/typing/recording]\n` +
      `▸ presence group [off/online/typing/recording]`;
    return reply(msg);
  }

  if (!['private', 'group'].includes(type)) {
    return reply(
      "❌ Invalid type. Use:\n\n" +
      `▸ presence private [status]\n` +
      `▸ presence group [status]\n` +
      `▸ presence group [status] all - Apply to all groups`
    );
  }

  if (!status || !['off', 'online', 'typing', 'recording'].includes(status)) {
    return reply(
      "❌ Invalid status. Options:\n\n" +
      `▸ off - No presence\n` +
      `▸ online - Show as online\n` +
      `▸ typing - Show typing indicator\n` +
      `▸ recording - Show recording indicator`
    );
  }

  const lastPresenceArg = args[2]?.toLowerCase();
  const isAllPresenceScope = lastPresenceArg === 'all';

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';
  if (isSubBot && updateSubBotSettings) {
    const updateKey = type === 'private' ? 'presencePrivateChat' : 'presenceGroupChat';
    await updateSubBotSettings({ [updateKey]: status });
  } else if (type === 'group') {
    if (isAllPresenceScope) {
      await updateGlobalGroupSettings({ presenceStatus: status });
      return reply(`✅ Group presence set to *${status}* for all groups.`);
    }
    if (!conText.isGroup) return reply("❌ Use this command in the group where you want to set presence, or add 'all' for global.");
    await updateGroupSettings(from, { presenceStatus: status });
  } else {
    await updatePresenceSettings({ privateChat: status });
  }
  reply(`✅ ${type === 'private' ? 'Private chat' : 'Group chat'} presence set to *${status}*` + subBotNote);
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "greet",
  aliases: ["autoreply"],
  category: "Settings",
  description: "Manage private chat greeting settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const action = args[0]?.toLowerCase();
  const message = args.slice(1).join(" ");

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      enabled: botSettings.greetEnabled || false,
      message: botSettings.greetMessage || 'Hello @user! Thanks for messaging.'
    };
  } else {
    settings = await getGreetSettings();
  }

  if (!action) {
    return reply(
      `*👋 Greeting Settings*\n\n` +
      `🔹 *Status:* ${settings.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Message:* ${settings.message}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ greet on/off\n` +
      `▸ greet set <message>\n` +
      `▸ greet clear`
    );
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  switch (action) {
    case 'on':
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ greetEnabled: true });
      } else {
        await updateGreetSettings({ enabled: true });
      }
      return reply("✅ Private chat greetings enabled." + subBotNote);

    case 'off':
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ greetEnabled: false });
      } else {
        await updateGreetSettings({ enabled: false });
      }
      return reply("✅ Private chat greetings disabled." + subBotNote);

    case 'set':
      if (!message) return reply("❌ Provide a greeting message.");
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ greetMessage: message });
      } else {
        await updateGreetSettings({ message });
      }
      return reply(`✅ Greet message updated:\n"${message}"` + subBotNote);

    case 'clear':
      clearRepliedContacts();
      return reply("✅ Replied contacts memory cleared.");

    default:
      return reply(
        "❌ Invalid subcommand. Options:\n\n" +
        `▸ greet on/off\n` +
        `▸ greet set <message>\n` +
        `▸ greet clear`
      );
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

// Helper functions for media download
async function downloadMedia(mediaUrl) {
    try {
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Error downloading media:', error);
        return null;
    }
}

bwmxmd({
  pattern: "chatbot",
  aliases: ["chatai"],
  category: "Settings",
  description: "Manage chatbot settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ");

  const settings = await getChatbotSettings();

  if (!subcommand) {
    const statusMap = {
      'on': '✅ ON',
      'off': '❌ OFF'
    };

    const modeMap = {
      'private': '🔒 Private Only',
      'group': '👥 Group Only', 
      'both': '🌐 Both'
    };

    const triggerMap = {
      'dm': '📨 DM Trigger',
      'all': '🔊 All Messages'
    };

    const responseMap = {
      'text': '📝 Text',
      'audio': '🎵 Audio'
    };

    return reply(
      `*🤖 Chatbot Settings*\n\n` +
      `🔹 *Status:* ${statusMap[settings.status]}\n` +
      `🔹 *Mode:* ${modeMap[settings.mode]}\n` +
      `🔹 *Trigger:* ${triggerMap[settings.trigger]}\n` +
      `🔹 *Default Response:* ${responseMap[settings.default_response]}\n` +
      `🔹 *Voice:* ${settings.voice}\n\n` +
      `*🎯 Response Types:*\n` +
      `▸ *Text* - Normal AI conversation\n` +
      `▸ *Audio* - Add "audio" to get voice response\n` +
      `▸ *Video* - Add "video" to generate videos\n` +
      `▸ *Image* - Add "image" to generate images\n` +
      `▸ *Vision* - Send image + "analyze this"\n\n` +
      `*Usage Examples:*\n` +
      `▸ @bot hello how are you? (Text)\n` +
      `▸ @bot audio tell me a story (Audio response)\n` +
      `▸ @bot video a cat running (Video generation)\n` +
      `▸ @bot image a beautiful sunset (Image generation)\n` +
      `▸ [Send image] "analyze this" (Vision analysis)\n\n` +
      `*Commands:*\n` +
      `▸ chatbot on/off\n` +
      `▸ chatbot mode private/group/both\n` +
      `▸ chatbot trigger dm/all\n` +
      `▸ chatbot response text/audio\n` +
      `▸ chatbot voice <name>\n` +
      `▸ chatbot voices\n` +
      `▸ chatbot clear\n` +
      `▸ chatbot status\n` +
      `▸ chatbot test <type> <message>`
    );
  }

  switch (subcommand) {
    case 'on':
    case 'off':
      await updateChatbotSettings({ status: subcommand });
      return reply(`✅ Chatbot: *${subcommand.toUpperCase()}*`);

    case 'mode':
      if (!['private', 'group', 'both'].includes(value)) {
        return reply("❌ Invalid mode! Use: private, group, or both");
      }
      await updateChatbotSettings({ mode: value });
      return reply(`✅ Chatbot mode: *${value.toUpperCase()}*`);

    case 'trigger':
      if (!['dm', 'all'].includes(value)) {
        return reply("❌ Invalid trigger! Use: dm or all");
      }
      await updateChatbotSettings({ trigger: value });
      return reply(`✅ Chatbot trigger: *${value.toUpperCase()}*`);

    case 'response':
      if (!['text', 'audio'].includes(value)) {
        return reply("❌ Invalid response type! Use: text or audio");
      }
      await updateChatbotSettings({ default_response: value });
      return reply(`✅ Default response: *${value.toUpperCase()}*`);

    case 'voice':
      if (!availableVoices.includes(value)) {
        return reply(`❌ Invalid voice! Available voices:\n${availableVoices.join(', ')}`);
      }
      await updateChatbotSettings({ voice: value });
      return reply(`✅ Voice set to: *${value}*`);

    case 'voices':
      return reply(`*🎙️ Available Voices:*\n\n${availableVoices.join(', ')}`);

    case 'clear':
      const cleared = await clearConversationHistory(from);
      if (cleared) {
        return reply("✅ Chatbot conversation history cleared!");
      } else {
        return reply("❌ No conversation history to clear!");
      }

    case 'status':
      const history = await getConversationHistory(from, 5);
      if (history.length === 0) {
        return reply("📝 No recent conversations found.");
      }
      
      let historyText = `*📚 Recent Conversations (${history.length})*\n\n`;
      history.forEach((conv, index) => {
        const typeIcon = getTypeIcon(conv.type);
        historyText += `*${index + 1}. ${typeIcon} You:* ${conv.user}\n`;
        historyText += `   *AI:* ${conv.type === 'audio' ? '[Voice Message]' : conv.ai}\n\n`;
      });
      
      return reply(historyText);

    case 'test':
      const testArgs = value.split(' ');
      const testType = testArgs[0]?.toLowerCase();
      const testMessage = testArgs.slice(1).join(' ') || "Hello, this is a test message";
      
      try {
        await reply(`🧪 Testing ${testType || 'text'} with: "${testMessage}"`);
        
        if (testType === 'audio') {
          const answer = await requestChatAnswer(testMessage);
          const speech = await requestSpeech(answer, settings.voice);
          return client.sendMessage(from, { audio: speech.buffer, ptt: true, mimetype: speech.mimetype });
        } else if (testType === 'video') {
          const generated = await requestGeneratedMedia('video', testMessage);
          if (generated?.buffer) return client.sendMessage(from, { video: generated.buffer, caption: `Test video: ${testMessage}` });
          return reply("Video generation is unavailable right now. Here is a text response instead:\n\n" +
            await safeChatAnswer(`Describe this video concept without claiming to generate it: ${testMessage}`));
        } else if (testType === 'image') {
          const generated = await requestGeneratedMedia('image', testMessage);
          if (generated?.buffer) return client.sendMessage(from, { image: generated.buffer, caption: `Test image: ${testMessage}` });
          return reply("Image generation is unavailable right now. Here is a text response instead:\n\n" +
            await safeChatAnswer(`Describe this image concept without claiming to generate it: ${testMessage}`));
        } else {
          // Text test
          return reply(await safeChatAnswer(testMessage));
        }
        
      } catch (error) {
        return reply(await safeChatAnswer(testMessage));
      }

    default:
      return reply(
        "❌ Invalid command!\n\n" +
        `▸ chatbot on/off\n` +
        `▸ chatbot mode private/group/both\n` +
        `▸ chatbot trigger dm/all\n` +
        `▸ chatbot response text/audio\n` +
        `▸ chatbot voice <name>\n` +
        `▸ chatbot voices\n` +
        `▸ chatbot clear\n` +
        `▸ chatbot status\n` +
        `▸ chatbot test <text/audio/video/image> <message>`
      );
  }
});

function getTypeIcon(type) {
  const icons = {
    'text': '📝',
    'audio': '🎵',
    'video': '🎥',
    'image': '🖼️',
    'vision': '🔍'
  };
  return icons[type] || '📝';
}
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "autoviewstatus",
  aliases: ["viewstatus"],
  category: "Settings",
  description: "Configure auto-view for incoming statuses"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const arg = q?.trim().toLowerCase();
  
  let settings;
  if (isSubBot && botSettings) {
    settings = {
      autoviewStatus: botSettings.autoviewStatus || 'false'
    };
  } else {
    settings = await getAutoStatusSettings();
  }

  if (!arg || arg === 'status') {
    return reply(
      `*👁️ Auto View Status*\n\n` +
      `🔹 *Enabled:* ${settings.autoviewStatus === 'true' ? '✅ ON' : '❌ OFF'}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ autoviewstatus on/off\n` +
      `▸ autoviewstatus status`
    );
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';
  let normalizedArg = arg;
  if (arg === 'on') normalizedArg = 'true';
  if (arg === 'off') normalizedArg = 'false';
  
  if (['true', 'false'].includes(normalizedArg)) {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ autoviewStatus: normalizedArg });
    } else {
      await updateAutoStatusSettings({ autoviewStatus: normalizedArg });
    }
    return reply(`✅ Auto-view status set to *${normalizedArg === 'true' ? 'ON' : 'OFF'}*` + subBotNote);
  }

  reply("❌ Invalid input. Use `.autoviewstatus on/off` or `.autoviewstatus status`.");
});
//========================================================================================================================


//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "autoreplystatus",
  aliases: ["replystatus"],
  category: "Settings",
  description: "Configure auto-reply for viewed statuses"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const sub = args[0]?.toLowerCase();
  
  let settings;
  if (isSubBot && botSettings) {
    settings = {
      autoReplyStatus: botSettings.autoReplyStatus || 'false',
      statusReplyText: botSettings.statusReplyText || 'Nice status!'
    };
  } else {
    settings = await getAutoStatusSettings();
  }

  if (!sub || sub === 'status') {
    return reply(
      `*💬 Auto Reply Status*\n\n` +
      `🔹 *Enabled:* ${settings.autoReplyStatus === 'true' ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Reply Text:* ${settings.statusReplyText}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ autoreplystatus on/off\n` +
      `▸ autoreplystatus text [your message]\n` +
      `▸ autoreplystatus status`
    );
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  if (sub === 'text') {
    const newText = args.slice(1).join(' ');
    if (!newText) return reply("❌ Provide reply text after 'text'");
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ statusReplyText: newText });
    } else {
      await updateAutoStatusSettings({ statusReplyText: newText });
    }
    return reply("✅ Auto-reply text updated." + subBotNote);
  }

  let normalizedSub = sub;
  if (sub === 'on') normalizedSub = 'true';
  if (sub === 'off') normalizedSub = 'false';
  
  if (['true', 'false'].includes(normalizedSub)) {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ autoReplyStatus: normalizedSub });
    } else {
      await updateAutoStatusSettings({ autoReplyStatus: normalizedSub });
    }
    return reply(`✅ Auto-reply status set to *${normalizedSub === 'true' ? 'ON' : 'OFF'}*` + subBotNote);
  }

  reply("❌ Invalid input. Use `.autoreplystatus on/off` or `.autoreplystatus status`.");
});
//========================================================================================================================

bwmxmd({
  pattern: "autoreactstatus",
  aliases: ["reactstatus", "statusreact", "autolikestatus"],
  category: "Settings",
  description: "Configure auto-react (emojis or text) for statuses"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, updateSettings, botSettings } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const sub = args[0]?.toLowerCase();

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      autoLikeStatus: botSettings.autoLikeStatus || 'false',
      statusLikeEmojis: botSettings.statusLikeEmojis || '👍,❤️,😍,🔥,😂'
    };
  } else {
    settings = await getAutoStatusSettings();
  }

  if (!sub || sub === 'status') {
    return reply(
      `*😍 Auto React Status*\n\n` +
      `Automatically reacts with emojis or text to every status your contacts post.\n\n` +
      `🔹 *Enabled:* ${settings.autoLikeStatus === 'true' ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Reactions (emojis or text):* ${settings.statusLikeEmojis}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ ${conText.prefix}autolikestatus on — Enable auto-react\n` +
      `▸ ${conText.prefix}autolikestatus off — Disable auto-react\n` +
      `▸ ${conText.prefix}autolikestatus emojis <list> — Set reaction emojis or text\n` +
      `▸ ${conText.prefix}autolikestatus emojis 👍,❤️,🔥 — Example reaction list\n` +
      `▸ ${conText.prefix}autolikestatus emojis xmd — Example text reaction\n` +
      `▸ ${conText.prefix}autolikestatus status — Show current settings\n\n` +
      `_Alias: autoreactstatus controls this same setting._\n` +
      `_You can use emojis or text. Separate multiple reactions with commas. A random one will be picked for each status._`
    );
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  if (sub === 'emojis') {
    const emojiList = args.slice(1).join(' ').trim();
    if (!emojiList) return reply("❌ Provide emojis or text. Examples: 👍,❤️,🔥 or xmd. Separate multiple reactions with commas.");
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ statusLikeEmojis: emojiList });
    } else {
      await updateAutoStatusSettings({ statusLikeEmojis: emojiList });
    }
    return reply(`✅ Status reactions updated to: ${emojiList}` + subBotNote);
  }

  let normalizedSub = sub;
  if (sub === 'on') normalizedSub = 'true';
  if (sub === 'off') normalizedSub = 'false';

  if (['true', 'false'].includes(normalizedSub)) {
    if (isSubBot && updateSubBotSettings) {
      await updateSubBotSettings({ autoLikeStatus: normalizedSub });
    } else {
      await updateAutoStatusSettings({ autoLikeStatus: normalizedSub });
    }
    return reply(`✅ Auto-react status set to *${normalizedSub === 'true' ? 'ON' : 'OFF'}*` + subBotNote);
  }

  reply("❌ Invalid input. Use `.autoreactstatus on/off`, `.autoreactstatus emojis <list>`, or `.autoreactstatus status`.");
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "autoread",
  aliases: ["readmessages", "setread"],
  category: "Settings",
  description: "Manage auto-read settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser } = conText;
  const { getAutoReadSettings, updateAutoReadSettings } = createSettingsView(conText, settingsReaders);

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ");

  const settings = await getAutoReadSettings();

  if (!subcommand) {
    const status = settings.status ? '✅ ON' : '❌ OFF';
    const types = settings.chatTypes.length > 0 ? settings.chatTypes.join(', ') : '*No types set*';

    return reply(
      `*👓 Auto-Read Settings*\n\n` +
      `🔹 *Status:* ${status}\n` +
      `🔹 *Chat Types:* ${types}\n\n` +
      `*🛠 Usage:*\n` +
      `▸ autoread on/off\n` +
      `▸ autoread types <private/group/both>\n` +
      `▸ autoread addtype <type>\n` +
      `▸ autoread removetype <type>`
    );
  }

  switch (subcommand) {
    case 'on':
    case 'off': {
      const newStatus = subcommand === 'on';
      await updateAutoReadSettings({ status: newStatus });
      return reply(`✅ Auto-read has been ${newStatus ? 'enabled' : 'disabled'}.`);
    }

    case 'types': {
      if (!['private', 'group', 'both'].includes(value)) {
        return reply('❌ Use "private", "group", or "both".');
      }
      const types = value === 'both' ? ['private', 'group'] : [value];
      await updateAutoReadSettings({ chatTypes: types });
      return reply(`✅ Auto-read set for: ${types.join(', ')}`);
    }

    case 'addtype': {
      if (!['private', 'group'].includes(value)) {
        return reply('❌ Use "private" or "group".');
      }
      if (settings.chatTypes.includes(value)) {
        return reply(`⚠️ Type ${value} is already included.`);
      }
      const updated = [...settings.chatTypes, value];
      await updateAutoReadSettings({ chatTypes: updated });
      return reply(`✅ Added ${value} to auto-read types.`);
    }

    case 'removetype': {
      if (!['private', 'group'].includes(value)) {
        return reply('❌ Use "private" or "group".');
      }
      if (!settings.chatTypes.includes(value)) {
        return reply(`⚠️ Type ${value} is not currently included.`);
      }
      const updated = settings.chatTypes.filter(t => t !== value);
      await updateAutoReadSettings({ chatTypes: updated });
      return reply(`✅ Removed ${value} from auto-read types.`);
    }

    default:
      return reply(
        "❌ Invalid subcommand. Options:\n\n" +
        `▸ autoread on/off\n` +
        `▸ autoread types <private/group/both>\n` +
        `▸ autoread addtype <type>\n` +
        `▸ autoread removetype <type>`
      );
  }
});
//========================================================================================================================
bwmxmd({
  pattern: "autoreact",
  category: "Settings",
  description: "Auto-react to messages in DMs and groups"
},
async (from, client, conText) => {
  const { reply, q, mek, prefix, isSubBot, updateSubBotSettings, isSuperUser } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const action = args[1]?.toLowerCase();
  const extra = args[2]?.toLowerCase();

  const reactSettings = await getAutoReactSettings();

  if (!subcommand) {
    const globalS = await getGlobalGroupSettings();
    let grpStatus = null;
    if (conText.isGroup) {
      const gs = await getGroupSettings(from);
      grpStatus = gs.autoreactEnabled;
    }
    let msg = `*😍 Auto React Settings*\n\n`;
    msg += `🔹 *DM Status:* ${reactSettings.dmStatus ? '✅ ON' : '❌ OFF'}\n`;
    msg += `🔹 *DM Emojis:* ${reactSettings.dmEmojis}\n`;
    if (grpStatus !== null) msg += `🔹 *This Group:* ${grpStatus ? '✅ ON' : '❌ OFF'}\n`;
    msg += `🔹 *All Groups:* ${globalS.autoreactEnabled ? '✅ ON' : '❌ OFF'}\n`;
    msg += `🔹 *Group Emojis:* ${globalS.autoreactEmojis || 'Default'}\n\n`;
    msg += `*🛠 Usage:*\n`;
    msg += `▸ autoreact dm on/off\n`;
    msg += `▸ autoreact group on/off [all]\n`;
    msg += `▸ autoreact emojis dm <emoji,emoji,...>\n`;
    msg += `▸ autoreact emojis group <emoji,emoji,...> [all]`;
    return reply(msg);
  }

  if (subcommand === 'dm') {
    if (!['on', 'off'].includes(action)) {
      return reply("❌ Use: autoreact dm on/off");
    }
    const newStatus = action === 'on';
    await updateAutoReactSettings({ dmStatus: newStatus });
    return reply(`✅ Auto-react in DMs ${newStatus ? 'enabled' : 'disabled'}.`);
  }

  if (subcommand === 'group') {
    if (!['on', 'off'].includes(action)) {
      return reply("❌ Use: autoreact group on/off [all]");
    }
    const newStatus = action === 'on';
    const isAll = extra === 'all';

    if (isAll) {
      await updateGlobalGroupSettings({ autoreactEnabled: newStatus });
      return reply(`✅ Auto-react ${newStatus ? 'enabled' : 'disabled'} for ALL groups.`);
    }
    if (!conText.isGroup) return reply("❌ Use this in a group, or add 'all' for global.");
    await updateGroupSettings(from, { autoreactEnabled: newStatus });
    return reply(`✅ Auto-react ${newStatus ? 'enabled' : 'disabled'} in this group.`);
  }

  if (subcommand === 'emojis') {
    const scope = action;
    if (!['dm', 'group'].includes(scope)) {
      return reply("❌ Use: autoreact emojis dm <emojis> OR autoreact emojis group <emojis> [all]");
    }
    const emojiStr = args.slice(2).join(' ').replace(/\s*all\s*$/i, '').trim();
    const isAll = args[args.length - 1]?.toLowerCase() === 'all';

    if (!emojiStr) {
      return reply("❌ Provide emojis separated by commas. Example: ❤️,🔥,💯");
    }

    if (scope === 'dm') {
      await updateAutoReactSettings({ dmEmojis: emojiStr });
      return reply(`✅ DM auto-react emojis set to: ${emojiStr}`);
    }

    if (scope === 'group') {
      if (isAll) {
        await updateGlobalGroupSettings({ autoreactEmojis: emojiStr });
        return reply(`✅ Group auto-react emojis set for ALL groups: ${emojiStr}`);
      }
      if (!conText.isGroup) return reply("❌ Use this in a group, or add 'all' for global.");
      await updateGroupSettings(from, { autoreactEmojis: emojiStr });
      return reply(`✅ Group auto-react emojis set for this group: ${emojiStr}`);
    }
  }

  return reply("❌ Invalid. Use: autoreact dm on/off | autoreact group on/off [all] | autoreact emojis dm/group <emojis>");
});
//========================================================================================================================

//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "autobio",
  aliases: ["bio", "setbio"],
  category: "Settings",
  description: "Manage auto-bio settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const message = args.slice(1).join(" ");

  const settings = await getAutoBioSettings();

  if (!subcommand) {
    const status = settings.status === 'on' ? '✅ ON' : '❌ OFF';
    const currentBotName = botSettings.botname || 'BWM-XMD';
    const currentTimezone = botSettings.timezone || 'Africa/Nairobi';

    return reply(
      `*📝 Auto-Bio Settings*\n\n` +
      `🔹 *Status:* ${status}\n` +
      `🔹 *Bot Name:* ${currentBotName}\n` +
      `🔹 *Timezone:* ${currentTimezone}\n` +
      `🔹 *Message:* ${settings.message}\n\n` +
      `*🛠 Usage:*\n` +
      `▸ autobio on/off\n` +
      `▸ autobio set <message>\n` +
      `▸ autobio reset\n\n` +
      `*💡 Note:* Uses bot name and timezone from settings`
    );
  }

  switch (subcommand) {
    case 'on':
    case 'off': {
      const newStatus = subcommand;
      if (settings.status === newStatus) {
        return reply(`⚠️ Auto-bio is already ${newStatus === 'on' ? 'enabled' : 'disabled'}.`);
      }
      await updateAutoBioSettings({ status: newStatus });
      
      // Restart auto-bio interval if enabling
      if (newStatus === 'on' && typeof global._bwmStartAutoBio === 'function') {
        global._bwmStartAutoBio();
      }
      
      return reply(`✅ Auto-bio has been ${newStatus === 'on' ? 'enabled' : 'disabled'}.`);
    }

    case 'set': {
      if (!message) return reply("❌ Provide a bio message.");
      if (message.length > 100) return reply("❌ Bio message too long (max 100 characters).");
      
      await updateAutoBioSettings({ message });
      return reply(`✅ Bio message updated to:\n"${message}"`);
    }

    case 'reset': {
      const defaultMessage = '🌟 Always active!';
      await updateAutoBioSettings({ message: defaultMessage });
      return reply(`✅ Bio message reset to default:\n"${defaultMessage}"`);
    }

    default:
      return reply(
        "❌ Invalid subcommand. Options:\n\n" +
        `▸ autobio on/off\n` +
        `▸ autobio set <message>\n` +
        `▸ autobio reset`
      );
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "antistatusmention",
  aliases: ["antistatus", "statusguard", "antitag"],
  category: "Settings",
  description: "Manage anti-status-mention settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isBotAdmin, isGroup } = conText;

  if (!isSuperUser) return reply("❌ Admin only command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const value = args[1]?.toLowerCase();
  const lastArg = args[args.length - 1]?.toLowerCase();
  const isAllScope = lastArg === 'all' && args.length > 1;

  if (!isGroup && !isAllScope) return reply("❌ Use in a group or add 'all' for global!");

  const groupSettings = isGroup ? await getGroupSettings(from) : await getGlobalGroupSettings();
  const settings = {
    status: groupSettings.antitagStatus,
    action: groupSettings.antitagAction,
    warn_limit: groupSettings.antitagWarnLimit
  };

  if (!subcommand) {
    const globalS = await getGlobalGroupSettings();
    const statusMap = {
      'off': '❌ OFF',
      'warn': '⚠️ WARN', 
      'delete': '🗑️ DELETE',
      'remove': '🚫 REMOVE'
    };

    return reply(
      `*🛡️ Anti-Status-Mention Settings*\n\n` +
      `🔹 *Status:* ${statusMap[settings.status]}\n` +
      `🔹 *All Groups:* ${statusMap[globalS.antitagStatus] || '❌ OFF'}\n` +
      `🔹 *Warn Limit:* ${settings.warn_limit}\n\n` +
      `*Blocks:* Status mention messages in groups\n\n` +
      `*Actions:*\n` +
      `▸ warn - Warn users (remove after ${settings.warn_limit} warnings)\n` +
      `▸ delete - Delete status mentions + warn\n` +
      `▸ remove - Delete status mentions + remove immediately\n\n` +
      `*Usage:*\n` +
      `▸ antistatusmention off/warn/delete/remove\n` +
      `▸ antistatusmention off/warn/delete/remove all\n` +
      `▸ antistatusmention limit <1-10>\n` +
      `▸ antistatusmention resetwarns`
    );
  }

  switch (subcommand) {
    case 'off':
      if (isAllScope) {
        await updateGlobalGroupSettings({ antitagStatus: 'off' });
        return reply(`✅ Anti-status-mention: *OFF* for all groups.`);
      }
      await updateGroupSettings(from, { antitagStatus: 'off' });
      return reply(`✅ Anti-status-mention: *OFF*`);
    case 'warn':
    case 'delete':
    case 'remove':
      if (isAllScope) {
        await updateGlobalGroupSettings({ antitagStatus: subcommand, antitagAction: subcommand });
        return reply(`✅ Anti-status-mention: *${subcommand.toUpperCase()}* for all groups.`);
      }
      await updateGroupSettings(from, { antitagStatus: subcommand, antitagAction: subcommand });
      return reply(`✅ Anti-status-mention: *${subcommand.toUpperCase()}*`);

    case 'limit':
      const limit = parseInt(value);
      if (isNaN(limit) || limit < 1 || limit > 10) {
        return reply("❌ Limit must be 1-10");
      }
      if (isAllScope) await updateGlobalGroupSettings({ antitagWarnLimit: limit });
      else await updateGroupSettings(from, { antitagWarnLimit: limit });
      return reply(`✅ Warn limit: *${limit}*`);

    case 'resetwarns':
      clearGroupTagWarns(from);
      return reply("✅ Status mention warning counts reset!");

    default:
      return reply(
        "❌ Invalid command!\n\n" +
        `▸ antistatusmention off/warn/delete/remove\n` +
        `▸ antistatusmention off/warn/delete/remove all\n` +
        `▸ antistatusmention limit <1-10>\n` +
        `▸ antistatusmention resetwarns`
      );
  }
});
//========================================================================================================================
//const { bwmxmd } = require('../adams/commandHandler');

bwmxmd({
  pattern: "antilink",
  aliases: ["linkguard"],
  category: "Settings",
  description: "Manage anti-link settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isBotAdmin, isGroup, isSubBot, updateSubBotSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Admin only command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const value = args[1]?.toLowerCase();
  const lastArg = args[args.length - 1]?.toLowerCase();
  const isAllScope = lastArg === 'all' && args.length > 1;

  if (!isGroup && !isAllScope) return reply("❌ Use in a group or add 'all' for global!");

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      status: botSettings.antilinkStatus || 'off',
      action: botSettings.antilinkAction || 'delete',
      warn_limit: botSettings.antilinkWarnLimit || 3
    };
  } else {
    const groupSettings = isGroup ? await getGroupSettings(from) : await getGlobalGroupSettings();
    settings = {
      status: groupSettings.antilinkStatus,
      action: groupSettings.antilinkAction,
      warn_limit: groupSettings.antilinkWarnLimit
    };
  }

  if (!subcommand) {
    const globalS = await getGlobalGroupSettings();
    const statusMap = {
      'off': '❌ OFF',
      'warn': '⚠️ WARN', 
      'delete': '🗑️ DELETE',
      'remove': '🚫 REMOVE'
    };

    return reply(
      `*🛡️ Anti-Link Settings*\n\n` +
      `🔹 *Status:* ${statusMap[settings.status]}\n` +
      `🔹 *All Groups:* ${statusMap[globalS.antilinkStatus] || '❌ OFF'}\n` +
      `🔹 *Warn Limit:* ${settings.warn_limit}\n` +
      (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*Actions:*\n` +
      `▸ warn - Warn users (remove after ${settings.warn_limit} warnings)\n` +
      `▸ delete - Delete links + warn\n` +
      `▸ remove - Delete links + remove immediately\n\n` +
      `*Usage:*\n` +
      `▸ antilink off/warn/delete/remove\n` +
      `▸ antilink off/warn/delete/remove all\n` +
      `▸ antilink limit <1-10>\n` +
      `▸ antilink resetwarns`
    );
  }

  switch (subcommand) {
    case 'off':
      if (isAllScope) {
        await updateGlobalGroupSettings({ antilinkStatus: 'off' });
        return reply(`✅ Anti-link: *OFF* for all groups.`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antilinkStatus: 'off' });
      } else {
        await updateGroupSettings(from, { antilinkStatus: 'off' });
      }
      return reply(`✅ Anti-link: *OFF*` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));
    case 'warn':
    case 'delete':
    case 'remove':
      if (isAllScope) {
        await updateGlobalGroupSettings({ antilinkStatus: subcommand, antilinkAction: subcommand });
        return reply(`✅ Anti-link: *${subcommand.toUpperCase()}* for all groups.`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antilinkStatus: subcommand, antilinkAction: subcommand });
      } else {
        await updateGroupSettings(from, { antilinkStatus: subcommand, antilinkAction: subcommand });
      }
      return reply(`✅ Anti-link: *${subcommand.toUpperCase()}*` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));

    case 'limit':
      const limit = parseInt(value);
      if (isNaN(limit) || limit < 1 || limit > 10) {
        return reply("❌ Limit must be 1-10");
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antilinkWarnLimit: limit });
      } else {
      if (isAllScope) await updateGlobalGroupSettings({ antilinkWarnLimit: limit });
      else await updateGroupSettings(from, { antilinkWarnLimit: limit });
      }
      return reply(`✅ Warn limit: *${limit}*` + (isSubBot ? '\n_(Only affects this sub-bot)_' : ''));

    case 'resetwarns':
      clearGroupWarns(from);
      return reply("✅ Warning counts reset!");

    default:
      return reply(
        "❌ Invalid command!\n\n" +
        `▸ antilink off/warn/delete/remove\n` +
        `▸ antilink off/warn/delete/remove all\n` +
        `▸ antilink limit <1-10>\n` +
        `▸ antilink resetwarns`
      );
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "antidelete",
  aliases: ["deleteset", "antideletesetting"],
  category: "Settings",
  description: "Manage anti-delete settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isSubBot, updateSubBotSettings, botSettings, isGroup } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const lastArg = args[args.length - 1]?.toLowerCase();
  const isAllScope = lastArg === 'all' && args.length > 1;
  const value = isAllScope ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      status: botSettings.antideleteStatus || false,
      includeGroupInfo: botSettings.antideleteIncludeGroupInfo !== false,
      includeMedia: botSettings.antideleteIncludeMedia !== false,
      sendToOwner: botSettings.antideleteSendToOwner !== false,
      notification: botSettings.antideleteNotification || '🗑️ *Message Deleted*'
    };
  } else {
    settings = await getAntiDeleteSettings();
  }

  let groupSettings = null;
  if (isGroup && !isSubBot) {
    groupSettings = await getGroupSettings(from);
  }

  if (!subcommand) {
    const status = settings.status ? '✅ ON' : '❌ OFF';
    const groupInfo = settings.includeGroupInfo ? '✅ ON' : '❌ OFF';
    const media = settings.includeMedia ? '✅ ON' : '❌ OFF';
    const toOwner = settings.sendToOwner ? '✅ ON' : '❌ OFF';
    const globalS = await getGlobalGroupSettings();

    const dmChat = settings.sendToDmChat !== false ? '✅ ON' : '❌ OFF';
    let statusMsg = `*👿 Anti-Delete Settings*\n\n` +
      `🔹 *Master Switch:* ${status}\n` +
      `🔹 *Private DM Recovery:* ${dmChat} _(sends deleted msg back to same DM)_\n` +
      `🔹 *Also Copy to Owner Inbox:* ${toOwner}\n` +
      `🔹 *All Groups:* ${globalS.antideleteEnabled ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Include Media Content:* ${media}\n` +
      `🔹 *Include Group Info:* ${groupInfo}\n` +
      `🔹 *Notification Text:* ${settings.notification}\n`;

    if (groupSettings) {
      statusMsg += `\n*📌 This Group:*\n` +
        `🔹 *Group Anti-Delete:* ${groupSettings.antideleteEnabled ? '✅ ON' : '❌ OFF'}\n` +
        `🔹 *Send to Group Chat:* ${groupSettings.antideleteSendToChat ? '✅ ON' : '❌ OFF'}\n`;
    }

    statusMsg += (isSubBot ? `🔹 *Sub-Bot:* Yes (changes only affect this bot)\n` : '') +
      `\n*🛠 Usage:*\n` +
      `▸ *Master switch (from any DM):*\n` +
      `   !antidelete on — Enable everything\n` +
      `   !antidelete off — Disable ALL antidelete everywhere\n\n` +
      `▸ *Private DM recovery:*\n` +
      `   !antidelete dm on — Send recovered msgs back into the DM\n` +
      `   !antidelete dm off — Disable DM recovery (groups unaffected)\n` +
      `   !antidelete inbox on/off — Also copy to owner inbox\n\n` +
      `▸ *Groups:*\n` +
      `   !antidelete on — Enable for this group\n` +
      `   !antidelete off — Disable for this group\n` +
      `   !antidelete chat on/off — Post recovered msg back into group\n` +
      `   !antidelete on all / off all — All groups at once\n\n` +
      `▸ *Other:*\n` +
      `   !antidelete media on/off\n` +
      `   !antidelete groupinfo on/off\n` +
      `   !antidelete notification <text>`;

    return reply(statusMsg);
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  switch (subcommand) {
    case 'on':
    case 'off': {
      const newStatus = subcommand === 'on';
      if (isAllScope) {
        await updateGlobalGroupSettings({ antideleteEnabled: newStatus });
        return reply(`✅ Anti-delete ${newStatus ? 'enabled' : 'disabled'} for all groups.`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antideleteStatus: newStatus });
      } else if (isGroup) {
        // For groups: enable in this group AND ensure master switch is ON
        await updateGroupSettings(from, { antideleteEnabled: newStatus });
        if (newStatus) await updateAntiDeleteSettings({ status: true, sendToOwner: true });
        return reply(
          newStatus
            ? `✅ Anti-delete *ON* for this group.\nDeleted messages will be sent to owner's DM inbox.\n\nTo also show them here in the group: *!antidelete chat on*`
            : `✅ Anti-delete *OFF* for this group.`
        );
      } else {
        // In private DM: toggle master switch. When turning ON, also enable inbox.
        if (newStatus) {
          await updateAntiDeleteSettings({ status: true, sendToOwner: true });
        } else {
          await updateAntiDeleteSettings({ status: false });
        }
        return reply(
          newStatus
            ? `✅ Anti-delete *ON* — Inbox enabled\n\nDeleted messages will come to your owner inbox.\n\n` +
              `To also recover in private DMs: *!antidelete dm on*\n` +
              `For groups, run *!antidelete on* inside the group.`
            : `✅ Anti-delete *OFF* — All recovery disabled everywhere.\n\nUse *!antidelete on* to turn it back on.`
        );
      }
    }

    case 'chat': {
      const chatArgs = isAllScope ? args.slice(1, -1) : args.slice(1);
      const chatValue = chatArgs[0]?.toLowerCase();
      if (!['on', 'off'].includes(chatValue)) return reply('❌ Use "on" or "off".');
      const newValue = chatValue === 'on';
      if (isAllScope) {
        await updateGlobalGroupSettings({ antideleteSendToChat: newValue });
        return reply(`✅ In-group deleted message recovery ${newValue ? 'enabled' : 'disabled'} for all groups.`);
      }
      if (!isGroup) return reply('❌ This subcommand can only be used in a group or with "all".');
      await updateGroupSettings(from, { antideleteSendToChat: newValue });
      return reply(`✅ In-group deleted message recovery ${newValue ? 'enabled' : 'disabled'}.`);
    }

    case 'dm': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".\n\n▸ !antidelete dm on — Enable private DM recovery\n▸ !antidelete dm off — Disable DM recovery only (groups unaffected)');
      const newValue = value === 'on';
      await updateAntiDeleteSettings({ sendToDmChat: newValue });
      return reply(
        newValue
          ? `✅ Private DM recovery *ON*\nWhen a message is deleted in a private DM, it will be sent back into that same DM.`
          : `✅ Private DM recovery *OFF*\nDeleted messages in private DMs will no longer be recovered there.\nGroup antidelete is unaffected.`
      );
    }

    case 'notification': {
      if (!value) return reply('❌ Provide a notification text.');
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antideleteNotification: value });
      } else {
        await updateAntiDeleteSettings({ notification: value });
      }
      return reply(`✅ Notification updated:\n\n"${value}"` + subBotNote);
    }

    case 'groupinfo': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antideleteIncludeGroupInfo: newValue });
      } else {
        await updateAntiDeleteSettings({ includeGroupInfo: newValue });
      }
      return reply(`✅ Group info inclusion ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    case 'media': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antideleteIncludeMedia: newValue });
      } else {
        await updateAntiDeleteSettings({ includeMedia: newValue });
      }
      return reply(`✅ Media content inclusion ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    case 'inbox': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antideleteSendToOwner: newValue });
      } else {
        await updateAntiDeleteSettings({ sendToOwner: newValue });
      }
      return reply(`✅ Send to owner inbox ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    default:
      return reply(
        '❌ Invalid subcommand. Options:\n\n' +
        `▸ antidelete on/off\n` +
        `▸ antidelete on/off all\n` +
        `▸ antidelete notification <text>\n` +
        `▸ antidelete groupinfo on/off\n` +
        `▸ antidelete media on/off\n` +
        `▸ antidelete inbox on/off\n` +
        `▸ antidelete chat on/off\n` +
        `▸ antidelete chat on/off all`
      );
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "antiedit",
  aliases: ["editset", "antieditsetting"],
  category: "Settings",
  description: "Manage anti-edit settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isGroup, isSubBot, updateSubBotSettings, botSettings } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const args = q?.trim().split(/\s+/) || [];
  const subcommand = args[0]?.toLowerCase();
  const lastArg = args[args.length - 1]?.toLowerCase();
  const isAllScope = lastArg === 'all' && args.length > 1;
  const value = isAllScope ? args.slice(1, -1).join(" ") : args.slice(1).join(" ");

  let settings;
  if (isSubBot && botSettings) {
    settings = {
      status: botSettings.antieditStatus || false,
      includeGroupInfo: botSettings.antieditIncludeGroupInfo !== false,
      includeMedia: botSettings.antieditIncludeMedia !== false,
      sendToOwner: botSettings.antieditSendToOwner !== false,
      sendToDmChat: botSettings.antieditSendToDmChat === true,
      notification: botSettings.antieditNotification || '📝 *Message Edited*'
    };
  } else {
    settings = await getAntiEditSettings();
  }

  let groupSettings = null;
  if (isGroup) {
    groupSettings = await getGroupSettings(from);
  }

  const subBotNote = isSubBot ? '\n_(Only affects this sub-bot)_' : '';

  if (!subcommand) {
    const status = settings.status ? '✅ ON' : '❌ OFF';
    const groupInfo = settings.includeGroupInfo ? '✅ ON' : '❌ OFF';
    const media = settings.includeMedia ? '✅ ON' : '❌ OFF';
    const toOwner = settings.sendToOwner ? '✅ ON' : '❌ OFF';
    const globalS = await getGlobalGroupSettings();
    const dmChat = settings.sendToDmChat !== false ? '✅ ON' : '❌ OFF';

    let statusMsg = `*📝 Anti-Edit Settings*\n\n` +
      `🔹 *Master Switch:* ${status}\n` +
      `🔹 *Private DM Capture:* ${dmChat} _(sends edited msg back to same DM)_\n` +
      `🔹 *Also Copy to Owner Inbox:* ${toOwner}\n` +
      `🔹 *All Groups:* ${globalS.antieditEnabled ? '✅ ON' : '❌ OFF'}\n` +
      `🔹 *Include Media Content:* ${media}\n` +
      `🔹 *Include Group Info:* ${groupInfo}\n` +
      `🔹 *Notification Text:* ${settings.notification}\n`;

    if (groupSettings) {
      statusMsg += `\n*📌 This Group:*\n` +
        `🔹 *Group Anti-Edit:* ${groupSettings.antieditEnabled ? '✅ ON' : '❌ OFF'}\n` +
        `🔹 *Send to Group Chat:* ${groupSettings.antieditSendToChat ? '✅ ON' : '❌ OFF'}\n`;
    }

    statusMsg += `\n*🛠 Usage:*\n` +
      `▸ *Master switch (from any DM):*\n` +
      `   !antiedit on — Enable everything\n` +
      `   !antiedit off — Disable ALL antiedit everywhere\n\n` +
      `▸ *Private DM capture:*\n` +
      `   !antiedit dm on — Send edited msgs back into the DM\n` +
      `   !antiedit dm off — Disable DM capture (groups unaffected)\n` +
      `   !antiedit inbox on/off — Also copy to owner inbox\n\n` +
      `▸ *Groups:*\n` +
      `   !antiedit on — Enable for this group\n` +
      `   !antiedit off — Disable for this group\n` +
      `   !antiedit chat on/off — Post edited msg back into group\n` +
      `   !antiedit on all / off all — All groups at once\n\n` +
      `▸ *Other:*\n` +
      `   !antiedit media on/off\n` +
      `   !antiedit groupinfo on/off\n` +
      `   !antiedit notification <text>`;

    return reply(statusMsg);
  }

  switch (subcommand) {
    case 'on':
    case 'off': {
      const newStatus = subcommand === 'on';
      if (isAllScope) {
        if (isSubBot) return reply('❌ "all" scope is not available on sub-bots. Use *antiedit on/off* instead.');
        await updateGlobalGroupSettings({ antieditEnabled: newStatus });
        return reply(`✅ Anti-edit ${newStatus ? 'enabled' : 'disabled'} for all groups.`);
      }
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditStatus: newStatus });
        return reply(`✅ Anti-edit ${newStatus ? '*ON*' : '*OFF*'} for this sub-bot.` + subBotNote);
      }
      if (isGroup) {
        await updateGroupSettings(from, { antieditEnabled: newStatus });
        if (newStatus) await updateAntiEditSettings({ status: true, sendToOwner: true });
        return reply(
          newStatus
            ? `✅ Anti-edit *ON* for this group.\nEdited messages will be sent to owner's DM inbox.\n\nTo also show them here in the group: *!antiedit chat on*`
            : `✅ Anti-edit *OFF* for this group.`
        );
      } else {
        if (newStatus) {
          await updateAntiEditSettings({ status: true, sendToOwner: true });
        } else {
          await updateAntiEditSettings({ status: false });
        }
        return reply(
          newStatus
            ? `✅ Anti-edit *ON* — Inbox enabled\n\nEdited messages will come to your owner inbox.\n\n` +
              `To also capture in private DMs: *!antiedit dm on*\n` +
              `For groups, run *!antiedit on* inside the group.`
            : `✅ Anti-edit *OFF* — All capture disabled everywhere.\n\nUse *!antiedit on* to turn it back on.`
        );
      }
    }

    case 'chat': {
      const chatArgs = isAllScope ? args.slice(1, -1) : args.slice(1);
      const chatValue = chatArgs[0]?.toLowerCase();
      if (!['on', 'off'].includes(chatValue)) return reply('❌ Use "on" or "off".');
      const newValue = chatValue === 'on';
      if (isAllScope) {
        if (isSubBot) return reply('❌ "all" scope is not available on sub-bots. Use *antiedit chat on/off* inside a group instead.');
        await updateGlobalGroupSettings({ antieditSendToChat: newValue });
        return reply(`✅ In-group edited message capture ${newValue ? 'enabled' : 'disabled'} for all groups.`);
      }
      if (!isGroup) return reply('❌ This subcommand can only be used in a group or with "all".');
      await updateGroupSettings(from, { antieditSendToChat: newValue });
      return reply(`✅ In-group edited message capture ${newValue ? 'enabled' : 'disabled'}.`);
    }

    case 'dm': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".\n\n▸ !antiedit dm on — Enable private DM capture\n▸ !antiedit dm off — Disable DM capture only (groups unaffected)');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditSendToDmChat: newValue });
      } else {
        await updateAntiEditSettings({ sendToDmChat: newValue });
      }
      return reply(
        newValue
          ? `✅ Private DM capture *ON*\nWhen a message is edited in a private DM, it will be sent back into that same DM.`
          : `✅ Private DM capture *OFF*\nEdited messages in private DMs will no longer be sent there.\nGroup antiedit is unaffected.`
      );
    }

    case 'notification': {
      if (!value) return reply('❌ Provide a notification text.');
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditNotification: value });
      } else {
        await updateAntiEditSettings({ notification: value });
      }
      return reply(`✅ Notification updated:\n\n"${value}"` + subBotNote);
    }

    case 'groupinfo': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditIncludeGroupInfo: newValue });
      } else {
        await updateAntiEditSettings({ includeGroupInfo: newValue });
      }
      return reply(`✅ Group info inclusion ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    case 'media': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditIncludeMedia: newValue });
      } else {
        await updateAntiEditSettings({ includeMedia: newValue });
      }
      return reply(`✅ Media content inclusion ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    case 'inbox': {
      if (!['on', 'off'].includes(value)) return reply('❌ Use "on" or "off".');
      const newValue = value === 'on';
      if (isSubBot && updateSubBotSettings) {
        await updateSubBotSettings({ antieditSendToOwner: newValue });
      } else {
        await updateAntiEditSettings({ sendToOwner: newValue });
      }
      return reply(`✅ Send to owner inbox ${newValue ? 'enabled' : 'disabled'}.` + subBotNote);
    }

    default:
      return reply(
        '❌ Invalid subcommand. Options:\n\n' +
        `▸ antiedit on/off\n` +
        `▸ antiedit on/off all\n` +
        `▸ antiedit notification <text>\n` +
        `▸ antiedit groupinfo on/off\n` +
        `▸ antiedit media on/off\n` +
        `▸ antiedit inbox on/off\n` +
        `▸ antiedit chat on/off\n` +
        `▸ antiedit chat on/off all`
      );
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "viewonce",
  aliases: ["vo", "viewonceset"],
  category: "Settings",
  description: "Manage viewonce auto-forward settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser, isGroup } = conText;
  if (!isSuperUser) return reply("❌ Owner only!");

  const args = q?.trim().toLowerCase().split(/\s+/) || [];
  const action = args[0];
  const scope = args[1];

  if (!action || !['on', 'off', 'status'].includes(action)) {
    return reply(
      `👁️ *ViewOnce Auto-Forward Settings*\n\n` +
      `Usage:\n` +
      `▸ viewonce on - Enable for this group\n` +
      `▸ viewonce off - Disable for this group\n` +
      `▸ viewonce on all - Enable for all groups + private chats\n` +
      `▸ viewonce off all - Disable for all\n` +
      `▸ viewonce status - Show current status`
    );
  }

  if (action === 'status') {
    const globalS = await getGlobalGroupSettings();
    let msg = `👁️ *ViewOnce Status*\n\n`;
    msg += `▸ All groups: ${globalS.viewonceEnabled ? 'ON' : 'OFF'}`;
    if (isGroup) {
      const grpS = await getGroupSettings(from);
      msg += `\n▸ This group: ${grpS.viewonceEnabled ? 'ON' : 'OFF'}`;
    }
    return reply(msg);
  }

  const newStatus = action === 'on';
  if (scope === 'all') {
    await updateGlobalGroupSettings({ viewonceEnabled: newStatus });
    return reply(`✅ ViewOnce auto-forward ${newStatus ? 'enabled' : 'disabled'} for all groups & private chats.`);
  }

  if (isGroup) {
    await updateGroupSettings(from, { viewonceEnabled: newStatus });
    return reply(`✅ ViewOnce auto-forward ${newStatus ? 'enabled' : 'disabled'} for this group.`);
  }

  await updateGlobalGroupSettings({ viewonceEnabled: newStatus });
  return reply(`✅ ViewOnce auto-forward ${newStatus ? 'enabled' : 'disabled'} globally.`);
});
//========================================================================================================================

bwmxmd({
  pattern: "statusantidelete",
  aliases: ["statusad", "statusantidel"],
  category: "Settings",
  description: "Manage status antidelete settings"
},
async (from, client, conText) => {
  const { reply, q, isSuperUser } = conText;
  if (!isSuperUser) return reply("❌ Owner only!");

  const action = q?.trim().toLowerCase();

  if (!action || !['on', 'off', 'status'].includes(action)) {
    return reply(
      `📊 *Status AntiDelete Settings*\n\n` +
      `Usage:\n` +
      `▸ statusantidelete on - Enable status message recovery\n` +
      `▸ statusantidelete off - Disable status message recovery\n` +
      `▸ statusantidelete status - Show current status`
    );
  }

  if (action === 'status') {
    const globalS = await getGlobalGroupSettings();
    return reply(`📊 *Status AntiDelete:* ${globalS.statusAntideleteEnabled ? 'ON' : 'OFF'}`);
  }

  const newStatus = action === 'on';
  await updateGlobalGroupSettings({ statusAntideleteEnabled: newStatus });
  return reply(`✅ Status antidelete ${newStatus ? 'enabled' : 'disabled'}. ${newStatus ? 'Deleted status messages will now be recovered.' : ''}`);
});
//========================================================================================================================
//========================================================================================================================

bwmxmd({
  pattern: "allvar",
  react: "📊",
  aliases: ["getallvar", "vars", "listvars", "varlist", "allsettings"],
  category: "Settings",
  description: "View all bot variables and settings"
},
async (from, client, conText) => {
  const { reply, isSuperUser } = conText;
  const {
    getAutoStatusSettings, getAutoReadSettings, getPresenceSettings,
    getAntiDeleteSettings, getAntiCallSettings, getAutoBioSettings
  } = createSettingsView(conText, settingsReaders);

  if (!isSuperUser) return reply("*Owner only command*");

  try {
    const [botSettings, statusSettings, readSettings, presenceSettings] = await Promise.all([
      conText.getSettings ? conText.getSettings() : getSettings(),
      getAutoStatusSettings(),
      getAutoReadSettings(),
      getPresenceSettings()
    ]);
    
    let antideleteSettings = { status: false };
    let anticallSettings = { status: false, action: 'reject' };
    let autobioSettings = { enabled: false, text: '' };
    
    try { antideleteSettings = await getAntiDeleteSettings(); } catch (e) {}
    try { anticallSettings = await getAntiCallSettings(); } catch (e) {}
    try { autobioSettings = await getAutoBioSettings(); } catch (e) {}
    
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    let msg = `*BWM-XMD ALL VARIABLES*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    msg += `*BOT CONFIG*\n`;
    msg += `├ prefix: \`${botSettings.prefix}\`\n`;
    msg += `├ botname: ${botSettings.botname}\n`;
    msg += `├ mode: ${botSettings.mode}\n`;
    msg += `├ deviceMode: ${botSettings.deviceMode}\n`;
    msg += `├ packname: ${botSettings.packname}\n`;
    msg += `├ author: ${botSettings.author}\n`;
    msg += `└ timezone: ${botSettings.timezone}\n\n`;
    
    msg += `*STATUS*\n`;
    msg += `├ autoviewStatus: ${statusSettings.autoviewStatus === 'true' ? 'ON' : 'OFF'}\n`;
    msg += `├ autoReplyStatus: ${statusSettings.autoReplyStatus === 'true' ? 'ON' : 'OFF'}\n`;
    msg += `├ statusReplyText: ${(statusSettings.statusReplyText || '').slice(0, 25)}...\n`;
    msg += `├ autoReactStatus: ${statusSettings.autoLikeStatus === 'true' ? 'ON' : 'OFF'}\n`;
    msg += `└ statusReactEmojis: ${statusSettings.statusLikeEmojis || '👍,❤️,😍,🔥,😂'}\n\n`;
    
    msg += `*AUTO FEATURES*\n`;
    msg += `├ autoread: ${readSettings.status ? 'ON' : 'OFF'}\n`;
    msg += `└ autobio: ${autobioSettings.status === 'on' ? 'ON' : 'OFF'}\n\n`;
    
    msg += `*PRESENCE*\n`;
    msg += `├ privateChat: ${presenceSettings.privateChat}\n`;
    msg += `└ groupChat: ${presenceSettings.groupChat}\n\n`;
    
    msg += `*PROTECTION*\n`;
    msg += `├ antidelete: ${antideleteSettings.status ? 'ON' : 'OFF'}\n`;
    msg += `├ anticall: ${anticallSettings.status ? 'ON' : 'OFF'}\n`;
    msg += `└ anticallAction: ${anticallSettings.action}\n\n`;
    
    msg += `*SYSTEM*\n`;
    msg += `├ uptime: ${hours}h ${mins}m\n`;
    msg += `├ memory: ${memUsage}MB\n`;
    msg += `└ node: ${process.version}\n\n`;
    
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*.getvar <key>* - Get specific var\n`;
    msg += `*.setvar key=value* - Set var`;
    
    return reply(msg);
  } catch (err) {
    console.error("Allvar error:", err);
    return reply("*Failed to load variables*");
  }
});

bwmxmd({
  pattern: "getvar",
  react: "📋",
  aliases: ["var", "gv", "get"],
  category: "Settings",
  description: "Get a specific variable value"
},
async (from, client, conText) => {
  const { q, reply, isSuperUser } = conText;
  const {
    getAutoStatusSettings, getAutoReadSettings, getPresenceSettings,
    getAntiDeleteSettings, getAntiCallSettings, getAutoBioSettings
  } = createSettingsView(conText, settingsReaders);

  if (!isSuperUser) return reply("*Owner only command*");

  if (!q) {
    return reply(
      `*Usage:* .getvar <variable>\n\n` +
      `*Available Variables:*\n` +
      `prefix, botname, mode, deviceMode, packname, author, timezone, ` +
      `autoviewStatus, autoReplyStatus, autoreactstatus, statusreactemojis, autoread, autobio, ` +
      `privateChat, groupChat, antidelete, anticall`
    );
  }

  const varName = q.toLowerCase().trim();

  try {
    const [botSettings, statusSettings, readSettings, presenceSettings] = await Promise.all([
      conText.getSettings ? conText.getSettings() : getSettings(),
      getAutoStatusSettings(),
      getAutoReadSettings(),
      getPresenceSettings()
    ]);
    
    let antideleteSettings = { status: false };
    let anticallSettings = { status: false, action: 'reject' };
    let autobioSettings = { enabled: false };
    
    try { antideleteSettings = await getAntiDeleteSettings(); } catch (e) {}
    try { anticallSettings = await getAntiCallSettings(); } catch (e) {}
    try { autobioSettings = await getAutoBioSettings(); } catch (e) {}
    
    const allVars = {
      prefix: botSettings.prefix,
      botname: botSettings.botname,
      mode: botSettings.mode,
      devicemode: botSettings.deviceMode,
      packname: botSettings.packname,
      author: botSettings.author,
      timezone: botSettings.timezone,
      url: botSettings.url,
      gurl: botSettings.gurl,
      autoviewstatus: statusSettings.autoviewStatus === 'true' ? 'ON' : 'OFF',
      autoreplystatus: statusSettings.autoReplyStatus === 'true' ? 'ON' : 'OFF',
      statusreplytext: statusSettings.statusReplyText,
      autoreactstatus: statusSettings.autoLikeStatus === 'true' ? 'ON' : 'OFF',
      autolikestatus: statusSettings.autoLikeStatus === 'true' ? 'ON' : 'OFF',
      statusreactemojis: statusSettings.statusLikeEmojis || '👍,❤️,😍,🔥,😂',
      autoread: readSettings.status ? 'ON' : 'OFF',
      autobio: autobioSettings.status === 'on' ? 'ON' : 'OFF',
      privatechat: presenceSettings.privateChat,
      groupchat: presenceSettings.groupChat,
      antidelete: antideleteSettings.status ? 'ON' : 'OFF',
      anticall: anticallSettings.status ? 'ON' : 'OFF',
      anticallaction: anticallSettings.action
    };
    
    if (allVars.hasOwnProperty(varName)) {
      return reply(
        `*Variable Info*\n━━━━━━━━━━━━━━\n\n` +
        `*Name:* ${varName}\n` +
        `*Value:* ${allVars[varName]}`
      );
    }
    
    const matchingVars = Object.keys(allVars).filter(k => k.includes(varName));
    if (matchingVars.length > 0) {
      let msg = `*Did you mean?*\n\n`;
      matchingVars.forEach(v => {
        msg += `*${v}:* ${allVars[v]}\n`;
      });
      return reply(msg);
    }
    
    return reply(`*Variable "${varName}" not found*\n\nUse \`.allvar\` to see all variables`);
  } catch (err) {
    console.error("Getvar error:", err);
    return reply("*Failed to get variable*");
  }
});

bwmxmd({
  pattern: "setvar",
  react: "✏️",
  aliases: ["sv", "setv"],
  category: "Settings",
  description: "Set a variable value"
},
async (from, client, conText) => {
  const { q, reply, isSuperUser, updateSettings, botSettings: ctxSettings } = conText;
  const {
    updateAutoStatusSettings, updatePresenceSettings, updateAutoReadSettings,
    updateAntiDeleteSettings, updateAntiCallSettings
  } = createSettingsView(conText, settingsReaders);

  if (!isSuperUser) return reply("*Owner only command*");

  if (!q || !q.includes('=')) {
    return reply(
      `*Usage:* .setvar <variable>=<value>\n\n` +
      `*Examples:*\n` +
      `.setvar prefix=!\n` +
      `.setvar botname=MyBot\n` +
      `.setvar mode=private\n` +
      `.setvar deviceMode=iPhone\n` +
      `.setvar autoviewstatus=on\n` +
      `.setvar privatechat=typing`
    );
  }

  const [varName, ...valueParts] = q.split('=');
  const value = valueParts.join('=').trim();
  const key = varName.toLowerCase().trim();

  if (!value) return reply("*Value cannot be empty*");

  try {
    const botVars = ['prefix', 'botname', 'mode', 'devicemode', 'packname', 'author', 'timezone', 'url', 'gurl', 'sessionname'];
    const statusVars = ['autoviewstatus', 'autoreplystatus', 'statusreplytext', 'autoreactstatus', 'autolikestatus', 'statusreactemojis'];
    const presenceVars = ['privatechat', 'groupchat'];
    
    let success = false;
    let displayName = key;

    if (botVars.includes(key)) {
      const keyMap = {
        'devicemode': 'deviceMode',
        'sessionname': 'sessionName'
      };
      const updateKey = keyMap[key] || key;
      await updateSettings({ [updateKey]: value });
      if (ctxSettings) ctxSettings[updateKey] = value;
      displayName = updateKey;
      success = true;
    } else if (statusVars.includes(key)) {
      const statusKeyMap = {
        'autoviewstatus': 'autoviewStatus',
        'autoreplystatus': 'autoReplyStatus',
        'statusreplytext': 'statusReplyText',
        'autoreactstatus': 'autoLikeStatus',
        'autolikestatus': 'autoLikeStatus',
        'statusreactemojis': 'statusLikeEmojis'
      };
      const updateKey = statusKeyMap[key] || key;
      let updateValue = value;
      if (['autoviewstatus', 'autoreplystatus', 'autoreactstatus', 'autolikestatus'].includes(key)) {
        if (!['on', 'off', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
          return reply('*Invalid value. Use on/off or true/false.*');
        }
        updateValue = ['on', 'true', 'yes', '1'].includes(value.toLowerCase()) ? 'true' : 'false';
      }
      await updateAutoStatusSettings({ [updateKey]: updateValue });
      displayName = updateKey;
      success = true;
    } else if (presenceVars.includes(key)) {
      const presenceKeyMap = { 'privatechat': 'privateChat', 'groupchat': 'groupChat' };
      const updateKey = presenceKeyMap[key] || key;
      const validValues = ['off', 'online', 'typing', 'recording'];
      if (!validValues.includes(value.toLowerCase())) {
        return reply(`*Invalid value!*\n\nValid options: ${validValues.join(', ')}`);
      }
      await updatePresenceSettings({ [updateKey]: value.toLowerCase() });
      displayName = updateKey;
      success = true;
    } else if (key === 'autoread') {
      if (!['on', 'off', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
        return reply('*Invalid value. Use on/off or true/false.*');
      }
      const status = ['on', 'true', 'yes', '1'].includes(value.toLowerCase());
      await updateAutoReadSettings({ status });
      displayName = 'autoread';
      success = true;
    } else if (key === 'antidelete') {
      if (!['on', 'off', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
        return reply('*Invalid value. Use on/off or true/false.*');
      }
      const status = ['on', 'true', 'yes', '1'].includes(value.toLowerCase());
      await updateAntiDeleteSettings({ status });
      displayName = 'antidelete';
      success = true;
    } else if (key === 'anticall') {
      if (!['on', 'off', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
        return reply('*Invalid value. Use on/off or true/false.*');
      }
      const status = ['on', 'true', 'yes', '1'].includes(value.toLowerCase());
      await updateAntiCallSettings({ status });
      displayName = 'anticall';
      success = true;
    } else if (key === 'autobio') {
      if (!['on', 'off', 'true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
        return reply('*Invalid value. Use on/off or true/false.*');
      }
      const status = ['on', 'true', 'yes', '1'].includes(value.toLowerCase()) ? 'on' : 'off';
      await updateAutoBioSettings({ status });
      if (status === 'on' && typeof global._bwmStartAutoBio === 'function') global._bwmStartAutoBio();
      displayName = 'autobio';
      success = true;
    }

    if (success) {
      return reply(
        `*Variable Updated*\n━━━━━━━━━━━━━━\n\n` +
        `*Variable:* ${displayName}\n` +
        `*Value:* ${value}\n` +
        `*Status:* Saved`
      );
    } else {
      return reply(`*Variable "${key}" not recognized*\n\nUse \`.allvar\` to see available variables`);
    }
  } catch (err) {
    console.error("Setvar error:", err);
    return reply("*Failed to update variable:* " + err.message);
  }
});

bwmxmd({
  pattern: "systeminfo",
  react: "📊",
  aliases: ["sysinfo", "botstatus", "runtime"],
  category: "Settings",
  description: "View system information and runtime status"
},
async (from, client, conText) => {
  const { reply, isSuperUser, botSettings } = conText;

  if (!isSuperUser) return reply("*Owner only command*");

  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = Math.floor(uptime % 60);

  const memUsage = process.memoryUsage();
  const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rss = Math.round(memUsage.rss / 1024 / 1024);

  let msg = `*BWM-XMD SYSTEM INFO*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `*RUNTIME*\n`;
  msg += `├ Uptime: ${hours}h ${mins}m ${secs}s\n`;
  msg += `├ Node: ${process.version}\n`;
  msg += `├ Platform: ${process.platform}\n`;
  msg += `└ Arch: ${process.arch}\n\n`;

  msg += `*MEMORY*\n`;
  msg += `├ Heap: ${heapUsed}/${heapTotal}MB\n`;
  msg += `└ RSS: ${rss}MB\n\n`;

  msg += `*BOT*\n`;
  msg += `├ Name: ${botSettings?.botname || 'BWM-XMD'}\n`;
  msg += `├ Mode: ${botSettings?.mode || 'public'}\n`;
  msg += `├ Device: ${botSettings?.deviceMode || 'Android'}\n`;
  msg += `└ Prefix: ${botSettings?.prefix || '.'}\n\n`;

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*Status:* Online`;

  return reply(msg);
});


