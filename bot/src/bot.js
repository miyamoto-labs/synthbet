import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!WEBAPP_URL) {
  console.error('Missing WEBAPP_URL');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// /start — opens the Mini App
bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name || 'trader';

  await ctx.reply(
    `Hey ${firstName}! Welcome to Déja.\n\n` +
    `Bet on BTC, ETH & SOL using AI-powered predictions from 1,000-path Monte Carlo simulations.\n\n` +
    `We find when Polymarket has mispriced UP/DOWN markets — and you capitalize on the edge.\n\n` +
    `Paper trading with $10,000 starting balance. Top the leaderboard!`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🏛 Open Déja.', WEBAPP_URL)],
      [Markup.button.webApp('📊 Live Signals', WEBAPP_URL)],
      [Markup.button.callback('❓ How it works', 'how_it_works')],
    ])
  );
});

// /play — quick launch
bot.command('play', async (ctx) => {
  await ctx.reply(
    'Tap below to open Déja.',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Open Déja.', WEBAPP_URL)],
    ])
  );
});

// How it works
bot.action('how_it_works', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `How Déja. Works\n\n` +
    `1. We run 1,000 Monte Carlo simulations on BTC/ETH/SOL\n` +
    `2. Calculate the probability of UP vs DOWN for each timeframe\n` +
    `3. Compare our prediction against Polymarket's market odds\n` +
    `4. When there's a significant edge (>5%), that's your alpha\n` +
    `5. Bet UP or DOWN with paper money ($10/$25/$50/$100)\n\n` +
    `Example: Déja says 68% UP, Polymarket says 55% UP = 13% edge!\n\n` +
    `Top the leaderboard by making the best predictions.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('Start Betting', WEBAPP_URL)],
    ])
  );
});

// Leaderboard deep link
bot.action('leaderboard', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    'View the leaderboard in the app:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Open Leaderboard', `${WEBAPP_URL}?tab=leaderboard`)],
    ])
  );
});

// Handle any text — suggest opening the app
bot.on('text', async (ctx) => {
  await ctx.reply(
    'Tap below to open Déja. and start betting!',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Open Déja.', WEBAPP_URL)],
    ])
  );
});

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start
async function startBot() {
  try {
    await bot.launch();
    console.log('Déja. bot is running!');
    console.log(`Web App URL: ${WEBAPP_URL}`);
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
