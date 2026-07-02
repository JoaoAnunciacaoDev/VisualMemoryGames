import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Library from './pages/Library/Library';
import TierList from './pages/TierList/TierList';
import TierListEditor from './pages/TierListEditor/TierListEditor';
import NotFound from './pages/NotFound/NotFound';
import { ToastProvider } from './providers/ToastProvider';

function App() {
  return (
      <BrowserRouter>
        <Layout>
          <ToastProvider position="top-center">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/library" element={<Library />} />
              <Route path="/tierlists" element={<TierList />} />
              <Route path="/tierlists/:id" element={<TierListEditor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </Layout>
      </BrowserRouter>
  );
}

export default App;