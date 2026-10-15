import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Activity,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Send,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

const ServicesView = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pingingId, setPingingId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [allowedMethods, setAllowedMethods] = useState(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
  const [isActive, setIsActive] = useState(true);

  const toast = useToast();

  const fetchServices = async () => {
    try {
      const res = await api.get('/api/services');
      setServices(res.data.data);
    } catch (err) {
      toast.error('Failed to load upstream services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setName('');
    setSlug('');
    setTargetUrl('');
    setDescription('');
    setTimeoutMs(15000);
    setAllowedMethods(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setName(service.name);
    setSlug(service.slug);
    setTargetUrl(service.targetUrl);
    setDescription(service.description || '');
    setTimeoutMs(service.timeoutMs || 15000);
    setAllowedMethods(service.allowedMethods || ['GET', 'POST']);
    setIsActive(service.isActive);
    setIsModalOpen(true);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!editingService) {
      // Auto-generate clean slug
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const toggleMethod = (method) => {
    if (allowedMethods.includes(method)) {
      if (allowedMethods.length === 1) {
        toast.warning('At least one HTTP method must be permitted.');
        return;
      }
      setAllowedMethods(allowedMethods.filter((m) => m !== method));
    } else {
      setAllowedMethods([...allowedMethods, method]);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.warning('Please enter a service name.');
    if (!slug.trim()) return toast.warning('Please enter a unique route slug.');
    if (!targetUrl.trim() || !/^https?:\/\/.+/i.test(targetUrl)) {
      return toast.warning('Please enter a valid target URL starting with http:// or https://');
    }

    try {
      const payload = {
        name,
        slug: slug.toLowerCase().trim(),
        targetUrl: targetUrl.trim(),
        description,
        timeoutMs: Number(timeoutMs),
        allowedMethods,
        isActive,
      };

      if (editingService) {
        await api.put(`/api/services/${editingService._id}`, payload);
        toast.success(`Service '${name}' updated successfully.`);
      } else {
        await api.post('/api/services', payload);
        toast.success(`Upstream service '${name}' created and bound to /gateway/${slug}`);
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save service.';
      toast.error(msg);
    }
  };

  const handleDelete = async (id, serviceName) => {
    if (!window.confirm(`Are you sure you want to remove '${serviceName}'? Proxied calls to this route will immediately fail.`)) {
      return;
    }
    try {
      await api.delete(`/api/services/${id}`);
      toast.success(`Service '${serviceName}' removed.`);
      fetchServices();
    } catch (err) {
      toast.error('Failed to delete service.');
    }
  };

  const handleTestPing = async (service) => {
    setPingingId(service._id);
    try {
      const res = await api.post(`/api/services/${service._id}/test-ping`);
      if (res.data.healthy) {
        toast.success(`Ping Passed! Upstream responded with HTTP ${res.data.statusCode} in ${res.data.latencyMs}ms.`);
      } else {
        toast.error(res.data.message || 'Target upstream unreachable.');
      }
      fetchServices();
    } catch (err) {
      toast.error('Health ping test failed.');
    } finally {
      setPingingId(null);
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await api.put(`/api/services/${service._id}`, { isActive: !service.isActive });
      toast.info(`Service '${service.name}' marked as ${!service.isActive ? 'Active' : 'Inactive'}.`);
      fetchServices();
    } catch (err) {
      toast.error('Failed to toggle status.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Upstream Target Backend Services</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure backend target servers, route prefixes, and timeout policies
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Upstream Service</span>
        </button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Server className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Upstream Services Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Register your first target backend API to start proxying, inspecting, and rate-limiting incoming traffic.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer hover:bg-indigo-500"
          >
            Add Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              key={service._id}
              className={`bg-slate-900/60 border rounded-2xl p-5 backdrop-blur-sm transition-all flex flex-col justify-between ${
                service.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-rose-950/40 bg-slate-950/40 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{service.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          service.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{service.description}</p>
                    )}
                  </div>

                  {/* Health status pill */}
                  <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                    {service.healthStatus === 'healthy' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Healthy</span>
                      </>
                    ) : service.healthStatus === 'unhealthy' ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-rose-400 font-medium">Unreachable</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400 font-medium">Unverified</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Route Path & Target URL cards */}
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      Gateway Route
                    </span>
                    <span className="text-slate-200 truncate select-all">
                      /gateway/{service.slug}/*
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                      Upstream Target
                    </span>
                    <span className="text-slate-400 truncate select-all">{service.targetUrl}</span>
                  </div>
                </div>

                {/* HTTP Methods & Specs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {service.allowedMethods?.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                      {m}
                    </span>
                  ))}
                  <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{service.timeoutMs || 15000}ms timeout</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleTestPing(service)}
                  disabled={pingingId === service._id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors font-medium cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 text-indigo-400 ${pingingId === service._id ? 'animate-spin' : ''}`} />
                  <span>{pingingId === service._id ? 'Pinging Target...' : 'Test Health Ping'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(service)}
                    title={service.isActive ? 'Disable service' : 'Activate service'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      service.isActive
                        ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {service.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEditModal(service)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service._id, service.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register/Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Upstream Service' : 'Register New Upstream Target Service'}
        subtitle="Gateway will proxy requests arriving at /gateway/:slug to this destination"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Service Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Stripe Payment Proxy or Orders Backend"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Route Slug Identifier <span className="text-slate-400 font-normal">(/gateway/:slug)</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., payments"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-indigo-400 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Timeout Policy <span className="text-slate-400 font-normal">(milliseconds)</span>
              </label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
                min="1000"
                max="60000"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Upstream URL
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="e.g., http://localhost:5050/api/mock-upstream/orders or https://api.example.com"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of service responsibilities..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Allowed HTTP Methods</label>
            <div className="flex flex-wrap gap-2">
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => {
                const isSelected = allowedMethods.includes(method);
                return (
                  <button
                    type="button"
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              {editingService ? 'Save Changes' : 'Register Service'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServicesView;
