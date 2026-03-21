import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Rocket, Check, Code, Database, Shield, CreditCard, Layout, Server, Cloud, TestTube } from 'lucide-react';
import { api } from '../lib/api';

const STACK_OPTIONS = [
  { id: 'react', label: 'React', icon: Code, category: 'Frontend' },
  { id: 'nextjs', label: 'Next.js', icon: Layout, category: 'Frontend' },
  { id: 'vue', label: 'Vue.js', icon: Code, category: 'Frontend' },
  { id: 'tailwind', label: 'Tailwind CSS', icon: Layout, category: 'Frontend' },
  { id: 'node', label: 'Node.js', icon: Server, category: 'Backend' },
  { id: 'python', label: 'Python', icon: Code, category: 'Backend' },
  { id: 'postgres', label: 'PostgreSQL', icon: Database, category: 'Database' },
  { id: 'mongodb', label: 'MongoDB', icon: Database, category: 'Database' },
  { id: 'redis', label: 'Redis', icon: Database, category: 'Database' },
  { id: 'docker', label: 'Docker', icon: Cloud, category: 'DevOps' },
  { id: 'github-actions', label: 'GitHub Actions', icon: Cloud, category: 'DevOps' },
  { id: 'stripe', label: 'Stripe', icon: CreditCard, category: 'Integrations' },
];

const FEATURE_SUGGESTIONS = [
  'User Authentication & Authorization',
  'Dashboard with Analytics',
  'CRUD Operations',
  'Real-time Notifications',
  'Search & Filtering',
  'File Upload',
  'Email Notifications',
  'Role-based Access Control',
  'API Rate Limiting',
  'Audit Logging',
  'Multi-tenancy',
  'Billing & Subscriptions',
  'User Settings & Preferences',
  'Export to CSV/PDF',
  'Webhooks',
  'Two-Factor Authentication',
];

type Step = 'basics' | 'stack' | 'features' | 'review';

export function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basics');
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState<string[]>(['react', 'node', 'postgres', 'tailwind', 'docker']);
  const [features, setFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState('');
  const [billingMode, setBillingMode] = useState<'subscription' | 'usage' | 'none'>('none');

  const steps: { id: Step; label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'stack', label: 'Tech Stack' },
    { id: 'features', label: 'Features' },
    { id: 'review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  function toggleStack(id: string) {
    setStack(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function toggleFeature(feature: string) {
    setFeatures(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
  }

  function addCustomFeature() {
    if (customFeature.trim() && !features.includes(customFeature.trim())) {
      setFeatures(prev => [...prev, customFeature.trim()]);
      setCustomFeature('');
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await api.createProject({
        name,
        description,
        config: { stack, features, billingMode },
      });
      navigate(`/project/${result.id}`);
    } catch (err: any) {
      alert(err.message);
      setCreating(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 'basics': return name.trim().length > 0 && description.trim().length > 0;
      case 'stack': return stack.length > 0;
      case 'features': return true;
      case 'review': return true;
    }
  }

  function nextStep() {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) setStep(steps[idx + 1].id);
  }

  function prevStep() {
    const idx = currentStepIndex;
    if (idx > 0) setStep(steps[idx - 1].id);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">Create New Project</h1>
      <p className="text-sm text-zinc-400 mb-8">Configure your SaaS application and let the agent team build it</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                i <= currentStepIndex
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}
              onClick={() => i <= currentStepIndex && setStep(s.id)}
            >
              {i < currentStepIndex ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-zinc-700 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        {step === 'basics' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Portal, Inventory Manager"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your SaaS application should do. Be as detailed as possible - this helps the agent team understand your vision."
                rows={5}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Billing Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'subscription', 'usage'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBillingMode(mode)}
                    className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                      billingMode === mode
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-medium capitalize">{mode === 'none' ? 'Free' : mode}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {mode === 'none' ? 'No billing' : mode === 'subscription' ? 'Monthly/yearly plans' : 'Pay per use'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'stack' && (
          <div>
            <p className="text-sm text-zinc-400 mb-4">Select the technologies for your project</p>
            {['Frontend', 'Backend', 'Database', 'DevOps', 'Integrations'].map((category) => {
              const options = STACK_OPTIONS.filter(o => o.category === category);
              if (options.length === 0) return null;
              return (
                <div key={category} className="mb-5">
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {options.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => toggleStack(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                          stack.includes(id)
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 'features' && (
          <div>
            <p className="text-sm text-zinc-400 mb-4">Select features or add custom ones</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {FEATURE_SUGGESTIONS.map((feature) => (
                <button
                  key={feature}
                  onClick={() => toggleFeature(feature)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    features.includes(feature)
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {features.includes(feature) && <span className="mr-1">+</span>}
                  {feature}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomFeature()}
                placeholder="Add a custom feature..."
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                onClick={addCustomFeature}
                disabled={!customFeature.trim()}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-white">Review Your Project</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Name</label>
                <p className="text-white mt-1">{name}</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Description</label>
                <p className="text-zinc-300 text-sm mt-1">{description}</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Tech Stack</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {stack.map(s => (
                    <span key={s} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Features ({features.length})</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {features.map(f => (
                    <span key={f} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">{f}</span>
                  ))}
                  {features.length === 0 && <span className="text-xs text-zinc-500">No specific features selected</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Billing</label>
                <p className="text-zinc-300 text-sm mt-1 capitalize">{billingMode === 'none' ? 'Free (no billing)' : billingMode}</p>
              </div>
            </div>

            {/* Agent team preview */}
            <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Agent Team That Will Build This</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '📋', name: 'Project Manager', phase: 'All phases' },
                  { emoji: '📊', name: 'Business Analyst', phase: 'Requirements' },
                  { emoji: '🏗️', name: 'Solution Architect', phase: 'Architecture' },
                  { emoji: '🎨', name: 'Frontend Developer', phase: 'Development' },
                  { emoji: '⚙️', name: 'Backend Developer', phase: 'Development' },
                  { emoji: '🧪', name: 'QA Engineer', phase: 'Testing' },
                  { emoji: '🚀', name: 'DevOps Engineer', phase: 'Deployment' },
                ].map(agent => (
                  <div key={agent.name} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{agent.emoji}</span>
                    <span className="text-zinc-300">{agent.name}</span>
                    <span className="text-zinc-600">- {agent.phase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step === 'review' ? (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {creating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Creating...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Create Project
              </>
            )}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
