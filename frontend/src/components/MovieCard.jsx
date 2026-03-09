import { Link } from 'react-router-dom';

export default function MovieCard({ movie, showExplanation }) {
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="movie-card-poster">
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} loading="lazy" />
        ) : (
          <div className="poster-placeholder">
            <span>🎬</span>
          </div>
        )}
        {movie.avg_rating && (
          <div className="movie-card-rating">
            <span className="star">★</span> {movie.avg_rating}
          </div>
        )}
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.title}</h3>
        <p className="movie-card-meta">
          {movie.release_year} {movie.director && `· ${movie.director}`}
        </p>
        <div className="movie-card-genres">
          {movie.genres?.slice(0, 3).map(g => (
            <span key={g} className="genre-tag">{g}</span>
          ))}
        </div>
        {showExplanation && movie.explanation && (
          <p className="movie-card-explanation">{movie.explanation}</p>
        )}
      </div>
    </Link>
  );
}
