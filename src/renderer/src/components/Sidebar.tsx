import { MouseEvent as ReactMouseEvent, useState } from "react";
import { Bot, ChevronDown, ChevronRight, FolderPlus, Globe2, MoonStar, Pin, PinOff, Plus, Settings2, X } from "lucide-react";
import { BrowserTab, TabSpace } from "../types";

interface SidebarProps {
  tabs: BrowserTab[];
  spaces: TabSpace[];
  activeTabId: string;
  expanded: boolean;
  sidebarWidth: number;
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
  onResizeWidth: (width: number) => void;
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
      <span className="tab-favicon" aria-hidden="true">
        {tab.favicon ? (
          <img src={tab.favicon} alt="" />
        ) : tab.suspended ? (
          <MoonStar size={12} strokeWidth={1.9} />
        ) : (
          <Globe2 size={13} strokeWidth={1.8} />
        )}
      </span>

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
              {tab.pinned ? <PinOff size={11} strokeWidth={1.8} /> : <Pin size={11} strokeWidth={1.8} />}
            </button>
            <button
              className="tab-mini"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              title="Close tab"
            >
              <X size={11} strokeWidth={2} />
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
  sidebarWidth,
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
  onResizeWidth,
  onOpenAI,
  onOpenSettings
}: SidebarProps) {
  const pinnedTabs = tabs.filter((tab) => tab.pinned);
  const [dragTargetSpaceId, setDragTargetSpaceId] = useState<string | null>(null);

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      onResizeWidth(startWidth + delta);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <aside
      className={`sidebar ${expanded ? "expanded" : "collapsed"}`}
      style={expanded ? { width: `${sidebarWidth}px` } : undefined}
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
                className={`space-group ${dragTargetSpaceId === space.id ? "drag-target" : ""}`}
                key={space.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragTargetSpaceId(space.id);
                }}
                onDragLeave={() => {
                  setDragTargetSpaceId((current) => (current === space.id ? null : current));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const sourceId = event.dataTransfer.getData("text/tab-id");
                  if (sourceId) {
                    onMoveTabToSpace(sourceId, space.id);
                  }
                  setDragTargetSpaceId(null);
                }}
              >
                <button
                  className="space-header"
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragTargetSpaceId(space.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const sourceId = event.dataTransfer.getData("text/tab-id");
                    if (sourceId) {
                      onMoveTabToSpace(sourceId, space.id);
                    }
                    setDragTargetSpaceId(null);
                  }}
                  onClick={() => onToggleSpaceCollapsed(space.id)}
                  title={space.name}
                >
                  {expanded ? (
                    space.collapsed ? <ChevronRight size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />
                  ) : null}
                  <span className="space-dot" style={{ backgroundColor: space.color }} />
                  {expanded ? <span className="space-name">{space.name}</span> : null}
                  {expanded ? <span className="space-count">{spaceTabs.length}</span> : null}
                </button>

                {!space.collapsed && (
                  <div
                    className="tabs-list"
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragTargetSpaceId(space.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const sourceId = event.dataTransfer.getData("text/tab-id");
                      if (sourceId) {
                        onMoveTabToSpace(sourceId, space.id);
                      }
                      setDragTargetSpaceId(null);
                    }}
                  >
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
                        <Plus size={12} strokeWidth={2} />
                        <span>New tab in {space.name}</span>
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
          <Plus size={14} strokeWidth={2} />
        </button>
        <button className="icon-button" onClick={onAddSpace} title="Add space">
          <FolderPlus size={14} strokeWidth={1.8} />
        </button>
        <button className="icon-button" onClick={onOpenAI} title="AI panel (Ctrl+Shift+A)">
          <Bot size={14} strokeWidth={1.8} />
        </button>
        <button className="icon-button" onClick={onToggleSidebarPin} title={pinned ? "Unpin sidebar" : "Pin sidebar"}>
          {pinned ? <PinOff size={13} strokeWidth={1.8} /> : <Pin size={13} strokeWidth={1.8} />}
        </button>
        <button className="icon-button" onClick={onOpenSettings} title="Settings">
          <Settings2 size={14} strokeWidth={1.8} />
        </button>
      </div>

      {expanded ? <div className="sidebar-resizer" onMouseDown={handleResizeStart} /> : null}
    </aside>
  );
}
