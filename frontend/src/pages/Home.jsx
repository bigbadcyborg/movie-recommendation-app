import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popular, setPopular] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const popularData = await api.movies.popular();
        setPopular(popularData);

        if (user) {
          try {
            const recs = await api.recommendations.get(8);
            setRecommendations(recs);
          } catch {
            // User may have no activity yet
          }
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/movies?search=${encodeURIComponent(search.trim())}`);
    }
  };

  if (loading) {
    return <div className="container"><div className="spinner" /></div>;
  }

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Discover Your Next Favorite Movie</h1>
          <p>
            Personalized recommendations powered by your ratings, favorites, and viewing preferences.
          </p>
          
          <form onSubmit={handleSearch} className="hero-search-form">
            <input
              type="text"
              placeholder="Search movies, directors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="hero-actions">
            <Link to="/movies" className="btn btn-ghost btn-lg">Browse All</Link>
            {!user && <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>}
          </div>
        </div>
      </section>

      {user && recommendations.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2>Recommended for You</h2>
              <p className="section-subtitle">Based on your ratings and preferences</p>
            </div>
            <div className="movie-grid">
              {recommendations.map(movie => (
                <MovieCard key={movie.id} movie={movie} showExplanation />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>{user ? 'Popular Movies' : 'Trending Now'}</h2>
            <Link to="/movies" className="section-link">View All →</Link>
          </div>
          <div className="movie-grid">
            {popular.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section className="section cta-section">
          <div className="container">
            <div className="cta-card">
              <h2>Join CineMatch Today</h2>
              <p>Rate movies, save favorites, and get personalized recommendations tailored just for you.</p>
              <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
