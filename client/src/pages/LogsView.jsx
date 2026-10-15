import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const LogsView = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [method, setMethod] = useState('');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');

  const toast = useToast();

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 15,
      });
      if (search.trim()) params.append('search', search.trim());
      if (statusCode) params.append('statusCode', statusCode);
      if (method) params.append('method', method);
      if (selectedService) params.append('serviceSlug', selectedService);

      const res = await api.get(`/api/analytics/logs?${params.toString()}`);
      setLogs(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages || 1);

      if (isManual) toast.success('Audit logs refreshed');
    } catch (err) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/api/services');
        setServices(res.data.data);
      } catch (e) {}
    };
    fetchServices();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, statusCode, method, selectedService]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getStatusBadge = (code) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {code} OK
        </span>
      );
    }
    if (code === 429) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          429 Throttled
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {code} Client Err
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        {code} Upstream Err
      </span>
    );
  };

  const getMethodBadge = (m) => {
    const colors = {
      GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      POST: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${colors[m] || 'text-slate-300'}`}>
        {m}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Ingress Audit & Request Logs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Asynchronously recorded proxy transactions with roundtrip latency, headers, and status codes
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by path, API key, or service..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Code Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusCode}
              onChange={(e) => {
                setStatusCode(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All HTTP Status Codes</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="404">404 Not Found</option>
              <option value="429">429 Too Many Requests</option>
              <option value="502">502 Bad Gateway</option>
            </select>
          </div>

          {/* Method Filter */}
          <div className="sm:col-span-2">
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Service Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Upstream Services</option>
              {services.map((s) => (
                <option key={s._id} value={s.slug}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Method & Request Path</th>
                <th className="py-3.5 px-4 font-semibold">Service</th>
                <th className="py-3.5 px-4 font-semibold">API Key Prefix</th>
                <th className="py-3.5 px-4 font-semibold">Status Code</th>
                <th className="py-3.5 px-4 font-semibold">Roundtrip Latency</th>
                <th className="py-3.5 px-4 font-semibold">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
                    Loading telemetry logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No requests match your search criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        {getMethodBadge(log.method)}
                        <span className="text-slate-200 truncate max-w-xs">{log.path}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-400/90 mt-0.5 truncate max-w-xs font-sans">
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                        {log.serviceSlug}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.apiKeyPrefix || 'None'}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(log.statusCode)}</td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span className={log.latencyMs < 50 ? 'text-emerald-400' : log.latencyMs < 150 ? 'text-cyan-400' : 'text-amber-400'}>
                        {log.latencyMs}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{logs.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> total logged requests
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 font-semibold">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(Math.min(pages, page + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsView;
