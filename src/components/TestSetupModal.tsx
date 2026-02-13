import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ChevronDown, Radio } from "lucide-react";

interface TestSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

export const TestSetupModal: React.FC<TestSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [step, setStep] = useState(1);
  const [testName, setTestName] = useState("");
  const [mode, setMode] = useState<"live" | "solo">("live");

  const handleStart = () => {
    onStart();
    // Reset state after closing (optional)
    setTimeout(() => {
        setStep(1);
        setTestName("");
        setMode("live");
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Test" className="max-w-[560px]">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3, 4].map((s, index) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    step >= s
                      ? "bg-[#4262ff] text-white"
                      : "border border-[#050038]/10 bg-white text-[#050038]/60"
                  }`}
                >
                  {s}
                </div>
                <span className="text-xs text-[#050038]/60">
                  {s === 1 && "Config"}
                  {s === 2 && "Mode"}
                  {s === 3 && "Privacy"}
                  {s === 4 && "AI"}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-px flex-1 ${step > s ? "bg-[#4262ff]" : "bg-[#050038]/10"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <div className="min-h-[300px]">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#050038]">
                Test name <span className="text-[#ffd02f]">*</span>
              </label>
              <Input
                placeholder="e.g., Mobile App v2 Test"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#050038]">
                Description (optional)
              </label>
              <textarea
                className="flex w-full rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-[#050038]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4262ff] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                placeholder="What are you testing?"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#050038]">
                Board
              </label>
              <div className="relative">
                <select className="w-full appearance-none rounded-md border border-[#050038]/10 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#4262ff]">
                  <option>Mobile App Prototype v2</option>
                  <option>Web Dashboard Mockup</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-2.5 text-[#050038]/60 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div
              className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${
                mode === "live"
                  ? "border-[#4262ff] bg-[#4262ff]/5"
                  : "border-[#050038]/10 bg-white hover:bg-[#fafafa]"
              }`}
              onClick={() => setMode("live")}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${mode === 'live' ? 'border-[#4262ff]' : 'border-[#050038]/20'}`}>
                    {mode === 'live' && <div className="h-2 w-2 rounded-full bg-[#4262ff]" />}
                </div>
                <div>
                  <h3 className="font-semibold text-[#050038]">Live Session Mode</h3>
                  <p className="mt-1 text-sm text-[#050038]/60">
                    Track real-time collaboration during workshops
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`cursor-pointer rounded-xl border p-5 transition-colors ${
                mode === "solo"
                  ? "border-[#4262ff] bg-[#4262ff]/5 ring-1 ring-[#4262ff]"
                  : "border-[#050038]/10 bg-white hover:bg-[#fafafa]"
              }`}
              onClick={() => setMode("solo")}
            >
              <div className="flex items-start gap-3">
                 <div className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${mode === 'solo' ? 'border-[#4262ff]' : 'border-[#050038]/20'}`}>
                    {mode === 'solo' && <div className="h-2 w-2 rounded-full bg-[#4262ff]" />}
                </div>
                <div>
                  <h3 className="font-semibold text-[#050038]">Solo Test Mode</h3>
                  <p className="mt-1 text-sm text-[#050038]/60">
                    Track one user at a time for usability testing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {step >= 3 && (
            <div className="flex h-[300px] items-center justify-center text-center text-[#050038]/60">
                <p>Steps 3 & 4 (Privacy/AI) are placeholders for this prototype.</p>
            </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
        >
          {step > 1 ? "← Back" : "Cancel"}
        </Button>
        <Button
          disabled={step === 1 && !testName}
          onClick={() => {
            if (step < 4) {
              setStep(step + 1);
            } else {
              handleStart();
            }
          }}
        >
          {step < 4 ? "Next →" : "Start Test →"}
        </Button>
      </div>
    </Modal>
  );
};
