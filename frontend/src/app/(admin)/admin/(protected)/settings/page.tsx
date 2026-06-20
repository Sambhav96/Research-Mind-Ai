"use client";

import { useState, useEffect } from "react";
import { GlowCard } from "@/components/effects/glow-card";
import { Settings, Cpu, Shield, Zap, Save, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";

const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      enabled ? 'bg-indigo-600' : 'bg-muted-foreground/30'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // AI Provider Settings
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [temperature, setTemperature] = useState("0.7");

  // Rate Limits
  const [aiRateLimit, setAiRateLimit] = useState("100");
  const [uploadRateLimit, setUploadRateLimit] = useState("50");
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState("25");

  // Feature Flags
  const [features, setFeatures] = useState({
    flashcards: true,
    quizzes: true,
    aiChat: true,
    notes: true,
    analytics: true,
    sharing: false,
    publicSignup: true,
  });

  // Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "We are currently performing scheduled maintenance. We'll be back shortly."
  );

  useEffect(() => {
    setMounted(true);
    const savedSettings = localStorage.getItem('admin_mock_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.aiProvider) setAiProvider(parsed.aiProvider);
        if (parsed.aiModel) setAiModel(parsed.aiModel);
        if (parsed.maxTokens) setMaxTokens(parsed.maxTokens);
        if (parsed.temperature) setTemperature(parsed.temperature);
        if (parsed.aiRateLimit) setAiRateLimit(parsed.aiRateLimit);
        if (parsed.uploadRateLimit) setUploadRateLimit(parsed.uploadRateLimit);
        if (parsed.maxUploadSizeMb) setMaxUploadSizeMb(parsed.maxUploadSizeMb);
        if (parsed.features) setFeatures(parsed.features);
        if (parsed.maintenanceMode !== undefined) setMaintenanceMode(parsed.maintenanceMode);
        if (parsed.maintenanceMessage) setMaintenanceMessage(parsed.maintenanceMessage);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const settingsToSave = {
      aiProvider,
      aiModel,
      maxTokens,
      temperature,
      aiRateLimit,
      uploadRateLimit,
      maxUploadSizeMb,
      features,
      maintenanceMode,
      maintenanceMessage
    };
    localStorage.setItem('admin_mock_settings', JSON.stringify(settingsToSave));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
          <p className="text-muted-foreground">Configure AI providers, rate limits, feature flags, and system options.</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* AI Provider Configuration */}
      <GlowCard className="p-6 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" /> AI Provider Configuration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">AI Provider</label>
            <select
              value={aiProvider}
              onChange={e => setAiProvider(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Default Model</label>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            >
              {aiProvider === "openai" && (
                <>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
              {aiProvider === "anthropic" && (
                <>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </>
              )}
              {aiProvider === "google" && (
                <>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Max Tokens Per Request</label>
            <input
              type="number"
              value={maxTokens}
              onChange={e => setMaxTokens(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Temperature ({temperature})</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground/80">
              <span>Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Rate Limits */}
      <GlowCard className="p-6 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> Rate Limits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">AI Requests / User / Day</label>
            <input
              type="number"
              value={aiRateLimit}
              onChange={e => setAiRateLimit(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Uploads / User / Day</label>
            <input
              type="number"
              value={uploadRateLimit}
              onChange={e => setUploadRateLimit(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Max Upload Size (MB)</label>
            <input
              type="number"
              value={maxUploadSizeMb}
              onChange={e => setMaxUploadSizeMb(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </GlowCard>

      {/* Feature Flags */}
      <GlowCard className="p-6 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Feature Flags
        </h2>
        <div className="divide-y divide-border/50">
          {([
            { key: 'flashcards', label: 'Flashcard Generation', desc: 'Allow users to generate AI-powered flashcards from documents' },
            { key: 'quizzes', label: 'Quiz Generation', desc: 'Allow users to generate and take quizzes' },
            { key: 'aiChat', label: 'AI Chat', desc: 'Enable AI-powered chat sessions on documents' },
            { key: 'notes', label: 'Notes', desc: 'Allow users to create and manage study notes' },
            { key: 'analytics', label: 'User Analytics', desc: 'Show users their personal usage analytics dashboard' },
            { key: 'sharing', label: 'Content Sharing', desc: 'Allow users to share documents and content publicly' },
            { key: 'publicSignup', label: 'Public Signup', desc: 'Allow new users to register without an invite code' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Toggle enabled={features[key]} onToggle={() => toggleFeature(key)} />
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Maintenance Mode */}
      <GlowCard className={`p-6 space-y-6 border ${
        maintenanceMode ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/50'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${maintenanceMode ? 'text-amber-400' : 'text-muted-foreground'}`} />
            Maintenance Mode
          </h2>
          <Toggle enabled={maintenanceMode} onToggle={() => setMaintenanceMode(prev => !prev)} />
        </div>
        {maintenanceMode && (
          <div className="space-y-3">
            <p className="text-sm text-amber-400 font-medium">⚠ Maintenance mode is ACTIVE — users will see the message below instead of the app.</p>
            <label className="text-sm font-medium text-muted-foreground block">Maintenance Message</label>
            <textarea
              value={maintenanceMessage}
              onChange={e => setMaintenanceMessage(e.target.value)}
              rows={3}
              className="w-full bg-background border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        )}
      </GlowCard>
    </div>
  );
}
