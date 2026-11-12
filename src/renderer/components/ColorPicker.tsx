// Hue-spread so every swatch stays distinct (also after the dimmed/gray inactive tint).
export const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#16a34a', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#c026d3', // fuchsia
  '#ec4899' // pink
]

// First preset no existing account uses (falls back to the first preset).
export function nextFreeColor(used: string[]): string {
  return PRESET_COLORS.find((c) => !used.includes(c)) ?? PRESET_COLORS[0]
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-10 gap-2 px-0.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="aspect-square w-full cursor-pointer rounded-sm transition-all"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px'
          }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  )
}
