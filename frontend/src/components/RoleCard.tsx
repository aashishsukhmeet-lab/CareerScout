import { useState } from 'react';
import { ScoredRole, DislikeReason } from '../types';
import { useFeedback } from '../hooks/useApi';

interface RoleCardProps {
  role: ScoredRole;
  hasFeedback?: boolean;
  feedbackValue?: 'LIKE' | 'DISLIKE';
}

const DISLIKE_REASONS: { value: DislikeReason; label: string }[] = [
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'too_senior', label: 'Too senior' },
  { value: 'too_junior', label: 'Too junior' },
  { value: 'location_mismatch', label: 'Location mismatch' },
  { value: 'compensation', label: 'Compensation' },
  { value: 'company_fit', label: 'Company fit' },
];

export default function RoleCard({ role, hasFeedback, feedbackValue }: RoleCardProps) {
  const { submitFeedback, undoFeedback } = useFeedback();
  const [showDislikeReason, setShowDislikeReason] = useState(false);

  const handleLike = () => {
    submitFeedback.mutate({ roleId: role.id, data: { value: 'LIKE' } });
  };

  const handleDislike = (reason?: DislikeReason) => {
    submitFeedback.mutate({
      roleId: role.id,
      data: { value: 'DISLIKE', reason },
    });
    setShowDislikeReason(false);
  };

  const handleUndo = () => {
    undoFeedback.mutate(role.id);
  };

  const isLoading = submitFeedback.isPending || undoFeedback.isPending;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{role.title}</h3>
          <p className="text-gray-600 font-medium">{role.company}</p>
          {role.location && (
            <p className="text-sm text-gray-500 mt-1">📍 {role.location}</p>
          )}
        </div>
        {role.score && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Score</div>
            <div className="text-lg font-bold text-blue-600">
              {role.score.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {role.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {role.rationale && role.rationale.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold text-gray-600 mb-1">Why this role:</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {role.rationale.map((reason, idx) => (
              <li key={idx}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        {!hasFeedback && (
          <>
            <button
              onClick={handleLike}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              👍 Like
            </button>
            <div className="relative flex-1">
              <button
                onClick={() => setShowDislikeReason(!showDislikeReason)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                👎 Dislike
              </button>
              {showDislikeReason && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Why?</div>
                  {DISLIKE_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => handleDislike(reason.value)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700"
                    >
                      {reason.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDislike()}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-500 border-t border-gray-200 mt-1"
                  >
                    No specific reason
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {hasFeedback && (
          <div className="flex-1 flex items-center justify-between bg-gray-100 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-gray-700">
              {feedbackValue === 'LIKE' ? '👍 Liked' : '👎 Disliked'}
            </span>
            <button
              onClick={handleUndo}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
