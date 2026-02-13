import { useEffect, useMemo, useRef, useState } from 'react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  buttonClassName = '',
  containerClassName = '',
  menuClassName = '',
  optionClassName = '',
  openUpward = false,
  align = 'left',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const menuPositionClass = openUpward ? 'bottom-full mb-2' : 'top-full mt-2';
  const menuAlignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-200 hover:bg-gray-800 hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption?.label ?? ''}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute ${menuPositionClass} ${menuAlignClass} z-[80] min-w-full max-h-72 overflow-y-auto rounded-lg border border-gray-600 bg-gray-900/95 backdrop-blur shadow-2xl ${menuClassName}`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-gray-200 hover:bg-white/10'
                } ${optionClassName}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
