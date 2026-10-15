import React, { useState, useEffect } from 'react';
import { Shield, Activity, LogOut, User as UserIcon, Server, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [gatewayStatus, setGatewayStatus] = useState({ healthy: true, uptime: 0 });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.status === 'healthy') {
          setGatewayStatus({ healthy: true, uptime: res.data.uptimeSeconds });
        }
      } catch (e) {
        setGatewayStatus({ healthy: false, uptime: 0 });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white font-mono">GATEHOUSE</span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0 Pro
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Enterprise API Gateway & Proxy Platform</p>
        </div>
      </div>

      {/* Center status indicators */}
      <div className="hidden md:flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-full px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gatewayStatus.healthy ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${gatewayStatus.healthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-slate-300 font-medium">
            Gateway Engine: <span className={gatewayStatus.healthy ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>{gatewayStatus.healthy ? 'Operational' : 'Degraded'}</span>
          </span>
        </div>
        <div className="w-px h-3 bg-slate-800"></div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span>Port 5050</span>
        </div>
      </div>

      {/* User info & Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">{user.name}</div>
              <div className="text-xs text-slate-400">{user.organization || 'Gatehouse Org'}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Navbar;
