export function FolderGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden>
      <path
        fill="#f7c66b"
        d="M2.5 6.5A1.5 1.5 0 0 1 4 5h4.6a1.5 1.5 0 0 1 1.1.5l1.2 1.3H20a1.5 1.5 0 0 1 1.5 1.5v9.2A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5Z"
      />
      <path fill="#ffdf9e" d="M2.5 9.3h19v8.2A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5Z" />
    </svg>
  );
}

export function SpreadsheetGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden>
      <path fill="#e8f3ec" stroke="#1d7a4c" strokeWidth="1.2" d="M6 2.6h7.2L18.4 7.8V21.4H6z" />
      <path fill="none" stroke="#1d7a4c" strokeWidth="1.2" d="M13.2 2.6v5.2h5.2" />
      <path fill="none" stroke="#1d7a4c" strokeWidth="1" d="M8.2 11.4h8M8.2 14.4h8M8.2 17.4h8M11.6 11.4v6.6" />
    </svg>
  );
}

export function DocumentGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden>
      <path fill="#eef2f8" stroke="#5b6b86" strokeWidth="1.2" d="M6 2.6h7.2L18.4 7.8V21.4H6z" />
      <path fill="none" stroke="#5b6b86" strokeWidth="1.2" d="M13.2 2.6v5.2h5.2" />
      <path fill="none" stroke="#5b6b86" strokeWidth="1" d="M8.4 12h7M8.4 15h7M8.4 18h4.5" />
    </svg>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3 w-3 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
