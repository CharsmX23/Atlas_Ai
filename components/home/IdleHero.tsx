'use client'

const EXAMPLES = [
  'Cardiologists in Birmingham',
  'Lawyers in Chicago',
  'Dentists in Austin',
  'Plumbers in Houston',
]

export function IdleHero({ onQueryClick }: { onQueryClick?: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6" style={{ paddingTop: 'calc(50vh - 200px)' }}>
      {/* Main headline */}
      <h1
        className="mb-4 tracking-[-0.03em] leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '56px',
          color: 'var(--text-primary)',
        }}
      >
        Atlas AI
      </h1>

      {/* Subtitle */}
      <p
        className="mb-14 max-w-[420px]"
        style={{
          fontSize: '20px',
          fontWeight: 400,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          opacity: 0.75,
        }}
      >
        Autonomous business intelligence
      </p>

      {/* Example searches */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 max-w-[600px]">
        {EXAMPLES.map((query) => (
          <button
            key={query}
            onClick={() => onQueryClick?.(query)}
            className="text-[14px] transition-all duration-150"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}
