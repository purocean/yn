import * as ioc from '@fe/core/ioc'

test('ioc usage', () => {
  expect(ioc.get('ACTION_AFTER_RUN')).toEqual([])
  ioc.remove('ACTION_AFTER_RUN', null)
  ioc.register('ACTION_AFTER_RUN', 'test')
  ioc.register('ACTION_AFTER_RUN', 'test1')
  expect(ioc.get('ACTION_AFTER_RUN')).toEqual(['test', 'test1'])
  ioc.remove('ACTION_AFTER_RUN', 'test2')
  expect(ioc.get('ACTION_AFTER_RUN')).toEqual(['test', 'test1'])
  ioc.remove('ACTION_AFTER_RUN', 'test')
  expect(ioc.get('ACTION_AFTER_RUN')).toEqual(['test1'])
  ioc.removeAll('ACTION_AFTER_RUN')

  ioc.register('ACTION_AFTER_RUN', 'test')
  ioc.register('ACTION_AFTER_RUN', 'test1')
  ioc.register('ACTION_AFTER_RUN', 'test2')
  ioc.register('ACTION_AFTER_RUN', 'test3')
  ioc.register('ACTION_AFTER_RUN', 'test4')

  ioc.removeWhen('ACTION_AFTER_RUN', item => item === 'test' || item === 'test3')
  expect(ioc.get('ACTION_AFTER_RUN')).toEqual(['test1', 'test2', 'test4'])

  ioc.removeAll('ACTION_AFTER_RUN')
  ioc.register('ACTION_AFTER_RUN', 'test')
  ioc.register('ACTION_AFTER_RUN', 'test1')
  ioc.register('ACTION_AFTER_RUN', 'test2')
  ioc.register('ACTION_AFTER_RUN', 'test3')
  ioc.register('ACTION_AFTER_RUN', 'test4')

  for (const item of ioc.get('ACTION_AFTER_RUN')) {
    ioc.remove('ACTION_AFTER_RUN', item)
  }

  expect(ioc.get('ACTION_AFTER_RUN')).toEqual([])

  // test getRaw
  expect(ioc.getRaw('ACTION_AFTER_RUN_XXX' as any) === undefined)
  ioc.register('ACTION_AFTER_RUN', 'test1')
  const content1 = ioc.get('ACTION_AFTER_RUN')
  const raw1 = ioc.getRaw('ACTION_AFTER_RUN')
  ioc.register('ACTION_AFTER_RUN', 'test2')
  const content2 = ioc.get('ACTION_AFTER_RUN')
  const raw2 = ioc.getRaw('ACTION_AFTER_RUN')
  expect(content1 === content2).toBe(false)
  expect(raw1 === raw2).toBe(true)
  expect(content1).toEqual(['test1'])
  expect(content2).toEqual(['test1', 'test2'])
  expect([...raw1!]).toEqual(['test1', 'test2'])
  expect([...raw2!]).toEqual(['test1', 'test2'])
  ioc.removeAll('ACTION_AFTER_RUN')
  expect(raw1 === raw2).toBe(true)
  expect(raw1?.length).toEqual(0)

  // test version
  expect(ioc.getRaw('ACTION_BEFORE_RUN') === undefined).toBe(true)
  ioc.register('ACTION_BEFORE_RUN', 'test1')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(1)
  ioc.register('ACTION_BEFORE_RUN', 'test2')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(2)
  ioc.register('ACTION_BEFORE_RUN', 'test3')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(3)
  ioc.remove('ACTION_BEFORE_RUN', 'test1')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(4)
  ioc.removeWhen('ACTION_BEFORE_RUN', item => item === 'test2')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(5)
  ioc.removeAll('ACTION_BEFORE_RUN')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(6)
  ioc.register('ACTION_BEFORE_RUN', 'test1')
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version).toBe(7)
  expect(ioc.getRaw('ACTION_BEFORE_RUN')?._version === undefined).toBe(false)
})
