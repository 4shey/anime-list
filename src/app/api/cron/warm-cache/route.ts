import { getHomeHtml, getOngoingHtml, getCompletedHtml, getScheduleHtml } from '@/lib/sokuja/client';

const WORKER_URL = process.env.SCRAPER_WORKER_URL!;
const API_KEY = process.env.PROXY_API_KEY!;

export async function GET() {
  const endpoints = [
    '/',
    '/anime/?status=ongoing&order=update&page=1',
    '/anime/?status=completed&order=update&page=1',
    '/jadwal-rilis-anime/',
  ];
  
  const results = await Promise.allSettled(
    endpoints.map(path => fetch(`${WORKER_URL}/proxy/html/${encodeURIComponent(path)}`, { 
      headers: { 'X-API-Key': API_KEY } 
    }))
  );
  
  return Response.json({ 
    warmed: results.filter(r => r.status === 'fulfilled').length,
    total: endpoints.length,
    timestamp: Date.now()
  });
}