import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInsights, useResetMemory } from '../hooks/useApi';
import { useAppStore } from '../hooks/useAppStore';

export default function WhatWeLearned() {
  const navigate = useNavigate();
  const { data, isLoading } = useInsights();
  const { mutate: resetMemory, isPending: isResetting } = useResetMemory();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetMemory(undefined, {
      onSuccess: () => {
        setOnboardingComplete(false);
        setShowResetConfirm(false);
        navigate('/onboarding');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🧠 What We Learned</h2>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Reset Memory
        </button>
      </div>

      {data?.insights && data.insights.length > 0 ? (
        <div className="space-y-4 mb-6">
          {data.insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {'⭐'.repeat(Math.min(insight.weight, 5))}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-700">{insight.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">Not enough data yet</p>
          <p className="text-sm">
            Interact with at least 10 roles to see insights about your preferences
          </p>
        </div>
      )}

      {data?.nextIdeas && data.nextIdeas.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Suggested Exploration Areas</h3>
          <div className="flex flex-wrap gap-2">
            {data.nextIdeas.map((idea) => (
              <span
                key={idea}
                className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"
              >
                {idea}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            These tags are related to your interests but you haven't explored them yet
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate('/onboarding')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Adjust Preferences
        </button>
        <button
          onClick={() => navigate('/feed')}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Feed
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reset All Memory?</h3>
            <p className="text-gray-700 mb-6">
              This will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• Your profile and preferences</li>
              <li>• All insights we've learned</li>
              <li>• Your like/dislike history</li>
              <li>• All tracked signals</li>
            </ul>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone. You'll be returned to onboarding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
