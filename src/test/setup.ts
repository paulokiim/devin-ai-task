import '@testing-library/jest-dom/vitest'

if (typeof globalThis.NodeFilter === 'undefined') {
  Object.defineProperty(globalThis, 'NodeFilter', {
    value: window.NodeFilter,
  })
}
