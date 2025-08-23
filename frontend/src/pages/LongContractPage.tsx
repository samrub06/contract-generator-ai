/**
 * Long Contract Page
 * Main page for 10+ page contract generation with intelligent chunking
 */

import React from 'react';
import LongContractGenerator from '../components/LongContractGenerator';

const LongContractPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <LongContractGenerator />
    </div>
  );
};

export default LongContractPage;