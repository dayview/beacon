import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Test } from '../data/mockData';

interface EditTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Test>) => void;
  test: Test;
}

export const EditTestModal: React.FC<EditTestModalProps> = ({ isOpen, onClose, onSave, test }) => {
  const [name, setName] = useState(test.name);
  const [description, setDescription] = useState(test.description);
  const [targetParticipants, setTargetParticipants] = useState(test.participants.target);

  useEffect(() => {
    setName(test.name);
    setDescription(test.description);
    setTargetParticipants(test.participants.target);
  }, [test]);

  const handleSave = () => {
    onSave({
      name,
      description,
      participants: {
        ...test.participants,
        target: targetParticipants
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-[#050038]">Edit Test</h2>
        <p className="mt-2 text-sm text-[#050038]/60">Update test details</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#050038]">Test Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#050038]/10 px-4 py-2 text-sm focus:border-[#4262ff] focus:outline-none focus:ring-2 focus:ring-[#4262ff]/20"
              placeholder="e.g., Mobile App Redesign"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#050038]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-[#050038]/10 px-4 py-2 text-sm focus:border-[#4262ff] focus:outline-none focus:ring-2 focus:ring-[#4262ff]/20"
              placeholder="Describe what you're testing..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#050038]">Target Participants</label>
            <input
              type="number"
              value={targetParticipants}
              onChange={(e) => setTargetParticipants(parseInt(e.target.value) || 0)}
              min="1"
              className="mt-1 w-full rounded-lg border border-[#050038]/10 px-4 py-2 text-sm focus:border-[#4262ff] focus:outline-none focus:ring-2 focus:ring-[#4262ff]/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#050038]/10 px-4 py-2 text-sm font-semibold text-[#050038] hover:bg-[#fafafa]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-[#ffd02f] px-4 py-2 text-sm font-semibold text-[#050038] hover:bg-[#ffd02f]/90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
