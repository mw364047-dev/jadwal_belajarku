import EmptyState from './EmptyState.jsx'

function cellContent(column, row, index) {
  return column.render ? column.render(row, index) : row?.[column.key] ?? '—'
}

function isNumericColumn(column, row) {
  return column.numeric === true || typeof row?.[column.key] === 'number'
}

export default function Table({
  columns = [],
  data = [],
  rowKey = 'id',
  caption,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data akan ditampilkan di sini setelah tersedia.',
  className = '',
}) {
  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />
  }

  return (
    <div className={className}>
      {/* Mobile: setiap label berada di atas nilainya agar mudah dipindai. */}
      <div className="divide-y divide-ink/20 border-y border-ink/20 md:hidden">
        {data.map((row, index) => (
          <article key={row?.[rowKey] ?? index} className="py-4 first:pt-3 last:pb-3">
            <dl className="space-y-3">
              {columns.filter((column) => !column.hideOnMobile).map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-sm font-semibold text-ink-muted">{column.header || column.title}</dt>
                  <dd className={`mt-1 min-w-0 break-words text-base text-ink ${isNumericColumn(column, row) ? 'tabular-nums' : ''}`}>
                    {cellContent(column, row, index)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden max-h-[68vh] overflow-auto border-y border-ink/20 md:block">
        <table className="min-w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-paper">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap border-b-[3px] border-double border-ink px-4 py-3 text-sm font-bold text-ink ${column.numeric ? 'text-right tabular-nums' : ''} ${column.headerClassName || ''}`}
                >
                  {column.header || column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row?.[rowKey] ?? index} className="border-b border-ink/15 last:border-b-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 text-base text-ink ${isNumericColumn(column, row) ? 'text-right tabular-nums' : ''} ${column.cellClassName || ''}`}
                  >
                    {cellContent(column, row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="mt-2 text-xs text-ink-muted md:hidden">{caption}</p>}
    </div>
  )
}
