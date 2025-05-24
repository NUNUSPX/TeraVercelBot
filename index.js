import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// ✅ Config (GANTI DENGAN DATA ANDA!)
const BOT_TOKEN = process.env.BOT_TOKEN || '6876560897:AAEVkkvsFirio_tYbBM8WDBg0giLgcsT89M';
const CHANNEL_ID = process.env.CHANNEL_ID || '-1004129850269';
const ADMIN_ID = process.env.ADMIN_ID || '123456789'; // ID Telegram admin
const VERCEL_URL = process.env.VERCEL_URL; // Contoh: your-app.vercel.app

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// ✅ Path file
const COOKIES_PATH = path.join(process.cwd(), 'terabox.txt');
const LOG_PATH = path.join(process.cwd(), 'bot.log');

// ✅ Regex validasi URL TeraBox
const teraboxUrlRegex = /^https:\/\/(terabox\.com|1024terabox\.com|teraboxapp\.com)\/s\/[A-Za-z0-9_-]+/;

// ✅ Inisialisasi log
if (!fs.existsSync(LOG_PATH)) {
  fs.writeFileSync(LOG_PATH, '🤖 Bot Log Started\n\n');
}

// ✅ Fungsi log
function writeLog(action, user = 'System') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action} by ${user}\n`;
  fs.appendFileSync(LOG_PATH, logEntry);
}

// ✅ Baca cookies (file atau env variable)
function getCookies() {
  if (process.env.TERABOX_COOKIES) {
    return process.env.TERABOX_COOKIES; // Prioritaskan env variable
  }
  if (fs.existsSync(COOKIES_PATH)) {
    return fs.readFileSync(COOKIES_PATH, 'utf-8').trim();
  }
  writeLog('ERROR: Cookies missing', 'System');
  return null;
}

// ✅ Ekstrak link download dari TeraBox
async function getDownloadLink(url, cookies) {
  try {
    const headers = {
      'Cookie': cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    const response = await axios.get(url, { headers });
    const html = response.data;

    // Cari link download di HTML (contoh regex sederhana)
    const directLinkMatch = html.match(/https:\/\/[^"]+?\/file\/[^"]+/);
    if (!directLinkMatch) throw new Error('Link tidak ditemukan di HTML.');

    const filenameMatch = html.match(/<title>([^<]+)<\/title>/);
    const filename = filenameMatch ? filenameMatch[1].trim() : 'file_terabox';

    return { directLink: directLinkMatch[0], filename };
  } catch (error) {
    writeLog(`ERROR: ${error.message}`, 'System');
    throw error;
  }
}

// ✅ Command /start
bot.start((ctx) => {
  writeLog(`Bot started by ${ctx.from.username}`, ctx.from.id);
  ctx.replyWithPhoto(
    'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg',
    {
      caption: '👋 Kirim link TeraBox untuk download!',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📢 Channel', 'https://t.me/Opleech_WD')]
      ])
    }
  );
});

// ✅ Command /log (Admin-only)
bot.command('log', async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_ID) {
    writeLog(`Unauthorized /log attempt by ${ctx.from.username}`, ctx.from.id);
    return ctx.reply('❌ Hanya admin yang bisa akses log!');
  }

  writeLog('Admin accessed logs', ctx.from.username);
  await ctx.replyWithDocument({ source: fs.createReadStream(LOG_PATH), filename: 'bot.log' });
});

// ✅ Handler pesan (Download TeraBox)
bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  const user = ctx.from.username || ctx.from.id;

  if (!teraboxUrlRegex.test(url)) {
    writeLog(`Invalid link: ${url}`, user);
    return ctx.reply('❌ Format link tidak valid! Contoh: https://terabox.com/s/xxx');
  }

  writeLog(`Processing link: ${url}`, user);
  await ctx.reply('🔄 Memproses link...');

  try {
    const cookies = getCookies();
    if (!cookies) return ctx.reply('❌ Cookies TeraBox tidak ditemukan!');

    const { directLink, filename } = await getDownloadLink(url, cookies);
    await ctx.replyWithPhoto(
      'https://graph.org/file/120e174a9161afae40914.jpg',
      {
        caption: `✅ **Siap Download!**\n📁 ${filename}\n🔗 [Klik disini](${directLink})`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('⬇️ Download', directLink)]
        ])
      }
    );
    writeLog(`Success: ${filename}`, user);
  } catch (error) {
    writeLog(`ERROR: ${error.message}`, user);
    ctx.reply('❌ Gagal memproses link. Coba lagi nanti.');
  }
});

// ✅ Webhook untuk Vercel
if (process.env.VERCEL) {
  bot.telegram.setWebhook(`https://${VERCEL_URL}/api`);
  app.use(bot.webhookCallback('/api'));
} else {
  bot.launch(); // Polling untuk development lokal
}

// ✅ Express endpoint
app.get('/', (req, res) => res.send('🤖 Bot is running!'));
app.listen(3000, () => console.log('Server ready'));

// ✅ Log bot status
writeLog('Bot launched', 'System');
console.log('🚀 Bot running...');
