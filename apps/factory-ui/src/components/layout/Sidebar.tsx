import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderPlus, Settings, Factory, ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../../store/store';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/new', icon: FolderPlus, label: 'New Project' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, wsConnected } = useAppStore();

  return (
    <aside className={`flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <Factory className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-sm font-bold text-white">SaaS Factory</h1>
            <p className="text-[10px] text-zinc-500">Multi-Agent Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-zinc-800 space-y-2">
        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
          wsConnected ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {!sidebarCollapsed && <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 w-full transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
