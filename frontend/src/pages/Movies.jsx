import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import MovieCard from '../components/MovieCard';

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const currentGenre = searchParams.get('genre') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    api.movies.genres().then(setGenres).catch(console.error);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = { page: currentPage, limit: 12 };
        if (searchParams.get('search')) params.search = searchParams.get('search');
        if (currentGenre) params.genre = currentGenre;
        if (currentSort) params.sort = currentSort;

        const data = await api.movies.list(params);
        setMovies(data.movies);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Failed to load movies:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams]);

  const updateParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    if (updates.page === undefined) params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ search: search || null });
  };

  return (
    <div className="container movies-page">
      <h1>Browse Movies</h1>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div className="filter-controls">
          <select
            value={currentGenre}
            onChange={e => updateParams({ genre: e.target.value || null })}
            className="filter-select"
          >
            <option value="">All Genres</option>
            {genres.map(g => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <select
            value={currentSort}
            onChange={e => updateParams({ sort: e.target.value || null })}
            className="filter-select"
          >
            <option value="">Newest First</option>
            <option value="year_asc">Oldest First</option>
            <option value="title">Title A-Z</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : movies.length === 0 ? (
        <div className="empty-state">
          <p>No movies found matching your criteria.</p>
          <button onClick={() => setSearchParams({})} className="btn btn-ghost">Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="movie-grid">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ page: currentPage - 1 })}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={currentPage >= pagination.pages}
                onClick={() => updateParams({ page: currentPage + 1 })}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
