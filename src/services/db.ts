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
   private tracking = new Map<number, { confirmedOn: boolean; streak: number }>();

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

   /**
    * Debounced power state tracking. A state flip is reported only after
    * `config.monitor.confirm_readings` consecutive readings agree on the new state,
    * so a single glitchy 0 V reading can't trigger a false outage.
    *
    * Returns `[poweredOn, since]` when a flip is confirmed, otherwise undefined.
    * `last_on_at` / `last_off_at` are only refreshed by readings that agree with the
    * confirmed state, so they keep their meaning (last seen on / last seen off).
    */
   async stateChanged(device_id: number, voltage: number) {
      const device = await this.db("devices").where({ id: device_id }).first();

      if (!device) {
         return;
      }

      const poweredOn = voltage > 0;

      let track = this.tracking.get(device_id);
      if (!track) {
         // First reading since startup: restore the confirmed state from the DB.
         track = { confirmedOn: toMs(device.last_on_at) >= toMs(device.last_off_at), streak: 0 };
         this.tracking.set(device_id, track);
      }

      if (poweredOn === track.confirmedOn) {
         track.streak = 0;
         await this.db("devices")
            .where({ id: device_id })
            .update(poweredOn ? { last_on_at: new Date() } : { last_off_at: new Date() });
         return;
      }

      track.streak++;
      if (track.streak < config.monitor.confirm_readings) {
         return;
      }

      // Flip confirmed.
      track.confirmedOn = poweredOn;
      track.streak = 0;
      await this.db("devices")
         .where({ id: device_id })
         .update(poweredOn ? { last_on_at: new Date() } : { last_off_at: new Date() });

      return poweredOn ? [true, device.last_on_at] : [false, device.last_off_at];
   }
}

function toMs(value: unknown): number {
   if (typeof value === "number") return value;
   const ms = new Date(value as string).getTime();
   return Number.isNaN(ms) ? 0 : ms;
}
