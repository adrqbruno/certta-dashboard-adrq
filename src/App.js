import React, { useState, useEffect } from 'react';

// ============================================
// CONFIGURAÇÃO - URLs DO GOOGLE SHEETS
// ============================================
const SHEETS_CONFIG = {
  // SEO Competitors
  competitorsUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1560647113&single=true&output=csv',
  configUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=109836250&single=true&output=csv',
  
  // Smarketing KPIs (CRM Data)
  smarketingUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMqy3JIcjK5fi9BkPrTzskfgQs9BrZAwIk1UFZ4IBbqoFXYIOXhWSokH4JzUORg/pub?gid=1987761827&single=true&output=csv',
  
  // Executive Brief
  executiveBriefUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1672972077&single=true&output=csv',
  
  useFallback: false
};

// Dados de fallback - Competitors
const FALLBACK_DATA = {
  lastUpdated: "Mar 2026",
  competitors: [
    { domain: 'unico.io', name: 'Unico', tier: 'leader', organicKeywords: 5400, keywordsTrend: 1.11, organicTraffic: 39300, trafficTrend: 0.29, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 2900, refTrend: -3.5, authorityScore: 36, authorityChange: -3, isOwn: false, highlight: false },
    { domain: 'idwall.co', name: 'idwall', tier: 'competitor', organicKeywords: 2700, keywordsTrend: 0.3, organicTraffic: 12400, trafficTrend: -5.87, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 1500, refTrend: -2.61, authorityScore: 33, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'jumio.com', name: 'Jumio', tier: 'global', organicKeywords: 171, keywordsTrend: -1.16, organicTraffic: 512, trafficTrend: 0, paidKeywords: 1, paidTrend: -50, paidTraffic: 2, paidTrafficTrend: -71.43, refDomains: 8600, refTrend: -2.92, authorityScore: 42, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'caf.io', name: 'CAF (legacy)', tier: 'legacy', organicKeywords: 515, keywordsTrend: -5.16, organicTraffic: 1200, trafficTrend: -2.57, paidKeywords: 2, paidTrend: -33.33, paidTraffic: 54, paidTrafficTrend: -37.93, refDomains: 3300, refTrend: -1.65, authorityScore: 29, authorityChange: 0, isOwn: true, highlight: false },
    { domain: 'clear.sale', name: 'ClearSale', tier: 'leader', organicKeywords: 4000, keywordsTrend: 0.86, organicTraffic: 22500, trafficTrend: 3.73, paidKeywords: 5, paidTrend: 25, paidTraffic: 994, paidTrafficTrend: 26.14, refDomains: 3300, refTrend: -3.64, authorityScore: 42, authorityChange: -1, isOwn: false, highlight: false },
    { domain: 'certta.ai', name: 'Certta', tier: 'new', organicKeywords: 101, keywordsTrend: 2.02, organicTraffic: 56, trafficTrend: 0, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 762, refTrend: 3.81, authorityScore: 20, authorityChange: 16, isOwn: true, highlight: true }
  ]
};

// Dados DUMMY do Funnel
const FUNNEL_DATA = {
  period: "YTD 2026",
  // Score Cards
  totalRevenue: { value: 666700, trend: 8.5 },
  ltv: { value: 45000, trend: 12.3 },
  arr: { value: 1200000, trend: 18.5 },
  // Funil
  leads: { value: 1869, trend: 12.5 },
  mql: { value: 1235, trend: 8.2 },
  sql: { value: 262, trend: 15.1 },
  proposals: { value: 75, trend: 5.6 },
  wonDeals: { value: 33, trend: 2.1 },
  winRate: { value: 29.3, trend: 1.4 },
  // Financeiro
  adsSpend: { value: 416200, trend: -3.2 },
  cac: { value: 2500, trend: -5.0 },
  cpa: { value: 152.30, trend: 4.8 },
  dealValue: { value: 666700, trend: 8.5 },
  roas: { value: 1.6, trend: 15.0 }
};

