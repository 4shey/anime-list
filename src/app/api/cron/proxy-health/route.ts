import { getHomeHtml } from '@/lib/sokuja/client';

const WORKER_URL = process.env.SCRAPER_WORKER_URL!;
const API_KEY = process.env.PROXY_API_KEY!;

async function testProxy(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'X-API-Key': API_KEY } });
    return { url, ok: res.ok, latency: Date.now() - start };
  } catch {
    return { url, ok: false, latency: Date.now() - start };
  }
}

export async function GET() {
  const testUrls = [
    `${WORKER_URL}/health`,
    `${WORKER_URL}/proxy/stream/https://storages.sokuja.uk/test.mp4`,
  ];
  
  const results = await Promise.all(testUrls.map(testProxy));
  
  return Response.json({ proxies: results, timestamp: Date.now() });
}