import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const FIRST_FILM_YEAR = 1888;

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
    genres: [],
    similar_movie_ids: []
  });
  const [allMovies, setAllMovies] = useState([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
      return;
    }
    api.movies.list({ limit: 200 }).then(data => setAllMovies(data.movies || [])).catch((err) => {
      console.error('Failed to load movies for similarity picker:', err);
    });
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

  const handleSimilarToggle = (movieId) => {
    setForm(prev => ({
      ...prev,
      similar_movie_ids: prev.similar_movie_ids.includes(movieId)
        ? prev.similar_movie_ids.filter(id => id !== movieId)
        : [...prev.similar_movie_ids, movieId]
    }));
  };

  const filteredMovies = allMovies.filter(m =>
    m.title.toLowerCase().includes(movieSearch.toLowerCase())
  );

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
        genres: form.genres,
        similar_movie_ids: form.similar_movie_ids
      });
      setSuccess(`"${movie.title}" was added successfully!`);
      setAllMovies(prev => [...prev, movie]);
      setForm({ title: '', director: '', release_year: '', duration: '', description: '', poster_url: '', genres: [], similar_movie_ids: [] });
      setMovieSearch('');
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
                min={FIRST_FILM_YEAR}                max={new Date().getFullYear() + 5}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {ALL_GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
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

          <div className="form-group">
            <label>Similar Movies</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.5rem' }}>
              Select movies that are similar to this one. They will appear in each other's "Similar Movies" section and feed the recommendation algorithm.
            </p>
            <input
              type="text"
              placeholder="Search movies..."
              value={movieSearch}
              onChange={e => setMovieSearch(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            />
            {form.similar_movie_ids.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                {form.similar_movie_ids.length} movie{form.similar_movie_ids.length !== 1 ? 's' : ''} selected
              </p>
            )}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
              {filteredMovies.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No movies found</p>
              ) : filteredMovies.map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={form.similar_movie_ids.includes(m.id)}
                    onChange={() => handleSimilarToggle(m.id)}
                  />
                  {m.title} {m.release_year ? `(${m.release_year})` : ''}
                </label>
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


