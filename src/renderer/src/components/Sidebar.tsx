import { BrowserTab, TabSpace } from "../types";

interface SidebarProps {
  tabs: BrowserTab[];
  spaces: TabSpace[];
  activeTabId: string;
  expanded: boolean;
  pinned: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: (spaceId?: string) => void;
  onTogglePinnedTab: (id: string) => void;
  onReorderTab: (sourceId: string, targetId: string) => void;
  onMoveTabToSpace: (tabId: string, spaceId: string) => void;
  onToggleSpaceCollapsed: (spaceId: string) => void;
  onAddSpace: () => void;
  onToggleSidebarPin: () => void;
  onOpenAI: () => void;
  onOpenSettings: () => void;
}

function TabItem({
  tab,
  active,
  expanded,
  onSelect,
  onClose,
  onTogglePin,
  onReorder
}: {
  tab: BrowserTab;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  onClose: () => void;
  onTogglePin: () => void;
  onReorder: (sourceId: string, targetId: string) => void;
}) {
  return (
    <div
      className={`tab-item ${active ? "active" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/tab-id", tab.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/tab-id");
        if (sourceId && sourceId !== tab.id) {
          onReorder(sourceId, tab.id);
        }
      }}
      onClick={onSelect}
      title={tab.title}
    >
      <span className="tab-favicon">{tab.suspended ? "zzz" : "o"}</span>
      {expanded && (
        <>
          <span className="tab-title">{tab.title}</span>
          <div className="tab-actions">
            <button
              className="tab-mini"
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin();
              }}
              title={tab.pinned ? "Unpin" : "Pin"}
            >
              {tab.pinned ? "P" : "p"}
            </button>
            <button
              className="tab-mini"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              title="Close tab"
            >
              x
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  tabs,
  spaces,
  activeTabId,
  expanded,
  pinned,
  onHoverChange,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onTogglePinnedTab,
  onReorderTab,
  onMoveTabToSpace,
  onToggleSpaceCollapsed,
  onAddSpace,
  onToggleSidebarPin,
  onOpenAI,
  onOpenSettings
}: SidebarProps) {
  const pinnedTabs = tabs.filter((tab) => tab.pinned);

  return (
    <aside
      className={`sidebar ${expanded ? "expanded" : "collapsed"}`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="sidebar-section">
        {expanded && <div className="sidebar-label">Pinned</div>}
        <div className="tabs-list">
          {pinnedTabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              expanded={expanded}
              onSelect={() => onSelectTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onTogglePin={() => onTogglePinnedTab(tab.id)}
              onReorder={onReorderTab}
            />
          ))}
        </div>
      </div>

      <div className="sidebar-separator" />

      <div className="sidebar-section tabs-grow">
        {expanded && <div className="sidebar-label">Spaces</div>}

        <div className="spaces-list">
          {spaces.map((space) => {
            const spaceTabs = tabs.filter((tab) => !tab.pinned && tab.spaceId === space.id);
            return (
              <section
                className="space-group"
                key={space.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/tab-id");
                  if (sourceId) {
                    onMoveTabToSpace(sourceId, space.id);
                  }
                }}
              >
                <button
                  className="space-header"
                  onClick={() => onToggleSpaceCollapsed(space.id)}
                  title={space.name}
                >
                  <span className="space-dot" style={{ backgroundColor: space.color }} />
                  {expanded ? <span className="space-name">{space.name}</span> : null}
                  {expanded ? <span className="space-count">{spaceTabs.length}</span> : null}
                </button>

                {!space.collapsed && (
                  <div className="tabs-list">
                    {spaceTabs.map((tab) => (
                      <TabItem
                        key={tab.id}
                        tab={tab}
                        active={tab.id === activeTabId}
                        expanded={expanded}
                        onSelect={() => onSelectTab(tab.id)}
                        onClose={() => onCloseTab(tab.id)}
                        onTogglePin={() => onTogglePinnedTab(tab.id)}
                        onReorder={onReorderTab}
                      />
                    ))}

                    {expanded && (
                      <button className="space-add-tab" onClick={() => onNewTab(space.id)}>
                        + New tab in {space.name}
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="icon-button" onClick={() => onNewTab()} title="New tab (Ctrl+T)">
          +
        </button>
        <button className="icon-button" onClick={onAddSpace} title="Add space">
          S+
        </button>
        <button className="icon-button" onClick={onOpenAI} title="AI panel (Ctrl+Shift+A)">
          AI
        </button>
        <button className="icon-button" onClick={onToggleSidebarPin} title={pinned ? "Unpin sidebar" : "Pin sidebar"}>
          {pinned ? "Unpin" : "Pin"}
        </button>
        <button className="icon-button" onClick={onOpenSettings} title="Settings">
          cfg
        </button>
      </div>
    </aside>
  );
}
