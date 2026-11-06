const { bwmxmd } = require('../adams/commandHandler');
const { requestChatAnswer, AI_UNAVAILABLE, hasProviderBranding } = require('../adams/lib/chatbotApi');
const {
  saveConversation,
  getConversationHistory,
  clearConversationHistory
} = require('../adams/database/gpt');

const XMD_SYSTEM = `[System: You are XMD, a smart WhatsApp AI assistant created by Ibrahim Adams. Reply in plain text only — no markdown, no asterisks, no headers. Keep replies short and conversational since this is WhatsApp. Only say your name or creator when directly asked. Remember the conversation context and refer back to it naturally.]`;

async function askXMD(userJid, question, api) {
  // Build context from last conversation
  const history = await getConversationHistory(userJid, 3);
  let context = '';
  const cleanHistory = history.filter(item => !hasProviderBranding(item.ai));
  if (cleanHistory.length > 0) {
    const last = cleanHistory[0];
    context = `Previous:\nYou: ${last.user}\nXMD: ${last.ai}\n\nNow: `;
  }

  const fullQuery = `${XMD_SYSTEM}\n\n${context}${question}`;

  try {
    return await requestChatAnswer(fullQuery, undefined, { preferred: 'keithai' });
  } catch (error) {
    console.warn('XMD providers unavailable');
    return null;
  }
}

// ── Main XMD chat command ──────────────────────────────────────────────────
bwmxmd({
  pattern: 'xmd',
  aliases: ['claude', 'xmdai'],
  category: 'AI',
  description: 'Chat with XMD AI — remembers the conversation'
}, async (from, client, conText) => {
  const { reply, react, arg, sender, pushName, api } = conText;

  if (!arg || arg.length === 0) {
    return reply(`🤖 XMD AI\n\nHey ${pushName}! Ask me anything.\n\nExample: .xmd what is JavaScript?\n\nI remember our conversation so feel free to follow up.`);
  }

  const question = arg.join(' ');
  await react('⏳');

  try {
    const answer = await askXMD(sender, question, api);
    if (answer) {
      await saveConversation(sender, question, answer);
      await react('✅');
      await reply(answer);
    } else {
      await react('❌');
      await reply(AI_UNAVAILABLE);
    }
  } catch (err) {
    await react('❌');
    await reply(AI_UNAVAILABLE);
  }
});

// ── Clear conversation history ─────────────────────────────────────────────
bwmxmd({
  pattern: 'xmdclear',
  aliases: ['clearxmd', 'xmdreset'],
  category: 'AI',
  description: 'Clear your XMD conversation history'
}, async (from, client, conText) => {
  const { reply, react, sender, pushName } = conText;

  await react('🗑️');
  const cleared = await clearConversationHistory(sender);
  if (cleared) {
    await reply(`🗑️ Done! Conversation history cleared, ${pushName}. Fresh start!`);
  } else {
    await reply('ℹ️ No conversation history to clear.');
  }
});

// ── View recent exchanges ──────────────────────────────────────────────────
bwmxmd({
  pattern: 'xmdhistory',
  aliases: ['xmdlast'],
  category: 'AI',
  description: 'View your recent XMD conversation'
}, async (from, client, conText) => {
  const { reply, react, sender } = conText;

  await react('📚');
  const history = (await getConversationHistory(sender, 3)).filter(item => !hasProviderBranding(item.ai));

  if (!history.length) {
    return reply('📚 No XMD history yet.\n\nStart with: .xmd Hello!');
  }

  let out = '📚 Recent XMD Conversations\n━━━━━━━━━━━━━━━━━━━━\n\n';
  history.slice().reverse().forEach(conv => {
    const q = conv.user.length > 60 ? conv.user.slice(0, 60) + '...' : conv.user;
    const a = conv.ai.length > 80  ? conv.ai.slice(0, 80) + '...'   : conv.ai;
    out += `You: ${q}\nXMD: ${a}\n\n`;
  });
  await reply(out.trim());
});