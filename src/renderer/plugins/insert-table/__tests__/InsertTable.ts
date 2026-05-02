import { mount } from '@vue/test-utils'

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import InsertTable from '../InsertTable.vue'

describe('InsertTable', () => {
  test('renders default selection and emits initial change', () => {
    const wrapper = mount(InsertTable, {
      global: {
        mocks: { $t: (key: string) => key },
      },
    })

    expect(wrapper.findAll('.table-row')).toHaveLength(10)
    expect(wrapper.findAll('.table-cell')).toHaveLength(100)
    expect(wrapper.findAll('.table-cell.highlighted')).toHaveLength(6)
    expect(wrapper.find('.options').text()).toContain('insert-table.compact')
    expect(wrapper.emitted('change')?.[0]).toEqual([{ rows: 2, cols: 3, compact: false }])
  })

  test('updates highlighted cells by mouseover and confirms from panel click', async () => {
    const wrapper = mount(InsertTable, {
      global: {
        mocks: { $t: (key: string) => key },
      },
    })

    await wrapper.findAll('.table-cell')[34].trigger('mouseover')
    expect(wrapper.findAll('.table-cell.highlighted')).toHaveLength(20)
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ rows: 4, cols: 5, compact: false }])

    await wrapper.find('.insert-table-panel').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  test('emits compact state and clamps numeric input values', async () => {
    const wrapper = mount(InsertTable, {
      global: {
        mocks: { $t: (key: string) => key },
      },
    })
    const compact = wrapper.find<HTMLInputElement>('input[type="checkbox"]')
    const [rows, cols] = wrapper.findAll<HTMLInputElement>('input[type="number"]')

    await compact.setValue(true)
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ rows: 2, cols: 3, compact: true }])

    await rows.setValue('1000')
    await rows.trigger('change')
    await cols.setValue('0')
    await cols.trigger('change')

    expect(rows.element.value).toBe('999')
    expect(cols.element.value).toBe('1')
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ rows: 999, cols: 1, compact: true }])
  })
})
