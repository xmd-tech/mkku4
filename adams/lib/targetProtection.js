const { accountJid, sudoIdentity, authorizeCommand } = require('./authorization');

const BOSS_REPLY = "I can't harm my boss sorry 🥺🙏";

class ProtectedTargetError extends Error {
    constructor(reason = 'protected-account') {
        super(reason === 'unverified-account'
            ? '⚠️ Invalid or conflicting account identity. Reply to a current message or mention the account.'
            : BOSS_REPLY);
        this.code = reason === 'unverified-account' ? 'UNVERIFIED_TARGET' : 'PROTECTED_TARGET';
    }
}

// Install on the real socket, not on individual commands: aliases, bulk
// actions, event handlers and sub-bots must all pass the same target checks.
function installTargetProtection(client, {
    getOwnerNumbers = () => [], getSudoNumbers = async () => [],
    developerNumbers = [], knownLidToPhone = {}
} = {}) {
    async function inspect(target, { groupJid, key, metadata } = {}) {
        const jid = sudoIdentity(target);
        if (!jid) return 'unverified-account';
        const owners = await getOwnerNumbers();
        if (!Array.isArray(owners)) throw new ProtectedTargetError('unverified-account');
        if (!metadata && groupJid && client.groupMetadata) {
            metadata = await client.groupMetadata(groupJid).catch(() => null);
        }
        const auth = await authorizeCommand({
            client, groupMetadata: metadata,
            key: {
                ...key, fromMe: false,
                remoteJid: groupJid || jid,
                ...(groupJid ? { participant: jid } : {})
            },
            ownerNumbers: owners, developerNumbers, knownLidToPhone,
            sudoNumbers: await getSudoNumbers()
        });
        if (auth.isSuperUser) return 'protected-account';
        // A valid WhatsApp LID is an account identifier in its own right.
        // Missing phone disclosure does not mean that this is a boss account.
        if (auth.reason === 'conflicting-identity') return 'unverified-account';
        return null;
    }

    client.isProtectedAccount = async (target, options) => Boolean(await inspect(target, options));
    const assertSafe = async (target, options) => {
        const reason = await inspect(target, options);
        if (reason) throw new ProtectedTargetError(reason);
    };

    client.assertSafeTargets = async (groupJid, targets, metadata) => {
        if (!metadata) metadata = await client.groupMetadata?.(groupJid).catch(() => null);
        for (const target of targets) await assertSafe(target, { groupJid, metadata });
    };

    for (const [method, harmful] of [
        ['groupParticipantsUpdate', action => action === 'remove' || action === 'demote'],
        ['groupRequestParticipantsUpdate', action => action === 'reject']
    ]) {
        if (typeof client[method] !== 'function') continue;
        const original = client[method].bind(client);
        client[method] = async (groupJid, targets, action, ...rest) => {
            if (harmful(action)) {
                // Validate the entire batch before forwarding even its first
                // item. Never partially execute a mixed safe/protected batch.
                await client.assertSafeTargets(groupJid, targets);
            }
            return original(groupJid, targets, action, ...rest);
        };
    }
    if (typeof client.updateBlockStatus === 'function') {
        const original = client.updateBlockStatus.bind(client);
        client.updateBlockStatus = async (target, action, ...rest) => {
            if (action === 'block') await assertSafe(target);
            return original(target, action, ...rest);
        };
    }
    if (typeof client.rejectCall === 'function') {
        const original = client.rejectCall.bind(client);
        client.rejectCall = async (id, target, ...rest) => {
            await assertSafe(target);
            return original(id, target, ...rest);
        };
    }
    if (typeof client.sendMessage === 'function') {
        const original = client.sendMessage.bind(client);
        client.sendMessage = async (chat, content, ...rest) => {
            const key = content?.delete;
            // Own outgoing-message cleanup is not punishment of an account.
            if (key && (key.fromMe !== true || key.participant)) {
                const remote = key.remoteJid || chat;
                const groupJid = remote.endsWith('@g.us') ? remote : undefined;
                const target = groupJid ? key.participant : (key.participant || remote);
                await assertSafe(accountJid(target), { groupJid, key });
            }
            return original(chat, content, ...rest);
        };
    }
    return client;
}

module.exports = { installTargetProtection, ProtectedTargetError, BOSS_REPLY };
