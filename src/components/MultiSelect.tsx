'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
}

export default function MultiSelect({ 
  label, 
  values, 
  options, 
  onChange,
  allLabel = 'All'
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (values.includes(option)) {
      onChange(values.filter(v => v !== option));
    } else {
      onChange([...values, option]);
    }
  };

  const selectAll = () => {
    onChange([]);
  };

  const displayText = values.length === 0 
    ? allLabel 
    : values.length === 1 
      ? values[0] 
      : `${values.length} selected`;

  return (
    <div className="flex flex-col gap-1 relative" ref={containerRef}>
      <label className="text-xs text-gray-500">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#333] border border-[#444] rounded px-2 py-1.5 text-xs text-white 
                   focus:outline-none focus:border-blue-500
                   hover:border-[#555] transition-colors cursor-pointer min-w-[100px]
                   flex items-center justify-between gap-2"
      >
        <span className={values.length > 0 ? 'text-blue-400' : ''}>
          {displayText}
        </span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg 
                        shadow-xl z-50 min-w-[160px] max-h-[300px] overflow-y-auto">
          {/* All option */}
          <button
            onClick={selectAll}
            className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 
                       hover:bg-[#333] transition-colors border-b border-[#333]
                       ${values.length === 0 ? 'text-blue-400' : 'text-gray-400'}`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {values.length === 0 && '✓'}
            </span>
            {allLabel}
          </button>

          {/* Options */}
          {options.map((option) => {
            const isSelected = values.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`w-full px-3 py-2 text-xs text-left flex items-center gap-2 
                           hover:bg-[#333] transition-colors
                           ${isSelected ? 'text-blue-400 bg-blue-500/10' : 'text-white'}`}
              >
                <span className="w-4 h-4 flex items-center justify-center border border-[#555] rounded">
                  {isSelected && '✓'}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

