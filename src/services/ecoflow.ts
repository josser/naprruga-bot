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

      // A missing/non-numeric value means the API gave us nothing useful (offline device,
      // cloud glitch). Throw so callers treat it as a fetch error, not as 0 V (an outage).
      if (typeof acInVol !== "number" || !Number.isFinite(acInVol) || acInVol < 0) {
         throw new Error(`Invalid inv.acInVol value from EcoFlow API: ${JSON.stringify(acInVol)}`);
      }

      return Math.round(acInVol / 100) / 10; // Convert to volts and round to 1 decimal place
   }
}
