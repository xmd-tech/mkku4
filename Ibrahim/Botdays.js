const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');

const API_BASE = 'https://ockvxxtnzryvsjtiakqi.supabase.co/functions/v1/xmd254-bot-remain-days';

const NOT_FOUND =
  `*Bot Days Info*\n\n` +
  `We could not find your app. It may have been deployed outside the XMD main deployment site.\n\n` +
  `*Main deployment site*\n` +
  `pro.bwmxmd.co.ke`;

bwmxmd({
  pattern: "botdays",
  aliases: ["remainingdays", "daysremaining", "botexpiry", "expiry", "botlife"],
  description: "Check remaining deployment days: botdays or botdays <app-name>",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply, q, prefix = '.' } = conText;
  const manualAppName = (q || '').trim();
  if (manualAppName && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(manualAppName)) {
    return reply(`Enter just the app name, without a URL or spaces.\n\nUsage: ${prefix}botdays <app-name>`);
  }
  const appName = manualAppName.toLowerCase() || process.env.HEROKU_APP_NAME?.trim();

  if (!appName) {
    return reply(`${NOT_FOUND}\n\nTo check an app manually, use:\n${prefix}botdays <app-name>`);
  }

  try {
    const url = `${API_BASE}/${encodeURIComponent(appName)}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;

    if (!data || data.found === false || data.status === 'not_found' || data.error) {
      return reply(NOT_FOUND);
    }

    const remainingDays = data.remaining_days ?? data.remainingDays ?? data.days_remaining ?? data.days ?? 'N/A';
    const rawDate = data.expiry_date ?? data.expiryDate ?? data.expires_at ?? data.expiry ?? null;

    let expiryDate = 'N/A';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d)) {
        expiryDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        expiryDate = rawDate;
      }
    }

    return reply(
      `*Bot Days Info*\n\n` +
      `Remaining days: ${remainingDays} day(s)\n` +
      `Expires on: ${expiryDate}\n\n` +
      `_Deployed from main site_\n` +
      `pro.bwmxmd.co.ke`
    );
  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 400)) {
      return reply(NOT_FOUND);
    }
    return reply(
      `*Bot Days Info*\n\n` +
      `Could not reach the server. Please try again later.`
    );
  }
});
