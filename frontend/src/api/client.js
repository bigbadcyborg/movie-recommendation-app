const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  },
  movies: {
    list: (params) => request(`/movies?${new URLSearchParams(params)}`),
    get: (id) => request(`/movies/${id}`),
    genres: () => request('/movies/genres'),
    popular: () => request('/movies/popular'),
    create: (data) => request('/movies', { method: 'POST', body: JSON.stringify(data) }),
  },
  interactions: {
    rate: (movieId, rating) => request('/interactions/rate', { method: 'POST', body: JSON.stringify({ movieId, rating }) }),
    toggleFavorite: (movieId) => request('/interactions/favorite', { method: 'POST', body: JSON.stringify({ movieId }) }),
    comment: (movieId, text) => request('/interactions/comment', { method: 'POST', body: JSON.stringify({ movieId, text }) }),
    deleteComment: (id) => request(`/interactions/comment/${id}`, { method: 'DELETE' }),
    favorites: () => request('/interactions/favorites'),
    ratings: () => request('/interactions/ratings'),
  },
  recommendations: {
    get: (limit) => request(`/recommendations?limit=${limit || 10}`),
  },
};
