import { useState } from 'react';
import { Settings as SettingsIcon, Key, Server, Palette } from 'lucide-react';

export function Settings() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('minimax_api_key') || '');
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('backend_url') || 'http://localhost:3010');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('minimax_api_key', apiKey);
    localStorage.setItem('backend_url', backendUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-zinc-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* API Configuration */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">API Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">MiniMax API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your MiniMax API key"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Required for AI-powered agent responses. Get your key from the MiniMax developer portal.
              </p>
            </div>
          </div>
        </section>

        {/* Server Configuration */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Server Configuration</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Backend URL</label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3010"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </section>

        {/* About */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">About</h2>
          </div>
          <div className="space-y-2 text-sm text-zinc-400">
            <p><strong className="text-zinc-300">SaaS Factory</strong> v2.0.0</p>
            <p>Multi-agent SaaS development platform powered by MiniMax AI.</p>
            <p>Agents: PM, Business Analyst, Solution Architect, Frontend Dev, Backend Dev, QA Engineer, DevOps</p>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-emerald-400">Settings saved!</span>}
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
