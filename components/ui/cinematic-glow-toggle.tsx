import React from 'react';

interface CinematicSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CinematicSwitch: React.FC<CinematicSwitchProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-1 focus:ring-[#0A66C2] focus:ring-offset-1
        dark:focus:ring-offset-gray-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked
          ? 'bg-[#0A66C2] shadow-[0_0_10px_rgba(10,102,194,0.4)]'
          : 'bg-gray-300 dark:bg-gray-600'
        }
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full
          bg-white shadow-sm
          transition-all duration-300 ease-in-out
          ${checked
            ? 'translate-x-4'
            : 'translate-x-0.5'
          }
        `}
      />
    </button>
  );
};

export default CinematicSwitch;
