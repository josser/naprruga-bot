export default class Plotter {
   static plotVoltageHistory(data: { voltage: number; timestamp: string }[]) {
      const labels = data.map((entry) => new Date(entry.timestamp).toLocaleTimeString());
      const voltages = data.map((entry) => entry.voltage);
      return {
         type: "line",
         data: {
            labels,
            datasets: [
               {
                  label: "Напруга (В)",
                  data: voltages,
                  borderColor: "rgba(75, 192, 192, 1)",
                  backgroundColor: "rgba(75, 192, 192, 0.2)",
                  fill: true,
               },
            ],
         },
         options: {
            scales: {
               y: {
                  beginAtZero: true,
               },
            },
         },
      };
   }
}
