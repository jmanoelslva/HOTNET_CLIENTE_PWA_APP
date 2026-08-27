import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Sem "test.globals: true" no vitest.config.ts, o auto-cleanup do Testing
// Library (baseado em afterEach global) não é registrado sozinho — cada
// render() ficaria no DOM pro teste seguinte sem isso.
afterEach(() => {
  cleanup()
})
