import knex, { Knex } from "knex";
import config from "../config.js";
import knexfile from "../knexfile.cjs";

export interface Device {
   sn: string;
   last_voltage: number;
   last_voltage_at: string;
}

export default class Store {
   private db: Knex;

   constructor() {
      this.db = knex(knexfile);
   }

   disableAllDevicesForChat(chat_id: number) {
      return this.db("chats").where({ chat_id }).del();
   }

   async ensureDeviceBySn(sn: string) {
      let device = await this.db("devices").where({ sn }).first();

      if (!device) {
         [device] = await this.db("devices").insert({ sn }).returning("*");
      }

      return device;
   }

   async toggleLiveChatId(chat_id: number, device_id: number) {
      const existing = await this.db("chats").where({ chat_id, device_id }).first();

      if (existing) {
         await this.db("chats").where({ chat_id, device_id }).del();
         return "👎";
      } else {
         await this.db("chats").insert({ chat_id, device_id });
         return "👍";
      }
   }

   async getLivechatIds() {
      return await this.db("chats")
         .select("chat_id", "devices.sn", "device_id")
         .innerJoin("devices", "chats.device_id", "devices.id");
   }

   async stateChanged(device_id: number, voltage: number) {
      const device = await this.db("devices").where({ id: device_id }).first();

      if (!device) {
         return;
      }

      const poweredOn = voltage > 0;

      if (poweredOn) {
         await this.db("devices").where({ id: device_id }).update({ last_on_at: new Date() });
      } else {
         await this.db("devices").where({ id: device_id }).update({ last_off_at: new Date() });
      }

      const STATE_CHANGE_THRESHOLD = 30 * 1000; // 30 seconds

      if (Date.now() - device.last_on_at > STATE_CHANGE_THRESHOLD && poweredOn) {
         return [poweredOn, device.last_on_at];
      }
      if (!poweredOn && Date.now() - device.last_off_at > STATE_CHANGE_THRESHOLD) {
         return [poweredOn, device.last_off_at];
      }
   }
}
