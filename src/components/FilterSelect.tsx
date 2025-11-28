'use client';

import React from 'react';

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export default function FilterSelect({ 
  label, 
  value, 
  options, 
  onChange,
  allLabel = 'All'
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#333] border border-[#444] rounded px-2 py-1.5 text-xs text-white 
                   focus:outline-none focus:border-blue-500
                   hover:border-[#555] transition-colors cursor-pointer min-w-[100px]"
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