// Dados DUMMY do GA4 por mês
const GA4_MONTHLY_DATA = {
  'Jan 2026': {
    metrics: {
      sessions: { value: 4200, trend: 8.5 },
      pageViews: { value: 5100, trend: 6.2 },
      activeUsers: { value: 3200, trend: 5.8 },
      newUserPercent: { value: 112, trend: 2.3 }
    },
    dailyData: [
      { date: '01', sessions: 1200, sessionsPrev: 1100 },
      { date: '05', sessions: 1400, sessionsPrev: 1250 },
      { date: '10', sessions: 1350, sessionsPrev: 1200 },
      { date: '15', sessions: 1500, sessionsPrev: 1300 },
      { date: '20', sessions: 1450, sessionsPrev: 1350 },
      { date: '25', sessions: 1600, sessionsPrev: 1400 },
      { date: '31', sessions: 1550, sessionsPrev: 1450 }
    ]
  },
  'Fev 2026': {
    metrics: {
      sessions: { value: 5100, trend: -29.4 },
      pageViews: { value: 6200, trend: -27.3 },
      activeUsers: { value: 3975, trend: -27.1 },
      newUserPercent: { value: 118, trend: -5.1 }
    },
    dailyData: [
      { date: '01', sessions: 1600, sessionsPrev: 900 },
      { date: '05', sessions: 1850, sessionsPrev: 950 },
      { date: '10', sessions: 1400, sessionsPrev: 850 },
      { date: '15', sessions: 800, sessionsPrev: 450 },
      { date: '20', sessions: 650, sessionsPrev: 400 },
      { date: '22', sessions: 950, sessionsPrev: 600 },
      { date: '24', sessions: 500, sessionsPrev: 900 }
    ]
  },
  'Mar 2026': {
    metrics: {
      sessions: { value: 0, trend: 0 },
      pageViews: { value: 0, trend: 0 },
      activeUsers: { value: 0, trend: 0 },
      newUserPercent: { value: 0, trend: 0 }
    },
    dailyData: []
  }
};

// Dados DUMMY do Executive Brief
const EXECUTIVE_BRIEF_FALLBACK = {
  title: 'Authority +16 pts',
  highlight1: 'Backlinks: Forbes, MIT, UOL, LinkedIn',
  highlight2: 'Ref domains supera Unico (4.1K vs 2.9K)',
  gap: 'Tráfego 31x abaixo do líder',
  next1: 'Manter produção de conteúdo',
  next2: 'Acelerar migração backlinks',
  next3: 'Monitorar crossover de tráfego',
  updatedAt: 'Mar 2026'
};

const AVAILABLE_MONTHS = ['Jan 2026', 'Fev 2026', 'Mar 2026'];

// Parser de CSV genérico
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

// Parser específico para Smarketing KPIs
function parseSmarketingCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const data = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('"#')) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const metric = values[0];
    const value = values[1];
    const trend = values[2];
    const period = values[3];
    
    if (!metric || metric.startsWith('#')) continue;
    
    let parsedValue = value;
    let parsedTrend = parseFloat(trend) || 0;
    
    if (!isNaN(parseFloat(value))) {
      parsedValue = parseFloat(value);
    }
    
    data[metric] = {
      value: parsedValue,
      trend: parsedTrend,
      period: period || ''
    };
  }
  
  return data;
}

// Parser para Executive Brief
function parseExecutiveBriefCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const data = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const field = values[0];
    const content = values[1];
    
    if (field) {
      data[field] = content || '';
    }
  }
  
  return data;
}

