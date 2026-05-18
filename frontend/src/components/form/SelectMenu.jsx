import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

const SelectMenu = ({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-12 w-full items-center justify-between rounded-full border border-slate-200 bg-white px-5 text-left text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption?.label || placeholder}
        </span>

        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{option.label}</span>
                {isActive ? <FiCheck className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SelectMenu;
