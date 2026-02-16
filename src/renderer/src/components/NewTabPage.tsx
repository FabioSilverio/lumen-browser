import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Search, Star } from "lucide-react";
import { FavoritePage } from "../types";

interface TopSite {
  url: string;
  title: string;
  visits: number;
}

interface NewTabPageProps {
  favorites: FavoritePage[];
  topSites: TopSite[];
  onNavigate: (input: string) => void;
  onAskAI: (prompt: string) => void;
}

function siteHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function siteInitial(url: string): string {
  const host = siteHostname(url);
  return host.slice(0, 1).toUpperCase() || "?";
}

export function NewTabPage({ favorites, topSites, onNavigate, onAskAI }: NewTabPageProps) {
  const [searchInput, setSearchInput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const sortedFavorites = useMemo(
    () => [...favorites].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
    [favorites]
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchInput.trim()) {
      return;
    }
    onNavigate(searchInput.trim());
    setSearchInput("");
  };

  const handleAISubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!aiInput.trim()) {
      return;
    }
    onAskAI(aiInput.trim());
    setAiInput("");
  };

  return (
    <section className="viewport new-tab-view">
      <div className="new-tab-hero">
        <h1>New Tab</h1>
        <p>Private search + AI at the center of your workflow.</p>
      </div>

      <div className="new-tab-panels">
        <form className="new-tab-search" onSubmit={handleSearchSubmit}>
          <div className="new-tab-label">Search with DuckDuckGo</div>
          <label>
            <Search size={15} strokeWidth={1.9} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Type a URL or search query"
            />
          </label>
          <button className="primary-button" type="submit">
            Browse
          </button>
        </form>

        <form className="new-tab-ai" onSubmit={handleAISubmit}>
          <div className="new-tab-label">AI chat</div>
          <label>
            <MessageCircle size={15} strokeWidth={1.9} />
            <input
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              placeholder="Ask AI from a new tab"
            />
          </label>
          <button className="secondary-button" type="submit">
            Ask AI
          </button>
        </form>
      </div>

      <div className="new-tab-sections">
        <section className="new-tab-block">
          <div className="new-tab-block-head">
            <h2>Favorites</h2>
          </div>
          <div className="new-tab-grid">
            {sortedFavorites.map((site) => (
              <button
                key={site.id}
                className="new-tab-site"
                onClick={() => onNavigate(site.url)}
                title={site.url}
              >
                <span className="new-tab-site-icon">
                  <Star size={12} strokeWidth={1.9} />
                </span>
                <span className="new-tab-site-text">
                  <span>{site.title || siteHostname(site.url)}</span>
                  <small>{siteHostname(site.url)}</small>
                </span>
              </button>
            ))}
            {!sortedFavorites.length ? <p className="new-tab-empty">No favorites yet. Click the star in the top bar.</p> : null}
          </div>
        </section>

        <section className="new-tab-block">
          <div className="new-tab-block-head">
            <h2>Most visited</h2>
          </div>
          <div className="new-tab-grid">
            {topSites.map((site) => (
              <button
                key={site.url}
                className="new-tab-site"
                onClick={() => onNavigate(site.url)}
                title={site.url}
              >
                <span className="new-tab-site-icon">{siteInitial(site.url)}</span>
                <span className="new-tab-site-text">
                  <span>{site.title}</span>
                  <small>{siteHostname(site.url)} · {site.visits}</small>
                </span>
              </button>
            ))}
            {!topSites.length ? <p className="new-tab-empty">Your most visited sites will appear here.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
