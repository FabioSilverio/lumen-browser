import { useEffect, useState } from "react";
import { InstalledExtension } from "../types";

interface ExtensionsModalProps {
  open: boolean;
  profileId: string;
  initialStoreUrl?: string;
  onClose: () => void;
}

export function ExtensionsModal({ open, profileId, initialStoreUrl, onClose }: ExtensionsModalProps) {
  const [items, setItems] = useState<InstalledExtension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeUrl, setStoreUrl] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await window.lumen.extensions.list(profileId);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load extensions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setStoreUrl(initialStoreUrl ?? "");
    void load();
  }, [open, profileId, initialStoreUrl]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section className="extensions-modal" onClick={(event) => event.stopPropagation()}>
        <div className="extensions-header">
          <h2>Extensions</h2>
          <button className="icon-button" onClick={onClose}>Close</button>
        </div>

        <p className="helper-text">
          You can install unpacked extensions, import CRX files, or try direct install from a Chrome Web Store URL.
          Some store extensions may still fail if they rely on unsupported Chrome-only APIs.
        </p>

        <div className="extensions-actions">
          <button
            className="primary-button"
            onClick={() => {
              void window.lumen.extensions.pickAndInstall(profileId).then((list) => setItems(list));
            }}
          >
            Install unpacked extension
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              void window.lumen.extensions.importCrx(profileId).then((list) => setItems(list)).catch((err) => {
                setError(err instanceof Error ? err.message : "CRX import failed");
              });
            }}
          >
            Import CRX/ZIP
          </button>
          <button className="secondary-button" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        <form
          className="extensions-store-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!storeUrl.trim()) {
              return;
            }
            setError("");
            setLoading(true);
            void window.lumen.extensions.installFromWebStore(profileId, storeUrl.trim()).then((list) => {
              setItems(list);
            }).catch((err) => {
              setError(err instanceof Error ? err.message : "Chrome Web Store install failed");
            }).finally(() => {
              setLoading(false);
            });
          }}
        >
          <input
            value={storeUrl}
            onChange={(event) => setStoreUrl(event.target.value)}
            placeholder="Paste Chrome Web Store extension URL"
          />
          <button className="primary-button" type="submit">Install from store URL</button>
        </form>

        {loading ? <div className="palette-tip">Loading extensions...</div> : null}
        {error ? <div className="palette-tip">{error}</div> : null}

        <div className="extensions-list">
          {items.map((extension) => (
            <article key={extension.id} className="extensions-item">
              <div>
                <div className="extensions-name">{extension.name}</div>
                <div className="helper-text">{extension.version}</div>
                <div className="helper-text">{extension.path}</div>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  void window.lumen.extensions.remove(profileId, extension.id).then((list) => setItems(list));
                }}
              >
                Remove
              </button>
            </article>
          ))}
          {!items.length && !loading ? <div className="palette-empty">No extensions loaded.</div> : null}
        </div>
      </section>
    </div>
  );
}
