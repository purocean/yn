import { FirebaseAnalyticsJS } from '@fe/others/google-analytics'

describe('FirebaseAnalyticsJS', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('validates constructor inputs and event names', () => {
    expect(() => new FirebaseAnalyticsJS({ measurementId: '' }, { clientId: 'cid' })).toThrow('measurementId')
    expect(() => new FirebaseAnalyticsJS({ measurementId: 'G-TEST' }, { clientId: '' })).toThrow('clientId')

    expect(FirebaseAnalyticsJS.parseEvent({ clientId: 'cid', origin: 'test' }, 'open_app', {
      currency: 'USD',
      count: 2,
      label: 'Home',
    })).toMatchObject({
      en: 'open_app',
      cu: 'USD',
      'epn.count': 2,
      'ep.label': 'Home',
      'ep.origin': 'test',
    })

    expect(() => FirebaseAnalyticsJS.parseEvent({ clientId: 'cid' }, '_bad')).toThrow('Invalid event-name')
    expect(() => FirebaseAnalyticsJS.parseEvent({ clientId: 'cid' }, 'ga_bad')).toThrow('Invalid event-name')
  })

  test('validates user properties and encodes numeric values separately', () => {
    expect(FirebaseAnalyticsJS.parseUserProperty({ clientId: 'cid' }, 'plan', 'pro')).toBe('up.plan')
    expect(FirebaseAnalyticsJS.parseUserProperty({ clientId: 'cid' }, 'score', 10)).toBe('upn.score')
    expect(() => FirebaseAnalyticsJS.parseUserProperty({ clientId: 'cid' }, 'user_id', 'x')).toThrow('Invalid user-property')
    expect(() => FirebaseAnalyticsJS.parseUserProperty({ clientId: 'cid', strictNativeEmulation: true }, 'plan', 'x'.repeat(37))).toThrow('Invalid user-property value')
  })

  test('sends single events in the query string with configured context', async () => {
    const ga = new FirebaseAnalyticsJS({ measurementId: 'G-TEST' }, {
      clientId: 'client-1',
      maxCacheTime: 10,
      appName: 'Yank Note',
      appVersion: '1.0.0',
      userLanguage: 'en-US',
      customArgs: { debug_mode: 1 },
    })

    await ga.setUserId('user-1')
    await ga.setCurrentScreen('Editor')
    await ga.setUserProperties({ plan: 'pro', score: 7 })
    await ga.logEvent('open_app', { count: 2 })
    await (ga as any).flushEvents()

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('tid=G-TEST')
    expect(String(url)).toContain('cid=client-1')
    expect(String(url)).toContain('en=open_app')
    expect(String(url)).toContain('uid=user-1')
    expect(String(url)).toContain('ep.screen_name=Editor')
    expect(String(url)).toContain('up.plan=pro')
    expect(String(url)).toContain('upn.score=7')
    expect(String(url)).toContain('epn.count=2')
    expect(init).toMatchObject({ method: 'POST', cache: 'no-cache', body: '' })
  })

  test('sends batched events in the request body and clears queued events', async () => {
    const ga = new FirebaseAnalyticsJS({ measurementId: 'G-TEST' }, { clientId: 'client-1', maxCacheTime: 10 })

    await ga.logEvent('first_event')
    await ga.logEvent('second_event', { label: 'B' })
    await (ga as any).flushEvents()

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('tid=G-TEST')
    expect(String(url)).not.toContain('en=first_event')
    expect(init?.body).toContain('en=first_event')
    expect(init?.body).toContain('en=second_event')

    await (ga as any).flushEvents()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('honors disabled collection and resetAnalyticsData', async () => {
    const ga = new FirebaseAnalyticsJS({ measurementId: 'G-TEST' }, { clientId: 'client-1' })

    await ga.setAnalyticsCollectionEnabled(false)
    await ga.setUserId('ignored')
    await ga.logEvent('ignored_event')
    await (ga as any).flushEvents()
    expect(fetch).not.toHaveBeenCalled()

    await ga.setAnalyticsCollectionEnabled(true)
    await ga.setUserId('user-1')
    await ga.resetAnalyticsData()
    await ga.logEvent('next_event')
    await (ga as any).flushEvents()

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('en=next_event')
    expect(String(url)).not.toContain('uid=')
  })
})
