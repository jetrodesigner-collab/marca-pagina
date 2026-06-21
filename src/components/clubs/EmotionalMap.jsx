import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const MOOD_EMOJIS = {
  'Medo': '😱',
  'Suspense': '🤔',
  'Tristeza': '💔',
  'Divertido': '😂',
  'Surpresa': '😮',
}

const NUM_POINTS = 8

function buildChartData(members, moods, pageEnd) {
  if (!pageEnd || pageEnd <= 0 || !members.length) return []

  const moodMap = {}
  moods.forEach(m => { moodMap[m.user_id] = m.mood })

  return Array.from({ length: NUM_POINTS + 1 }, (_, i) => {
    const page = Math.round((i / NUM_POINTS) * pageEnd)
    const bucketLow = i === 0 ? 0 : Math.round(((i - 0.5) / NUM_POINTS) * pageEnd)
    const bucketHigh = i === NUM_POINTS
      ? pageEnd
      : Math.round(((i + 0.5) / NUM_POINTS) * pageEnd)

    const inBucket = members.filter(m => {
      const pg = m.pagina_atual || 0
      return pg >= bucketLow && pg <= bucketHigh
    })

    const moodCounts = {}
    inBucket.forEach(m => {
      const mood = moodMap[m.user_id]
      if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1
    })

    const withMood = Object.values(moodCounts).reduce((s, v) => s + v, 0)
    const intensity = members.length > 0
      ? Math.round((withMood / members.length) * 100)
      : 0

    const dominantMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null

    return {
      page,
      intensity,
      emoji: dominantMood ? MOOD_EMOJIS[dominantMood] : null,
      mood: dominantMood,
      count: withMood,
    }
  })
}

function EmotionDot(props) {
  const { cx, cy, payload } = props
  if (!payload?.emoji || !payload?.count) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#7EE8A2" style={{ filter: 'drop-shadow(0 0 5px #7EE8A2)' }} />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="14">{payload.emoji}</text>
    </g>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--sur)',
      border: '1px solid rgba(196,168,240,.12)',
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 11,
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'none',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7EE8A2', boxShadow: '0 0 6px #7EE8A2', flexShrink: 0 }} />
      <span>Pág. {d.page}</span>
      {d.emoji && <span>{d.emoji} {d.mood}</span>}
      <span style={{ color: '#7EE8A2', fontWeight: 700 }}>{d.intensity}%</span>
    </div>
  )
}

export default function EmotionalMap({ clubId, activeMeta, members }) {
  const [moods, setMoods] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('club_moods')
        .select('user_id, mood')
        .eq('club_id', clubId)
      setMoods(data || [])
    } catch {
      setMoods([])
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    load()
  }, [load, activeMeta?.id])

  // Realtime: recarrega quando qualquer humor for salvo neste clube
  useEffect(() => {
    if (!clubId) return
    const channel = supabase
      .channel(`club-moods-${clubId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'club_moods',
        filter: `club_id=eq.${clubId}`,
      }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [clubId, load])

  const pageEnd = activeMeta?.pagina_fim ?? null

  const chartData = useMemo(
    () => buildChartData(members, moods, pageEnd || 0),
    [members, moods, pageEnd],
  )

  const hasMoods = moods.length > 0
  const hasPageEnd = Boolean(pageEnd)

  const peakPoint = chartData.length
    ? chartData.reduce((mx, d) => (d.intensity > mx.intensity ? d : mx), chartData[0])
    : null

  const moodCounts = {}
  moods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1 })
  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="cl-mood" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
        {hasPageEnd ? `Clima da leitura · Pág. 0–${pageEnd}` : 'Mapa Emocional do Grupo'}
      </div>

      {/* Sem meta com página final configurada */}
      {!hasPageEnd && (
        <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Defina a página final da meta
            <br />
            <span style={{ fontSize: 11, color: 'rgba(90,84,104,1)' }}>
              O mapa emocional fica disponível assim que a meta tiver uma página-alvo.
            </span>
          </div>
        </div>
      )}

      {hasPageEnd && loading && (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Carregando...
        </div>
      )}

      {hasPageEnd && !loading && !hasMoods && (
        <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🌫️</span>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Nenhum humor registrado ainda.
            <br />
            <span style={{ fontSize: 11, color: 'rgba(90,84,104,1)' }}>
              O mapa emocional aparece quando os membros registrarem humor.
            </span>
          </div>
        </div>
      )}

      {hasPageEnd && !loading && hasMoods && (
        <>
          {peakPoint?.emoji && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(42,38,55,1)',
              border: '1px solid rgba(196,168,240,.12)',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11,
              color: 'var(--text)',
              marginBottom: 10,
              whiteSpace: 'nowrap',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7EE8A2', boxShadow: '0 0 6px #7EE8A2', flexShrink: 0 }} />
              <span>Pág. {peakPoint.page} — Tensão máxima {peakPoint.emoji}</span>
              <span style={{ color: '#7EE8A2', fontWeight: 700 }}>+{peakPoint.intensity}%</span>
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={chartData} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="emotionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7EE8A2" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7EE8A2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="page"
                  tick={{ fontSize: 10, fill: 'rgba(90,84,104,1)', fontFamily: 'Figtree, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="intensity"
                  stroke="#7EE8A2"
                  strokeWidth={2.5}
                  fill="url(#emotionAreaGrad)"
                  dot={<EmotionDot />}
                  activeDot={{ r: 5, fill: '#7EE8A2', stroke: 'none' }}
                  className="cl-emotion-curve"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {topMoods.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7EE8A2', boxShadow: '0 0 5px #7EE8A2', flexShrink: 0 }} />
                <span>Intensidade do grupo</span>
              </div>
              {topMoods.map(([mood, count]) => (
                <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ fontSize: 12 }}>{MOOD_EMOJIS[mood]}</span>
                  <span>{mood} · {count} {count === 1 ? 'leitor' : 'leitores'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
