import { useState, useEffect } from "react";

interface ProviderRestrictionOverlayProps {
  caseId: string;
}

export default function ProviderRestrictionOverlay({ caseId }: ProviderRestrictionOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Access Restricted</h2>
        <p className="text-gray-700 mb-4">
          Your access to this case is currently restricted. Please contact support for assistance.
        </p>
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}