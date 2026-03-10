import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AddMovie from './pages/AddMovie';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading CineMatch...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/add-movie" element={<AddMovie />} />
        </Routes>
      </main>
    </div>
  );
}
