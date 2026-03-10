import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchScreenedStocks(endpoint, filters, period = 'annual') {
  const res = await fetch(`${API_BASE}${endpoint}?period=${period}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
}

export async function fetchAllStocks(period = 'annual') {
  const res = await fetch(`${API_BASE}/api/stocks/all?period=${period}`);
  if (!res.ok) throw new Error('API Error');
  return res.json();
}