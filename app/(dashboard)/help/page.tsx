'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'

interface HelpArticle {
  id: string
  title: string
  content: string
  category: string
  audience: string
}

export default function HelpPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/help').then((r) => r.json()).then(setArticles).finally(() => setLoading(false))
  }, [])

  const filtered = articles.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
  })

  // カテゴリでグループ化
  const categories = Array.from(new Set(filtered.map((a) => a.category)))
  const grouped = categories.map((cat) => ({
    category: cat,
    articles: filtered.filter((a) => a.category === cat),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ヘルプ</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          ContactHub の使い方をご確認いただけます
        </p>
      </div>

      {/* 検索 */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワードで検索..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[hsl(var(--muted-foreground))]">
            {search ? '該当するヘルプ記事が見つかりません' : 'ヘルプ記事がまだありません'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.category}>
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
                {group.category}
              </h2>
              <Card>
                <CardContent className="p-0">
                  {group.articles.map((article, i) => {
                    const isExpanded = expandedId === article.id
                    return (
                      <div key={article.id} className={i > 0 ? 'border-t border-[hsl(var(--border))]' : ''}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[hsl(var(--accent))] transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
                          ) : (
                            <ChevronRight size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
                          )}
                          <span className="font-medium text-sm">{article.title}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pl-11">
                            <div className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed bg-[hsl(var(--secondary))] rounded-lg p-4">
                              {article.content}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
