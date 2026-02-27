export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 80"
      aria-hidden="true"
      focusable="false"
    >
      {/* L */}
      <path
        d="M0 0 L12 0 L12 68 L50 68 L50 80 L0 80 Z"
        fill="currentColor"
      />
      {/* Dash */}
      <path
        d="M72 34 L108 34 L108 46 L72 46 Z"
        fill="currentColor"
      />
      {/* S */}
      <path
        d="M200 0 L147 0 C137.61 0 130 7.61 130 17 L130 29 C130 38.39 137.61 46 147 46 L183 46 C192.39 46 200 53.61 200 63 C200 72.39 192.39 80 183 80 L130 80 L130 68 L183 68 C185.76 68 188 65.76 188 63 C188 60.24 185.76 58 183 58 L183 34 L147 34 C144.24 34 142 31.76 142 29 L142 17 C142 14.24 144.24 12 147 12 L200 12 Z"
        fill="currentColor"
      />
    </svg>
  )
}
