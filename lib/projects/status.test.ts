import { describe, it, expect } from 'vitest'
import { deriveProjectStatus } from './status'

describe('status', () => {
  describe('deriveProjectStatus', () => {
    it('ステータスがnullの場合はデフォルトで「リード」を返す', () => {
      const project = {
        status: null,
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('ステータスがundefinedの場合はデフォルトで「リード」を返す', () => {
      const project = {
        status: undefined,
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('手動設定のステータスをそのまま返す: リード', () => {
      const project = {
        status: 'リード',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('手動設定のステータスをそのまま返す: 見積中', () => {
      const project = {
        status: '見積中',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('見積中')
    })

    it('手動設定のステータスをそのまま返す: 受注', () => {
      const project = {
        status: '受注',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('受注')
    })

    it('手動設定のステータスをそのまま返す: 計上OK', () => {
      const project = {
        status: '計上OK',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('計上OK')
    })

    it('手動設定のステータスをそのまま返す: 計上済み', () => {
      const project = {
        status: '計上済み',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('計上済み')
    })

    it('手動設定のステータスをそのまま返す: 失注', () => {
      const project = {
        status: '失注',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('失注')
    })

    it('手動設定のステータスをそのまま返す: キャンセル', () => {
      const project = {
        status: 'キャンセル',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('キャンセル')
    })

    it('承認済み見積がある場合は「見積中」を返す（自動推論）', () => {
      const project = {
        status: '自動ステータス', // 手動ステータス以外
        quotes: [
          { approval_status: '下書き' },
          { approval_status: '承認済み' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('見積中')
    })

    it('承認済み見積がない場合は「リード」を返す（自動推論）', () => {
      const project = {
        status: '自動ステータス', // 手動ステータス以外
        quotes: [
          { approval_status: '下書き' },
          { approval_status: '却下' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('見積がnullの場合は「リード」を返す', () => {
      const project = {
        status: '自動ステータス',
        quotes: null,
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('見積がundefinedの場合は「リード」を返す', () => {
      const project = {
        status: '自動ステータス',
        quotes: undefined,
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('見積が空配列の場合は「リード」を返す', () => {
      const project = {
        status: '自動ステータス',
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('見積のapproval_statusがnullの場合は承認済みとみなさない', () => {
      const project = {
        status: '自動ステータス',
        quotes: [
          { approval_status: null },
          { approval_status: null },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('複数の見積があり、一つでも承認済みなら「見積中」を返す', () => {
      const project = {
        status: '自動ステータス',
        quotes: [
          { approval_status: '下書き' },
          { approval_status: '承認済み' },
          { approval_status: '却下' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('見積中')
    })

    it('手動ステータスが設定されている場合は、見積の状態に関わらずそのまま返す', () => {
      const project = {
        status: '受注',
        quotes: [
          { approval_status: '下書き' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('受注')
    })

    it('手動ステータス「失注」は見積の状態に関わらず返す', () => {
      const project = {
        status: '失注',
        quotes: [
          { approval_status: '承認済み' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('失注')
    })

    it('エッジケース: quotesプロパティがない場合', () => {
      const project = {
        status: '自動ステータス',
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('エッジケース: 見積の承認ステータスが「承認申請中」の場合', () => {
      const project = {
        status: '自動ステータス',
        quotes: [
          { approval_status: '承認申請中' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('エッジケース: 大文字小文字の違いは区別する', () => {
      const project = {
        status: '承認済み', // 「承認済み」は手動ステータスにない
        quotes: [],
      }

      // 手動ステータスにないため、見積の状態を確認
      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('実践的なケース: 新規リード（ステータス未設定、見積なし）', () => {
      const project = {
        status: null,
        quotes: [],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('実践的なケース: 見積作成中（下書き見積のみ）', () => {
      const project = {
        status: null,
        quotes: [
          { approval_status: '下書き' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('リード')
    })

    it('実践的なケース: 見積承認済み', () => {
      const project = {
        status: '自動', // null だと 'リード' になるので、手動ステータスでない値を設定
        quotes: [
          { approval_status: '承認済み' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('見積中')
    })

    it('実践的なケース: 受注済み（手動でステータス変更）', () => {
      const project = {
        status: '受注',
        quotes: [
          { approval_status: '承認済み' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('受注')
    })

    it('実践的なケース: 計上完了（手動でステータス変更）', () => {
      const project = {
        status: '計上済み',
        quotes: [
          { approval_status: '承認済み' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('計上済み')
    })

    it('実践的なケース: 失注（手動でステータス変更）', () => {
      const project = {
        status: '失注',
        quotes: [
          { approval_status: '却下' },
        ],
      }

      expect(deriveProjectStatus(project)).toBe('失注')
    })
  })
})
