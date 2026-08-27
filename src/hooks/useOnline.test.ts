import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOnline } from './useOnline'

afterEach(() => {
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
})

describe('useOnline', () => {
  it('parte do navigator.onLine atual', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(false)
  })

  it('reage aos eventos online/offline', () => {
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)

    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current).toBe(false)

    act(() => window.dispatchEvent(new Event('online')))
    expect(result.current).toBe(true)
  })
})
