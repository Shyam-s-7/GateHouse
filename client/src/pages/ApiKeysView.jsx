import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Shield,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Activity,
  Trash2,
  Edit2,
  Lock,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

const ApiKeysView = ({ onSelectKeyForPlayground }) => {
  const [keys, setKeys] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Key Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimitRequests, setRateLimitRequests] = useState(60);
  const [rateLimitWindow, setRateLimitWindow] = useState('1m');
  const [selectedServices, setSelectedServices] = useState([]);

  // Newly Created Key Reveal Modal
  const [revealedKeyData, setRevealedKeyData] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Edit Rate Limit Modal
  const [editingKey, setEditingKey] = useState(null);
  const [editRequests, setEditRequests] = useState(60);
  const [editWindow, setEditWindow] = useState('1m');

  const toast = useToast();

  const fetchData = async () => {
    try {
      const [keysRes, servicesRes] = await Promise.all([
        api.get('/api/keys'),
        api.get('/api/services'),
      ]);
      setKeys(keysRes.data.data);
      setServices(servicesRes.data.data);
    } catch (err) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return toast.warning('Please enter an API key name.');

    try {
      const res = await api.post('/api/keys', {
        name: keyName.trim(),
        requestsPerMinute: Number(rateLimitRequests),
        window: rateLimitWindow,
        allowedServices: selectedServices,
      });

      setIsCreateOpen(false);
      setRevealedKeyData(res.data.data);
      setHasCopied(false);
      toast.success('Cryptographic API key generated securely.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create API key');
    }
  };

  const handleRevokeKey = async (key) => {
    if (!window.confirm(`Revoke '${key.name}' (${key.keyPrefix}) immediately? Any client application using this key will immediately receive 403 Forbidden.`)) {
      return;
    }
    try {
      await api.post(`/api/keys/${key._id}/revoke`);
      toast.warning(`Key '${key.name}' revoked.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to revoke key');
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Permanently remove key '${name}'? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/keys/${id}`);
      toast.success('Key record removed.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete key');
    }
  };

  const openEditRateLimit = (key) => {
    setEditingKey(key);
    setEditRequests(key.rateLimit?.requests || 60);
    setEditWindow(key.rateLimit?.window || '1m');
  };

  const handleSaveRateLimit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/keys/${editingKey._id}`, {
        requests: Number(editRequests),
        window: editWindow,
      });
      toast.success(`Rate limit updated to ${editRequests} req/${editWindow}`);
      setEditingKey(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update rate limit');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    toast.success('Secret API key copied to clipboard!');
    setTimeout(() => setHasCopied(false), 3000);
  };

  const toggleServiceSelection = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">API Keys & Traffic Control</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate SHA-256 hashed keys, configure granular rate limits, and revoke compromised credentials
          </p>
        </div>
        <button
          onClick={() => {
            setKeyName('');
            setRateLimitRequests(60);
            setRateLimitWindow('1m');
            setSelectedServices([]);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New API Key</span>
        </button>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Key className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No API Keys Generated</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create an API key with custom request throttling to authenticate external clients calling your gateway.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer hover:bg-indigo-500"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {keys.map((key) => {
            const isRevoked = key.status === 'revoked';
            return (
              <div
                key={key._id}
                className={`bg-slate-900/60 border rounded-2xl p-5 backdrop-blur-sm transition-all flex flex-col justify-between ${
                  isRevoked ? 'border-rose-950/40 bg-slate-950/40 opacity-75' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Key Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">{key.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isRevoked
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {key.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {key.keyPrefix}
                        </span>
                        <span className="text-[11px] text-slate-400">(SHA-256 Hashed in DB)</span>
                      </div>
                    </div>

                    {/* Rate Limit Pill */}
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-200 font-semibold font-mono">
                        {key.rateLimit?.requests} req
                      </span>
                      <span className="text-slate-400 font-normal">/ {key.rateLimit?.window}</span>
                    </div>
                  </div>

                  {/* Scopes & Services */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Authorized Services:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {key.allowedServices?.length === 0 ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                          All Services (Global Access)
                        </span>
                      ) : (
                        key.allowedServices.map((svc) => (
                          <span
                            key={svc._id}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                          >
                            {svc.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Usage telemetry summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60 font-mono">
                    <div className="text-slate-400">
                      Total Ingress Calls:{' '}
                      <span className="text-slate-200 font-bold">{key.totalRequests || 0}</span>
                    </div>
                    <div className="text-right text-slate-400 truncate">
                      Last Active:{' '}
                      <span className="text-slate-300 font-medium">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => openEditRateLimit(key)}
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Adjust Rate Limit</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!isRevoked ? (
                      <button
                        onClick={() => handleRevokeKey(key)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Revoke Key</span>
                      </button>
                    ) : (
                      <span className="text-xs text-rose-400 font-medium">Revoked Key</span>
                    )}
                    <button
                      onClick={() => handleDeleteKey(key._id, key.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate API Key Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate Cryptographic API Key"
        subtitle="Keys are generated with 192+ bits of entropy and stored securely as SHA-256 hashes"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Key Purpose / Label</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Mobile iOS App, Partner Webhook, or Internal Service"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Request Quota (Limit)</label>
              <input
                type="number"
                value={rateLimitRequests}
                onChange={(e) => setRateLimitRequests(e.target.value)}
                min="1"
                max="100000"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sliding Window</label>
              <select
                value={rateLimitWindow}
                onChange={(e) => setRateLimitWindow(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="1m">Per 1 Minute (High Precision)</option>
                <option value="1h">Per 1 Hour</option>
                <option value="1d">Per 1 Day (24 Hours)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Allowed Upstream Services <span className="text-slate-400 font-normal">(Leave empty for Global Access)</span>
            </label>
            {services.length === 0 ? (
              <p className="text-xs text-slate-400">No services created yet. Key will have global access.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {services.map((svc) => (
                  <label
                    key={svc._id}
                    className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white cursor-pointer p-1.5 rounded hover:bg-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(svc._id)}
                      onChange={() => toggleServiceSelection(svc._id)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span className="font-semibold">{svc.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">(/gateway/{svc.slug})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Issue API Key
            </button>
          </div>
        </form>
      </Modal>

      {/* Secret Key One-Time Reveal Modal */}
      <Modal
        isOpen={!!revealedKeyData}
        onClose={() => setRevealedKeyData(null)}
        title="API Key Created Successfully"
        subtitle="Copy your secret API key now. It cannot be shown again for security reasons."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Warning:</span> Gatehouse only stores an irreversible SHA-256 cryptographic hash of this key. If lost, you will need to generate a new key.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Secret Raw API Key</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={revealedKeyData?.rawKey || ''}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/50 rounded-xl font-mono text-xs text-indigo-300 selection:bg-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(revealedKeyData?.rawKey)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
            <div>Key Name: <span className="text-slate-200">{revealedKeyData?.name}</span></div>
            <div>Prefix: <span className="text-slate-200">{revealedKeyData?.keyPrefix}</span></div>
            <div>Rate Limit: <span className="text-slate-200">{revealedKeyData?.rateLimit?.requests} req / {revealedKeyData?.rateLimit?.window}</span></div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setRevealedKeyData(null)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Done & Safely Stored
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Rate Limit Modal */}
      <Modal
        isOpen={!!editingKey}
        onClose={() => setEditingKey(null)}
        title="Adjust Key Traffic Throttling"
        subtitle={`Update rate limit policy for '${editingKey?.name}'`}
      >
        <form onSubmit={handleSaveRateLimit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Requests</label>
              <input
                type="number"
                value={editRequests}
                onChange={(e) => setEditRequests(e.target.value)}
                min="1"
                max="100000"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Window</label>
              <select
                value={editWindow}
                onChange={(e) => setEditWindow(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="1m">Per 1 Minute</option>
                <option value="1h">Per 1 Hour</option>
                <option value="1d">Per 1 Day</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Note: Updating limits immediately resets this key's sliding window cache in memory.
          </p>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingKey(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Save Rate Limit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ApiKeysView;
