import React from 'react';
import {
  LayoutDashboard,
  Server,
  Key,
  Terminal,
  FileText,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Analytics Dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'services',
      label: 'Upstream Services',
      icon: Server,
    },
    {
      id: 'keys',
      label: 'API Keys & Throttling',
      icon: Key,
    },
    {
      id: 'playground',
      label: 'API Playground',
      icon: Terminal,
      badge: 'Test',
    },
    {
      id: 'logs',
      label: 'Request Logs',
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-2">
            Platform Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Gateway Gateway Info Card */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gateway Ingress Path</span>
          </div>
          <div className="text-[11px] font-mono bg-slate-900 px-2 py-1.5 rounded border border-slate-800 text-indigo-300 break-all select-all">
            /gateway/:serviceSlug/*
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Requests pass through rate limiting, key check, and latency timing before proxying.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/60 px-3 text-xs text-slate-400 flex items-center justify-between">
        <span>Gatehouse Engine</span>
        <span className="flex items-center gap-1 text-indigo-400 hover:underline cursor-pointer">
          MERN Stack
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
