import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALL_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

export default function AddMovie() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    director: '',
    release_year: '',
    duration: '',
    description: '',
    poster_url: '',
    genres: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGenreToggle = (genre) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    try {
      const movie = await api.movies.create({
        title: form.title.trim(),
        director: form.director.trim() || undefined,
        release_year: form.release_year ? parseInt(form.release_year) : undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
        description: form.description.trim() || undefined,
        poster_url: form.poster_url.trim() || undefined,
        genres: form.genres
      });
      setSuccess(`"${movie.title}" was added successfully!`);
      setForm({ title: '', director: '', release_year: '', duration: '', description: '', poster_url: '', genres: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.isAdmin) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Add New Movie</h1>
        <p className="page-subtitle">Add a movie to the catalogue so it can appear in recommendations</p>
      </div>

      <div className="auth-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. The Shawshank Redemption"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="director">Director</label>
            <input
              id="director"
              name="director"
              type="text"
              value={form.director}
              onChange={handleChange}
              placeholder="e.g. Frank Darabont"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="release_year">Release Year</label>
              <input
                id="release_year"
                name="release_year"
                type="number"
                value={form.release_year}
                onChange={handleChange}
                placeholder="e.g. 1994"
                min="1888"
                max={new Date().getFullYear() + 5}
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <input
                id="duration"
                name="duration"
                type="number"
                value={form.duration}
                onChange={handleChange}
                placeholder="e.g. 142"
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Brief plot summary..."
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="poster_url">Poster URL</label>
            <input
              id="poster_url"
              name="poster_url"
              type="url"
              value={form.poster_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>Genres</label>
            <div className="genre-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {ALL_GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
                  className={`genre-tag${form.genres.includes(genre) ? ' active' : ''}`}
                  onClick={() => handleGenreToggle(genre)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: form.genres.includes(genre) ? 'var(--primary)' : 'transparent',
                    color: form.genres.includes(genre) ? '#fff' : 'inherit',
                    fontSize: '0.875rem'
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Adding movie...' : 'Add Movie'}
          </button>
        </form>
      </div>
    </div>
  );
}
