import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { analyzeFoodItem, isOllamaConfigured, type FoodAnalysisResult } from '@/lib/ollama'
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
  
  const bg = colors.background
  const textColor = colors.text
  const headingColor = colors.text
  const textMuted = colors.textMuted
  const inputBg = colors.inputBackground
  const cardBorder = colors.border
  const cardBg = colors.surface
  const detailValueColor = colors.text

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Ollama food analysis state
  const [foodQuery, setFoodQuery] = useState('')
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisSearched, setAnalysisSearched] = useState(false)

  const handleFoodAnalysis = async () => {
    const trimmed = foodQuery.trim()
    if (!trimmed) return

    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    setAnalysisSearched(true)

    try {
      const result = await analyzeFoodItem(trimmed)
      setAnalysisResult(result)
    } catch (err: any) {
      setAnalysisError(err.message ?? 'Failed to analyze food item')
    } finally {
      setAnalysisLoading(false)
    }
  }

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

          {/* AI Food Analysis Section */}
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #2a2a2a',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '32px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#aaa', letterSpacing: '0.04em' }}>
                AI FOOD ANALYSIS
              </span>
              <span style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '600',
                background: isOllamaConfigured() ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
                color: isOllamaConfigured() ? '#34d399' : '#fb7185',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {isOllamaConfigured() ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p style={{ color: '#555', fontSize: '13px', margin: '0 0 16px 0' }}>
              Enter a food item to analyze its ingredients for chemical and pesticide risks
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                className="search-input"
                type="text"
                placeholder="e.g. Big Mac, organic banana, store-bought milk..."
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFoodAnalysis()}
                disabled={!isOllamaConfigured()}
                style={{
                  flex: 1,
                  height: '48px',
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  borderRadius: '14px',
                  padding: '0 18px',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#e0e0e0',
                  outline: 'none',
                  opacity: isOllamaConfigured() ? 1 : 0.5,
                }}
              />
              <button
                className="search-btn"
                onClick={handleFoodAnalysis}
                disabled={!isOllamaConfigured() || analysisLoading}
                style={{
                  height: '48px',
                  padding: '0 24px',
                  background: '#34d399',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#141414',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: isOllamaConfigured() ? 'pointer' : 'not-allowed',
                  opacity: isOllamaConfigured() ? 1 : 0.5,
                }}
              >
                Analyze
              </button>
            </div>

            {/* Analysis Loading */}
            {analysisLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '20px 0',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '3px solid #333',
                  borderTopColor: '#34d399',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ color: '#666', fontSize: '13px' }}>
                  Analyzing with MedGemma...
                </span>
              </div>
            )}

            {/* Analysis Error */}
            {analysisError && (
              <div style={{
                marginTop: '16px',
                padding: '14px 18px',
                background: 'rgba(251, 113, 133, 0.1)',
                border: '1px solid rgba(251, 113, 133, 0.2)',
                borderRadius: '12px',
                color: '#fb7185',
                fontSize: '13px',
              }}>
                {analysisError}
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Overall Score & Summary */}
                <div style={{
                  display: 'flex',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    background: '#141414',
                    border: '1px solid #2a2a2a',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    minWidth: '140px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                      Risk Score
                    </div>
                    <span style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      fontFamily: "'Outfit', sans-serif",
                      color: analysisResult.overall_risk_score >= 3 ? '#34d399'
                        : analysisResult.overall_risk_score >= -2 ? '#f59e0b'
                        : '#fb7185',
                    }}>
                      {analysisResult.overall_risk_score > 0 ? '+' : ''}{analysisResult.overall_risk_score}
                    </span>
                    <span style={{ fontSize: '12px', color: '#555', marginLeft: '4px' }}>/10</span>
                  </div>
                  <div style={{
                    background: '#141414',
                    border: '1px solid #2a2a2a',
                    borderRadius: '16px',
                    padding: '18px 22px',
                    flex: 1,
                    minWidth: '200px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                      Summary
                    </div>
                    <div style={{ fontSize: '14px', color: '#bbb', lineHeight: '1.5' }}>
                      {analysisResult.summary}
                    </div>
                  </div>
                </div>

                {/* Ingredients Breakdown */}
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Ingredients ({analysisResult.ingredients.length})
                </div>
                {analysisResult.ingredients.map((ing, i) => (
                  <div key={i} style={{
                    background: '#141414',
                    border: '1px solid #2a2a2a',
                    borderRadius: '14px',
                    padding: '16px 20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0' }}>
                        {ing.name}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        padding: '2px 10px',
                        borderRadius: '8px',
                        background: ing.risk_score >= 3 ? 'rgba(52, 211, 153, 0.15)'
                          : ing.risk_score >= -2 ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(251, 113, 133, 0.15)',
                        color: ing.risk_score >= 3 ? '#34d399'
                          : ing.risk_score >= -2 ? '#f59e0b'
                          : '#fb7185',
                      }}>
                        {ing.risk_score > 0 ? '+' : ''}{ing.risk_score}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#777', lineHeight: '1.4', marginBottom: '10px' }}>
                      {ing.reasoning}
                    </div>

                    {ing.chemicals.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Chemicals:{' '}
                        </span>
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
                          {ing.chemicals.map((c) => (
                            <span key={c} style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#a78bfa',
                            }}>
                              {c}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {ing.pesticides.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Pesticides:{' '}
                        </span>
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
                          {ing.pesticides.map((p) => (
                            <span key={p} style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              background: 'rgba(249, 115, 22, 0.15)',
                              color: '#f97316',
                            }}>
                              {p}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #2a2a2a',
            marginBottom: '28px',
          }} />

          {/* Database Search Header */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#aaa', letterSpacing: '0.04em' }}>
              DATABASE LOOKUP
            </div>
            <p style={{ color: '#555', fontSize: '13px', margin: '4px 0 0 0' }}>
              Search chemicals and pesticides directly in the database
            </p>
          </div>

          {/* Database Search Bar */}
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
