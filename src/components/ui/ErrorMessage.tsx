export const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 bg-red-50 text-red-800 border border-red-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(220,38,38,0.02)] antialiased text-sm font-medium">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-red-600 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01M21 12A9 9 0 1112 3a9 9 0 019 9z"
      />
    </svg>
    <span>{message}</span>
  </div>
);