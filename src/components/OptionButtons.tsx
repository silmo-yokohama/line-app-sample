import { useState } from "react";
import type { Option } from "../types";

type OptionButtonsProps = {
  options: Option[];
  type: "single" | "multiple";
  onSubmit: (values: string[]) => void;
};

export function OptionButtons({ options, type, onSubmit }: OptionButtonsProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pressed, setPressed] = useState<string | null>(null);

  const handleTap = (value: string) => {
    if (type === "single") {
      setPressed(value);
      setTimeout(() => onSubmit([value]), 200);
    } else {
      setSelected((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value]
      );
    }
  };

  const handleConfirm = () => {
    if (selected.length > 0) {
      onSubmit(selected);
    }
  };

  return (
    <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 bg-gradient-to-t from-bg via-bg to-transparent">
      {type === "multiple" && (
        <p className="text-center text-xs font-medium text-text-sub mb-2">
          タップして選択してください（複数OK）
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {options.map((option, i) => {
          const isSelected = selected.includes(option.value);
          const isPressed = pressed === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleTap(option.value)}
              className="animate-float-in opacity-0"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
            >
              <div
                className={`
                  relative flex items-center min-h-[48px] px-5 py-3 rounded-2xl
                  text-[15px] font-semibold tracking-tight
                  border-2 transition-all duration-200 ease-out
                  active:scale-[0.97]
                  ${
                    isSelected
                      ? "bg-pink-400 border-pink-400 text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)]"
                      : isPressed
                      ? "bg-pink-400 border-pink-400 text-white scale-[0.97]"
                      : "bg-white border-pink-200 text-text hover:border-pink-300 hover:bg-pink-50 shadow-[0_2px_8px_rgba(255,181,197,0.15)]"
                  }
                `}
              >
                {type === "multiple" && (
                  <div
                    className={`
                      flex-shrink-0 w-5 h-5 mr-3 rounded-md border-2 flex items-center justify-center transition-all duration-200
                      ${isSelected ? "bg-white border-white" : "border-pink-300"}
                    `}
                  >
                    {isSelected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FF6B9D"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: "check-pop 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                )}
                <span className="flex-1 text-left">{option.label}</span>
                {type === "single" && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 ml-2 opacity-30"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {type === "multiple" && (
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className={`
            mt-3 w-full min-h-[52px] rounded-2xl text-[16px] font-bold tracking-tight
            transition-all duration-300 ease-out
            ${
              selected.length > 0
                ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-[0_4px_16px_rgba(255,107,157,0.4)] active:scale-[0.97]"
                : "bg-pink-100 text-pink-300 cursor-not-allowed"
            }
          `}
        >
          {selected.length > 0
            ? `決定（${selected.length}件選択中）`
            : "選択してください"}
        </button>
      )}
    </div>
  );
}
