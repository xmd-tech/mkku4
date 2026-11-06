// Keep phone JIDs and LIDs in separate namespaces. A username or numeric
// suffix is never evidence that an account belongs to an owner.
function accountJid(value) {
    if (typeof value !== 'string') return null;
    const match = value.match(/^(\d+)(?::\d+)?@(s\.whatsapp\.net|c\.us|lid)$/);
    if (!match) return null;
    return `${match[1]}@${match[2] === 'c.us' ? 's.whatsapp.net' : match[2]}`;
}

function phoneJid(value) {
    const jid = accountJid(value);
    if (jid) return jid.endsWith('@s.whatsapp.net') ? jid : null;
    if (typeof value !== 'string' || !/^\+?[\d\s().-]+$/.test(value)) return null;
    const digits = value.replace(/\D/g, '').replace(/^0+/, '');
    return digits ? `${digits}@s.whatsapp.net` : null;
}

function participantJids(participant = {}) {
    participant = participant || {};
    const values = [
        accountJid(participant.id),
        phoneJid(participant.pn),
        phoneJid(participant.phoneNumber),
        accountJid(participant.lid) ||
            (typeof participant.lid === 'string' && /^\d+$/.test(participant.lid)
                ? `${participant.lid}@lid` : null)
    ];
    return new Set(values.filter(Boolean));
}

function intersects(left, right) {
    return [...left].some(value => right.has(value));
}

async function phoneLidMappings(client, values) {
    const phones = [...new Set(values.map(phoneJid).filter(Boolean))];
    const store = client.signalRepository?.lidMapping;
    if (!store || !phones.length) return [];
    try {
        const pairs = typeof store.getLIDsForPNs === 'function'
            ? await store.getLIDsForPNs(phones)
            : await Promise.all(phones.map(async pn => ({
                pn, lid: await store.getLIDForPN?.(pn)
            })));
        return (Array.isArray(pairs) ? pairs : []).flatMap(pair => {
            const pn = phoneJid(pair.pn);
            const lid = accountJid(pair.lid);
            return phones.includes(pn) && lid?.endsWith('@lid') ? [{ pn, lid }] : [];
        });
    } catch (_) {
        // Unavailable directory lookup cannot grant privileges.
        return [];
    }
}

async function authorizeCommand({
    key = {}, client = {}, groupMetadata = null,
    ownerNumbers = [], developerNumbers = [], sudoNumbers = [],
    knownLidToPhone = {}
} = {}) {
    const isGroup = typeof key.remoteJid === 'string' && key.remoteJid.endsWith('@g.us');
    const actorJid = accountJid(isGroup ? key.participant : key.remoteJid);
    const senderJids = new Set(actorJid ? [actorJid] : []);
    const botJids = participantJids(client.user);
    const senderPn = accountJid(key.senderPn);
    const selfSenderMatches = !senderPn || botJids.has(senderPn);
    const self = () => ({
        isSuperUser: true, reason: 'self', actorJid: accountJid(client.user?.id),
        phone: [...botJids].find(id => id.endsWith('@s.whatsapp.net')) || null,
        senderJids: new Set(botJids), botJids
    });
    // In an outgoing DM, remoteJid is the recipient, NOT the actor. Never
    // associate the bot's senderPn with that recipient's LID.
    if (!isGroup && botJids.size && key.fromMe === true && selfSenderMatches) return self();

    const phones = new Set();
    if (actorJid?.endsWith('@s.whatsapp.net')) phones.add(actorJid);

    if (actorJid?.endsWith('@lid')) {
        const addPhone = value => {
            const jid = phoneJid(value);
            if (jid) phones.add(jid);
        };
        // These alternatives describe this message's actor. In groups,
        // senderPn by itself must not override the actual participant.
        const alternatives = isGroup
            ? [key.participantPn, key.participantAlt]
            : [key.remoteJidAlt, key.senderPn];
        alternatives.forEach(addPhone);

        for (const participant of groupMetadata?.participants || []) {
            const ids = participantJids(participant);
            if (ids.has(actorJid)) {
                for (const id of ids) if (id.endsWith('@s.whatsapp.net')) addPhone(id);
            }
        }
        const lid = actorJid.split('@')[0];
        if (Object.prototype.hasOwnProperty.call(knownLidToPhone, lid)) {
            addPhone(knownLidToPhone[lid]);
        }
        try {
            const mapped = await client.signalRepository?.lidMapping?.getPNForLID?.(actorJid);
            if (mapped) addPhone(mapped);
        } catch (_) {
            // A failed lookup never grants access. An otherwise verified
            // message/group mapping can still identify the same account.
        }
        // WhatsApp may expose PN -> LID even when its LID -> PN lookup is
        // unavailable. Ask only about explicitly trusted phone accounts.
        if (phones.size === 0) {
            const pairs = await phoneLidMappings(client, [
                ...ownerNumbers, ...developerNumbers, ...sudoNumbers, ...botJids
            ]);
            for (const pair of pairs) if (pair.lid === actorJid) addPhone(pair.pn);
        }
        for (const phone of phones) senderJids.add(phone);
    }

    const deny = reason => ({
        isSuperUser: false, reason, actorJid,
        phone: reason === 'conflicting-identity' ? null : [...phones][0] || null,
        senderJids: reason === 'conflicting-identity' ? new Set() : senderJids, botJids
    });
    if (phones.size > 1) return deny('conflicting-identity');

    // fromMe is a protocol boolean, not a truthy flag supplied by a command.
    // In groups, also verify the participant is the connected account.
    if (key.fromMe === true && selfSenderMatches &&
        (!isGroup || intersects(senderJids, botJids))) {
        return self();
    }
    if (!actorJid) return deny('unidentified');

    const trustedRoles = [
        ['owner', ownerNumbers], ['developer', developerNumbers], ['sudo', sudoNumbers]
    ];
    for (const [reason, numbers] of trustedRoles) {
        // A sudo entry may be an explicitly enrolled LID. Never reinterpret its
        // digits as a phone number, or trust an unbound username/display name.
        const trusted = new Set(numbers.map(reason === 'sudo' ? sudoIdentity : phoneJid).filter(Boolean));
        // A reply may have enrolled a LID, while subsequent messages arrive
        // using its phone JID. Only verified, non-conflicting mappings join
        // those namespaces; numeric equality is never a mapping.
        if (reason === 'sudo' && actorJid.endsWith('@s.whatsapp.net') &&
            !intersects(senderJids, trusted)) {
            const reverse = [...trusted].some(id => id.endsWith('@lid'))
                ? await phoneLidMappings(client, [actorJid]) : [];
            for (const id of [...trusted].filter(value => value.endsWith('@lid'))) {
                const mappedPhones = new Set();
                const add = value => { const pn = phoneJid(value); if (pn) mappedPhones.add(pn); };
                add(knownLidToPhone[id.split('@')[0]]);
                for (const participant of groupMetadata?.participants || []) {
                    const ids = participantJids(participant);
                    if (ids.has(id)) for (const value of ids) if (value.endsWith('@s.whatsapp.net')) add(value);
                }
                try { add(await client.signalRepository?.lidMapping?.getPNForLID?.(id)); } catch (_) {}
                for (const pair of reverse) if (pair.lid === id) add(pair.pn);
                if (mappedPhones.size === 1) trusted.add([...mappedPhones][0]);
            }
        }
        if (intersects(senderJids, trusted)) {
            return {
                isSuperUser: true, reason, actorJid,
                phone: [...phones][0] || null, senderJids, botJids
            };
        }
    }
    if (intersects(senderJids, botJids)) {
        return {
            isSuperUser: true, reason: 'connected-account', actorJid,
            phone: [...phones][0] || null, senderJids, botJids
        };
    }
    return deny('not-authorized');
}

