# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: 見積システム
      - generic [ref=e6]: メールアドレスとパスワードでログイン
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: メールアドレス
        - textbox "メールアドレス" [ref=e11]:
          - /placeholder: your.email@example.com
          - text: approver@example.com
      - generic [ref=e12]:
        - generic [ref=e13]: パスワード
        - textbox "パスワード" [ref=e14]:
          - /placeholder: ••••••••
          - text: password123
      - generic [ref=e15]: メールアドレスまたはパスワードが正しくありません
      - button "ログイン" [ref=e16]
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - img [ref=e23]
  - alert [ref=e28]
```