// Converte dados do Sheets para formato do FUNNEL_DATA
function convertSmarketingToFunnelData(sheetsData) {
  return {
    period: sheetsData.period?.value || "YTD 2026",
    totalRevenue: { 
      value: parseFloat(sheetsData.totalRevenue?.value) || 666700, 
      trend: sheetsData.totalRevenue?.trend || 0 
    },
    ltv: { 
      value: parseFloat(sheetsData.ltv?.value) || 45000, 
      trend: sheetsData.ltv?.trend || 0 
    },
    arr: { 
      value: parseFloat(sheetsData.arr?.value) || 1200000, 
      trend: sheetsData.arr?.trend || 0 
    },
    leads: { 
      value: parseFloat(sheetsData.leads?.value) || 0, 
      trend: sheetsData.leads?.trend || 0 
    },
    mql: { 
      value: parseFloat(sheetsData.mql?.value) || 0, 
      trend: sheetsData.mql?.trend || 0 
    },
    sql: { 
      value: parseFloat(sheetsData.sql?.value) || 0, 
      trend: sheetsData.sql?.trend || 0 
    },
    proposals: { 
      value: parseFloat(sheetsData.proposals?.value) || 0, 
      trend: sheetsData.proposals?.trend || 0 
    },
    wonDeals: { 
      value: parseFloat(sheetsData.wonDeals?.value) || 0, 
      trend: sheetsData.wonDeals?.trend || 0 
    },
    winRate: { 
      value: parseFloat(sheetsData.winRate?.value) || 0, 
      trend: sheetsData.winRate?.trend || 0 
    },
    adsSpend: { 
      value: parseFloat(sheetsData.adsSpend?.value) || 0, 
      trend: sheetsData.adsSpend?.trend || 0 
    },
    cac: { 
      value: parseFloat(sheetsData.cac?.value) || 0, 
      trend: sheetsData.cac?.trend || 0 
    },
    cpa: { 
      value: parseFloat(sheetsData.cpa?.value) || 0, 
      trend: sheetsData.cpa?.trend || 0 
    },
    dealValue: { 
      value: parseFloat(sheetsData.totalRevenue?.value) || 666700, 
      trend: sheetsData.totalRevenue?.trend || 0 
    },
    roas: { 
      value: parseFloat(sheetsData.roas?.value) || 0, 
      trend: sheetsData.roas?.trend || 0 
    }
  };
}

