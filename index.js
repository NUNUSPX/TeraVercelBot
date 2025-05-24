import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';

// ✅ Fixed Port
const PORT = 8080;

// ✅ Express Setup
const app = express();

app.get('/', (req, res) => {
    res.send('🤖 Bot is running!');
});

app.listen(PORT, () => {
    console.log(`✅ Server running on fixed port ${PORT}`);
});

// ✅ Fixed Bot Token
const BOT_TOKEN = '6876560897:AAEVkkvsFirio_tYbBM8WDBg0giLgcsT89M';
const bot = new Telegraf(BOT_TOKEN);

// ✅ TeraBox URL Validation  
const teraboxUrlRegex = /^https:\/\/(terabox\.com|1024terabox\.com|teraboxapp\.com|teraboxlink\.com|terasharelink\.com|terafileshare\.com)\/s\/[A-Za-z0-9-_]+$/;

// ✅ Your Telegram Channel ID  
const CHANNEL_ID = "-1004129850269"; // 🔹 Ganti dengan ID channel Anda

// ✅ Path to cookies file
const COOKIES_PATH = path.join(process.cwd(), 'terabox.txt');

// ✅ Function to read cookies from file
function getCookies() {
    try {
        if (!fs.existsSync(COOKIES_PATH)) {
            console.error('❌ Cookies file not found!');
            return null;
        }
        return fs.readFileSync(COOKIES_PATH, 'utf-8').trim();
    } catch (err) {
        console.error('❌ Error reading cookies file:', err);
        return null;
    }
}

// ✅ /start Command  
bot.start((ctx) => {
    const welcomeMessage = '👋 Welcome! Send a TeraBox link to download.';
    const imageUrl = 'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg';

    ctx.replyWithPhoto(
        { url: imageUrl },
        {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('📌 US ❖ 𝐖𝐃 𝐙𝐎𝐍𝐄 ❖', 'https://t.me/Opleech_WD')]
            ])
        }
    );
});

// ✅ Message Handler  
bot.on('text', async (ctx) => {
    const messageText = ctx.message.text;

    if (!teraboxUrlRegex.test(messageText)) {
        return ctx.reply('❌ Invalid TeraBox link!');
    }

    await ctx.reply('🔄 Processing your link...');

    try {
        // ✅ Get cookies from file
        const cookies = getCookies();
        if (!cookies) {
            return ctx.reply('❌ Cookies not found. Please check the server.');
        }

        // ✅ TeraBox API Call with cookies
        const apiUrl = `https://unchinkywp.vercel.app/api?url=${encodeURIComponent(messageText)}`;
        const apiResponse = await fetch(apiUrl, {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!apiResponse.ok) {
            return ctx.reply('⚠️ Failed to fetch download link. API error.');
        }

        const apiData = await apiResponse.json();

        if (!apiData["📜 Extracted Info"]?.length) {
            return ctx.reply('⚠️ Download link not found.');
        }

        const fileInfo = apiData["📜 Extracted Info"][0];
        const downloadLink = fileInfo["🔽 Direct Download Link"];
        const filename = fileInfo["📂 Title"] || `video_${Date.now()}.mp4`;

        // ✅ Format file size and estimate download time
        let fileSize = "Unknown Size";
        let estimatedTime = "N/A";
        if (fileInfo["📏 Size"]) {
            fileSize = fileInfo["📏 Size"];
            estimatedTime = calculateDownloadTime(fileSize);
        }

        // ✅ Image Link  
        const imageUrl = 'https://graph.org/file/120e174a9161afae40914.jpg';

        // ✅ Send Image with Caption & Download Button
        const caption = `🎬 **File Processing Done!**\n✅ **Download Link Found:**\n📁 **File:** ${filename}\n⚖ **Size:** ${fileSize}\n⏳ **Estimated Time:** ${estimatedTime}`;

        await ctx.replyWithPhoto(imageUrl, {
            caption: caption,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url(`⬇️ 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 (${fileSize})`, downloadLink)]
            ])
        });

        // ✅ Auto-forward to channel
        await bot.telegram.sendMessage(CHANNEL_ID, `📥 **New Download Request**\n\n📁 **File:** ${filename}\n⚖ **Size:** ${fileSize}\n⏳ **Estimated Time:** ${estimatedTime}\n🔗 **Download Link:** [Click Here](${downloadLink})`, {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        });

    } catch (error) {
        console.error('API Error:', error);
        ctx.reply('❌ An error occurred while processing your request.');
    }
});

// ✅ Download time calculator
function calculateDownloadTime(sizeStr) {
    const speedMbps = 10; // 🔹 Default internet speed (10 Mbps)
    const sizeUnits = { "B": 1, "KB": 1024, "MB": 1024 ** 2, "GB": 1024 ** 3 };

    let sizeValue = parseFloat(sizeStr);
    let sizeUnit = sizeStr.replace(/[0-9.]/g, '').trim();

    if (!sizeUnits[sizeUnit]) return "N/A";

    let sizeInBytes = sizeValue * sizeUnits[sizeUnit];
    let downloadTimeSec = (sizeInBytes * 8) / (speedMbps * 1024 * 1024);

    if (downloadTimeSec < 60) return `${Math.round(downloadTimeSec)} sec`;
    else return `${(downloadTimeSec / 60).toFixed(1)} min`;
}

// ✅ Error Handling
bot.catch((err) => {
    console.error('🤖 Bot Crashed! Error:', err);
});

// ✅ Start Polling
bot.launch().then(() => {
    console.log('🤖 Bot is running (Polling Mode)...');
}).catch(err => {
    console.error('Bot Launch Error:', err);
});
