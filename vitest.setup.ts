import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// クリーンアップを各テスト後に実行
afterEach(() => {
  cleanup()
})
