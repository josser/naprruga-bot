
export default {
   telegram: {
      token: process.env.TELEGRAM_TOKEN || "your-telegram-bot-token-here"
   },
   ecoflow: {
      access_key: process.env.ECOFLOW_ACCESS_KEY || "your-access-key-here",
      secret_key: process.env.ECOFLOW_SECRET_KEY || "your-access-secret-here",
      sn: process.env.ECOFLOW_SN || "your-device-sn-here",
   },
   monitor: {
      interval: 10 * 1000, // Check every 10 seconds
      messages_max_interval: 5 * 60 * 1000, // Send at most one message per 5 minute
      threshold: {
         low_voltage: 205,
         high_voltage: 240
      }
   }
}
