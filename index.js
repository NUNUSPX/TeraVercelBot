import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';
import axios from 'axios'; // Untuk HTTP requests

// ✅ Bot Token & Channel ID (GANTI DENGAN MILIK ANDA)
const BOT_TOKEN = '6876560897:AAEVkkvsFirio_tYbBM8WDBg0giLgcsT89M';
const CHANNEL_ID = '-1004129850269'; 
const bot = new Telegraf(BOT_TOKEN);

// ✅ Path ke file cookies
const COOKIES_PATH = path.join(process.cwd(), 'terabox.txt');

// ✅ Regex untuk validasi URL TeraBox
const teraboxUrlRegex = /^https:\/\/(terabox\.com|1024terabox\.com|teraboxapp\.com)\/s\/[A-Za-z0-9_-]+/;

// ✅ Baca cookies dari file
function getCookies() {
  if (!fs.existsSync(COOKIES_PATH)) {
    console.error('❌ File cookies (terabox.txt) tidak ditemukan!');
    return null;
  }
  return fs.readFileSync(COOKIES_PATH, 'utf-8').trim();
}

// ✅ Ekstrak link download dari HTML TeraBox
async function getDownloadLink(url, cookies) {
  try {
    const headers = {
      'Cookie': cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // 1. Ambil HTML halaman TeraBox
    const response = await axios.get(url, { headers });
    const html = response.data;

    // 2. Cari link download di HTML (contoh: pola regex sederhana)
    const directLinkMatch = html.match(/https:\/\/[^"]+?\/file\/[^"]+/);
    if (!directLinkMatch) throw new Error('Link download tidak ditemukan di HTML.');

    const directLink = directLinkMatch[0];

    // 3. Ambil nama file dari URL atau HTML
    const filenameMatch = html.match(/<title>([^<]+)<\/title>/);
    const filename = filenameMatch ? filenameMatch[1].trim() : 'file_terabox';

    return { directLink, filename };
  } catch (error) {
    console.error('Error ekstrak link:', error);
    throw new Error('Gagal mengambil link download.');
  }
}

// ✅ Command /start
bot.start((ctx) => {
  ctx.replyWithPhoto(
    'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg',
    {
      caption: '👋 Kirim link TeraBox untuk mendapatkan link download langsung!',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📢 Channel', 'https://t.me/Opleech_WD')]
      ])
    }
  );
});

// ✅ Handler Pesan
bot.on('text', async (ctx) => {
  const url = ctx.message.text;

  if (!teraboxUrlRegex.test(url)) {
    return ctx.reply('❌ Format link TeraBox tidak valid! Contoh: https://terabox.com/s/xxx');
  }

  const cookies = getCookies();
  if (!cookies) return ctx.reply('❌ Cookies TeraBox tidak ditemukan!');

  await ctx.reply('🔄 Memproses link...');

  try {
    // 1. Dapatkan link download
    const { directLink, filename } = await getDownloadLink(url, cookies);

    // 2. Kirim hasil ke pengguna
    await ctx.replyWithPhoto(
      'https://graph.org/file/120e174a9161afae40914.jpg',
      {
        caption: `✅ **Download Ready!**\n📁 ${filename}\n🔗 [Klik untuk download](${directLink})`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('⬇️ Download', directLink)]
        ])
      }
    );

    // 3. Forward ke channel
    await ctx.telegram.sendMessage(
      CHANNEL_ID,
      `📥 **New Download**\n\n📂 ${filename}\n🔗 ${directLink}`,
      { disable_web_page_preview: true }
    );

  } catch (error) {
    console.error(error);
    ctx.reply('❌ Gagal memproses link. Pastikan cookies valid atau coba lagi nanti.');
  }
});

// ✅ Jalankan Bot
bot.launch();
console.log('🤖 Bot running...');
