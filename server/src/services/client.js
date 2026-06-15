'use strict';

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${path}`);
  return response.json();
}

async function getLatestRecommendations() {
  return apiFetch('/api/recommendations/latest');
}

async function getLatestReview() {
  return apiFetch('/api/reviews/latest');
}

async function getHistory(limit = 10) {
  return apiFetch(`/api/recommendations/history?limit=${limit}`);
}

async function triggerGenerate(key) {
  return apiFetch(`/api/tasks/generate?key=${encodeURIComponent(key)}`, { method: 'POST' });
}

async function triggerReview(key) {
  return apiFetch(`/api/tasks/review?key=${encodeURIComponent(key)}`, { method: 'POST' });
}

module.exports = { getLatestRecommendations, getLatestReview, getHistory, triggerGenerate, triggerReview };
