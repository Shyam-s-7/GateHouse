import React, { useState, useEffect } from 'react';
import {
  Send,
  Terminal,
  Play,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Layers,
  Code2,
  FileJson,
  Sparkles,
  Info,
  Server,
  Key,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const PlaygroundView = () => {
  const [services, setServices] = useState([]);
  const [keys, setKeys] = useState([]);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState('');
  const [subPath, setSubPath] = useState('');
  const [method, setMethod] = useState('GET');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedKeyId, setSelectedKeyId] = useState('manual');

  // Request Tabs
  const [activeReqTab, setActiveReqTab] = useState('body'); // 'body' | 'headers' | 'params'
  const [requestBody, setRequestBody] = useState('{\n  "customer": "Apex Global Systems",\n  "amount": 549.99,\n  "currency": "USD",\n  "items": 4\n}');
  const [customHeaders, setCustomHeaders] = useState([
    { key: 'Accept', value: 'application/json' },
  ]);
  const [queryParams, setQueryParams] = useState([
    { key: 'format', value: 'compact' },
  ]);

  // Response State
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [activeResTab, setActiveResTab] = useState('pretty'); // 'pretty' | 'raw' | 'headers'
  const [curlCopied, setCurlCopied] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [servicesRes, keysRes] = await Promise.all([
          api.get('/api/services'),
          api.get('/api/keys'),
        ]);

        const svcs = servicesRes.data.data;
        setServices(svcs);
        if (svcs.length > 0) {
          setSelectedServiceSlug(svcs[0].slug);
        }

        const activeKeys = keysRes.data.data.filter((k) => k.status === 'active');
        setKeys(activeKeys);

        // Pre-fill with seeded key if available
        if (activeKeys.length > 0) {
          setSelectedKeyId(activeKeys[0]._id);
          // If we had a stored test key in localStorage or placeholder
          setApiKeyInput('gh_live_1493ce9452fb36078b7f7df2b9bfd2c170d425842aa46511');
        }
      } catch (err) {
        console.error('Failed to load services or keys for playground:', err);
      }
    };
    init();
  }, []);

  const handleKeySelectChange = (e) => {
    const val = e.target.value;
    setSelectedKeyId(val);
    if (val === 'demo1') {
      setApiKeyInput('gh_live_1493ce9452fb36078b7f7df2b9bfd2c170d425842aa46511');
    } else if (val === 'demo2') {
      setApiKeyInput('gh_live_a427b1741739e8c08ab4d7151f23ce55753bc9d7191dbecd');
    }
  };

  const getFullGatewayUrl = () => {
    const base = `/gateway/${selectedServiceSlug || 'orders'}`;
    const cleanSub = subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '';
    return `${base}${cleanSub}`;
  };

  const executeRequest = async () => {
    if (!selectedServiceSlug) {
      toast.warning('Please select or specify a target upstream route.');
      return;
    }
    if (!apiKeyInput.trim()) {
      toast.warning('Please provide an API Key in the x-api-key header.');
      return;
    }

    setLoading(true);
    setResponse(null);

    const fullUrl = getFullGatewayUrl();
    const startTime = performance.now();

    // Prepare query params
    const paramsObj = {};
    queryParams.forEach((p) => {
      if (p.key.trim()) paramsObj[p.key.trim()] = p.value;
    });

    // Prepare headers
    const headersObj = {
      'x-api-key': apiKeyInput.trim(),
    };
    customHeaders.forEach((h) => {
      if (h.key.trim()) headersObj[h.key.trim()] = h.value;
    });

    let parsedBody = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      try {
        parsedBody = JSON.parse(requestBody);
        headersObj['Content-Type'] = 'application/json';
      } catch (jsonErr) {
        toast.error('Invalid JSON request body: ' + jsonErr.message);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await api({
        method,
        url: fullUrl,
        params: paramsObj,
        headers: headersObj,
        data: parsedBody,
        validateStatus: () => true, // capture all status codes
      });

      const clientLatency = Math.round(performance.now() - startTime);

      setResponse({
        status: res.status,
        statusText: res.statusText || 'OK',
        data: res.data,
        headers: res.headers,
        latency: clientLatency,
        gatewayLatency: res.headers['x-gatehouse-latency'] || `${clientLatency}ms`,
        rateLimitLimit: res.headers['x-ratelimit-limit'],
        rateLimitRemaining: res.headers['x-ratelimit-remaining'],
        rateLimitReset: res.headers['x-ratelimit-reset'],
      });

      if (res.status === 429) {
        toast.warning('HTTP 429: Rate limit quota exceeded! Request throttled by Gatehouse.');
      } else if (res.status >= 200 && res.status < 300) {
        toast.success(`HTTP ${res.status}: Request proxied successfully (${clientLatency}ms).`);
      } else {
        toast.info(`HTTP ${res.status} returned by gateway / upstream.`);
      }
    } catch (err) {
      const clientLatency = Math.round(performance.now() - startTime);
      setResponse({
        status: err.response?.status || 500,
        statusText: 'Gateway Error',
        data: err.response?.data || { error: err.message },
        headers: err.response?.headers || {},
        latency: clientLatency,
      });
      toast.error('Request failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    const fullUrl = `http://localhost:5050${getFullGatewayUrl()}`;
    let curl = `curl -X ${method} "${fullUrl}" \\\n  -H "x-api-key: ${apiKeyInput || 'YOUR_API_KEY'}"`;

    customHeaders.forEach((h) => {
      if (h.key.trim()) {
        curl += ` \\\n  -H "${h.key.trim()}: ${h.value}"`;
      }
    });

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n/g, ' ')}'`;
    }

    return curl;
  };

  const copyCurlToClipboard = () => {
    const curl = generateCurl();
    navigator.clipboard.writeText(curl);
    setCurlCopied(true);
    toast.success('cURL command copied to clipboard!');
    setTimeout(() => setCurlCopied(false), 2500);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(parsed, null, 2));
      toast.info('JSON formatted');
    } catch (e) {
      toast.error('Invalid JSON: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">API Playground & Workbench</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
              Postman Alternative
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate live client requests, verify rate limit headers, and inspect upstream proxy latency
          </p>
        </div>

        <button
          onClick={copyCurlToClipboard}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          {curlCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
          <span>{curlCopied ? 'cURL Copied' : 'Export cURL'}</span>
        </button>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Method + Path Ingress Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-2 shadow-lg backdrop-blur-sm">
            {/* Method Select */}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full sm:w-28 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>

            {/* Service & Sub-path Input */}
            <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 w-full text-xs font-mono">
              <span className="text-slate-400 select-none">/gateway/</span>
              <select
                value={selectedServiceSlug}
                onChange={(e) => setSelectedServiceSlug(e.target.value)}
                className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer pr-1"
              >
                {services.map((s) => (
                  <option key={s._id} value={s.slug} className="bg-slate-900 text-white">
                    {s.slug}
                  </option>
                ))}
              </select>
              <span className="text-slate-400 select-none">/</span>
              <input
                type="text"
                value={subPath}
                onChange={(e) => setSubPath(e.target.value)}
                placeholder="sub-path (e.g. ord_101)"
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={executeRequest}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>Send</span>
            </button>
          </div>

          {/* Authentication & API Key Selector Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Key className="w-4 h-4 text-amber-400" />
                <span>API Key Authentication (x-api-key)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApiKeyInput('gh_live_1493ce9452fb36078b7f7df2b9bfd2c170d425842aa46511')}
                  className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Fill Sample Key 1 (60/m)
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setApiKeyInput('gh_live_a427b1741739e8c08ab4d7151f23ce55753bc9d7191dbecd')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Fill Key 2 (20/m)
                </button>
              </div>
            </div>

            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste raw secret API key (gh_live_...)"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Request Config Tabs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveReqTab('body')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeReqTab === 'body'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Body (JSON)
                </button>
                <button
                  onClick={() => setActiveReqTab('headers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeReqTab === 'headers'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Headers ({customHeaders.length})
                </button>
                <button
                  onClick={() => setActiveReqTab('params')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeReqTab === 'params'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Params ({queryParams.length})
                </button>
              </div>

              {activeReqTab === 'body' && (
                <button
                  onClick={formatJson}
                  className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Beautify JSON</span>
                </button>
              )}
            </div>

            {/* Tab: Body */}
            {activeReqTab === 'body' && (
              <div>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 selection:bg-indigo-600/50"
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>
            )}

            {/* Tab: Headers */}
            {activeReqTab === 'headers' && (
              <div className="space-y-2">
                {customHeaders.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Header Name"
                      value={header.key}
                      onChange={(e) => {
                        const copy = [...customHeaders];
                        copy[idx].key = e.target.value;
                        setCustomHeaders(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={header.value}
                      onChange={(e) => {
                        const copy = [...customHeaders];
                        copy[idx].value = e.target.value;
                        setCustomHeaders(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomHeaders(customHeaders.filter((_, i) => i !== idx))}
                      className="px-2 py-1 text-slate-400 hover:text-rose-400 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                  className="text-xs text-indigo-400 hover:underline font-semibold pt-1 cursor-pointer"
                >
                  + Add Custom Header
                </button>
              </div>
            )}

            {/* Tab: Params */}
            {activeReqTab === 'params' && (
              <div className="space-y-2">
                {queryParams.map((param, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Param Key"
                      value={param.key}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].key = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Param Value"
                      value={param.value}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].value = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                      className="px-2 py-1 text-slate-400 hover:text-rose-400 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQueryParams([...queryParams, { key: '', value: '' }])}
                  className="text-xs text-indigo-400 hover:underline font-semibold pt-1 cursor-pointer"
                >
                  + Add Query Parameter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Response & Telemetry Viewer (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between shadow-xl min-h-[480px]">
          <div>
            {/* Top response telemetry badges */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300">Live Gateway Response</span>

              {response ? (
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                      response.status === 429
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : response.status >= 200 && response.status < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>

                  {/* Latency Badge */}
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{response.gatewayLatency}</span>
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Awaiting dispatch</span>
              )}
            </div>

            {/* Rate limit quota live indicator */}
            {response?.rateLimitRemaining !== undefined && (
              <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">X-RateLimit-Remaining:</span>
                <span className="text-amber-400 font-bold">
                  {response.rateLimitRemaining} / {response.rateLimitLimit}
                </span>
              </div>
            )}

            {/* Response Content Tabs */}
            {response && (
              <div className="mt-3 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <button
                  onClick={() => setActiveResTab('pretty')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeResTab === 'pretty' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Formatted JSON
                </button>
                <button
                  onClick={() => setActiveResTab('headers')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeResTab === 'headers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Telemetry Headers
                </button>
                <button
                  onClick={() => setActiveResTab('raw')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeResTab === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw Body
                </button>
              </div>
            )}

            {/* Response Output Pane */}
            <div className="mt-3">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400">Proxying to upstream target...</span>
                </div>
              ) : !response ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-slate-800 rounded-xl">
                  <Terminal className="w-8 h-8 text-slate-400" />
                  <p className="text-xs text-slate-400 font-medium">
                    Configure your route parameters on the left and click "Send" to trigger a proxied call.
                  </p>
                </div>
              ) : activeResTab === 'pretty' ? (
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 select-all leading-relaxed">
                  {typeof response.data === 'object'
                    ? JSON.stringify(response.data, null, 2)
                    : String(response.data)}
                </pre>
              ) : activeResTab === 'headers' ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono max-h-80 overflow-y-auto space-y-1">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-semibold">{k}:</span>
                      <span className="text-slate-300 break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-80 select-all">
                  {typeof response.data === 'object'
                    ? JSON.stringify(response.data)
                    : String(response.data)}
                </pre>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Reverse Proxy: Active</span>
            <span className="font-mono text-indigo-400">Gatehouse Core</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundView;
