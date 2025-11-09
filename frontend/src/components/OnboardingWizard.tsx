import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useApi';
import { useAppStore } from '../hooks/useAppStore';

const INTEREST_OPTIONS = [
  'salesforce',
  'ai',
  'fintech',
  'product',
  'support',
  'ops',
  'data',
];

const SENIORITY_OPTIONS = ['IC', 'Senior IC', 'Lead/Manager'];

const COMPANY_TYPE_OPTIONS = [
  'startup',
  'scaleup',
  'public',
  'FAANG-like',
  'consulting',
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { mutate: saveOnboarding, isPending } = useOnboarding();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string>('');
  const [locationInput, setLocationInput] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);

  const toggleArrayItem = <T,>(arr: T[], item: T, setArr: (arr: T[]) => void) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  const handleAddLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setLocations(locations.filter((l) => l !== loc));
  };

  const handleSubmit = () => {
    if (interests.length === 0 || locations.length === 0 || companyTypes.length === 0) {
      alert('Please complete all required fields');
      return;
    }

    saveOnboarding(
      {
        interests,
        seniority: seniority || undefined,
        locations,
        companyTypes,
      },
      {
        onSuccess: () => {
          setOnboardingComplete(true);
          navigate('/feed');
        },
        onError: (error) => {
          alert(`Failed to save preferences: ${error.message}`);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to CareerScout</h1>
            <span className="text-sm text-gray-500">Step {step} of 5</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">What are your primary interests?</h2>
            <p className="text-gray-600 mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleArrayItem(interests, interest, setInterests)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    interests.includes(interest)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">What's your seniority preference?</h2>
            <p className="text-gray-600 mb-6">Choose one</p>
            <div className="space-y-2 mb-8">
              {SENIORITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setSeniority(option)}
                  className={`w-full p-4 rounded-lg font-medium text-left transition-colors ${
                    seniority === option
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Where do you want to work?</h2>
            <p className="text-gray-600 mb-6">Add your preferred locations</p>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                  placeholder="e.g., Remote, New York, Chicago"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2"
                >
                  {loc}
                  <button
                    onClick={() => handleRemoveLocation(loc)}
                    className="text-blue-900 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">What company types interest you?</h2>
            <p className="text-gray-600 mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {COMPANY_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleArrayItem(companyTypes, type, setCompanyTypes)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    companyTypes.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">You're all set! 🎉</h2>
            <p className="text-gray-600 mb-6">Here's what you selected:</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-8 space-y-3">
              <div>
                <strong className="text-gray-700">Interests:</strong>{' '}
                <span className="text-gray-600">{interests.join(', ')}</span>
              </div>
              {seniority && (
                <div>
                  <strong className="text-gray-700">Seniority:</strong>{' '}
                  <span className="text-gray-600">{seniority}</span>
                </div>
              )}
              <div>
                <strong className="text-gray-700">Locations:</strong>{' '}
                <span className="text-gray-600">{locations.join(', ')}</span>
              </div>
              <div>
                <strong className="text-gray-700">Company Types:</strong>{' '}
                <span className="text-gray-600">{companyTypes.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < 5 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && interests.length === 0) ||
                (step === 3 && locations.length === 0) ||
                (step === 4 && companyTypes.length === 0)
              }
              className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
          {step === 5 && (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              {isPending ? 'Saving...' : 'Show me 10 roles now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
