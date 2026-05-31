const DEFAULT_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function post(path, body, baseUrl = DEFAULT_BASE) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg;
    try {
      const err = await res.json();
      msg = err.detail || res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return res.json();
}

export const scoutAsk = (body, baseUrl) => post('/api/scout/ask', body, baseUrl);
export const scoutSendToSim = (body, baseUrl) => post('/api/scout/send-to-sim', body, baseUrl);
export const analyzeVideo = (body) => post('/api/video/analyze', body);
export const simStart = (body) => post('/api/simulator/start', body);
export const simAction = (body) => post('/api/simulator/action', body);
export const simContinue = (body) => post('/api/simulator/continue', body);

// File upload — sends multipart/form-data to /api/video/analyze/upload
export async function analyzeVideoUpload({ file, message, timestamp, history }) {
  const form = new FormData();
  form.append('video_file', file);
  if (message) form.append('message', message);
  if (timestamp) form.append('timestamp', timestamp);
  if (history?.length) form.append('history', JSON.stringify(history));

  const res = await fetch(`${DEFAULT_BASE}/api/video/analyze/upload`, {
    method: 'POST',
    body: form, // no Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    let msg;
    try {
      const err = await res.json();
      msg = err.detail || res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return res.json();
}
