import { ChangeEvent } from 'react';

export interface FilterValues {
  location?: string;
  remote?: boolean;
  employmentType?: string[];
  postedSinceDays?: number;
}

interface JobFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const EMPLOYMENT_TYPES = [
  { value: 'FULLTIME', label: 'Full-time' },
  { value: 'PARTTIME', label: 'Part-time' },
  { value: 'CONTRACTOR', label: 'Contract' },
  { value: 'INTERN', label: 'Internship' },
];

const POSTED_SINCE_OPTIONS = [
  { value: 1, label: 'Past 24 hours' },
  { value: 3, label: 'Past 3 days' },
  { value: 7, label: 'Past week' },
  { value: 14, label: 'Past 2 weeks' },
  { value: 30, label: 'Past month' },
];

export default function JobFilters({ filters, onChange }: JobFiltersProps) {
  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, location: e.target.value || undefined });
  };

  const handleRemoteToggle = () => {
    onChange({ ...filters, remote: !filters.remote });
  };

  const handleEmploymentTypeToggle = (type: string) => {
    const current = filters.employmentType || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onChange({ ...filters, employmentType: updated.length > 0 ? updated : undefined });
  };

  const handlePostedSinceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange({ ...filters, postedSinceDays: value });
  };

  const hasActiveFilters =
    filters.location ||
    filters.remote ||
    (filters.employmentType && filters.employmentType.length > 0) ||
    filters.postedSinceDays;

  const handleClearAll = () => {
    onChange({
      location: undefined,
      remote: undefined,
      employmentType: undefined,
      postedSinceDays: undefined,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={filters.location || ''}
          onChange={handleLocationChange}
          placeholder="e.g., San Francisco, Remote"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Remote Toggle */}
      <div className="flex items-center">
        <input
          id="remote"
          type="checkbox"
          checked={filters.remote || false}
          onChange={handleRemoteToggle}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="remote" className="ml-2 text-sm text-gray-700">
          Remote only
        </label>
      </div>

      {/* Employment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employment Type
        </label>
        <div className="space-y-2">
          {EMPLOYMENT_TYPES.map(type => (
            <div key={type.value} className="flex items-center">
              <input
                id={`employment-${type.value}`}
                type="checkbox"
                checked={filters.employmentType?.includes(type.value) || false}
                onChange={() => handleEmploymentTypeToggle(type.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`employment-${type.value}`}
                className="ml-2 text-sm text-gray-700"
              >
                {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Posted Since */}
      <div>
        <label htmlFor="posted-since" className="block text-sm font-medium text-gray-700 mb-1">
          Posted
        </label>
        <select
          id="posted-since"
          value={filters.postedSinceDays || ''}
          onChange={handlePostedSinceChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        >
          <option value="">Any time</option>
          {POSTED_SINCE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
