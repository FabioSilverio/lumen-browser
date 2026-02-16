import { useEffect, useState } from "react";
import { BrowserTab, LumenMetrics } from "../types";

interface TaskManagerProps {
  open: boolean;
  tabs: BrowserTab[];
  onClose: () => void;
}

export function TaskManagerModal({ open, tabs, onClose }: TaskManagerProps) {
  const [metrics, setMetrics] = useState<LumenMetrics>({
    processes: [],
    system: {
      totalMemoryMB: 0,
      usedMemoryMB: 0,
      memoryPressureRatio: 0
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const refresh = () => {
      void window.lumen.system.metrics().then(setMetrics);
    };

    refresh();
    const interval = window.setInterval(refresh, 2500);
    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) {
    return null;
  }

  const totalMem = metrics.processes.reduce((sum, process) => sum + process.memoryMB, 0);
  const pressurePct = Math.round(metrics.system.memoryPressureRatio * 100);

  return (
    <div className="overlay" onClick={onClose}>
      <section className="task-manager" onClick={(event) => event.stopPropagation()}>
        <div className="task-header">
          <h2>Task Manager</h2>
          <button className="icon-button" onClick={onClose}>?</button>
        </div>

        <div className="task-summary">
          Total app memory: {totalMem} MB | System memory: {metrics.system.usedMemoryMB}/{metrics.system.totalMemoryMB} MB ({pressurePct}%)
        </div>

        <table>
          <thead>
            <tr>
              <th>PID</th>
              <th>Type</th>
              <th>CPU</th>
              <th>Memory</th>
            </tr>
          </thead>
          <tbody>
            {metrics.processes.map((process) => (
              <tr key={process.pid}>
                <td>{process.pid}</td>
                <td>{process.type}</td>
                <td>{process.cpuPercent.toFixed(1)}%</td>
                <td>{process.memoryMB} MB</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="task-summary">Open tabs: {tabs.length}</div>
      </section>
    </div>
  );
}
