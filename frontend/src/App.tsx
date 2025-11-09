import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfile } from './hooks/useApi';
import OnboardingWizard from './components/OnboardingWizard';
import Feed from './components/Feed';
import WhatWeLearned from './components/WhatWeLearned';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Layout() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={profile ? '/feed' : '/onboarding'} replace />}
      />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route
        path="/feed"
        element={
          profile ? (
            <div>
              <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">CareerScout</h1>
                    <a
                      href="/insights"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      What We Learned →
                    </a>
                  </div>
                </div>
              </nav>
              <Feed />
            </div>
          ) : (
            <Navigate to="/onboarding" replace />
          )
        }
      />
      <Route
        path="/insights"
        element={
          profile ? (
            <div className="min-h-screen bg-gray-50 py-8">
              <div className="max-w-4xl mx-auto px-4">
                <WhatWeLearned />
              </div>
            </div>
          ) : (
            <Navigate to="/onboarding" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
