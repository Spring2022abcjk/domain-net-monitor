/**
 * 表格组件
 * @param {Object} props - 属性
 * @param {Array} props.columns - 列定义 [{ key: 'name', title: '名称', width: '100px', render: (value, row, index, col) => string, align: 'left'|'center'|'right' }]
 * @param {Array} props.data - 数据数组
 * @param {string} [props.emptyText='暂无数据'] - 空数据提示
 * @param {string} [props.rowIdPrefix='row'] - 行 ID 前缀
 * @param {Function} [props.rowClassName] - 行类名函数 (row, index) => string
 */
export function Table({ columns, data, emptyText = '暂无数据', rowIdPrefix = 'row', rowClassName }) {
  if (!data || data.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        ${emptyText}
      </div>
    `
  }

  /** @param {string} align */
  const getColumnAlignClass = (align) => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  return `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            ${columns
              .map(
                (col) => `
              <th 
                class="px-6 py-3 ${getColumnAlignClass(col.align)} text-xs font-medium text-gray-500 uppercase tracking-wider"
                ${col.width ? `style="width: ${col.width}"` : ''}
              >
                ${col.title}
              </th>
            `,
              )
              .join('')}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${data
            .map((row, index) => {
              const customClass = rowClassName ? rowClassName(row, index) : ''
              return `
              <tr 
                class="hover:bg-gray-50 ${customClass}" 
                id="${rowIdPrefix}-${index}" 
                data-row-index="${index}"
              >
                ${columns
                  .map((col) => {
                    const cellValue = row[col.key]
                    let displayValue
                    if (col.render && typeof col.render === 'function') {
                      displayValue = col.render(cellValue, row, index, col)
                    } else {
                      displayValue = cellValue !== null && cellValue !== undefined ? String(cellValue) : '-'
                    }
                    return `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${getColumnAlignClass(col.align)}">
                      ${displayValue}
                    </td>
                  `
                  })
                  .join('')}
              </tr>
            `
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

export default Table
