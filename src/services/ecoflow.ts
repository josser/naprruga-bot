import { RestClient } from '@ecoflow-api/rest-client';

import config from '../config.js';

export default class EcoFlowService {
   private client: RestClient;
   private device: any;

   constructor() {
      this.client = new RestClient({
         accessKey: config.ecoflow.access_key,
         secretKey: config.ecoflow.secret_key,
         host: 'https://api-e.ecoflow.com'
      });

      this.device = this.client.getDevice(config.ecoflow.sn); // Replace with your device SN
   }

   async getVoltage(): Promise<number> {
      const props = await this.device.getProperties();
      return props['inv.acInVol'] / 1000;
   }
}
