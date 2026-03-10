import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import MovieCard from '../components/MovieCard';

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [data, similar] = await Promise.all([
          api.movies.get(id),
          api.movies.similar(id)
        ]);
        setMovie(data);
        setSimilarMovies(similar);
      } catch (err) {
        console.error('Failed to load movie:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleRate = async (rating) => {
    if (!user) return;
    try {
      const data = await api.interactions.rate(movie.id, rating);
      setMovie(prev => ({
        ...prev,
        userRating: rating,
        avg_rating: data.avgRating
      }));
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  const handleFavorite = async () => {
    if (!user) return;
    try {
      const data = await api.interactions.toggleFavorite(movie.id);
      setMovie(prev => ({ ...prev, isFavorite: data.isFavorite }));
    } catch (err) {
      console.error('Favorite failed:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await api.interactions.comment(movie.id, commentText);
      setMovie(prev => ({
        ...prev,
        comments: [comment, ...prev.comments]
      }));
      setCommentText('');
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.interactions.deleteComment(commentId);
      setMovie(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
    } catch (err) {
      console.error('Delete comment failed:', err);
    }
  };

  if (loading) {
    return <div className="container"><div className="spinner" /></div>;
  }

  if (!movie) {
    return (
      <div className="container empty-state">
        <h2>Movie not found</h2>
        <Link to="/movies" className="btn btn-primary">Browse Movies</Link>
      </div>
    );
  }

  return (
    <div className="container movie-detail-page">
      <Link to="/movies" className="back-link">← Back to Movies</Link>

      <div className="movie-detail">
        <div className="movie-detail-poster">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} />
          ) : (
            <div className="poster-placeholder large">
              <span>🎬</span>
            </div>
          )}
        </div>

        <div className="movie-detail-info">
          <h1>{movie.title}</h1>

          <div className="movie-meta-row">
            {movie.release_year && <span className="meta-item">{movie.release_year}</span>}
            {movie.duration && <span className="meta-item">{movie.duration} min</span>}
            {movie.director && <span className="meta-item">Dir. {movie.director}</span>}
          </div>

          <div className="movie-genres">
            {movie.genres?.map(g => (
              <span key={g} className="genre-tag">{g}</span>
            ))}
          </div>

          <div className="rating-section">
            <div className="avg-rating">
              <span className="big-star">★</span>
              <span className="big-rating">{movie.avg_rating || 'N/A'}</span>
              <span className="rating-count">({movie.rating_count} ratings)</span>
            </div>
          </div>

          {movie.description && (
            <p className="movie-description">{movie.description}</p>
          )}

          {user && (
            <div className="user-actions">
              <div className="action-group">
                <label className="action-label">Your Rating</label>
                <StarRating
                  rating={movie.userRating || 0}
                  onRate={handleRate}
                  size="lg"
                />
              </div>
              <button
                className={`btn ${movie.isFavorite ? 'btn-favorite active' : 'btn-favorite'}`}
                onClick={handleFavorite}
              >
                {movie.isFavorite ? '♥ In Favorites' : '♡ Add to Favorites'}
              </button>
            </div>
          )}

          {!user && (
            <div className="auth-prompt">
              <Link to="/login">Sign in</Link> to rate, comment, and add favorites.
            </div>
          )}
        </div>
      </div>

      <section className="comments-section">
        <h2>Comments ({movie.comments?.length || 0})</h2>

        {user && (
          <form onSubmit={handleComment} className="comment-form">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Share your thoughts about this movie..."
              rows={3}
              className="comment-input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        )}

        <div className="comments-list">
          {movie.comments?.length === 0 ? (
            <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            movie.comments?.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-avatar">{comment.username[0].toUpperCase()}</span>
                  <span className="comment-author">{comment.username}</span>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                  {user && user.id === comment.user_id && (
                    <button
                      className="btn btn-ghost btn-sm delete-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="comment-text">{comment.comment_text}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {similarMovies.length > 0 && (
        <section className="similar-movies-section">
          <h2>Similar Movies</h2>
          <div className="similar-movies-grid">
            {similarMovies.map(m => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
