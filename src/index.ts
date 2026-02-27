import { Bot } from "grammy";
import config from './config.js';
import EcoFlowService from "./services/ecoflow.js";

// Create a bot object
const bot = new Bot(config.telegram.token); // <-- place your bot token in this string
const ecoflowService = new EcoFlowService();

bot.hears(/світло|свет|харчування/, async (ctx) => {
   ecoflowService.getVoltage().then(voltage => {
      if (voltage === 0) {
         ctx.reply("⚠️ Світла нема! Напруга 0 В.");
      }  else if (voltage < config.monitor.threshold.low_voltage) {
         ctx.reply(`⚠️ Світло є але напруга низька: ${voltage} В.`);
      } else if (voltage > config.monitor.threshold.high_voltage) {
         ctx.reply(`⚠️ Світло є але Напруга висока: ${voltage} В.`);
      } else {
         ctx.reply(`🤩 Світло є! Напруга в нормі: ${voltage} В.`);
      }
   }).catch(error => {
      console.error("Error fetching voltage:", error);
      ctx.reply("Не вдалося отримати дані про напругу.");
   });
});

// Start the bot (using long polling)
bot.start();
