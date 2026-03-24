import moment from "moment";
import Store from "./db.js";
import EcoFlowService from "./ecoflow.js";
import { Bot } from "grammy";
import { EventEmitter } from "node:events";
import config from "../config.js";

moment.locale("uk");

export class LiveStreamer {
   constructor(
      private ecoflowService: EcoFlowService,
      private db: Store,
      private bot: Bot,
   ) {
      this.setupLiveDataStreams();
   }
   private streams: { [chat_id: string]: EventEmitter } = {};
   public async setupLiveDataStreams() {
      const liveChatIds = await this.db.getLivechatIds();
      for (const chat of liveChatIds) {
         this.addLiveDataStream(chat);
      }
   }

   removeLiveDataStream(chat_id: string) {
      for (const key in this.streams) {
         if (key.startsWith(`${chat_id}_`)) {
            this.streams[key].removeAllListeners();
            delete this.streams[key];
         }
      }
   }

   private liveDataStream(sn: string) {
      const eventEmitter = new EventEmitter();
      const timeout = setInterval(() => {
         this.ecoflowService
            .getVoltage(sn)
            .then((voltage) => {
               eventEmitter.emit("data", { "inv.acInVol": voltage });
            })
            .catch((error: Error) => {
               console.error("Error fetching voltage:", error);
            });
      }, config.monitor.interval);
      return eventEmitter;
   }

   public async addLiveDataStream(chat: { chat_id: string; device_id: number; sn: string }) {
      const stream = this.liveDataStream(chat.sn);
      stream.on("data", async (data) => {
         const voltage = data["inv.acInVol"];
         const state = await this.db.stateChanged(chat.device_id, voltage);

         if (state !== undefined) {
            const [stateChanged, since] = state;
            if (stateChanged) {
               this.bot.api.sendMessage(
                  chat.chat_id,
                  `⚡️ Світло з\`явилося! Напруга: ${voltage} В. Світла не було: ${moment(since).fromNow(true)}`,
               );
            } else {
               this.bot.api.sendMessage(
                  chat.chat_id,
                  `🚫⚡︎ Світло зникло! Останній раз світло вимикали: ${moment(since).format("llll")}`,
               );
            }
         }
      });
      this.streams[`${chat.chat_id}_${chat.device_id}`] = stream;
   }
   public async stopLiveDataStreams() {}
}
