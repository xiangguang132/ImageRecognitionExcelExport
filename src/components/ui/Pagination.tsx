'use client'

interface PaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  pageSizeOptions?: number[]
  itemLabel?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/**
 * 通用分页组件：每页条数下拉（默认 5/10/15）+ 当前页展示 + 前后翻页
 */
export default function Pagination({
  currentPage,
  totalCount,
  pageSize,
  pageSizeOptions = [5, 10, 15],
  itemLabel = '条记录',
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  if (totalCount <= 0) return null

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          共 <span className="font-bold text-slate-700">{totalCount}</span> {itemLabel}
        </span>
        <label className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          每页
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          条
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一页
        </button>

        <div className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
          {currentPage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-1"
        >
          下一页
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
