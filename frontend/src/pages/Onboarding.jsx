import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';

const MAX_GENRES = 10;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState([]);
  const [movies, setMovies] = useState([]);
  const [ratings, setRatings] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.movies
      .genres()
      .then((list) => {
        if (!cancelled) setGenres(list);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load genres');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleGenre = (name) => {
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((g) => g !== name);
      }
      if (prev.length >= MAX_GENRES) return prev;
      return [...prev, name];
    });
  };

  const handleGenresNext = async () => {
    setError('');
    if (selected.length === 0) {
      setError('Pick at least one genre');
      return;
    }
    setLoading(true);
    try {
      const { movies: list } = await api.onboarding.starterMovies(selected);
      setMovies(list);
      setRatings({});
      setStep(2);
    } catch (e) {
      setError(e.message || 'Could not load starter movies');
    } finally {
      setLoading(false);
    }
  };

  const setMovieRating = (movieId, value) => {
    setRatings((prev) => ({ ...prev, [movieId]: value }));
  };

  const allRated =
    movies.length > 0 && movies.every((m) => ratings[m.id] >= 1 && ratings[m.id] <= 5);

  const handleFinish = async () => {
    setError('');
    if (!allRated) {
      setError('Rate all 5 movies before continuing');
      return;
    }
    setLoading(true);
    try {
      const ratingPayload = movies.map((m) => ({
        movieId: m.id,
        rating: ratings[m.id],
      }));
      const { user: next } = await api.onboarding.complete({
        preferredGenres: selected,
        ratings: ratingPayload,
      });
      updateUser({
        ...next,
        stats: user?.stats,
      });
      navigate('/');
    } catch (e) {
      setError(e.message || 'Could not save your preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <p className="onboarding-kicker">Cold-start setup</p>
        <h1>Tune CineMatch to your taste</h1>
        <p className="onboarding-lead">
          {step === 1
            ? 'Choose genres you enjoy—we use them to pick five starter films to rate.'
            : 'Rate each film so recommendations can learn what you like.'}
        </p>

        <div className="onboarding-steps" aria-hidden>
          <span className={step === 1 ? 'active' : 'done'}>1. Genres</span>
          <span className="step-sep">→</span>
          <span className={step === 2 ? 'active' : ''}>2. Rate 5 films</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <>
            <p className="onboarding-hint">
              Select 1–{MAX_GENRES} genres ({selected.length} selected)
            </p>
            <div className="genre-pills">
              {genres.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`genre-pill ${selected.includes(g.name) ? 'selected' : ''}`}
                  onClick={() => toggleGenre(g.name)}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleGenresNext}
              disabled={loading || selected.length === 0}
            >
              {loading ? 'Loading picks…' : 'Next: rate 5 films'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onboarding-movies">
              {movies.map((m) => (
                <div key={m.id} className="onboarding-movie">
                  <div className="onboarding-movie-poster">
                    {m.poster_url ? (
                      <img src={m.poster_url} alt="" />
                    ) : (
                      <div className="poster-placeholder">No poster</div>
                    )}
                  </div>
                  <div className="onboarding-movie-body">
                    <h3>{m.title}</h3>
                    <p className="onboarding-movie-meta">
                      {m.release_year ? `${m.release_year}` : ''}
                      {m.genres?.length ? ` · ${m.genres.join(', ')}` : ''}
                    </p>
                    <StarRating
                      rating={ratings[m.id] || 0}
                      onRate={(v) => setMovieRating(m.id, v)}
                      size="md"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="onboarding-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinish}
                disabled={loading || !allRated}
              >
                {loading ? 'Saving…' : 'Finish & start exploring'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
