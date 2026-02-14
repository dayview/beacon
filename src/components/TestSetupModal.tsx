import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ChevronDown } from "lucide-react";
import { useTests } from "../contexts/TestContext";

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
  const { addTest } = useTests();
  const [step, setStep] = useState(1);
  const [testName, setTestName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"live-session" | "solo">("live-session");
  const [targetParticipants, setTargetParticipants] = useState(20);

  const handleStart = () => {
    // Create the test
    addTest({
      name: testName,
      description: description || `Usability test for ${testName}`,
      status: 'live',
      type: mode,
      participants: {
        current: 0,
        target: targetParticipants
      }
    });

    onStart();
    
    // Reset state after closing
    setTimeout(() => {
      setStep(1);
      setTestName("");
      setDescription("");
      setMode("live-session");
      setTargetParticipants(20);
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Test" className="max-w-[560px]">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3].map((s, index) => (
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
                  {s === 1 && "Details"}
                  {s === 2 && "Mode"}
                  {s === 3 && "Setup"}
                </span>
              </div>
              {index < 2 && (
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#050038]">
                Target Participants
              </label>
              <Input
                type="number"
                min="1"
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div
              className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${
                mode === "live-session"
                  ? "border-[#4262ff] bg-[#4262ff]/5"
                  : "border-[#050038]/10 bg-white hover:bg-[#fafafa]"
              }`}
              onClick={() => setMode("live-session")}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${mode === 'live-session' ? 'border-[#4262ff]' : 'border-[#050038]/20'}`}>
                  {mode === 'live-session' && <div className="h-2 w-2 rounded-full bg-[#4262ff]" />}
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
              className={`cursor-pointer rounded-xl border-2 p-5 transition-colors ${
                mode === "solo"
                  ? "border-[#4262ff] bg-[#4262ff]/5"
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
        
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-xl border border-[#050038]/10 bg-white p-6">
              <h3 className="font-semibold text-[#050038]">Ready to Start</h3>
              <p className="mt-2 text-sm text-[#050038]/60">
                Your test "{testName}" will start collecting data once you click "Start Test". You can view real-time analytics from the dashboard.
              </p>
              <div className="mt-4 space-y-2 rounded-lg bg-[#fafafa] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#050038]/60">Mode:</span>
                  <span className="font-semibold text-[#050038]">
                    {mode === 'live-session' ? 'Live Session' : 'Solo Test'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#050038]/60">Target:</span>
                  <span className="font-semibold text-[#050038]">{targetParticipants} participants</span>
                </div>
              </div>
            </div>
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
            if (step < 3) {
              setStep(step + 1);
            } else {
              handleStart();
            }
          }}
        >
          {step < 3 ? "Next →" : "Start Test →"}
        </Button>
      </div>
    </Modal>
  );
};
