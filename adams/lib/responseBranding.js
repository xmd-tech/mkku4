// Only change human-readable branding. Never rename transport identifiers,
// URLs, filenames, paths, session data or command/button IDs.
const brand = /(?<![\p{L}\p{N}])B[\s_-]*W[\s_-]*M[\s_-]*X[\s_-]*M[\s_-]*D(?![\p{L}\p{N}])/giu;
const protectedText = /```[\s\S]*?```|`[^`\n]*`|\b(?:https?:\/\/|www\.)[^\s<>"'`]+|(?:\.\.?\/|~\/|\/|[a-z]:\\)[^\s<>"'`]+|\b[\w.-]+[\\/][^\s<>"'`]+|\b[\w-]+(?:\.[\w-]+)+(?:\/[^\s<>"'`]+)?|[.!/?#][a-z][\w-]*/gi;
const displayFields = new Set([
    'text', 'conversation', 'caption', 'title', 'subtitle', 'description',
    'body', 'footer', 'footerText', 'contentText', 'displayText', 'display_text',
    'hydratedContentText', 'hydratedTitleText', 'newsletterName', 'displayName',
    'messageText', 'messageDisclaimerText'
]);
const opaqueFields = new Set([
    'quotedMessage', 'quoted', 'forward', 'key', 'url', 'sourceUrl', 'canonicalUrl',
    'matchedText', 'fileName', 'filename', 'id', 'buttonId', 'rowId', 'sessionName'
]);

function renameVisibleText(text) {
    if (typeof text !== 'string') return text;
    let result = '', offset = 0;
    for (const match of text.matchAll(protectedText)) {
        result += text.slice(offset, match.index).replace(brand, 'XMD') + match[0];
        offset = match.index + match[0].length;
    }
    return result + text.slice(offset).replace(brand, 'XMD');
}

function brandResponse(value) {
    if (!value || typeof value !== 'object' || Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value;
    let output = value;
    for (const [key, child] of Object.entries(value)) {
        if (opaqueFields.has(key)) continue;
        let replacement = child;
        if (displayFields.has(key) && typeof child === 'string') {
            replacement = renameVisibleText(child);
        } else if (key === 'buttonParamsJson' && typeof child === 'string') {
            try {
                const params = JSON.parse(child);
                const updated = brandResponse(params);
                if (updated !== params) replacement = JSON.stringify(updated);
            } catch { /* Preserve opaque or invalid native-flow parameters. */ }
        } else if (child && typeof child === 'object') {
            replacement = brandResponse(child);
        }
        if (replacement !== child) {
            if (output === value) output = Array.isArray(value) ? [...value] : { ...value };
            output[key] = replacement;
        }
    }
    return output;
}

function displaySettings(settings) {
    if (!settings) return settings;
    return {
        ...settings,
        botname: renameVisibleText(settings.botname),
        packname: renameVisibleText(settings.packname)
    };
}

module.exports = { renameVisibleText, brandResponse, displaySettings };
