import { FormEvent, useState } from "react";
import { BrowserProfile } from "../types";

interface ProfileGateProps {
  open: boolean;
  profiles: BrowserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string) => void;
  onContinue: () => void;
}

export function ProfileGate({
  open,
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onContinue
}: ProfileGateProps) {
  const [newProfileName, setNewProfileName] = useState("");

  if (!open) {
    return null;
  }

  return (
    <section className="profile-gate-overlay">
      <div className="profile-gate-card">
        <h1>Lumen</h1>
        <p>Select a profile to continue. Each profile keeps its own cookies, sessions, extensions and AI chats.</p>

        <div className="profile-gate-list">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`profile-gate-item ${profile.id === activeProfileId ? "active" : ""}`}
              onClick={() => onSelectProfile(profile.id)}
            >
              <span>{profile.name}</span>
            </button>
          ))}
        </div>

        <form
          className="profile-gate-create"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            const name = newProfileName.trim();
            if (!name) {
              return;
            }
            onCreateProfile(name);
            setNewProfileName("");
          }}
        >
          <input
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            placeholder="Create new profile"
          />
          <button type="submit" className="secondary-button">
            Add
          </button>
        </form>

        <button className="primary-button profile-gate-continue" onClick={onContinue}>
          Enter browser
        </button>
      </div>
    </section>
  );
}
