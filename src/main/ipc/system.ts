import { app, ipcMain } from "electron";
import os from "node:os";

export function registerSystemIpc(): void {
  ipcMain.handle("system:metrics", () => {
    const metrics = app.getAppMetrics();
    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();
    const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes;
    const usedRatio = totalMemoryBytes > 0 ? usedMemoryBytes / totalMemoryBytes : 0;

    return {
      processes: metrics.map((metric) => ({
        pid: metric.pid,
        type: metric.type,
        cpuPercent: metric.cpu?.percentCPUUsage ?? 0,
        memoryMB: Math.round((metric.memory?.workingSetSize ?? 0) / 1024)
      })),
      system: {
        totalMemoryMB: Math.round(totalMemoryBytes / (1024 * 1024)),
        usedMemoryMB: Math.round(usedMemoryBytes / (1024 * 1024)),
        memoryPressureRatio: Number(usedRatio.toFixed(4))
      }
    };
  });
}
