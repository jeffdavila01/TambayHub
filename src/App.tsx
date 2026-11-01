import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import MediaDashboard from './pages/MediaDashboard'
import Explore from './pages/Explore'
import Friends from './pages/Friends'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import MyTambayan from './pages/MyTambayan'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Forgot from './pages/auth/Forgot'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoomDetail from './pages/room/RoomDetail'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public - no login needed */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<Forgot />} />

            {/* Protected - need login */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/my-tambayan" element={<MyTambayan />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/media" element={<MediaDashboard />} />
              {/* ITO YUNG KULANG MO - ROOM DETAIL */}
              <Route path="/room/:id" element={<RoomDetail />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}