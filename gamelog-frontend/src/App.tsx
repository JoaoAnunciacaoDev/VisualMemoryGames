import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Library from './pages/Library/Library';
import TierList from './pages/TierList/TierList';
import TierListEditor from './pages/TierListEditor/TierListEditor';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/tierlists" element={<TierList />} />
          <Route path="/tierlists/:id" element={<TierListEditor />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;