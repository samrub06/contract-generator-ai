import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LongContractPage from './pages/LongContractPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LongContractPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
