import { env } from './env.js';

type SendResult = {
  ok: boolean;
  keyId?: string;
  remoteJid?: string;
};

const isConfigured = () =>
  Boolean(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY && env.EVOLUTION_INSTANCE_NAME);

const buildUrl = (path: string) => {
  const base = env.EVOLUTION_API_URL!.replace(/\/$/, '');
  return `${base}${path}`;
};

const headers = () => ({
  'Content-Type': 'application/json; charset=utf-8',
  apikey: env.EVOLUTION_API_KEY!,
});

const sendText = async (to: string, text: string): Promise<SendResult> => {
  if (!isConfigured()) {
    console.warn('[evolution-api] not configured, skipping message');
    return { ok: false };
  }
  try {
    const res = await fetch(
      buildUrl(`/message/sendText/${encodeURIComponent(env.EVOLUTION_INSTANCE_NAME!)}`),
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ number: to, text }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error('[evolution-api] send failed', res.status, body);
      return { ok: false };
    }
    const data = (await res.json()) as { key?: { id?: string; remoteJid?: string } };
    return { ok: true, keyId: data.key?.id, remoteJid: data.key?.remoteJid };
  } catch (err) {
    console.error('[evolution-api] send error', err);
    return { ok: false };
  }
};

const updateText = async (
  remoteJid: string,
  keyId: string,
  text: string
): Promise<boolean> => {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(
      buildUrl(`/chat/updateMessage/${encodeURIComponent(env.EVOLUTION_INSTANCE_NAME!)}`),
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          number: remoteJid,
          key: { id: keyId, remoteJid, fromMe: true },
          text,
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error('[evolution-api] update failed', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[evolution-api] update error', err);
    return false;
  }
};

export const evolutionApi = {
  sendToGroup: (text: string): Promise<SendResult> => {
    if (!env.EVOLUTION_GROUP_JID) {
      console.warn('[evolution-api] EVOLUTION_GROUP_JID not set');
      return Promise.resolve({ ok: false });
    }
    return sendText(env.EVOLUTION_GROUP_JID, text);
  },
  updateGroupMessage: (keyId: string, text: string): Promise<boolean> => {
    if (!env.EVOLUTION_GROUP_JID) return Promise.resolve(false);
    return updateText(env.EVOLUTION_GROUP_JID, keyId, text);
  },
};
