const { accountJid, sudoTarget } = require('./authorization');

// Username enrollment is an explicit privileged operation. Bind the result of
// WhatsApp's directory lookup once; never authorize incoming display names or
// silently rebind old username rows when a handle changes hands.
async function resolveSudoTarget(context, client) {
    const direct = sudoTarget(context);
    if (direct) return direct;
    const match = context.q?.trim().match(/^@([a-z0-9_.]{1,64})$/i);
    if (!match || typeof client.executeUSyncQuery !== 'function') return null;
    const username = match[1].toLowerCase();
    try {
        const { USyncQuery, USyncUser } = require('@whiskeysockets/baileys');
        const query = new USyncQuery()
            .withContactProtocol()
            .withLIDProtocol()
            .withUsernameProtocol()
            .withUser(new USyncUser().withUsername(username));
        const result = await client.executeUSyncQuery(query);
        if (result?.list?.length !== 1) return null;
        const row = result.list[0];
        if (row.contact !== true) return null;
        if (row.username && row.username.replace(/^@/, '').toLowerCase() !== username) return null;
        return accountJid(row.lid) || accountJid(row.id);
    } catch (_) {
        // The caller explicitly reports failure and offers reply/mention
        // enrollment if WhatsApp cannot resolve this handle (e.g. privacy PIN).
        return null;
    }
}

module.exports = { resolveSudoTarget };