function groupRoles(metadata, senderJids, botJids) {
    let isAdmin = false;
    let isSuperAdmin = false;
    let isBotAdmin = false;
    for (const participant of metadata?.participants || []) {
        if (participant.admin !== 'admin' && participant.admin !== 'superadmin') continue;
        const ids = participantJids(participant);
        if (intersects(ids, senderJids)) {
            isAdmin = true;
            if (participant.admin === 'superadmin') isSuperAdmin = true;
        }
        if (intersects(ids, botJids)) isBotAdmin = true;
    }
    return { isAdmin, isSuperAdmin, isBotAdmin };
}

function canManageGroup(context = {}) {
    return context.isSuperUser === true ||
        context.isAdmin === true || context.isSuperAdmin === true;
}

function sudoIdentity(value) {
    return accountJid(value) || phoneJid(value);
}

function sudoTarget(context = {}) {
    // Prefer the original reply/mention account ID over presentation-layer
    // quotedUser, which older routing helpers may have guessed from a LID.
    const message = context.mek?.message || {};
    const info = Object.values(message).find(value => value?.contextInfo)?.contextInfo;
    const quoted = accountJid(info?.participant) || accountJid(context.quotedUser);
    const mentioned = (info?.mentionedJid || context.mentionedJid || [])
        .map(accountJid).find(Boolean);
    return quoted || mentioned || sudoIdentity(context.q?.trim());
}

function sudoAliases(value) {
    const jid = sudoIdentity(value);
    if (!jid) return [];
    // Legacy numeric phone entries remain usable/removable. LID digits MUST
    // NOT become aliases of a phone entry.
    return jid.endsWith('@s.whatsapp.net') ? [jid, jid.split('@')[0]] : [jid];
}

async function matchingSudoEntries(target, entries, client, groupMetadata, knownLidToPhone = {}) {
    const jid = sudoIdentity(target);
    if (!jid) return [];
    const matches = [];
    for (const entry of entries) {
        if (!sudoIdentity(entry)) continue;
        const auth = await authorizeCommand({
            key: { remoteJid: jid, fromMe: false }, client, groupMetadata,
            sudoNumbers: [entry], knownLidToPhone
        });
        if (auth.reason === 'sudo') matches.push(entry);
    }
    return matches;
}

module.exports = {
    accountJid, phoneJid, authorizeCommand, groupRoles, canManageGroup,
    sudoIdentity, sudoTarget, sudoAliases, matchingSudoEntries
};
