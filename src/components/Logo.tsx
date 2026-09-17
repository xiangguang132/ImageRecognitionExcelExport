'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * 学生证识别系统 Logo（V2 简化版）
 * 设计语义：
 * - 粗线条证件卡 + 实心人像 = 学生证，小尺寸也清晰
 * - 琥珀色扫描线 + 右上星芒 = AI 识别
 * - 小尺寸下刻意只保留 3 个视觉元素，避免糊成一团
 */
export default function Logo({ size = 'md', className }: LogoProps) {
  const box = {
    sm: 'w-8 h-8 rounded-[10px]',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  }[size]
  const icon = {
    sm: 'w-[18px] h-[18px]',
    md: 'w-[22px] h-[22px]',
    lg: 'w-7 h-7',
  }[size]

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white',
        'shadow-lg shadow-indigo-500/30 ring-1 ring-white/25 ring-inset',
        box,
        className ?? '',
      ].join(' ')}
    >
      {/* 高光 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/10" />

      <svg className={`relative ${icon}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* 证件卡：粗线条，小尺寸清晰 */}
        <rect x="2.8" y="7" width="13.4" height="12.4" rx="3" stroke="currentColor" strokeWidth="2" />
        {/* 人像：实心头 + 肩线 */}
        <circle cx="7.4" cy="11.8" r="1.9" fill="currentColor" />
        <path
          d="M4.9 16.9c.4-1.5 1.4-2.3 2.5-2.3s2.1 0.8 2.5 2.3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* 信息行：只留一条，加粗 */}
        <path d="M11.4 11.2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <path d="M11.4 14h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        {/* 琥珀色扫描线：横穿卡片，AI 识别的点睛 */}
        <path
          d="M3.6 16.4h11.8"
          stroke="#FCD34D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* AI 星芒：右上，放大一号 */}
        <path
          d="M19 9.4c.3-1.6 1-2.4 2.6-2.7-1.6-.3-2.3-1.1-2.6-2.7-.3 1.6-1 2.4-2.6 2.7 1.6.3 2.3 1.1 2.6 2.7Z"
          fill="#FDE68A"
          stroke="#FDE68A"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