// Sparkline Chart Component
const SparklineChart = ({ data, width = 500, height = 140 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '13px'
      }}>
        Dados não disponíveis para este período
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.sessions, d.sessionsPrev)));
  const minValue = 0;
  const padding = { top: 20, right: 20, bottom: 30, left: 10 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const getX = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
  
  const createPath = (key) => {
    return data.map((d, i) => {
      const x = getX(i);
      const y = getY(d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const createArea = (key) => {
    const linePath = data.map((d, i) => {
      const x = getX(i);
      const y = getY(d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    const bottomY = padding.top + chartHeight;
    
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map((ratio, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - ratio)}
          x2={width - padding.right}
          y2={padding.top + chartHeight * (1 - ratio)}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      ))}
      
      <path d={createArea('sessionsPrev')} fill="#64748b" opacity="0.15" />
      <path d={createPath('sessionsPrev')} fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
      <path d={createArea('sessions')} fill="#3b82f6" opacity="0.2" />
      <path d={createPath('sessions')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      
      {data.map((d, i) => (
        <circle key={`current-${i}`} cx={getX(i)} cy={getY(d.sessions)} r="4" fill="#3b82f6" />
      ))}
      
      {data.map((d, i) => (
        <text key={`label-${i}`} x={getX(i)} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="10">
          {d.date}
        </text>
      ))}
      
      <text x={padding.left + 5} y={padding.top + 5} fill="#64748b" fontSize="9">
        {(maxValue / 1000).toFixed(1)}K
      </text>
      <text x={padding.left + 5} y={padding.top + chartHeight - 5} fill="#64748b" fontSize="9">
        0
      </text>
    </svg>
  );
};

// Month Selector Component
const MonthSelector = ({ months, selected, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      background: '#0f172a',
      padding: '4px',
      borderRadius: '10px',
      border: '1px solid #334155'
    }}>
      {months.map(month => (
        <button
          key={month}
          onClick={() => onChange(month)}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: selected === month ? '#3b82f6' : 'transparent',
            color: selected === month ? '#fff' : '#94a3b8'
          }}
        >
          {month.split(' ')[0]}
        </button>
      ))}
    </div>
  );
};

// Executive Brief Component
const ExecutiveBrief = ({ data, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `📊 *Certta SEO Update - ${data.updatedAt}*

✅ *${data.title}*
• ${data.highlight1}
• ${data.highlight2}

⚠️ *Gap principal:*
${data.gap}

🎯 *Próximos passos:*
• ${data.next1}
• ${data.next2}
• ${data.next3}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #334155',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: '600'
        }}>
          📋 Executive Brief
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#10b981' : '#3b82f6',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {copied ? '✓ Copiado!' : '📤 Copiar'}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        {/* Title/Highlight */}
        <div style={{
          background: '#10b98120',
          borderLeft: '3px solid #10b981',
          padding: '12px',
          borderRadius: '0 8px 8px 0',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
            {data.title}
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            • {data.highlight1}<br />
            • {data.highlight2}
          </div>
        </div>

        {/* Gap */}
        <div style={{
          background: '#ef444420',
          borderLeft: '3px solid #ef4444',
          padding: '12px',
          borderRadius: '0 8px 8px 0',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase' }}>
            Gap Principal
          </div>
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>
            {data.gap}
          </div>
        </div>

        {/* Next Steps */}
        <div style={{
          background: '#3b82f620',
          borderLeft: '3px solid #3b82f6',
          padding: '12px',
          borderRadius: '0 8px 8px 0'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>
            Próximos Passos
          </div>
          <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>
            • {data.next1}<br />
            • {data.next2}<br />
            • {data.next3}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #334155',
        fontSize: '11px',
        color: '#64748b',
        textAlign: 'right'
      }}>
        📅 Atualizado: {data.updatedAt}
      </div>
    </div>
  );
};

function App() {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCompetitor, setHoveredCompetitor] = useState(null);
  const [competitors, setCompetitors] = useState(FALLBACK_DATA.competitors);
  const [lastUpdated, setLastUpdated] = useState(FALLBACK_DATA.lastUpdated);
  const [funnelData, setFunnelData] = useState(FUNNEL_DATA);
  const [executiveBrief, setExecutiveBrief] = useState(EXECUTIVE_BRIEF_FALLBACK);
  const [selectedMonth, setSelectedMonth] = useState('Fev 2026');
  const [dataSource, setDataSource] = useState('fallback');
  const [smarketingSource, setSmarketingSource] = useState('fallback');
  const [loading, setLoading] = useState(true);

  const ga4Data = GA4_MONTHLY_DATA[selectedMonth];

  useEffect(() => {
    async function fetchData() {
      let loadedSomething = false;

      // Carregar dados dos Competitors (SEO)
      try {
        if (!SHEETS_CONFIG.competitorsUrl.includes('COLE_AQUI')) {
          const competitorsResponse = await fetch(SHEETS_CONFIG.competitorsUrl);
          const competitorsCSV = await competitorsResponse.text();
          const competitorsData = parseCSV(competitorsCSV);
          
          if (competitorsData.length > 0) {
            setCompetitors(competitorsData);
            setDataSource('sheets');
            loadedSomething = true;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar competitors:', error);
      }

      // Carregar config
      try {
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
        console.error('Erro ao carregar config:', error);
      }

      // Carregar dados do Smarketing (CRM)
      try {
        if (SHEETS_CONFIG.smarketingUrl && !SHEETS_CONFIG.smarketingUrl.includes('COLE_AQUI')) {
          const smarketingResponse = await fetch(SHEETS_CONFIG.smarketingUrl);
          const smarketingCSV = await smarketingResponse.text();
          const smarketingRaw = parseSmarketingCSV(smarketingCSV);
          
          if (Object.keys(smarketingRaw).length > 0) {
            const convertedData = convertSmarketingToFunnelData(smarketingRaw);
            setFunnelData(convertedData);
            setSmarketingSource('sheets');
            loadedSomething = true;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar smarketing:', error);
        setSmarketingSource('fallback');
      }

      // Carregar Executive Brief
      try {
        if (SHEETS_CONFIG.executiveBriefUrl && !SHEETS_CONFIG.executiveBriefUrl.includes('COLE_AQUI')) {
          const briefResponse = await fetch(SHEETS_CONFIG.executiveBriefUrl);
          const briefCSV = await briefResponse.text();
          const briefData = parseExecutiveBriefCSV(briefCSV);
          
          if (Object.keys(briefData).length > 0) {
            setExecutiveBrief({ ...EXECUTIVE_BRIEF_FALLBACK, ...briefData });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar executive brief:', error);
      }

      if (!loadedSomething) {
        setDataSource('fallback');
      }
      
      setLoading(false);
    }

    fetchData();
  }, []);

  // Computed data
  const certtaData = competitors.find(c => c.domain === 'certta.ai') || {};
  const cafData = competitors.find(c => c.domain === 'caf.io') || {};
  
  const certtaCombined = {
    organicKeywords: (certtaData.organicKeywords || 0) + (cafData.organicKeywords || 0),
    organicTraffic: (certtaData.organicTraffic || 0) + (cafData.organicTraffic || 0),
    refDomains: (certtaData.refDomains || 0) + (cafData.refDomains || 0),
    authorityScore: Math.max(certtaData.authorityScore || 0, cafData.authorityScore || 0),
    paidPresence: (certtaData.paidTraffic || 0) + (cafData.paidTraffic || 0)
  };

  const spiderCompetitors = [
    { name: 'Certta (combined)', color: '#10b981', ...certtaCombined },
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

  const centerX = 220;
  const centerY = 200;
  const radius = 140;

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

  const formatCurrency = (num) => {
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}K`;
    return `R$ ${num.toFixed(0)}`;
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

  const funnelStages = [
    { name: 'Leads', value: funnelData.leads.value, color: '#3b82f6' },
    { name: 'MQL', value: funnelData.mql.value, color: '#f97316' },
    { name: 'SQL', value: funnelData.sql.value, color: '#8b5cf6' },
    { name: 'Proposals', value: funnelData.proposals.value, color: '#06b6d4' },
    { name: 'Won', value: funnelData.wonDeals.value, color: '#10b981' }
  ];

  // KPI Card Component
  const KpiCard = ({ label, value, trend, trendLabel, icon }) => (
    <div style={{
      background: '#0f172a',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #334155',
      minWidth: '140px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{value}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: getTrendColor(trend), fontWeight: '500' }}>
          <span>{getTrendIcon(trend)}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span style={{ color: '#64748b', marginLeft: '4px' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );

  // GA4 KPI Card
  const GA4KpiCard = ({ label, value, trend, trendLabel }) => (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: getTrendColor(trend), fontWeight: '600' }}>{getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%</span>
        <span style={{ color: '#64748b' }}>{trendLabel}</span>
      </div>
    </div>
  );

  // Funnel KPI Card
  const FunnelKpiCard = ({ label, value, trend, color }) => (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color || '#f8fafc', marginBottom: '4px' }}>{value}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: getTrendColor(trend), fontWeight: '500' }}>
          <span>{getTrendIcon(trend)}</span>
          <span>{Math.abs(trend).toFixed(1)}% MoM</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>
            Certta Performance Hub
          </h1>
          <span style={{ background: '#10b98120', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>LIVE</span>
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
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Smarketing & SEO Performance Dashboard • Updated: {lastUpdated}
        </p>
      </div>

      {/* GA4 Website Analytics */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>Website Analytics</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Google Analytics 4 • certta.ai</div>
          </div>
          <MonthSelector months={AVAILABLE_MONTHS} selected={selectedMonth} onChange={setSelectedMonth} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <GA4KpiCard label="Sessions" value={formatNumber(ga4Data.metrics.sessions.value)} trend={ga4Data.metrics.sessions.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="Page Views" value={formatNumber(ga4Data.metrics.pageViews.value)} trend={ga4Data.metrics.pageViews.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="Active Users" value={formatNumber(ga4Data.metrics.activeUsers.value)} trend={ga4Data.metrics.activeUsers.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="New Users %" value={`${ga4Data.metrics.newUserPercent.value}%`} trend={ga4Data.metrics.newUserPercent.trend} trendLabel="vs. mês anterior" />
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions Trend • {selectedMonth}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }} />
                  <span style={{ color: '#94a3b8' }}>Current</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '3px', background: '#64748b', borderRadius: '2px' }} />
                  <span style={{ color: '#64748b' }}>Previous</span>
                </div>
              </div>
            </div>
            <SparklineChart data={ga4Data.dailyData} width={500} height={140} />
          </div>
        </div>
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
          <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain Migration Status</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{migrationProgress}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Traffic on certta.ai</div>
          <div style={{ marginTop: '12px', background: '#1e293b', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${migrationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ Legacy Decay (caf.io)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>{cafData.trafficTrend || 0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>

        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 New Domain Growth (certta.ai)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>+{certtaData.trafficTrend || 0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>
      </div>

      {/* Spider Chart Section */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '20px' }}>Competitive Positioning Radar</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Spider Chart SVG */}
          <svg width="100%" viewBox="0 0 440 400" style={{ maxWidth: '440px' }}>
            {[20, 40, 60, 80, 100].map((percent, i) => (
              <circle key={i} cx={centerX} cy={centerY} r={(percent / 100) * radius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={i === 4 ? "none" : "4,4"} />
            ))}
            
            {axes.map((_, i) => {
              const point = getPoint(100, i);
              return <line key={i} x1={centerX} y1={centerY} x2={point.x} y2={point.y} stroke="#334155" strokeWidth="1" />;
            })}
            
            {axes.map((label, i) => {
              const point = getPoint(120, i);
              const isTop = i === 0;
              const isBottom = i === Math.floor(numAxes / 2);
              return (
                <text key={i} x={point.x} y={point.y} textAnchor="middle" dominantBaseline={isTop ? "auto" : isBottom ? "hanging" : "middle"} fill="#94a3b8" fontSize="11" fontWeight="500">
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
              <text key={i} x={centerX + 5} y={centerY - (percent / 100) * radius} fill="#64748b" fontSize="9" dominantBaseline="middle">{percent}%</text>
            ))}
          </svg>

          {/* Right side: Legend + KPIs + Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Legend */}
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Competitors</div>
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
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: competitor.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: competitor.name.includes('Certta') ? '600' : '400', color: competitor.name.includes('Certta') ? '#10b981' : '#e2e8f0' }}>
                        {competitor.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certta KPIs */}
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Certta Combined Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <KpiCard icon="🔑" label="Keywords" value={formatNumber(certtaCombined.organicKeywords)} trend={(certtaData.keywordsTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="📈" label="Org. Traffic" value={formatNumber(certtaCombined.organicTraffic)} trend={(certtaData.trafficTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="🔗" label="Ref Domains" value={formatNumber(certtaCombined.refDomains)} trend={(certtaData.refTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="⭐" label="Authority" value={certtaCombined.authorityScore} trend={certtaData.authorityChange || 0} trendLabel="pts" />
                </div>
              </div>
            </div>

            {/* Radar Insights */}
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Radar Analysis</div>
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

      {/* Competitive Metrics Table + Executive Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '24px' }}>
        {/* Compressed Table */}
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Detailed Competitive Metrics</div>
          </div>
          
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '140px repeat(5, 1fr)',
            gap: '4px',
            padding: '12px 20px',
            background: '#0f172a',
            borderBottom: '1px solid #334155',
            fontSize: '10px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <div>Domain</div>
            <div style={{ textAlign: 'right' }}>KWs</div>
            <div style={{ textAlign: 'right' }}>Traffic</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div style={{ textAlign: 'right' }}>Refs</div>
            <div style={{ textAlign: 'center' }}>Auth</div>
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
                  gridTemplateColumns: '140px repeat(5, 1fr)',
                  gap: '4px',
                  padding: '12px 20px',
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
                <div>
                  <div style={{ fontWeight: '600', color: company.highlight ? '#10b981' : company.isOwn ? '#f87171' : '#f8fafc', fontSize: '13px' }}>
                    {company.name}
                  </div>
                  <span style={{
                    background: tierStyle.bg,
                    color: tierStyle.color,
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: '500'
                  }}>
                    {tierStyle.label}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.organicKeywords)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.keywordsTrend), fontWeight: '500' }}>
                    {getTrendIcon(company.keywordsTrend)} {Math.abs(company.keywordsTrend).toFixed(1)}%
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.organicTraffic)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.trafficTrend), fontWeight: '500' }}>
                    {getTrendIcon(company.trafficTrend)} {Math.abs(company.trafficTrend).toFixed(1)}%
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: company.paidTraffic === 0 ? '#475569' : '#f8fafc', fontSize: '13px' }}>
                    {company.paidTraffic === 0 ? '—' : formatNumber(company.paidTraffic)}
                  </div>
                  {company.paidTraffic > 0 && (
                    <div style={{ fontSize: '10px', color: getTrendColor(company.paidTrafficTrend), fontWeight: '500' }}>
                      {getTrendIcon(company.paidTrafficTrend)} {Math.abs(company.paidTrafficTrend).toFixed(0)}%
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.refDomains)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.refTrend), fontWeight: '500' }}>
                    {getTrendIcon(company.refTrend)} {Math.abs(company.refTrend).toFixed(1)}%
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `conic-gradient(${getAuthorityColor(company.authorityScore)} ${company.authorityScore * 3.6}deg, #334155 0deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '11px',
                      color: getAuthorityColor(company.authorityScore)
                    }}>
                      {company.authorityScore}
                    </div>
                  </div>
                  {company.authorityChange !== 0 && (
                    <div style={{ fontSize: '9px', fontWeight: '600', color: company.authorityChange > 0 ? '#10b981' : '#ef4444' }}>
                      {company.authorityChange > 0 ? '+' : ''}{company.authorityChange}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Executive Brief Panel */}
        <ExecutiveBrief data={executiveBrief} />
      </div>

      {/* Smarketing Funnel Section */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>Smarketing Performance</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Full-funnel results: from lead generation to closed revenue</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              background: smarketingSource === 'sheets' ? '#10b98120' : '#f59e0b20',
              color: smarketingSource === 'sheets' ? '#10b981' : '#f59e0b',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '500'
            }}>
              {smarketingSource === 'sheets' ? '🔗 Live Data' : '📁 Demo'}
            </span>
            <span style={{ background: '#06b6d420', color: '#06b6d4', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>
              {funnelData.period}
            </span>
          </div>
        </div>

        {/* Score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #10b98140' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              <span style={{ fontSize: '11px', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Total Revenue</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{formatCurrency(funnelData.totalRevenue.value)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: '#6ee7b7', fontWeight: '600' }}>{getTrendIcon(funnelData.totalRevenue.trend)} {Math.abs(funnelData.totalRevenue.trend).toFixed(1)}%</span>
              <span style={{ color: '#a7f3d0' }}>vs. período anterior</span>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #3b82f640' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              <span style={{ fontSize: '11px', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Lifetime Value</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{formatCurrency(funnelData.ltv.value)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: '#93c5fd', fontWeight: '600' }}>{getTrendIcon(funnelData.ltv.trend)} {Math.abs(funnelData.ltv.trend).toFixed(1)}%</span>
              <span style={{ color: '#bfdbfe' }}>vs. período anterior</span>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #8b5cf640' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📈</span>
              <span style={{ fontSize: '11px', color: '#e9d5ff', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>ARR</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{formatCurrency(funnelData.arr.value)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <span style={{ color: '#c4b5fd', fontWeight: '600' }}>{getTrendIcon(funnelData.arr.trend)} {Math.abs(funnelData.arr.trend).toFixed(1)}%</span>
              <span style={{ color: '#e9d5ff' }}>vs. período anterior</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <FunnelKpiCard label="Leads" value={formatNumber(funnelData.leads.value)} trend={funnelData.leads.trend} color="#3b82f6" />
              <FunnelKpiCard label="MQL" value={formatNumber(funnelData.mql.value)} trend={funnelData.mql.trend} color="#f97316" />
              <FunnelKpiCard label="SQL" value={formatNumber(funnelData.sql.value)} trend={funnelData.sql.trend} color="#8b5cf6" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <FunnelKpiCard label="Proposals" value={funnelData.proposals.value} trend={funnelData.proposals.trend} color="#06b6d4" />
              <FunnelKpiCard label="Won Deals" value={funnelData.wonDeals.value} trend={funnelData.wonDeals.trend} color="#10b981" />
              <FunnelKpiCard label="Win Rate %" value={`${funnelData.winRate.value}%`} trend={funnelData.winRate.trend} color="#10b981" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <FunnelKpiCard label="Ads Spend" value={formatCurrency(funnelData.adsSpend.value)} trend={funnelData.adsSpend.trend} />
              <FunnelKpiCard label="CAC" value={formatCurrency(funnelData.cac.value)} trend={funnelData.cac.trend} />
              <FunnelKpiCard label="ROAS" value={`${funnelData.roas.value}x`} trend={funnelData.roas.trend} color={funnelData.roas.value >= 1.5 ? '#10b981' : '#f59e0b'} />
            </div>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Sales Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {funnelStages.map((stage, idx) => {
                const maxValue = funnelStages[0].value;
                const percentage = (stage.value / maxValue) * 100;
                const conversionRate = idx > 0 ? ((stage.value / funnelStages[idx - 1].value) * 100).toFixed(1) : 100;
                
                return (
                  <div key={stage.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{stage.name}</span>
                      <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>{formatNumber(stage.value)}</span>
                    </div>
                    <div style={{ position: 'relative', height: '28px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '10px',
                        transition: 'width 0.5s ease'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Lead → Won</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{((funnelData.wonDeals.value / funnelData.leads.value) * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Deal Value</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>{formatCurrency(funnelData.dealValue.value)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
        Built by AdRoq • Data source: GA4 + Semrush + HubSpot • Last update: {lastUpdated}
      </div>
    </div>
  );
}

export default App;
