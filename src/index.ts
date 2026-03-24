import { Bot } from "grammy";
import config from "./config.js";
import EcoFlowService from "./services/ecoflow.js";
import Store from "./services/db.js";
import { LiveStreamer } from "./services/livestreamer.js";

// Create a bot object
const bot = new Bot(config.telegram.token);
const ecoflowService = new EcoFlowService();
const db = new Store();
const live = new LiveStreamer(ecoflowService, db, bot);

bot.hears(/світло|свет|харчування|напруга/i, async (ctx) => {
   ecoflowService
      .getVoltage()
      .then((voltage) => {
         const sVoltage = voltage.toString().replace(".", "\\.");
         if (voltage === 0) {
            ctx.reply("⚠️ Світла нема! Напруга 0 В.");
         } else if (voltage < config.monitor.threshold.low_voltage) {
            ctx.reply(`⚠️ Світло є але напруга низька: *${sVoltage}* В\\.`, { parse_mode: "MarkdownV2" });
         } else if (voltage > config.monitor.threshold.high_voltage) {
            ctx.reply(`⚠️ Світло є але напруга висока: *${sVoltage}* В\\.`, { parse_mode: "MarkdownV2" });
         } else {
            ctx.reply(`🤩 Світло є\\! Напруга в нормі: *${sVoltage}* В\\.`, { parse_mode: "MarkdownV2" });
         }
      })
      .catch((error) => {
         console.error("Error fetching voltage:", error);
         ctx.reply("Не вдалося отримати дані про напругу.");
      });
});

bot.command("live", async (ctx) => {
   if (ctx.message?.from.id && config.telegram.admin_id.includes(ctx.message?.from.id.toString())) {
      if (ctx.match.length < 5) {
         await db.disableAllDevicesForChat(ctx.message.chat.id);
         live.removeLiveDataStream(ctx.message.chat.id.toString());
         ctx.react("👎");
         return;
      }
      const device = await db.ensureDeviceBySn(ctx.match);
      const result = await db.toggleLiveChatId(ctx.message.chat.id, device.id);
      live.addLiveDataStream({ chat_id: ctx.message.chat.id.toString(), device_id: device.id, sn: ctx.match });
      ctx.react(result);
   }
});

live.setupLiveDataStreams().then(() => {
   // Start the bot (using long polling)
   bot.start();
});
