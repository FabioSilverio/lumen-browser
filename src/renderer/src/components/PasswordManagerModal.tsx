import { FormEvent, useEffect, useState } from "react";
import { SavedPassword } from "../types";

interface PasswordManagerModalProps {
  open: boolean;
  profileId: string;
  onClose: () => void;
}

export function PasswordManagerModal({ open, profileId, onClose }: PasswordManagerModalProps) {
  const [items, setItems] = useState<SavedPassword[]>([]);
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const rows = await window.lumen.passwords.list(profileId);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load passwords");
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    void load();
  }, [open, profileId]);

  const resetForm = () => {
    setSite("");
    setUsername("");
    setPassword("");
    setNotes("");
    setEditingId(null);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section className="passwords-modal" onClick={(event) => event.stopPropagation()}>
        <div className="extensions-header">
          <h2>Password manager</h2>
          <button className="icon-button" onClick={onClose}>Close</button>
        </div>

        <form
          className="password-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (!site.trim() || !username.trim() || !password) {
              return;
            }
            void window.lumen.passwords.save({
              profileId,
              entry: {
                id: editingId ?? undefined,
                site: site.trim(),
                username: username.trim(),
                password,
                notes: notes.trim() || undefined
              }
            }).then((rows) => {
              setItems(rows);
              resetForm();
            }).catch((err) => {
              setError(err instanceof Error ? err.message : "Failed to save password");
            });
          }}
        >
          <input value={site} onChange={(event) => setSite(event.target.value)} placeholder="Site (example.com)" />
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" />
          <div className="extensions-actions">
            <button className="primary-button" type="submit">{editingId ? "Update" : "Save"}</button>
            <button className="secondary-button" type="button" onClick={resetForm}>Clear</button>
            <button className="secondary-button" type="button" onClick={() => void load()}>Refresh</button>
          </div>
        </form>

        {error ? <div className="palette-tip">{error}</div> : null}

        <div className="extensions-list">
          {items.map((item) => (
            <article key={item.id} className="extensions-item">
              <div>
                <div className="extensions-name">{item.site}</div>
                <div className="helper-text">{item.username}</div>
                {item.notes ? <div className="helper-text">{item.notes}</div> : null}
              </div>
              <div className="extensions-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEditingId(item.id);
                    setSite(item.site);
                    setUsername(item.username);
                    setPassword(item.password);
                    setNotes(item.notes ?? "");
                  }}
                >
                  Edit
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void navigator.clipboard.writeText(item.password);
                  }}
                >
                  Copy password
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    void window.lumen.passwords.remove({ profileId, id: item.id }).then((rows) => setItems(rows));
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!items.length ? <div className="palette-empty">No saved passwords yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
