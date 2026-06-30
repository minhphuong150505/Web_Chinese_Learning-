import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { LanguageProvider } from './i18n/LanguageProvider';
import { TargetLanguageProvider } from './i18n/TargetLanguageProvider';
import { queryClient } from './lib/queryClient';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TargetLanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </TargetLanguageProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
