import { RestClient } from "@ecoflow-api/rest-client";

import config from "../config.js";

export default class EcoFlowService {
   private client: RestClient;
   private device: any;

   constructor() {
      this.client = new RestClient({
         accessKey: config.ecoflow.access_key,
         secretKey: config.ecoflow.secret_key,
         host: "https://api-e.ecoflow.com",
      });

      this.device = this.client.getDevice(config.ecoflow.sn); // Replace with your device SN
   }

   async getVoltage(sn?: string): Promise<number> {
      const acInVol = await this.client.getDevice(sn || config.ecoflow.sn).getProperty("inv.acInVol");

      return Math.round(acInVol / 100) / 10; // Convert to volts and round to 1 decimal place
   }
}
