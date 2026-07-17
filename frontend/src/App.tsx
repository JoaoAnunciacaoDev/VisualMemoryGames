import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Library from './pages/Library/Library';
import TierList from './pages/TierList/TierList';
import TierListEditor from './pages/TierListEditor/TierListEditor';
import Profile from './pages/Profile/Profile';
import NotFound from './pages/NotFound/NotFound';
import Admin from './pages/Admin/Admin';
import ItchCallback from './pages/ItchCallback/ItchCallback';
import { ToastProvider } from './providers/ToastProvider';
import { AuthProvider } from './providers/AuthProvider';

function App() {
  return (
      <BrowserRouter>
        <ToastProvider position="top-center">
          <AuthProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/library" element={<Library />} />
                <Route path="/tierlists" element={<TierList />} />
                <Route path="/tierlists/:id" element={<TierListEditor />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings/integrations/itch/callback" element={<ItchCallback />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
  );
}

export default App;