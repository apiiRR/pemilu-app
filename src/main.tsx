import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';


// Import test utilities to make them available globally (development only)
if (import.meta.env.DEV) {
  import('./utils/testVotingProcess').then(({ runVotingTest }) => {
    if (typeof window !== 'undefined') {
      (window as any).runVotingTest = runVotingTest;
      console.log('Voting test function available as: runVotingTest()');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
