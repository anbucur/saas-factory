import { Hono } from 'hono';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { CodingProviderType, CodingProviderConfig } from '../agents/coding-agent.js';
import {
  setActiveProvider,
  setProviderConfig,
  getActiveProvider,
  getProviderConfig,
  getAllProviderConfigs,
  detectAvailableProviders,
  getProviderInfoList,
} from '../agents/coding-agent.js';
import { setRuntimeApiKey } from '../agents/llm.js';

export const settingsRoutes = new Hono();

const DEFAULT_SETTINGS_ID = 'default';

async function getOrCreateSettings() {
  let existing = await db.select().from(settings).where(eq(settings.id, DEFAULT_SETTINGS_ID)).get();
  
  if (!existing) {
    const now = new Date();
    await db.insert(settings).values({
      id: DEFAULT_SETTINGS_ID,
      activeCodingProvider: 'opencode',
      minimaxApiKey: null,
      providerConfigs: '{}',
      soundEnabled: true,
      animationsEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
    existing = (await db.select().from(settings).where(eq(settings.id, DEFAULT_SETTINGS_ID)).get())!;
  }
  
  return existing;
}

settingsRoutes.get('/', async (c) => {
  const dbSettings = await getOrCreateSettings();
  const availableProviders = detectAvailableProviders();
  const providerInfo = getProviderInfoList();
  
  setActiveProvider(dbSettings.activeCodingProvider as CodingProviderType);
  
  let providerConfigs: Record<string, CodingProviderConfig> = {};
  try {
    providerConfigs = JSON.parse(dbSettings.providerConfigs || '{}');
    Object.entries(providerConfigs).forEach(([provider, config]) => {
      setProviderConfig(provider as CodingProviderType, config as CodingProviderConfig);
    });
  } catch {}
  
  return c.json({
    settings: {
      activeCodingProvider: dbSettings.activeCodingProvider,
      minimaxApiKeySet: !!dbSettings.minimaxApiKey,
      soundEnabled: dbSettings.soundEnabled,
      animationsEnabled: dbSettings.animationsEnabled,
    },
    providers: {
      available: availableProviders,
      info: providerInfo,
      configs: providerConfigs,
    },
  });
});

settingsRoutes.patch('/', async (c) => {
  const body = await c.req.json();
  const now = new Date();
  
  const updates: Record<string, unknown> = { updatedAt: now };
  
  if (body.activeCodingProvider) {
    updates.activeCodingProvider = body.activeCodingProvider;
    setActiveProvider(body.activeCodingProvider as CodingProviderType);
  }
  
  if (typeof body.minimaxApiKey !== 'undefined') {
    updates.minimaxApiKey = body.minimaxApiKey || null;
    if (body.minimaxApiKey) {
      setRuntimeApiKey(body.minimaxApiKey);
    }
  }
  
  if (typeof body.soundEnabled !== 'undefined') {
    updates.soundEnabled = body.soundEnabled;
  }
  
  if (typeof body.animationsEnabled !== 'undefined') {
    updates.animationsEnabled = body.animationsEnabled;
  }
  
  await db.update(settings)
    .set(updates)
    .where(eq(settings.id, DEFAULT_SETTINGS_ID));
  
  return c.json({ ok: true });
});

settingsRoutes.patch('/provider/:type', async (c) => {
  const providerType = c.req.param('type') as CodingProviderType;
  const body = await c.req.json();
  
  const dbSettings = await getOrCreateSettings();
  let providerConfigs: Record<string, CodingProviderConfig> = {};
  try {
    providerConfigs = JSON.parse(dbSettings.providerConfigs || '{}');
  } catch {}
  
  providerConfigs[providerType] = {
    enabled: body.enabled ?? true,
    customPath: body.customPath,
    additionalArgs: body.additionalArgs,
  };
  
  setProviderConfig(providerType, providerConfigs[providerType]);
  
  const now = new Date();
  await db.update(settings)
    .set({
      providerConfigs: JSON.stringify(providerConfigs),
      updatedAt: now,
    })
    .where(eq(settings.id, DEFAULT_SETTINGS_ID));
  
  const availableProviders = detectAvailableProviders();
  const provider = availableProviders.find(p => p.provider === providerType);
  
  return c.json({
    ok: true,
    provider: providerType,
    config: providerConfigs[providerType],
    detected: provider?.available ?? false,
    path: provider?.path,
  });
});

settingsRoutes.post('/detect', async (c) => {
  const availableProviders = detectAvailableProviders();
  return c.json({ providers: availableProviders });
});

settingsRoutes.post('/api-key', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (body.apiKey) {
    setRuntimeApiKey(body.apiKey);
    
    const now = new Date();
    await db.update(settings)
      .set({
        minimaxApiKey: body.apiKey,
        updatedAt: now,
      })
      .where(eq(settings.id, DEFAULT_SETTINGS_ID));
    
    return c.json({ ok: true, message: 'API key saved' });
  }
  return c.json({ ok: false, error: 'No API key provided' }, 400);
});
