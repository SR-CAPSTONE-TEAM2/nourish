import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ParallaxScrollView from '@/components/parallax-scroll-view'
import { useTheme } from '@/context/theme-context'

type Chemical = {
  id: string
  dtxsid: string
  preferred_name: string
  casrn: string | null
  molecular_formula: string | null
  category: string[] | null
  source_tags: string[] | null
}

type Pesticide = {
  id: number
  name: string
  cas_number: string | null
  pesticide_type: string | null
  primary_concern: string | null
  commonly_found_on: string[] | null
}

type SearchResult =
  | { type: 'chemical'; data: Chemical }
  | { type: 'pesticide'; data: Pesticide }

export default function SearchScreen() {
  const { isDark, colors } = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const bg = isDark ? '#141414' : '#FAFAFA'
  const cardBg = isDark ? '#1e1e1e' : '#FFFFFF'
  const cardBorder = isDark ? '#2a2a2a' : '#E5E5E7'
  const textColor = isDark ? '#e0e0e0' : '#111111'
  const textMuted = isDark ? '#555' : '#999'
  const inputBg = isDark ? '#1e1e1e' : '#F0F0F0'
  const headingColor = isDark ? '#f0f0f0' : '#111111'
  const detailValueColor = isDark ? '#bbb' : '#333'

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setSearched(true)
    setExpanded(null)

    const searchPattern = `%${trimmed}%`

    const [chemicalsRes, pesticidesRes] = await Promise.all([
      supabase
        .from('chemicals')
        .select('id, dtxsid, preferred_name, casrn, molecular_formula, category, source_tags')
        .or(`preferred_name.ilike.${searchPattern},casrn.ilike.${searchPattern},dtxsid.ilike.${searchPattern}`)
        .limit(20),
      supabase
        .from('pesticides')
        .select('id, name, cas_number, pesticide_type, primary_concern, commonly_found_on')
        .or(`name.ilike.${searchPattern},cas_number.ilike.${searchPattern}`)
        .limit(20),
    ])

    const combined: SearchResult[] = [
      ...(chemicalsRes.data ?? []).map((c) => ({ type: 'chemical' as const, data: c })),
      ...(pesticidesRes.data ?? []).map((p) => ({ type: 'pesticide' as const, data: p })),
    ]

    setResults(combined)
    setLoading(false)
  }

  const getResultKey = (item: SearchResult) =>
    item.type === 'chemical' ? `c-${item.data.id}` : `p-${item.data.id}`

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key))
  }

  const scrollbarTrack = isDark ? '#1a1a1a' : '#f0f0f0'
  const scrollbarThumb = isDark ? '#333' : '#ccc'
  const hoverBorder = isDark ? '#444' : '#ccc'
  const focusBorder = '#8B5CF6'
  const spinnerBorder = isDark ? '#333' : '#ddd'

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F5F5', dark: '#1C1C2E' }}>
      <div style={{
        minHeight: '100vh',
        background: bg,
        color: textColor,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: '0',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
          * { box-sizing: border-box; }
          .search-input:focus { outline: none; border-color: ${focusBorder} !important; }
          .result-card { transition: border-color 0.2s, transform 0.15s; }
          .result-card:hover { border-color: ${hoverBorder} !important; transform: translateY(-1px); }
          .search-btn { transition: background 0.2s, transform 0.15s; }
          .search-btn:hover { background: #7C4FE0 !important; transform: translateY(-1px); }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: ${scrollbarTrack}; }
          ::-webkit-scrollbar-thumb { background: ${scrollbarThumb}; border-radius: 3px; }
        `}</style>

        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px',
              fontWeight: '700',
              color: headingColor,
              margin: '0 0 6px 0',
            }}>
              Search
            </h1>
            <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>
              Look up chemicals and pesticides in the database
            </p>
          </div>

          {/* Search Bar */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '28px',
          }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search by name or CAS number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                height: '48px',
                background: inputBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '14px',
                padding: '0 18px',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                color: textColor,
                outline: 'none',
              }}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              style={{
                height: '48px',
                padding: '0 24px',
                background: '#8B5CF6',
                border: 'none',
                borderRadius: '14px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '40px 0',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: `3px solid ${spinnerBorder}`,
                borderTopColor: '#8B5CF6',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {/* No Results */}
          {!loading && searched && results.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 0',
              color: textMuted,
              fontSize: '14px',
            }}>
              No results found.
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Result Count */}
              <div style={{
                fontSize: '12px',
                color: textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>

              {results.map((item) => {
                const key = getResultKey(item)
                const isExpanded = expanded === key
                const isChemical = item.type === 'chemical'
                const chemical = isChemical ? (item.data as Chemical) : null
                const pesticide = !isChemical ? (item.data as Pesticide) : null
                const name = chemical?.preferred_name ?? pesticide?.name ?? ''
                const cas = chemical?.casrn ?? pesticide?.cas_number ?? null

                return (
                  <div
                    key={key}
                    className="result-card"
                    onClick={() => toggleExpand(key)}
                    style={{
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: '16px',
                      padding: '18px 22px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#fff',
                        background: isChemical ? '#8B5CF6' : '#f97316',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {isChemical ? 'Chemical' : 'Pesticide'}
                      </span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: textColor,
                        flex: 1,
                      }}>
                        {name}
                      </span>
                      <span style={{
                        fontSize: '18px',
                        color: textMuted,
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}>
                        &#9662;
                      </span>
                    </div>

                    {/* CAS Number */}
                    {cas && (
                      <div style={{
                        fontSize: '13px',
                        color: textMuted,
                        marginTop: '6px',
                        fontFamily: "'DM Sans', monospace",
                      }}>
                        CAS: {cas}
                      </div>
                    )}

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '14px',
                        paddingTop: '14px',
                        borderTop: `1px solid ${cardBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        {/* Chemical details */}
                        {chemical && (
                          <>
                            <DetailRow label="DTXSID" value={chemical.dtxsid} labelColor={textMuted} valueColor={detailValueColor} />
                            {chemical.molecular_formula && (
                              <DetailRow label="Formula" value={chemical.molecular_formula} labelColor={textMuted} valueColor={detailValueColor} />
                            )}
                            {chemical.category && chemical.category.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {chemical.category.map((cat) => (
                                  <span key={cat} style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    color: '#a78bfa',
                                  }}>
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                            {chemical.source_tags && chemical.source_tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                {chemical.source_tags.map((tag) => (
                                  <span key={tag} style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    background: 'rgba(249, 115, 22, 0.15)',
                                    color: '#f97316',
                                  }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Pesticide details */}
                        {pesticide && (
                          <>
                            {pesticide.pesticide_type && (
                              <DetailRow label="Type" value={pesticide.pesticide_type} labelColor={textMuted} valueColor={detailValueColor} />
                            )}
                            {pesticide.primary_concern && (
                              <DetailRow label="Concern" value={pesticide.primary_concern} color="#fb7185" labelColor={textMuted} valueColor={detailValueColor} />
                            )}
                            {pesticide.commonly_found_on && pesticide.commonly_found_on.length > 0 && (
                              <div>
                                <div style={{
                                  fontSize: '11px',
                                  color: textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: '6px',
                                  marginTop: '4px',
                                }}>
                                  Commonly found on
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {pesticide.commonly_found_on.map((item) => (
                                    <span key={item} style={{
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      background: 'rgba(249, 115, 22, 0.15)',
                                      color: '#f97316',
                                    }}>
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </ParallaxScrollView>
  )
}

function DetailRow({ label, value, color, labelColor, valueColor }: { label: string; value: string; color?: string; labelColor?: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
      <span style={{
        fontSize: '11px',
        color: labelColor ?? '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        minWidth: '70px',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '14px',
        color: color ?? valueColor ?? '#bbb',
        fontWeight: '500',
      }}>
        {value}
      </span>
    </div>
  )
}
