import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [allGenres, setAllGenres] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingGenres, setEditingGenres] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    async function load() {
      try {
        const [profileData, genresData] = await Promise.all([
          api.auth.me(),
          api.movies.genres()
        ]);
        setProfile(profileData);
        setAllGenres(genresData);
        setSelectedGenres(profileData.preferredGenres || []);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'favorites') {
      api.interactions.favorites().then(setFavorites).catch(console.error);
    } else if (tab === 'ratings') {
      api.interactions.ratings().then(setRatings).catch(console.error);
    }
  }, [tab, user]);

  const handleGenreToggle = (genreName) => {
    setSelectedGenres(prev =>
      prev.includes(genreName)
        ? prev.filter(g => g !== genreName)
        : [...prev, genreName]
    );
  };

  const saveGenres = async () => {
    try {
      const updated = await api.auth.updateProfile({ preferredGenres: selectedGenres });
      updateUser(updated);
      setProfile(prev => ({ ...prev, preferredGenres: selectedGenres }));
      setEditingGenres(false);
    } catch (err) {
      console.error('Failed to update genres:', err);
    }
  };

  if (loading) {
    return <div className="container"><div className="spinner" /></div>;
  }

  if (!profile) return null;

  return (
    <div className="container profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{profile.username[0].toUpperCase()}</div>
        <div className="profile-info">
          <h1>{profile.username}</h1>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-joined">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <span className="stat-number">{profile.stats.favorites}</span>
          <span className="stat-label">Favorites</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{profile.stats.ratings}</span>
          <span className="stat-label">Ratings</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{profile.stats.comments}</span>
          <span className="stat-label">Comments</span>
        </div>
      </div>

      <div className="profile-genres">
        <div className="section-header">
          <h2>Preferred Genres</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => editingGenres ? saveGenres() : setEditingGenres(true)}
          >
            {editingGenres ? 'Save' : 'Edit'}
          </button>
        </div>
        <div className="genre-selector">
          {editingGenres ? (
            allGenres.map(g => (
              <button
                key={g.id}
                className={`genre-tag selectable ${selectedGenres.includes(g.name) ? 'selected' : ''}`}
                onClick={() => handleGenreToggle(g.name)}
              >
                {g.name}
              </button>
            ))
          ) : (
            profile.preferredGenres?.length > 0
              ? profile.preferredGenres.map(g => <span key={g} className="genre-tag">{g}</span>)
              : <p className="text-muted">No preferred genres set. Click Edit to add some!</p>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`}
          onClick={() => setTab('favorites')}
        >
          Favorites
        </button>
        <button
          className={`tab-btn ${tab === 'ratings' ? 'active' : ''}`}
          onClick={() => setTab('ratings')}
        >
          My Ratings
        </button>
      </div>

      <div className="tab-content">
        {tab === 'favorites' && (
          favorites.length === 0 ? (
            <div className="empty-state">
              <p>You haven't added any favorites yet.</p>
              <Link to="/movies" className="btn btn-primary">Browse Movies</Link>
            </div>
          ) : (
            <div className="movie-grid">
              {favorites.map(movie => <MovieCard key={movie.id} movie={movie} />)}
            </div>
          )
        )}

        {tab === 'ratings' && (
          ratings.length === 0 ? (
            <div className="empty-state">
              <p>You haven't rated any movies yet.</p>
              <Link to="/movies" className="btn btn-primary">Browse Movies</Link>
            </div>
          ) : (
            <div className="movie-grid">
              {ratings.map(movie => (
                <div key={movie.id} className="rated-movie-wrapper">
                  <MovieCard movie={movie} />
                  <div className="user-rating-badge">
                    ★ {movie.rating}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
