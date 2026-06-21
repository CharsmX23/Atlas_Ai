export function ComingSoon() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm">
        <div className="text-[12px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Atlas AI
        </div>
        <div
          className="text-[20px] mb-2 italic"
          style={{ fontFamily: 'var(--font-serif-display)', fontStyle: 'italic', color: 'var(--text-primary)' }}
        >
          Coming soon
        </div>
        <div className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          This module is being prepared for the next release.
        </div>
      </div>
    </div>
  )
}
