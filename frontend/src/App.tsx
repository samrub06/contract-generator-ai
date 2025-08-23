import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RealTimeStreamingPage from './pages/RealTimeStreamingPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<RealTimeStreamingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
