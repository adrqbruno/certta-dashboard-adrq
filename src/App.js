import React, { useState, useEffect } from 'react';

// ============================================
// CONFIGURAÇÃO - ATUALIZE ESTAS URLs
// ============================================
// Após publicar sua planilha Google Sheets:
// 1. Arquivo > Compartilhar > Publicar na Web
// 2. Selecione a aba "competitors" > CSV > Publicar
// 3. Copie a URL e cole abaixo
// 4. Repita para a aba "config"

const SHEETS_CONFIG = {
  // URL da aba "competitors" publicada como CSV
  competitorsUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1560647113&single=true&output=csv',
  
  // URL da aba "config" publicada como CSV  
  configUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=109836250&single=true&output=csv',
  
  // Se as URLs acima não estiverem configuradas, usa dados de fallback
  useFallback: true
};

// Dados de fallback (usados enquanto Google Sheets não está configurado)
const FALLBACK_DATA = {
  lastUpdated: "Fev 2026",
  competitors: [
    { domain: 'unico.io', name: 'Unico', tier: 'leader', organicKeywords: 4500, keywordsTrend: 12.91, organicTraffic: 39300, trafficTrend: -3.45, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 2900, refTrend: -3.5, authorityScore: 36, authorityChange: -3, isOwn: false, highlight: false },
    { domain: 'clear.sale', name: 'ClearSale', tier: 'leader', organicKeywords: 3800, keywordsTrend: 6.67, organicTraffic: 19700, trafficTrend: 1.77, paidKeywords: 5, paidTrend: 25, paidTraffic: 994, paidTrafficTrend: 26.14, refDomains: 3400, refTrend: -4.66, authorityScore: 42, authorityChange: -1, isOwn: false, highlight: false },
    { domain: 'idwall.co', name: 'idwall', tier: 'competitor', organicKeywords: 2600, keywordsTrend: -0.83, organicTraffic: 12300, trafficTrend: -4.67, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 1600, refTrend: -3.58, authorityScore: 34, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'jumio.com', name: 'Jumio', tier: 'global', organicKeywords: 170, keywordsTrend: -3.41, organicTraffic: 517, trafficTrend: 1.77, paidKeywords: 1, paidTrend: -50, paidTraffic: 2, paidTrafficTrend: -71.43, refDomains: 8800, refTrend: 0.4, authorityScore: 42, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'caf.io', name: 'CAF (legacy)', tier: 'legacy', organicKeywords: 681, keywordsTrend: -20.35, organicTraffic: 1300, trafficTrend: -13.23, paidKeywords: 2, paidTrend: -33.33, paidTraffic: 54, paidTrafficTrend: -37.93, refDomains: 3300, refTrend: 1.95, authorityScore: 30, authorityChange: 0, isOwn: true, highlight: false },
    { domain: 'certta.ai', name: 'Certta', tier: 'new', organicKeywords: 76, keywordsTrend: 216.67, organicTraffic: 60, trafficTrend: 71.43, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 646, refTrend: 1645.95, authorityScore: 18, authorityChange: 16, isOwn: true, highlight: true }
  ]
};

// Parser de CSV
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (['organicKeywords', 'organicTraffic', 'paidKeywords', 'paidTraffic', 'refDomains', 'authorityScore', 'authorityChange'].includes(header)) {
        value = parseInt(value) || 0;
      } else if (['keywordsTrend', 'trafficTrend', 'paidTrend', 'paidTrafficTrend', 'refTrend'].includes(header)) {
        value = parseFloat(value) || 0;
      } else if (['isOwn', 'highlight'].includes(header)) {
        value = value.toUpperCase() === 'TRUE';
      }
      row[header] = value;
    });
    data.push(row);
  }
  return data;
}

