import { ipcMain } from "electron";
import { PermissionAuditStore, PermissionRuleDecision } from "../services/permission-audit-store";

export function registerSecurityIpc(auditStore: PermissionAuditStore): void {
  ipcMain.handle("security:get-audit", () => {
    return auditStore.getAudit();
  });

  ipcMain.handle(
    "security:set-rule",
    (_, payload: { origin: string; permission: string; decision: PermissionRuleDecision }) => {
      const rules = auditStore.setRule(payload.origin, payload.permission, payload.decision);
      return {
        rules
      };
    }
  );

  ipcMain.handle("security:remove-rule", (_, key: string) => {
    const rules = auditStore.removeRule(key);
    return {
      rules
    };
  });

  ipcMain.handle("security:clear-events", () => {
    auditStore.clearEvents();
    return {
      events: []
    };
  });
}
