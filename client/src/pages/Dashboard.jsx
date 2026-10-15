import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Server,
  Key,
  TrendingUp,
  ArrowRight,
  Filter,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const Dashboard = ({ setActiveTab }) => {
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [servicesBreakdown, setServicesBreakdown] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  const toast = useToast();

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [kpiRes, timelineRes, statusRes, servicesRes, logsRes] = await Promise.all([
        api.get(`/api/analytics/kpis?range=${range}`),
        api.get(`/api/analytics/timeline?range=${range}`),
        api.get('/api/analytics/status-distribution'),
        api.get('/api/analytics/services-breakdown'),
        api.get('/api/analytics/logs?limit=8'),
      ]);

      setKpis(kpiRes.data.data);
      setTimeline(timelineRes.data.data);
      setStatusDistribution(statusRes.data.data);
      setServicesBreakdown(servicesRes.data.data);
      setRecentLogs(logsRes.data.data);

      if (isManual) toast.success('Dashboard metrics refreshed');
    } catch (err) {
      console.error('Failed to load analytics:', err);
      toast.error('Unable to fetch analytics telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  const getStatusBadge = (code) => {
    if (code >= 200 && code < 300) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{code} OK</span>;
    }
    if (code === 429) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{code} Throttled</span>;
    }
    if (code >= 400 && code < 500) {
      return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">{code} Client Err</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">{code} Upstream Err</span>;
  };

  const getMethodBadge = (method) => {
    const colors = {
      GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      POST: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border ${colors[method] || 'text-slate-300'}`}>
        {method}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Aggregating gateway telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Developer Analytics Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time proxy telemetry, rate limit violations, and service health metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Picker */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setRange('24h')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                range === '24h' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                range === '7d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                range === '30d' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh metrics"
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Ingress Requests</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {kpis?.totalRequests.toLocaleString() || 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> Live
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Success: <span className="text-emerald-400 font-semibold">{kpis?.successRequests || 0}</span></span>
            <span>Throttled: <span className="text-amber-400 font-semibold">{kpis?.rateLimitedRequests || 0}</span></span>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Error Rate</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(kpis?.errorRate || 0) > 5 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {kpis?.errorRate || 0}%
            </span>
            <span className={`text-xs font-medium ${(kpis?.errorRate || 0) > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {(kpis?.errorRate || 0) > 5 ? 'Elevated 4xx/5xx' : 'Healthy Target'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Failed Responses: <span className="text-rose-400 font-semibold">{kpis?.errorRequests || 0}</span></span>
            <span>Non-2xx codes</span>
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Roundtrip Latency</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {kpis?.avgLatency || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Sub-millisecond Gateway</span>
            <span className="text-cyan-400 font-medium">High Throughput</span>
          </div>
        </div>

        {/* Active Key / Service Inventory */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-sm group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Infrastructure</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {kpis?.activeServicesCount || 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Upstreams</span>
            </div>
            <div className="w-px h-6 bg-slate-800 self-center"></div>
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {kpis?.activeKeysCount || 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Keys</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('services')}>
              Manage Services →
            </span>
            <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('keys')}>
              Manage Keys →
            </span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Traffic Volume Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Daily Traffic Volume Breakdown</h3>
              <p className="text-xs text-slate-400">Total ingress requests partitioned by HTTP response classification</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Successful
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> 429 Throttled
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Errors
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No traffic activity logged in this window. Send a test request via the API Playground!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="successful" name="Success" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rateLimited" name="429 Throttled" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="errors" name="Errors" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Code Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Status Code Distribution</h3>
            <p className="text-xs text-slate-400">HTTP response outcomes returned to API consumers</p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            {statusDistribution.length === 0 ? (
              <span className="text-xs text-slate-400">No status codes logged yet</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800/80">
            {statusDistribution.slice(0, 4).map((item) => (
              <div key={item.code} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="text-slate-400 ml-auto font-mono text-[11px] font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Request Logs Data Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Recent Gateway Activity</h3>
            <p className="text-xs text-slate-400">Live requests proxied through the Gatehouse reverse proxy engine</p>
          </div>
          <button
            onClick={() => setActiveTab('logs')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group cursor-pointer"
          >
            <span>Explore All Logs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-y border-slate-800/80">
              <tr>
                <th className="py-3 px-4 font-semibold">Method & Path</th>
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">API Key</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Latency</th>
                <th className="py-3 px-4 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No requests recorded yet. Fire a call from the Playground tab!
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2 font-mono">
                      {getMethodBadge(log.method)}
                      <span className="text-slate-200 truncate max-w-xs">{log.path}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {log.serviceSlug}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.apiKeyPrefix || 'None'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(log.statusCode)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span className={log.latencyMs < 50 ? 'text-emerald-400' : log.latencyMs < 120 ? 'text-cyan-400' : 'text-amber-400'}>
                        {log.latencyMs}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
