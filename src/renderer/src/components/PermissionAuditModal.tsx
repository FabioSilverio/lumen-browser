import { useEffect, useState } from "react";
import { PermissionEvent, PermissionRule, PermissionRuleDecision } from "../types";

interface PermissionAuditModalProps {
  open: boolean;
  onClose: () => void;
}

export function PermissionAuditModal({ open, onClose }: PermissionAuditModalProps) {
  const [events, setEvents] = useState<PermissionEvent[]>([]);
  const [rules, setRules] = useState<PermissionRule[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const payload = await window.lumen.security.getAudit();
      setEvents(payload.events);
      setRules(payload.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit");
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void load();
  }, [open]);

  const setRule = (origin: string, permission: string, decision: PermissionRuleDecision) => {
    void window.lumen.security.setRule({ origin, permission, decision }).then((payload) => {
      setRules(payload.rules);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to set rule");
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section className="permissions-modal" onClick={(event) => event.stopPropagation()}>
        <div className="extensions-header">
          <h2>Permission audit</h2>
          <button className="icon-button" onClick={onClose}>Close</button>
        </div>

        <div className="extensions-actions">
          <button className="secondary-button" onClick={() => void load()}>Refresh</button>
          <button
            className="secondary-button"
            onClick={() => {
              void window.lumen.security.clearEvents().then(() => setEvents([]));
            }}
          >
            Clear events
          </button>
        </div>

        {error ? <div className="palette-tip">{error}</div> : null}

        <h3>Site rules</h3>
        <div className="extensions-list">
          {rules.map((rule) => (
            <article className="extensions-item" key={rule.key}>
              <div>
                <div className="extensions-name">{rule.origin}</div>
                <div className="helper-text">{rule.permission}</div>
                <div className="helper-text">{rule.decision}</div>
              </div>
              <div className="extensions-actions">
                <button className="secondary-button" onClick={() => setRule(rule.origin, rule.permission, "allow")}>Allow</button>
                <button className="secondary-button" onClick={() => setRule(rule.origin, rule.permission, "block")}>Block</button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void window.lumen.security.removeRule(rule.key).then((payload) => setRules(payload.rules));
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
          {!rules.length ? <div className="palette-empty">No persistent rules.</div> : null}
        </div>

        <h3>Recent requests</h3>
        <div className="extensions-list">
          {events.slice(0, 120).map((event) => (
            <article className="extensions-item" key={event.id}>
              <div>
                <div className="extensions-name">{event.origin}</div>
                <div className="helper-text">{event.permission}</div>
                <div className="helper-text">{event.decision}</div>
                <div className="helper-text">{new Date(event.timestamp).toLocaleString()}</div>
              </div>
              <div className="extensions-actions">
                <button className="secondary-button" onClick={() => setRule(event.origin, event.permission, "allow")}>Always allow</button>
                <button className="secondary-button" onClick={() => setRule(event.origin, event.permission, "block")}>Always block</button>
              </div>
            </article>
          ))}
          {!events.length ? <div className="palette-empty">No permission activity yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
