import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testName: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, testName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#050038]">Delete Test</h2>
            <p className="mt-2 text-sm text-[#050038]/60">
              Are you sure you want to delete <strong>"{testName}"</strong>? This action cannot be undone and all associated data will be lost.
            </p>
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
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete Test
          </button>
        </div>
      </div>
    </div>
  );
};
