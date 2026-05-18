export function SimpleDoorShape() {
  return (
    <svg viewBox="0 0 110 90" className="h-24 w-28">
      <rect
        x="24"
        y="20"
        width="62"
        height="50"
        rx="3"
        fill="#d1d5db"
        stroke="#9ca3af"
        strokeWidth="4"
      />
      <rect
        x="32"
        y="28"
        width="46"
        height="34"
        fill="#f8fafc"
        opacity="0.45"
      />
      <circle cx="72" cy="45" r="3" fill="#9ca3af" />
    </svg>
  );
}

export function SimpleWindowShape() {
  return (
    <svg viewBox="0 0 110 90" className="h-24 w-28">
      <rect
        x="20"
        y="22"
        width="70"
        height="48"
        rx="4"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="4"
      />
      <rect
        x="28"
        y="30"
        width="54"
        height="32"
        fill="#f8fafc"
        opacity="0.65"
      />
      <line x1="55" y1="24" x2="55" y2="68" stroke="#9ca3af" strokeWidth="3" />
      <line x1="22" y1="46" x2="88" y2="46" stroke="#9ca3af" strokeWidth="3" />
    </svg>
  );
}
