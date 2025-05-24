import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// ====================== 🛠 KONFIGURASI ======================
// 🔧 SESUAIKAN BAGIAN INI DENGAN DATA ANDA!
const CONFIG = {
  BOT_TOKEN: '6876560897:AAE5_R0YP8M8M3Hu2maggR9dQrJt4_z2EN8', // Token bot Telegram
  CHANNEL_ID: '-1004129850269', // ID channel untuk log
  ADMIN_ID: '5115308362', // ID Telegram admin (untuk command /log)
  VERCEL_URL: 'nama-app-anda.vercel.app', // URL deployment Vercel
  TERABOX_COOKIES: 'ndus=abc123; csrf_token=xyz456', // Cookies TeraBox (alternatif dari file)
  IMAGE_START: 'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg', // Gambar untuk /start
  IMAGE_SUCCESS: 'https://graph.org/file/120e174a9161afae40914.jpg' // Gambar hasil download
};
// ============================================================

const bot = new Telegraf(CONFIG.BOT_TOKEN);
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

// ✅ Baca cookies (prioritaskan variabel CONFIG)
function getCookies() {
  if (CONFIG.TERABOX_COOKIES) return CONFIG.TERABOX_COOKIES;
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

    // Cari link download di HTML
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

// ====================== 🚀 HANDLER BOT ======================
// ✅ Command /start
bot.start((ctx) => {
  writeLog(`Bot started by ${ctx.from.username}`, ctx.from.id);
  ctx.replyWithPhoto(
    CONFIG.IMAGE_START,
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
  if (String(ctx.from.id) !== CONFIG.ADMIN_ID) {
    writeLog(`Unauthorized /log attempt by ${ctx.from.username}`, ctx.from.id);
    return ctx.reply('❌ Hanya admin yang bisa akses log!');
  }
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

  await ctx.reply('🔄 Memproses link...');
  try {
    const cookies = getCookies();
    if (!cookies) return ctx.reply('❌ Cookies TeraBox tidak ditemukan!');

    const { directLink, filename } = await getDownloadLink(url, cookies);
    await ctx.replyWithPhoto(
      CONFIG.IMAGE_SUCCESS,
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

// ====================== 🌐 WEBHOOK SETUP ======================
if (process.env.VERCEL) {
  // Mode production (Vercel)
  bot.telegram.setWebhook(`https://${CONFIG.VERCEL_URL}/api`);
  app.use(bot.webhookCallback('/api'));
  app.get('/', (req, res) => res.send('🤖 Bot is running (Webhook Mode)'));
} else {
  // Mode development (Polling)
  bot.launch();
  console.log('🤖 Bot running in polling mode...');
}

// ✅ Start server
app.listen(3000, () => {
  writeLog('Bot launched', 'System');
  console.log('🚀 Server ready on port 3000');
});
