"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
    >
      Print Continuation
    </button>
  );
}