function App() {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCompetitor, setHoveredCompetitor] = useState(null);
  const [competitors, setCompetitors] = useState(FALLBACK_DATA.competitors);
  const [lastUpdated, setLastUpdated] = useState(FALLBACK_DATA.lastUpdated);
  const [dataSource, setDataSource] = useState('fallback');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (SHEETS_CONFIG.competitorsUrl.includes('COLE_AQUI')) {
        setDataSource('fallback');
        setLoading(false);
        return;
      }

      try {
        const competitorsResponse = await fetch(SHEETS_CONFIG.competitorsUrl);
        const competitorsCSV = await competitorsResponse.text();
        const competitorsData = parseCSV(competitorsCSV);
        
        if (competitorsData.length > 0) {
          setCompetitors(competitorsData);
          setDataSource('sheets');
        }

        if (!SHEETS_CONFIG.configUrl.includes('COLE_AQUI')) {
          const configResponse = await fetch(SHEETS_CONFIG.configUrl);
          const configCSV = await configResponse.text();
          const configData = parseCSV(configCSV);
          const lastUpdatedRow = configData.find(row => row.key === 'lastUpdated');
          if (lastUpdatedRow) {
            setLastUpdated(lastUpdatedRow.value);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do Google Sheets:', error);
        setDataSource('fallback');
      }
      
      setLoading(false);
    }

    fetchData();
  }, []);

  // Computed data
  const certtaData = competitors.find(c => c.domain === 'certta.ai') || {};
  const cafData = competitors.find(c => c.domain === 'caf.io') || {};
  
  // Combined Certta metrics (certta.ai + caf.io)
  const certtaCombined = {
    organicKeywords: (certtaData.organicKeywords || 0) + (cafData.organicKeywords || 0),
    organicTraffic: (certtaData.organicTraffic || 0) + (cafData.organicTraffic || 0),
    refDomains: (certtaData.refDomains || 0) + (cafData.refDomains || 0),
    authorityScore: Math.max(certtaData.authorityScore || 0, cafData.authorityScore || 0),
    paidPresence: (certtaData.paidTraffic || 0) + (cafData.paidTraffic || 0)
  };

  const spiderCompetitors = [
    {
      name: 'Certta (combined)',
      color: '#10b981',
      ...certtaCombined
    },
    ...competitors
      .filter(c => !c.isOwn && c.tier !== 'enterprise')
      .slice(0, 4)
      .map((c, idx) => ({
        name: c.name,
        color: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'][idx],
        organicKeywords: c.organicKeywords,
        organicTraffic: c.organicTraffic,
        refDomains: c.refDomains,
        authorityScore: c.authorityScore,
        paidPresence: c.paidTraffic + c.paidKeywords
      }))
  ];

  const maxValues = {
    organicKeywords: Math.max(...spiderCompetitors.map(c => c.organicKeywords)),
    organicTraffic: Math.max(...spiderCompetitors.map(c => c.organicTraffic)),
    refDomains: Math.max(...spiderCompetitors.map(c => c.refDomains)),
    authorityScore: 100,
    paidPresence: Math.max(...spiderCompetitors.map(c => c.paidPresence)) || 1
  };

  const normalizeData = (competitor) => ({
    name: competitor.name,
    color: competitor.color,
    values: [
      (competitor.organicKeywords / maxValues.organicKeywords) * 100,
      (competitor.organicTraffic / maxValues.organicTraffic) * 100,
      (competitor.refDomains / maxValues.refDomains) * 100,
      competitor.authorityScore,
      (competitor.paidPresence / maxValues.paidPresence) * 100
    ]
  });

  const normalizedData = spiderCompetitors.map(normalizeData);
  const axes = ['Organic Keywords', 'Organic Traffic', 'Ref Domains', 'Authority Score', 'Paid Presence'];
  const numAxes = axes.length;

  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  const getPoint = (value, axisIndex) => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const getPolygonPoints = (values) => {
    return values.map((value, i) => {
      const point = getPoint(value, i);
      return `${point.x},${point.y}`;
    }).join(' ');
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTrendColor = (value) => {
    if (value > 10) return '#10b981';
    if (value > 0) return '#6ee7b7';
    if (value > -10) return '#fbbf24';
    return '#ef4444';
  };

  const getTrendIcon = (value) => {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '—';
  };

  const getAuthorityColor = (score) => {
    if (score >= 60) return '#7c3aed';
    if (score >= 40) return '#3b82f6';
    if (score >= 25) return '#06b6d4';
    return '#94a3b8';
  };

  const getTierBadge = (tier) => {
    const styles = {
      enterprise: { bg: '#7c3aed20', color: '#7c3aed', label: 'Enterprise' },
      leader: { bg: '#3b82f620', color: '#3b82f6', label: 'Market Leader' },
      competitor: { bg: '#06b6d420', color: '#06b6d4', label: 'Direct Competitor' },
      global: { bg: '#f59e0b20', color: '#f59e0b', label: 'Global Player' },
      legacy: { bg: '#ef444420', color: '#ef4444', label: 'Legacy Domain' },
      new: { bg: '#10b98120', color: '#10b981', label: 'New Domain' }
    };
    return styles[tier] || styles.competitor;
  };

  const migrationProgress = certtaData && cafData ? 
    Math.round(((certtaData.organicTraffic || 0) / ((certtaData.organicTraffic || 0) + (cafData.organicTraffic || 1))) * 100) : 0;

  // KPI Card Component
  const KpiCard = ({ label, value, trend, trendLabel, icon }) => (
    <div style={{
      background: '#0f172a',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #334155',
      minWidth: '140px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: '4px'
      }}>
        {value}
      </div>
      {trend !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: getTrendColor(trend),
          fontWeight: '500'
        }}>
          <span>{getTrendIcon(trend)}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span style={{ color: '#64748b', marginLeft: '4px' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>Carregando dados...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      minHeight: '100vh',
      padding: '32px',
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '8px',
          flexWrap: 'wrap'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '600',
            color: '#f8fafc',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            Competitive Authority Monitor
          </h1>
          <span style={{
            background: '#10b98120',
            color: '#10b981',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            LIVE
          </span>
          <span style={{
            background: dataSource === 'sheets' ? '#3b82f620' : '#f59e0b20',
            color: dataSource === 'sheets' ? '#3b82f6' : '#f59e0b',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {dataSource === 'sheets' ? '📊 Google Sheets' : '📁 Dados Locais'}
          </span>
        </div>
        <p style={{ 
          color: '#94a3b8', 
          fontSize: '14px',
          margin: 0 
        }}>
          SEO & Digital Authority benchmarking • Source: Semrush • Updated: {lastUpdated}
        </p>
      </div>

      {/* Migration Alert Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #4338ca40',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px'
      }}>
        <div>
          <div style={{ 
            fontSize: '12px', 
            color: '#a5b4fc', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Domain Migration Status
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '4px'
          }}>
            {migrationProgress}%
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#94a3b8' 
          }}>
            Traffic on certta.ai
          </div>
          <div style={{
            marginTop: '12px',
            background: '#1e293b',
            borderRadius: '8px',
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${migrationProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: '8px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#fca5a5', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ⚠️ Legacy Decay (caf.io)
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700',
            color: '#ef4444',
            marginBottom: '4px'
          }}>
            {cafData.trafficTrend || 0}%
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#94a3b8' 
          }}>
            Organic traffic MoM
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#86efac', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🚀 New Domain Growth (certta.ai)
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700',
            color: '#10b981',
            marginBottom: '4px'
          }}>
            +{certtaData.trafficTrend || 0}%
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#94a3b8' 
          }}>
            Organic traffic MoM
          </div>
        </div>
      </div>

      {/* Spider Chart Section */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #334155'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#f8fafc',
          marginBottom: '20px'
        }}>
          Competitive Positioning Radar
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 400px) 1fr',
          gap: '32px',
          alignItems: 'start'
        }}>
          {/* Spider Chart SVG */}
          <svg width="100%" viewBox="0 0 400 400" style={{ maxWidth: '400px' }}>
            {[20, 40, 60, 80, 100].map((percent, i) => (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={(percent / 100) * radius}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray={i === 4 ? "none" : "4,4"}
              />
            ))}
            
            {axes.map((_, i) => {
              const point = getPoint(100, i);
              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={point.x}
                  y2={point.y}
                  stroke="#334155"
                  strokeWidth="1"
                />
              );
            })}
            
            {axes.map((label, i) => {
              const point = getPoint(120, i);
              const isTop = i === 0;
              const isBottom = i === Math.floor(numAxes / 2);
              return (
                <text
                  key={i}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline={isTop ? "auto" : isBottom ? "hanging" : "middle"}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="500"
                >
                  {label}
                </text>
              );
            })}
            
            {normalizedData.map((competitor, idx) => (
              <polygon
                key={competitor.name}
                points={getPolygonPoints(competitor.values)}
                fill={`${competitor.color}15`}
                stroke={competitor.color}
                strokeWidth={hoveredCompetitor === idx || hoveredCompetitor === null ? "2" : "1"}
                opacity={hoveredCompetitor === null || hoveredCompetitor === idx ? 1 : 0.3}
                style={{ transition: 'all 0.2s ease' }}
              />
            ))}
            
            {normalizedData.map((competitor, idx) => (
              competitor.values.map((value, i) => {
                const point = getPoint(value, i);
                return (
                  <circle
                    key={`${competitor.name}-${i}`}
                    cx={point.x}
                    cy={point.y}
                    r={hoveredCompetitor === idx ? 5 : 4}
                    fill={competitor.color}
                    opacity={hoveredCompetitor === null || hoveredCompetitor === idx ? 1 : 0.3}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                );
              })
            ))}
            
            {[25, 50, 75, 100].map((percent, i) => (
              <text
                key={i}
                x={centerX + 5}
                y={centerY - (percent / 100) * radius}
                fill="#64748b"
                fontSize="9"
                dominantBaseline="middle"
              >
                {percent}%
              </text>
            ))}
          </svg>

          {/* Right side: Legend + KPIs + Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top row: Legend + KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '24px',
              alignItems: 'start'
            }}>
              {/* Legend */}
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Competitors
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {normalizedData.map((competitor, idx) => (
                    <div
                      key={competitor.name}
                      onMouseEnter={() => setHoveredCompetitor(idx)}
                      onMouseLeave={() => setHoveredCompetitor(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: hoveredCompetitor === idx ? '#33415530' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: competitor.color,
                        flexShrink: 0
                      }} />
                      <span style={{ 
                        fontSize: '13px',
                        fontWeight: competitor.name.includes('Certta') ? '600' : '400',
                        color: competitor.name.includes('Certta') ? '#10b981' : '#e2e8f0'
                      }}>
                        {competitor.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certta KPIs */}
              <div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🎯 Certta Combined Metrics
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px'
                }}>
                  <KpiCard 
                    icon="🔑"
                    label="Keywords"
                    value={formatNumber(certtaCombined.organicKeywords)}
                    trend={(certtaData.keywordsTrend || 0)}
                    trendLabel="MoM"
                  />
                  <KpiCard 
                    icon="📈"
                    label="Org. Traffic"
                    value={formatNumber(certtaCombined.organicTraffic)}
                    trend={(certtaData.trafficTrend || 0)}
                    trendLabel="MoM"
                  />
                  <KpiCard 
                    icon="🔗"
                    label="Ref Domains"
                    value={formatNumber(certtaCombined.refDomains)}
                    trend={(certtaData.refTrend || 0)}
                    trendLabel="MoM"
                  />
                  <KpiCard 
                    icon="⭐"
                    label="Authority"
                    value={certtaCombined.authorityScore}
                    trend={certtaData.authorityChange || 0}
                    trendLabel="pts"
                  />
                </div>
              </div>
            </div>

            {/* Radar Insights */}
            <div style={{
              background: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #334155'
            }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#64748b', 
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📊 Radar Analysis
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong style={{ color: '#10b981' }}>Certta's strength:</strong> Ref Domains ({formatNumber(certtaCombined.refDomains)} combined) competitive with market leaders due to caf.io legacy backlinks.
                </p>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong style={{ color: '#ef4444' }}>Critical gaps:</strong> Organic Traffic {Math.round(maxValues.organicTraffic / certtaCombined.organicTraffic)}x below market leader. Volume metrics take 6-12 months to build.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#f59e0b' }}>Opportunity:</strong> Jumio has high authority (42) but low BR traffic — international player without local SEO. Certta can capture BR-specific demand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #334155'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#f8fafc'
          }}>
            Detailed Competitive Metrics
          </div>
        </div>
        
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px repeat(6, 1fr)',
          gap: '8px',
          padding: '16px 24px',
          background: '#0f172a',
          borderBottom: '1px solid #334155',
          fontSize: '11px',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div>Domain</div>
          <div style={{ textAlign: 'right' }}>Keywords</div>
          <div style={{ textAlign: 'right' }}>Organic Traffic</div>
          <div style={{ textAlign: 'right' }}>Paid KWs</div>
          <div style={{ textAlign: 'right' }}>Paid Traffic</div>
          <div style={{ textAlign: 'right' }}>Ref Domains</div>
          <div style={{ textAlign: 'center' }}>Authority</div>
        </div>

        {/* Table Rows */}
        {competitors.map((company, index) => {
          const tierStyle = getTierBadge(company.tier);
          return (
            <div
              key={company.domain}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px repeat(6, 1fr)',
                gap: '8px',
                padding: '16px 24px',
                borderBottom: index < competitors.length - 1 ? '1px solid #334155' : 'none',
                background: company.highlight 
                  ? 'linear-gradient(90deg, #10b98110 0%, transparent 100%)'
                  : company.isOwn && !company.highlight
                  ? 'linear-gradient(90deg, #ef444410 0%, transparent 100%)'
                  : hoveredRow === index 
                  ? '#334155' 
                  : 'transparent',
                transition: 'background 0.15s ease',
                alignItems: 'center'
              }}
            >
              {/* Domain */}
              <div>
                <div style={{ 
                  fontWeight: '600',
                  color: company.highlight ? '#10b981' : company.isOwn ? '#f87171' : '#f8fafc',
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {company.name}
                </div>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#64748b' 
                  }}>
                    {company.domain}
                  </span>
                  <span style={{
                    background: tierStyle.bg,
                    color: tierStyle.color,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
                    {tierStyle.label}
                  </span>
                </div>
              </div>

              {/* Keywords */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                  {formatNumber(company.organicKeywords)}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: getTrendColor(company.keywordsTrend),
                  fontWeight: '500'
                }}>
                  {getTrendIcon(company.keywordsTrend)} {Math.abs(company.keywordsTrend).toFixed(1)}%
                </div>
              </div>

              {/* Organic Traffic */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                  {formatNumber(company.organicTraffic)}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: getTrendColor(company.trafficTrend),
                  fontWeight: '500'
                }}>
                  {getTrendIcon(company.trafficTrend)} {Math.abs(company.trafficTrend).toFixed(1)}%
                </div>
              </div>

              {/* Paid Keywords */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: company.paidKeywords === 0 ? '#475569' : '#f8fafc' 
                }}>
                  {company.paidKeywords === 0 ? '—' : formatNumber(company.paidKeywords)}
                </div>
                {company.paidKeywords > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: getTrendColor(company.paidTrend),
                    fontWeight: '500'
                  }}>
                    {getTrendIcon(company.paidTrend)} {Math.abs(company.paidTrend).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Paid Traffic */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: company.paidTraffic === 0 ? '#475569' : '#f8fafc' 
                }}>
                  {company.paidTraffic === 0 ? '—' : formatNumber(company.paidTraffic)}
                </div>
                {company.paidTraffic > 0 && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: getTrendColor(company.paidTrafficTrend),
                    fontWeight: '500'
                  }}>
                    {getTrendIcon(company.paidTrafficTrend)} {Math.abs(company.paidTrafficTrend).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Ref Domains */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                  {formatNumber(company.refDomains)}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: getTrendColor(company.refTrend),
                  fontWeight: '500'
                }}>
                  {getTrendIcon(company.refTrend)} {Math.abs(company.refTrend) > 100 ? '>100' : Math.abs(company.refTrend).toFixed(1)}%
                </div>
              </div>

              {/* Authority Score */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: `conic-gradient(${getAuthorityColor(company.authorityScore)} ${company.authorityScore * 3.6}deg, #334155 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: getAuthorityColor(company.authorityScore)
                  }}>
                    {company.authorityScore}
                  </div>
                </div>
                {company.authorityChange !== 0 && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: company.authorityChange > 0 ? '#10b981' : '#ef4444'
                  }}>
                    {company.authorityChange > 0 ? '+' : ''}{company.authorityChange}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights Footer */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#64748b', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            📊 Key Insight
          </div>
          <p style={{ 
            fontSize: '14px', 
            color: '#e2e8f0',
            margin: 0,
            lineHeight: '1.6'
          }}>
            <strong>Certta.ai</strong> shows explosive early growth (+{certtaData.keywordsTrend || 0}% keywords), 
            but absolute traffic ({certtaData.organicTraffic || 0}/mo) remains limited. <strong>Caf.io</strong> still holds majority of organic 
            equity but is declining {cafData.trafficTrend || 0}% monthly.
          </p>
        </div>
        
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#64748b', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            🎯 Competitive Gap
          </div>
          <p style={{ 
            fontSize: '14px', 
            color: '#e2e8f0',
            margin: 0,
            lineHeight: '1.6'
          }}>
            Market leaders have significantly more organic traffic than Certta. 
            Priority: accelerate certta.ai authority build while managing caf.io transition.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '24px',
        justifyContent: 'center',
        fontSize: '11px',
        color: '#64748b',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#10b981' }}>↑</span> Growth &gt;10%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6ee7b7' }}>↑</span> Mild Growth
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#fbbf24' }}>↓</span> Mild Decline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#ef4444' }}>↓</span> Decline &gt;10%
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#475569'
      }}>
        Built by AdRoq • Data source: Semrush • Last update: {lastUpdated}
      </div>
    </div>
  );
}

export default App;
