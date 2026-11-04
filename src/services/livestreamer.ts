import moment from "moment";
import Store from "./db.js";
import EcoFlowService from "./ecoflow.js";
import { Bot } from "grammy";
import config from "../config.js";

moment.locale("uk");

interface DeviceStream {
   sn: string;
   timer: NodeJS.Timeout;
   chats: Set<string>;
}

export class LiveStreamer {
   // One polling loop per device, shared by all chats subscribed to it. This keeps the
   // debounce state in Store consistent (one reading per tick per device).
   private streams = new Map<number, DeviceStream>();

   constructor(
      private ecoflowService: EcoFlowService,
      private db: Store,
      private bot: Bot,
   ) {}

   public async setupLiveDataStreams() {
      const liveChatIds = await this.db.getLivechatIds();
      for (const chat of liveChatIds) {
         await this.addLiveDataStream(chat);
      }
   }

   removeLiveDataStream(chat_id: string) {
      for (const [device_id, stream] of this.streams) {
         stream.chats.delete(chat_id);
         if (stream.chats.size === 0) {
            clearInterval(stream.timer);
            this.streams.delete(device_id);
         }
      }
   }

   private async poll(device_id: number, stream: DeviceStream) {
      let voltage: number;
      try {
         voltage = await this.ecoflowService.getVoltage(stream.sn);
      } catch (error) {
         console.error("Error fetching voltage:", error);
         return;
      }

      try {
         const state = await this.db.stateChanged(device_id, voltage);
         if (state === undefined) {
            return;
         }

         const [poweredOn, since] = state;
         const text = poweredOn
            ? `⚡️ Світло з\`явилося! Напруга: ${voltage} В. Світла не було: ${moment(since).fromNow(true)}`
            : `🚫⚡︎ Світло зникло! Останній раз світло вимикали: ${moment(since).format("llll")}`;

         for (const chat_id of stream.chats) {
            this.bot.api.sendMessage(chat_id, text).catch((error) => {
               console.error(`Error sending message to ${chat_id}:`, error);
            });
         }
      } catch (error) {
         console.error("Error processing voltage:", error);
      }
   }

   public async addLiveDataStream(chat: { chat_id: string; device_id: number; sn: string }) {
      const chat_id = String(chat.chat_id);
      const existing = this.streams.get(chat.device_id);
      if (existing) {
         existing.chats.add(chat_id);
         return;
      }

      const stream: DeviceStream = { sn: chat.sn, chats: new Set([chat_id]), timer: undefined as any };
      let busy = false;
      stream.timer = setInterval(async () => {
         // Skip the tick if the previous poll is still running (slow API / DB).
         if (busy) return;
         busy = true;
         try {
            await this.poll(chat.device_id, stream);
         } finally {
            busy = false;
         }
      }, config.monitor.interval);
      this.streams.set(chat.device_id, stream);
   }

   public async stopLiveDataStreams() {
      for (const stream of this.streams.values()) {
         clearInterval(stream.timer);
      }
      this.streams.clear();
   }
}
