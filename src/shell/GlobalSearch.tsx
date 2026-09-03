import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Caption1,
  SearchBox,
  Text,
} from '@fluentui/react-components'
import { usePrototype } from '../core/PrototypeContext'
import { useSearchResults, type SearchResult } from './useSearchResults'

/**
 * Command-palette style global search. Filters a compact result panel across
 * pages, KYC cases, refunds and feature flags, then navigates on selection.
 */
export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { notify } = usePrototype()
  const results = useSearchResults(query)
  const showPanel = open && query.trim().length > 0

  useEffect(() => {
    const onDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
        return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable)
        return
      event.preventDefault()
      inputRef.current?.focus()
      setOpen(true)
    }
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [])

  const select = (result: SearchResult) => {
    navigate(result.path)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    notify('Opened from search', `${result.kind}: ${result.title}`, 'info')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (!showPanel || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(
        (current) => (current - 1 + results.length) % results.length,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      select(results[Math.min(activeIndex, results.length - 1)])
    }
  }

  return (
    <div className="shell-search">
      <SearchBox
        ref={inputRef}
        className="shell-search-input"
        placeholder="Search cases, refunds, flags…"
        aria-label="Search cases, refunds and feature flags"
        aria-expanded={showPanel}
        aria-controls="shell-search-results"
        role="combobox"
        value={query}
        onChange={(_event, data) => {
          setQuery(data.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showPanel ? (
        <div
          className="shell-search-panel"
          id="shell-search-results"
          role="listbox"
          aria-label="Search results"
        >
          <div className="shell-search-panel-head">
            <Caption1>
              {results.length === 0
                ? 'No matches in the mocked data'
                : `${results.length} result${results.length === 1 ? '' : 's'} · ↑↓ to move, Enter to open`}
            </Caption1>
            <Button
              size="small"
              appearance="subtle"
              onClick={() => {
                setQuery('')
                setOpen(false)
              }}
            >
              Clear
            </Button>
          </div>
          {results.length === 0 ? (
            <div className="shell-search-empty">
              <Text size={200}>
                Try a case id such as “KYC-2026”, a refund id such as “RF-10”,
                or a flag key.
              </Text>
            </div>
          ) : (
            <ul className="shell-search-list">
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={
                      index === activeIndex
                        ? 'shell-search-item shell-search-item-active'
                        : 'shell-search-item'
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(result)}
                  >
                    <span className="shell-search-item-main">
                      <Text weight="semibold" size={200}>
                        {result.title}
                      </Text>
                      <Caption1 className="shell-muted">
                        {result.subtitle}
                      </Caption1>
                    </span>
                    <Badge appearance="tint" color="informative" size="small">
                      {result.kind}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
