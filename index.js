import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// ✅ Config (GANTI DENGAN DATA ANDA)
const BOT_TOKEN = '6876560897:AAE5_R0YP8M8M3Hu2maggR9dQrJt4_z2EN8';
const CHANNEL_ID = '-1004129850269';
const ADMIN_ID = '5115308362'; // 🔹 Ganti dengan ID Telegram admin
const bot = new Telegraf(BOT_TOKEN);

// ✅ Path file
const COOKIES_PATH = path.join(process.cwd(), 'terabox.txt');
const LOG_PATH = path.join(process.cwd(), 'bot.log');

// ✅ Inisialisasi file log jika belum ada
if (!fs.existsSync(LOG_PATH)) {
  fs.writeFileSync(LOG_PATH, '🤖 Bot Log Started\n\n');
}

// ✅ Fungsi untuk menulis log
function writeLog(action, user) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action} by ${user}\n`;
  fs.appendFileSync(LOG_PATH, logEntry);
}

// ✅ Baca cookies
function getCookies() {
  if (!fs.existsSync(COOKIES_PATH)) {
    writeLog('ERROR: Cookies file missing', 'System');
    return null;
  }
  return fs.readFileSync(COOKIES_PATH, 'utf-8').trim();
}

// ✅ Command /start
bot.start((ctx) => {
  writeLog('Bot started', ctx.from.username);
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

// ✅ Command /log (Hanya Admin)
bot.command('log', async (ctx) => {
  if (String(ctx.from.id) !== ADMIN_ID) {
    writeLog('Unauthorized /log attempt', ctx.from.username);
    return ctx.reply('❌ Hanya admin yang bisa akses log!');
  }

  writeLog('Admin accessed logs', ctx.from.username);

  try {
    // Kirim file log sebagai dokumen
    await ctx.replyWithDocument({
      source: fs.createReadStream(LOG_PATH),
      filename: 'bot.log'
    });
  } catch (error) {
    ctx.reply('❌ Gagal mengirim log. ' + error.message);
  }
});

// ✅ Handler Pesan (Download TeraBox)
bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  const user = ctx.from.username || ctx.from.id;

  if (!teraboxUrlRegex.test(url)) {
    writeLog(`Invalid link: ${url}`, user);
    return ctx.reply('❌ Format link tidak valid!');
  }

  writeLog(`Processing link: ${url}`, user);
  await ctx.reply('🔄 Memproses link...');

  try {
    const { directLink, filename } = await getDownloadLink(url, getCookies());
    
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

// ✅ Jalankan Bot
bot.launch();
writeLog('Bot launched', 'System');
console.log('🤖 Bot running...');
