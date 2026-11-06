const axios = require('axios');
const timers = require('node:timers/promises');

async function sendYouTubeMedia(from, client, context, type) {
    const query = context.q?.trim();
    // Validation/errors and the final media stay plain. Only the downloading
    // acknowledgment uses the bot's device-aware newsletter reply styling.
    const text = message => client.sendMessage(from, { text: message, linkPreview: null });
    if (!query) return text('Provide a search query or YouTube URL.');

    const isYouTubeUrl = /(youtube\.com|youtu\.be)/i.test(query);
    if (isYouTubeUrl && !query.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i)) {
        return text('Invalid YouTube URL.');
    }

    try {
        // A short pause applies only to this acknowledgment, not every reply.
        // It does not replace WhatsApp session/key synchronization.
        await timers.setTimeout(1000);
        // Still acknowledge before searching or requesting the download link.
        const icon = type === 'audio' ? '🎵' : '🎬';
        await context.reply(`${icon} Downloading ${query} ${type}..`, { linkPreview: null });

        let videoUrl = query;
        if (!isYouTubeUrl) {
            const search = await axios.get(`${context.api}/search/yts?query=${encodeURIComponent(query)}`);
            const results = search.data?.result;
            if (!Array.isArray(results) || !results[0]?.url) {
                return text(`No results found for ${query}.`);
            }
            videoUrl = results[0].url;
        }

        const download = await axios.get(`${context.api}/download/${type}?url=${encodeURIComponent(videoUrl)}`);
        const downloadUrl = download.data?.result;
        if (!downloadUrl) return text(`Failed to get ${type} link.`);

        // Exactly one native, playable media message. No document duplicate,
        // external-ad thumbnail, caption, synthetic quote or preview card.
        return await client.sendMessage(from, {
            [type]: { url: downloadUrl },
            mimetype: type === 'audio' ? 'audio/mpeg' : 'video/mp4'
        });
    } catch (error) {
        console.error(`${type} download error:`, error.message);
        return text(`Failed to download ${type}. Please try again.`);
    }
}

module.exports = { sendYouTubeMedia };
