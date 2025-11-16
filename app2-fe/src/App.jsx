import * as React from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate, 
} from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Profile from "./pages/Profile"
import PublicProfile from "./pages/PublicProfile"
import HomePage from "./pages/Home"
import Thread from "./pages/Thread" 
import CreateThread from "./pages/CreateThread" 
import { Button } from "./components/ui/button"
import { toast } from "sonner" 

// --- Auth Utilities ---

// 1. Hook kustom untuk menangani Force Logout (Central Logic)
export function useAuthLogout() {
  const navigate = useNavigate();

  const forceLogout = React.useCallback((message = "Sesi Anda telah berakhir.") => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userProfile");
    toast.error("Sesi Habis", { description: message });
    navigate("/login", { replace: true }); 
  }, [navigate]);

  return { forceLogout };
}

// Wrapper untuk injeksi props navigasi dan handler sukses
const useAuth = () => {
  const navigate = useNavigate()
  const { forceLogout } = useAuthLogout(); 

  const handleLoginSuccess = (data) => {
    console.log("User logged in successfully:", data)
    navigate("/profile") 
  }

  const handleRegisterSuccess = () => {
    navigate("/login", { 
      state: { registrationSuccess: true } 
    })
  }

  return {
    onLoginSuccess: handleLoginSuccess,
    onRegisterSuccess: handleRegisterSuccess,
    onLoginClick: () => navigate("/login"),
    onRegisterClick: () => navigate("/register"),
    forceLogout: forceLogout
  }
}

function AuthRouteWrapper({ element }) {
  const authProps = useAuth()
  return React.cloneElement(element, authProps)
}

// Komponen pelindung untuk route yang memerlukan token
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("authToken");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  const { forceLogout } = useAuthLogout();
  return React.cloneElement(children, { forceLogout });
}

// --- App Component ---

function App() {
  return (
    <Router>
      <div className="min-h-svh bg-background">
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthRouteWrapper element={<Login />} />} />
          <Route path="/register" element={<AuthRouteWrapper element={<Register />} />} />
          <Route path="/users/:username" element={<PublicProfile />} /> 
          
          <Route
            path="/thread/:id"
            element={
              <Thread />
            }
          />
          
          {/* Protected Route */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/create-thread" 
            element={
              <ProtectedRoute>
                <CreateThread />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">404 - Not Found</h1>
      <p className="mt-2">The page you are looking for does not exist.</p>
      <Button className="mt-4" onClick={() => window.location.href = "/"}>
        Go Home
      </Button>
    </div>
  )
}

export default App