'use client';

import { useState } from 'react';
import type { AIConfig, AIProvider } from '@/lib/ai-config';
import { PROVIDER_META } from '@/lib/ai-config';

interface Props {
  config:  AIConfig;
  onSave:  (config: AIConfig) => void;
  onClose: () => void;
}

export default function AISettingsPanel({ config, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AIConfig>(config);

  const set = <K extends keyof AIConfig>(key: K, val: AIConfig[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const needsKey  = draft.provider === 'groq' || draft.provider === 'openai';
  const isOllama  = draft.provider === 'ollama';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">AI Provider</h2>
            <p className="mt-0.5 text-xs text-stone-500">Choose how recipe generation is powered</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            ✕
          </button>
        </div>

        {/* Provider cards */}
        <div className="flex flex-col gap-2 px-6 py-4">
          {(Object.keys(PROVIDER_META) as AIProvider[]).map(p => {
            const { label, icon, desc } = PROVIDER_META[p];
            const active = draft.provider === p;
            return (
              <label
                key={p}
                className={[
                  'flex cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                  active
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p}
                  checked={active}
                  onChange={() => set('provider', p)}
                  className="sr-only"
                />
                <span className="text-xl leading-none">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${active ? 'text-emerald-800' : 'text-stone-800'}`}>
                    {label}
                  </p>
                  <p className={`truncate text-xs ${active ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {desc}
                  </p>
                </div>
                <span className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  active ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300',
                ].join(' ')}>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </label>
            );
          })}
        </div>

        {/* Contextual config fields */}
        {draft.provider !== 'server' && (
          <div className="flex flex-col gap-4 border-t border-stone-100 px-6 py-4">

            {/* API Key — BYOK providers */}
            {needsKey && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-600">
                  {draft.provider === 'groq' ? 'Groq' : 'OpenAI'} API Key
                </label>
                <input
                  type="password"
                  value={draft.apiKey}
                  onChange={e => set('apiKey', e.target.value)}
                  placeholder={draft.provider === 'groq' ? 'gsk_...' : 'sk-...'}
                  autoComplete="off"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 font-mono text-sm text-stone-900 placeholder:text-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="mt-1.5 text-xs text-stone-400">
                  Saved to your browser&apos;s localStorage · forwarded to this app&apos;s server only for AI calls · never logged or persisted server-side.
                </p>
              </div>
            )}

            {/* Model — Groq BYOK */}
            {draft.provider === 'groq' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-600">Model</label>
                <select
                  value={draft.groqModel}
                  onChange={e => set('groqModel', e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (recommended)</option>
                  <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                  <option value="gemma2-9b-it">gemma2-9b-it</option>
                </select>
              </div>
            )}

            {/* Model — OpenAI BYOK */}
            {draft.provider === 'openai' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-600">Model</label>
                <select
                  value={draft.openaiModel}
                  onChange={e => set('openaiModel', e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini — fast &amp; affordable</option>
                  <option value="gpt-4o">gpt-4o — most capable</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo — legacy</option>
                </select>
              </div>
            )}

            {/* Ollama config */}
            {isOllama && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-600">Ollama Endpoint</label>
                  <input
                    type="url"
                    value={draft.ollamaEndpoint}
                    onChange={e => set('ollamaEndpoint', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2.5 font-mono text-sm text-stone-900 placeholder:text-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-600">Model</label>
                  <input
                    type="text"
                    value={draft.ollamaModel}
                    onChange={e => set('ollamaModel', e.target.value)}
                    placeholder="llama3.2"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2.5 font-mono text-sm text-stone-900 placeholder:text-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <p className="mt-1.5 text-xs text-stone-400">
                    Download a model first:{' '}
                    <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">ollama pull llama3.2</code>
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700">CORS required for local inference</p>
                  <p className="mt-0.5 text-xs text-amber-600">
                    Start Ollama with:{' '}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                      OLLAMA_ORIGINS=* ollama serve
                    </code>
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
