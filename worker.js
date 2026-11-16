/**
 * functions/api/graficos.js
 * API Oficial: /api/grafico & /api/graficos
 * Graficos Pro — Gerador Universal de Gráficos e Imagens Vetoriais SVG em Edge (<3ms)
 * 
 * Funcionalidades:
 * - 28 Tipos de Gráficos Nativos: Area, Bar/Column, Bar Horizontal, Stacked Bar, Line, Donut, Pie, Gauge (Velocímetro),
 *   KPI Card, Sparkline, Radar (Teia de Aranha), Funil, Progress Bar, Combo (Barras + Linha),
 *   Mapa do Brasil (27 UFs & Regiões), Candlestick (OHLC), Waterfall (Cascata / DRE),
 *   Bullet (OKR), Heatmap (Matriz de Atividade), Radial Activity Rings, Scatter Plot, Treemap,
 *   Step Line, Pirâmide, Lollipop (Pirulito), Dumbbell (Antes vs Depois), Waffle 100% e Badge Shields.io
 * - Customização Granular "Cada Pedacinho":
 *   * Fundo customizado (bg=#hex, transparente, vidro/glassmorphism)
 *   * Bordas e arredondamento (borda=#hex/none, raio=0 a 30px)
 *   * Tipografia (fonte=Inter/Mono, tamanho_titulo, alinhamento, cor_titulo, cor_subtitulo)
 *   * Cores individuais por barra/fatia/ponto (cores=#hex,#hex,#hex)
 *   * Grade customizável (grade=true/false, cor_grade, estilo=tracejado/solido/pontilhado)
 *   * Rotação de rótulos dos eixos (rotacao_labels=0/45/90)
 *   * Rótulos de dados nos elementos (mostrar_valores=true/false, cor_valores, posicao=topo/dentro)
 *   * Linhas de apoio e anotações (meta, cor_meta, label_meta, media, cor_media, linhas_guia)
 *   * Rodapé e fonte de dados (rodape="Fonte: Banco Central")
 *   * Espessura de barras, raio de barra, espessura de linha, suavidade (curva Bézier vs reta), marcadores de ponto
 *   * Donut com furo ajustável (furo=0 a 0.95), fatia destacada (destaque_fatia=0), posição de legenda
 * - Formatos de Saída: SVG Puro (<3ms), JSON com Estatísticas Matemáticas, Data URI (Base64) e HTML
 * - 12 Paletas Automáticas + Suporte a Cores Customizadas Hexadecimais (#hex,#hex)
 * - Zero Dependências Externas, Latência Sub-3ms na Borda Cloudflare Anycast, Cache Global ETag
 */

// Rate Limiter e Client IP integrados para execução autônoma
function clientIp(request) {
  if (!request) return '127.0.0.1';
  return request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
}

const memoryRateLimit = new Map();
function rateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let entry = memoryRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    memoryRateLimit.set(ip, entry);
    return { ok: true, remaining: limit - 1 };
  }
  entry.count++;
  if (entry.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true, remaining: limit - entry.count };
}

export function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Calcula a cor ideal do texto (escuro ou claro) de acordo com o contraste WCAG 2.1 (Luminância Relativa)
 */
export function getContrastTextColor(hexBg, darkColor = '#090d16', lightColor = '#ffffff') {
  if (!hexBg) return lightColor;
  let clean = String(hexBg).trim().replace('#', '');
  if (clean.startsWith('rgb')) {
    const parts = clean.match(/\d+/g);
    if (parts && parts.length >= 3) {
      const r = Number(parts[0]) / 255;
      const g = Number(parts[1]) / 255;
      const b = Number(parts[2]) / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum > 0.52 ? darkColor : lightColor;
    }
  }
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length < 6) return lightColor;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return lightColor;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.52 ? darkColor : lightColor;
}

/**
 * Gera contorno protetor (Text-Halo) para garantir legibilidade 100% sobre qualquer elemento ou grade
 */
export function getTextHaloStyle(textColor, widthPx = '2.5px') {
  const isLight = textColor === '#ffffff' || textColor === '#f8fafc' || textColor === '#f1f5f9' || textColor === '#cbd5e1';
  const strokeColor = isLight ? 'rgba(9, 13, 22, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  return `paint-order:stroke fill;stroke:${strokeColor};stroke-width:${widthPx};stroke-linejoin:round;`;
}

export const PALETAS = {
  emerald: ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7', '#065f46'],
  ocean: ['#0ea5e9', '#3b82f6', '#0284c7', '#6366f1', '#38bdf8', '#1d4ed8'],
  sunset: ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d97706', '#be123c'],
  violet: ['#8b5cf6', '#a855f7', '#6366f1', '#c084fc', '#7c3aed', '#4f46e5'],
  neon: ['#06b6d4', '#ec4899', '#eab308', '#10b981', '#8b5cf6', '#3b82f6'],
  corporate: ['#2563eb', '#0284c7', '#4f46e5', '#0891b2', '#1d4ed8', '#0369a1'],
  amber: ['#f59e0b', '#d97706', '#ea580c', '#fbbf24', '#b45309', '#78350f'],
  rose: ['#f43f5e', '#e11d48', '#ec4899', '#fb7185', '#be123c', '#9f1239'],
  cyberpunk: ['#00f0ff', '#ffe600', '#ff003c', '#05d9e8', '#d1f7ff', '#7122fa'],
  dracula: ['#bd93f9', '#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c', '#ffb86c'],
  nord: ['#5e81ac', '#88c0d0', '#81a1c1', '#a3be8c', '#ebcb8b', '#d08770'],
  pastel: ['#818cf8', '#f472b6', '#fb923c', '#4ade80', '#38bdf8', '#a78bfa'],
  contrast: ['#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#f43f5e'],
  flex: ['#10b981', '#f59e0b', '#38bdf8', '#ef4444', '#8b5cf6', '#ec4899'],
  accessible: ['#0072b2', '#e69f00', '#009e73', '#d55e00', '#cc79a7', '#56b4e9']
};

export const TEMAS = {
  dark: {
    bg: '#090d16',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    border: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#ffffff',
    textMuted: '#cbd5e1',
    grid: 'rgba(255, 255, 255, 0.08)',
    tooltipBg: '#1e293b',
    tooltipBorder: 'rgba(255, 255, 255, 0.2)'
  },
  light: {
    bg: '#ffffff',
    cardBg: '#f8fafc',
    border: '#e2e8f0',
    textPrimary: '#090d16',
    textMuted: '#334155',
    grid: '#e2e8f0',
    tooltipBg: '#090d16',
    tooltipBorder: '#475569'
  },
  transparent: {
    bg: 'transparent',
    cardBg: 'transparent',
    border: 'transparent',
    textPrimary: '#ffffff',
    textMuted: '#cbd5e1',
    grid: 'rgba(255, 255, 255, 0.08)',
    tooltipBg: '#1e293b',
    tooltipBorder: 'rgba(255, 255, 255, 0.2)'
  },
  auto: {
    bg: '#090d16',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    border: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#ffffff',
    textMuted: '#cbd5e1',
    grid: 'rgba(255, 255, 255, 0.08)',
    tooltipBg: '#1e293b',
    tooltipBorder: 'rgba(255, 255, 255, 0.2)',
    isAuto: true
  }
};

export function resolvePaleta(input) {
  if (!input) return PALETAS.emerald;
  if (Array.isArray(input) && input.length) return input;
  const str = String(input).trim();
  if (str.includes(',') || str.startsWith('#')) {
    const list = str.split(',').map(s => s.trim()).filter(Boolean).map(c => c.startsWith('#') || c.startsWith('rgb') ? c : '#' + c);
    if (list.length) return list;
  }
  const key = str.toLowerCase();
  return PALETAS[key] || PALETAS.emerald;
}

export function formatarNumero(val, { moeda = null, compacto = false, sufixo = '', prefixo = '', casasDecimais = null } = {}) {
  const num = Number(val) || 0;
  const isBRL = moeda === 'BRL' || moeda === 'brl' || moeda === 'real';
  const isUSD = moeda === 'USD' || moeda === 'usd';

  if (compacto) {
    let comp = '';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1e9) comp = sign + (abs / 1e9).toFixed(1).replace('.0', '') + 'B';
    else if (abs >= 1e6) comp = sign + (abs / 1e6).toFixed(1).replace('.0', '') + 'M';
    else if (abs >= 1e3) comp = sign + (abs / 1e3).toFixed(1).replace('.0', '') + 'K';
    else comp = sign + abs.toLocaleString('pt-BR');

    if (isBRL) return 'R$ ' + comp;
    if (isUSD) return '$' + comp;
    return prefixo + comp + sufixo;
  }

  const decOpt = casasDecimais !== null ? { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais } : {};
  if (isBRL) {
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...decOpt });
  }
  if (isUSD) {
    return '$ ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...decOpt });
  }
  return prefixo + num.toLocaleString('pt-BR', decOpt) + sufixo;
}

export function parseArrayParam(val, defaultVal = []) {
  if (!val) return defaultVal;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return defaultVal;
}

export function parseNumberArray(val, defaultVal = []) {
  const arr = parseArrayParam(val, defaultVal);
  return arr.map(v => {
    if (typeof v === 'number') return v;
    const clean = String(v).replace(/\s/g, '').replace(',', '.');
    return Number(clean) || 0;
  });
}

export function parseMultiSeries(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (raw.length > 0 && Array.isArray(raw[0])) return raw;
    if (raw.length > 0 && typeof raw[0] === 'object' && raw[0].valores) return raw;
    return [parseNumberArray(raw)];
  }
  if (typeof raw === 'string') {
    if (raw.includes(';')) {
      return raw.split(';').map(part => parseNumberArray(part.trim())).filter(p => p.length > 0);
    }
  }
  return null;
}

export function calculateStats(numbers) {
  if (!numbers || !numbers.length) {
    return { min: 0, max: 0, media: 0, mediana: 0, soma: 0, total: 0, quantidade: 0 };
  }
  const clean = numbers.map(Number).filter(n => !isNaN(n));
  if (!clean.length) return { min: 0, max: 0, media: 0, mediana: 0, soma: 0, total: 0, quantidade: 0 };
  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const soma = clean.reduce((a, b) => a + b, 0);
  const media = Number((soma / clean.length).toFixed(2));
  const mid = Math.floor(sorted.length / 2);
  const mediana = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  return { min, max, media, mediana, soma, total: soma, quantidade: clean.length };
}

export function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(36);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS COMPARTILHADOS DE CUSTOMIZAÇÃO GRANULAR
// ─────────────────────────────────────────────────────────────────────────────

export function buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte }) {
  const isAuto = t && t.isAuto;
  const finalBg = bg !== undefined ? bg : (isAuto ? 'var(--card-bg, #090d16)' : t.bg);
  let finalBorder = isAuto ? '1px solid var(--card-border, rgba(255,255,255,0.08))' : `1px solid ${t.border}`;
  if (borda !== undefined) {
    finalBorder = (borda === 'none' || borda === '0') ? 'none' : (borda.includes(' ') ? borda : `1px solid ${borda}`);
  }
  const finalRadius = raioBorda !== null && raioBorda !== undefined ? Number(raioBorda) : 14;
  const vidroStyle = vidro ? 'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' : '';
  const fontStyle = fonte ? `font-family:${escapeXml(fonte)};` : '';

  const autoCss = isAuto ? `
    <style>
      :root {
        --card-bg: #090d16;
        --card-border: rgba(255, 255, 255, 0.08);
        --text-primary: #f8fafc;
        --text-muted: #94a3b8;
        --grid-line: rgba(255, 255, 255, 0.06);
      }
      @media (prefers-color-scheme: light) {
        :root, svg {
          --card-bg: #ffffff;
          --card-border: #e2e8f0;
          --text-primary: #0f172a;
          --text-muted: #334155;
          --grid-line: #e2e8f0;
        }
        .auto-card-bg { fill: #ffffff !important; }
        text:not([data-contrast="fixed"]) { fill: #0f172a !important; }
        .auto-text-muted, text[fill="#cbd5e1"], text[fill="#94a3b8"], text[opacity="0.75"], text[opacity="0.7"] { fill: #334155 !important; }
        line[stroke="rgba(255, 255, 255, 0.06)"], line[stroke="rgba(255, 255, 255, 0.07)"], line[stroke="rgba(255, 255, 255, 0.08)"] { stroke: #e2e8f0 !important; }
      }
    </style>
  ` : '';

  return {
    svgStyle: `width:100%;height:auto;max-width:100%;display:block;aspect-ratio:${width}/${height};background:${finalBg};border-radius:${finalRadius}px;border:${finalBorder};${vidroStyle}${fontStyle}`,
    rectBg: `${autoCss}<rect class="auto-card-bg" width="${width}" height="${height}" rx="${finalRadius}" fill="${finalBg}" />`,
    finalBg,
    finalBorder,
    finalRadius
  };
}

export function buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo }) {
  let svgHeader = '';
  const titleColor = corTitulo || t.textPrimary;
  const subtitleColor = corSubtitulo || t.textMuted;
  const titleSize = tamanhoTitulo || 16;
  const align = alinhamentoTitulo || 'left';

  let titleX = padding.left;
  let textAnchor = 'start';
  if (align === 'center' || align === 'centro') {
    titleX = width / 2;
    textAnchor = 'middle';
  } else if (align === 'right' || align === 'direita') {
    titleX = width - padding.right;
    textAnchor = 'end';
  }

  if (titulo) {
    svgHeader += `<text x="${titleX}" y="32" fill="${titleColor}" font-size="${titleSize}" font-weight="800" text-anchor="${textAnchor}">${escapeXml(titulo)}</text>`;
  }
  if (subtitulo) {
    svgHeader += `<text x="${titleX}" y="${titleSize > 16 ? 52 : 48}" fill="${subtitleColor}" font-size="11.5" text-anchor="${textAnchor}">${escapeXml(subtitulo)}</text>`;
  }

  let svgFooter = '';
  if (rodape) {
    svgFooter = `<text x="${width - padding.right}" y="${height - 10}" fill="${t.textMuted}" font-size="9.5" text-anchor="end" opacity="0.75">${escapeXml(rodape)}</text>`;
  }

  return { svgHeader, svgFooter };
}

export function buildGridLines({ padding, width, chartH, minVal, range, t, grade, corGrade, estiloGrade, moeda, compacto, casasDecimais, prefixo, sufixo, numLinhas = 4 }) {
  if (grade === false) return '';
  const strokeColor = corGrade || t.grid;
  let dashArray = '3,3';
  if (estiloGrade === 'solido' || estiloGrade === 'solid') dashArray = 'none';
  else if (estiloGrade === 'pontilhado' || estiloGrade === 'dotted') dashArray = '1,3';
  else if (estiloGrade === 'none' || estiloGrade === 'nenhum') return '';

  let svgGrids = '';
  for (let i = 0; i <= numLinhas; i++) {
    const yVal = minVal + (range / numLinhas) * (numLinhas - i);
    const yPos = padding.top + (chartH / numLinhas) * i;
    svgGrids += `
      <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${strokeColor}" stroke-dasharray="${dashArray}" />
      <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="11" text-anchor="end">${formatarNumero(yVal, { compacto, moeda, casasDecimais, prefixo, sufixo })}</text>
    `;
  }
  return svgGrids;
}

export function buildReferenceLines({ padding, width, chartH, minVal, range, valores, meta, corMeta, labelMeta, media, corMedia, labelMedia, linhasGuia, moeda, compacto }) {
  let svgRefs = '';
  if (media && valores && valores.length) {
    const mediaVal = valores.reduce((a, b) => a + Number(b), 0) / (valores.length || 1);
    const mediaY = padding.top + chartH - ((mediaVal - minVal) / range) * chartH;
    const cor = corMedia || '#eab308';
    const lbl = labelMedia || `Média: ${formatarNumero(mediaVal, { compacto: true, moeda })}`;
    svgRefs += `
      <line x1="${padding.left}" y1="${mediaY}" x2="${width - padding.right}" y2="${mediaY}" stroke="${cor}" stroke-width="1.8" stroke-dasharray="4,4" />
      <text x="${width - padding.right}" y="${mediaY - 6}" fill="${cor}" font-size="10" font-weight="700" text-anchor="end">${escapeXml(lbl)}</text>
    `;
  }

  if (meta !== null && meta !== undefined) {
    const metaVal = Number(meta);
    const metaY = padding.top + chartH - ((metaVal - minVal) / range) * chartH;
    const cor = corMeta || '#ef4444';
    const lbl = labelMeta || `Meta: ${formatarNumero(metaVal, { compacto: true, moeda })}`;
    svgRefs += `
      <line x1="${padding.left}" y1="${metaY}" x2="${width - padding.right}" y2="${metaY}" stroke="${cor}" stroke-width="1.8" stroke-dasharray="4,4" />
      <text x="${width - padding.right}" y="${metaY - 6}" fill="${cor}" font-size="10" font-weight="700" text-anchor="end">${escapeXml(lbl)}</text>
    `;
  }

  if (linhasGuia) {
    const items = String(linhasGuia).split(',');
    items.forEach(item => {
      const parts = item.split(':');
      const v = Number(parts[0]);
      if (!isNaN(v)) {
        const y = padding.top + chartH - ((v - minVal) / range) * chartH;
        const nameStr = parts[1];
        const cStr = parts[2];
        const cor = cStr ? (cStr.startsWith('#') ? cStr : '#' + cStr) : '#38bdf8';
        const lbl = nameStr ? nameStr.trim() : formatarNumero(v, { compacto: true, moeda });
        svgRefs += `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${cor}" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.85" />
          <text x="${width - padding.right}" y="${y - 4}" fill="${cor}" font-size="9.5" font-weight="700" text-anchor="end">${escapeXml(lbl)}</text>
        `;
      }
    });
  }

  return svgRefs;
}

export function buildAnnotationPins({ points, anotacoes, chartH, padding, t }) {
  if (!anotacoes || !points || !points.length) return '';
  let svgPins = '';
  const items = String(anotacoes).split(',');

  items.forEach(item => {
    const parts = item.split(':');
    const idxOrLabel = parts[0].trim();
    const pinText = parts[1] ? parts[1].trim() : 'Destaque';
    const rawColor = parts[2] ? (parts[2].startsWith('#') ? parts[2] : '#' + parts[2]) : '#38bdf8';
    const pinCor = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawColor) ? rawColor : '#38bdf8';

    let pt = null;
    const numIdx = parseInt(idxOrLabel, 10);
    if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= points.length) {
      pt = points[numIdx - 1];
    } else {
      pt = points.find(p => p.lbl && p.lbl.toLowerCase() === idxOrLabel.toLowerCase());
    }

    if (pt) {
      const cx = pt.x;
      const cy = pt.y;
      const badgeW = Math.max(50, pinText.length * 7 + 16);
      const balloonY = Math.max(22, cy - 26);

      svgPins += `
        <g class="chart-pin-annotation">
          <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${padding.top + chartH}" stroke="${pinCor}" stroke-width="1.4" stroke-dasharray="2,2" opacity="0.8" />
          <circle cx="${cx}" cy="${cy}" r="6" fill="${pinCor}" stroke="#ffffff" stroke-width="2" />
          <g transform="translate(${cx}, ${balloonY})">
            <rect x="${-badgeW / 2}" y="-15" width="${badgeW}" height="19" rx="5" fill="#090d16" stroke="${pinCor}" stroke-width="1.2" />
            <polygon points="0,-1 -3,-5 3,-5" fill="#090d16" stroke="${pinCor}" stroke-width="1.2" />
            <text x="0" y="-2" fill="${pinCor}" font-size="9.5" font-weight="800" text-anchor="middle">${escapeXml(pinText)}</text>
          </g>
        </g>
      `;
    }
  });

  return svgPins;
}

export function parsePromptToParams(promptText) {
  if (!promptText || typeof promptText !== 'string') return {};
  const boundedPrompt = promptText.slice(0, 500);
  const text = boundedPrompt.toLowerCase().trim();
  const extracted = {};

  if (text.includes('dashboard') || text.includes('painel')) extracted.tipo = 'dashboard';
  else if (text.includes('pizza')) extracted.tipo = 'pie';
  else if (text.includes('donut') || text.includes('rosca')) extracted.tipo = 'donut';
  else if (text.includes('velocimetro') || text.includes('gauge') || text.includes('score')) extracted.tipo = 'gauge';
  else if (text.includes('cascata') || text.includes('dre') || text.includes('waterfall')) extracted.tipo = 'waterfall';
  else if (text.includes('funil') || text.includes('conversao')) extracted.tipo = 'funnel';
  else if (text.includes('brasil') || text.includes('estados') || text.includes('mapa')) extracted.tipo = 'mapa_brasil';
  else if (text.includes('risco') || text.includes('compliance')) extracted.tipo = 'risk_matrix';
  else if (text.includes('solar') || text.includes('sunburst')) extracted.tipo = 'sunburst';
  else if (text.includes('kpi') || text.includes('card') || text.includes('metrica')) extracted.tipo = 'kpi_card';
  else if (text.includes('progresso') || text.includes('progress')) extracted.tipo = 'progress';
  else if (text.includes('ranking') || text.includes('horizontal')) extracted.tipo = 'bar_horizontal';
  else if (text.includes('linha') || text.includes('line') || text.includes('tendencia')) extracted.tipo = 'line';
  else if (text.includes('coluna') || text.includes('barra')) extracted.tipo = 'bar';
  else if (text.includes('area') || text.includes('faturamento') || text.includes('vendas')) extracted.tipo = 'area';

  if (text.includes('r$') || text.includes('reais') || text.includes('real') || text.includes('faturamento') || text.includes('receita') || text.includes('lucro') || text.includes('custo') || text.includes('vendas')) {
    extracted.moeda = 'BRL';
  } else if (text.includes('dolar') || text.includes('usd') || text.includes('$')) {
    extracted.moeda = 'USD';
  }

  if (text.includes('semestre') || text.includes('6 meses')) {
    extracted.labels = 'Jan,Fev,Mar,Abr,Mai,Jun';
    extracted.valores = '35000,48000,42000,61000,75000,92000';
  } else if (text.includes('ano') || text.includes('12 meses') || text.includes('anual')) {
    extracted.labels = 'Jan,Fev,Mar,Abr,Mai,Jun,Jul,Ago,Set,Out,Nov,Dez';
    extracted.valores = '28000,34000,42000,40000,52000,61000,58000,68000,72000,81000,89000,95000';
  } else if (text.includes('trimestre') || text.includes('quarter')) {
    extracted.labels = 'Q1,Q2,Q3,Q4';
    extracted.valores = '120000,145000,168000,210000';
  } else if (text.includes('semana') || text.includes('dias')) {
    extracted.labels = 'Seg,Ter,Qua,Qui,Sex,Sab,Dom';
    extracted.valores = '45,68,52,78,92,110,65';
  }

  const metaMatch = text.match(/meta\s*(?:de|:)?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|mil|%)?/i);
  if (metaMatch) {
    let val = parseFloat(metaMatch[1]);
    const mult = (metaMatch[2] || '').toLowerCase();
    if (mult === 'k' || mult === 'mil') val *= 1000;
    extracted.meta = String(val);
  }

  if (text.includes('media') || text.includes('média')) {
    extracted.media = 'true';
  }

  if (text.includes('claro') || text.includes('light') || text.includes('branco')) extracted.tema = 'light';
  else if (text.includes('auto') || text.includes('sistema')) extracted.tema = 'auto';
  else if (text.includes('transparente')) extracted.tema = 'transparent';
  else if (text.includes('escuro') || text.includes('dark')) extracted.tema = 'dark';

  if (text.includes('verde') || text.includes('emerald')) extracted.paleta = 'emerald';
  else if (text.includes('azul') || text.includes('ocean')) extracted.paleta = 'ocean';
  else if (text.includes('laranja') || text.includes('rosa') || text.includes('sunset')) extracted.paleta = 'sunset';
  else if (text.includes('roxo') || text.includes('violet') || text.includes('purpura')) extracted.paleta = 'violet';
  else if (text.includes('neon') || text.includes('cyber')) extracted.paleta = 'neon';

  extracted.titulo = boundedPrompt.charAt(0).toUpperCase() + boundedPrompt.slice(1);

  return extracted;
}

export const CATALOGO_GRAFICOS = [
  { tipo: 'area', nome: 'Área com Gradiente', desc: 'Tendência temporal suave com preenchimento em gradiente e pontos interativos' },
  { tipo: 'dashboard', nome: 'Painel Executivo 2x2', desc: 'Mini-dashboard consolidado com 4 quadrantes (KPI, Rosca, Área e Ranking) em uma única imagem' },
  { tipo: 'bar', nome: 'Colunas / Barras Verticais', desc: 'Comparativo de grandezas, suporta múltiplas séries agrupadas ou empilhadas e valores negativos' },
  { tipo: 'bar_horizontal', nome: 'Barras Horizontais / Ranking', desc: 'Ideal para rankings e nomes longos com ordenação ascendente ou descendente' },
  { tipo: 'stacked_bar', nome: 'Barras Empilhadas', desc: 'Composição de parcelas por categoria ao longo do tempo ou segmentos' },
  { tipo: 'line', nome: 'Linha Temporal Bézier', desc: 'Evolução contínua multi-série com curvas suaves ou retas e marcadores' },
  { tipo: 'donut', nome: 'Rosca com Total Central', desc: 'Distribuição proporcional com valor central, porcentagens e legenda lateral' },
  { tipo: 'pie', nome: 'Pizza Tradicional', desc: 'Proporção geral de fatias com destaque e cálculo de porcentagens' },
  { tipo: 'gauge', nome: 'Velocímetro / Indicador de Meta', desc: 'Progresso em arco de 180° com valor central, mínimo, máximo e meta' },
  { tipo: 'kpi_card', nome: 'Card Executivo de Métrica', desc: 'Valor em destaque, badge automático com seta de tendência e sparkline embutido' },
  { tipo: 'progress', nome: 'Barra de Progresso & Metas', desc: 'Barra única ou múltipla de atingimento com porcentagem, valores e animação' },
  { tipo: 'waterfall', nome: 'Cascata Financeira (DRE)', desc: 'Ponte de variação contábil com adições, deduções e subtotais automáticos' },
  { tipo: 'bullet', nome: 'Bullet Chart (OKR)', desc: 'Faixas qualitativas de desempenho, barra de realização e meta executiva' },
  { tipo: 'rings', nome: 'Anéis Radiais de Metas', desc: 'Múltiplos anéis concêntricos de atividade e atingimento simultâneo' },
  { tipo: 'heatmap', nome: 'Mapa de Calor (Heatmap)', desc: 'Matriz bidimensional de intensidade por dias da semana e turnos' },
  { tipo: 'scatter', nome: 'Dispersão (Scatter Plot)', desc: 'Correlação entre duas variáveis cartesianas X e Y com raios dimensionais' },
  { tipo: 'treemap', nome: 'Mapa em Árvore (Treemap)', desc: 'Blocos proporcionais retangulares com rótulos e participações de mercado' },
  { tipo: 'funnel', nome: 'Funil de Vendas & Conversão', desc: 'Estágios trapezoidais com taxa de conversão e perda por etapa' },
  { tipo: 'mapa_brasil', nome: 'Mapa do Brasil & Regiões', desc: 'Volume geográfico por UF (27 estados) e consolidação por grandes regiões' },
  { tipo: 'radar', nome: 'Radar Multidimensional (Teia)', desc: 'Avaliação técnica e scores polares em 3 ou mais eixos' },
  { tipo: 'combo', nome: 'Misto Barras + Linha', desc: 'Dois eixos Y independentes para comparar grandezas diferentes (ex: Volume vs Margem %)' },
  { tipo: 'candlestick', nome: 'Mercado Financeiro (Candlestick)', desc: 'Intervalo OHLC (Abertura, Máxima, Mínima e Fechamento) financeiro' },
  { tipo: 'step_line', nome: 'Linha em Degraus (Step Line)', desc: 'Transições discretas de estoque, capacidade ou níveis de serviço' },
  { tipo: 'pyramid', nome: 'Pirâmide de Distribuição', desc: 'Distribuição demográfica ou de clientes centralizada bilateralmente' },
  { tipo: 'sparkline', nome: 'Sparkline Inline Minimalista', desc: 'Micrográfico vetorial ultra compacto para tabelas e texto' },
  { tipo: 'lollipop', nome: 'Pirulito (Lollipop)', desc: 'Design minimalista e arejado com linha fina e vértice esférico iluminado' },
  { tipo: 'dumbbell', nome: 'Hálteres (Antes vs Depois)', desc: 'Comparativo de evolução conectando patamar inicial e realizado' },
  { tipo: 'waffle', nome: 'Grade Waffle 100%', desc: 'Matriz proporcional de 100 quadradinhos intuitiva para taxas e metas' },
  { tipo: 'badge', nome: 'Badge Shields.io', desc: 'Mini selo de status vetorial para colar no GitHub, documentações e rodapés' },
  { tipo: 'pareto', nome: 'Pareto 80/20', desc: 'Princípio de Pareto com barras ordenadas decrescentes e linha de percentual acumulado com corte em 80%' },
  { tipo: 'gantt', nome: 'Cronograma de Projetos (Gantt)', desc: 'Linhas de tempo com início, duração, marcos e barras de progresso' },
  { tipo: 'boxplot', nome: 'Diagrama de Caixas (Box Plot)', desc: 'Distribuição estatística rigorosa com mínimo, Q1, mediana, Q3, máximo e outliers' },
  { tipo: 'sankey', nome: 'Diagrama de Fluxos (Sankey)', desc: 'Faixas proporcionais com largura fluida conectando origens a destinos e custos' },
  { tipo: 'calendar', nome: 'Calendar Heatmap (Anual)', desc: 'Matriz anual de 52 semanas com densidade de atividade estilo contribuições do GitHub' },
  { tipo: 'tornado', nome: 'Gráfico Tornado (Sensibilidade)', desc: 'Barras bilaterais espelhadas a partir do centro para análise de cenários e sensibilidade' },
  { tipo: 'venn', nome: 'Diagrama de Venn (Conjuntos)', desc: 'Círculos translúcidos sobrepostos com cálculo das áreas de interseção' },
  { tipo: 'risk_matrix', nome: 'Matriz de Risco 5x5 (Compliance)', desc: 'Matriz bidimensional de Probabilidade x Impacto com quadrantes verde a vermelho' },
  { tipo: 'sunburst', nome: 'Gráfico Solar (Sunburst)', desc: 'Anéis concêntricos hierárquicos divididos em categorias macro e sub-itens proporcionais' }
];

// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZADORES NATIVOS SVG MATEMÁTICOS
// ─────────────────────────────────────────────────────────────────────────────

export class GraficosProEngine {
  static renderBarChart(params) {
    const {
      labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      valores = [35000, 48000, 42000, 61000, 75000, 92000],
      series = null,
      modo = 'grouped',
      titulo = 'Comparativo de Valores',
      subtitulo = '',
      rodape = '',
      width = 600,
      height = 320,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      corPrimaria = null,
      corSecundaria = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null,
      corTitulo = null,
      tamanhoTitulo = null,
      alinhamentoTitulo = 'left',
      corSubtitulo = null,
      grade = true,
      corGrade = null,
      estiloGrade = 'dashed',
      rotacaoLabels = 0,
      mostrarValores = true,
      corValores = null,
      moeda = null,
      compacto = true,
      casasDecimais = null,
      prefixo = '',
      sufixo = '',
      media = false,
      corMedia = null,
      labelMedia = null,
      meta = null,
      corMeta = null,
      labelMeta = null,
      linhasGuia = null,
      anotacoes = null,
      animado = true,
      multiColor = false,
      espessuraBarra = null,
      raioBarra = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = corPrimaria || colors[0];
    const secondaryColor = corSecundaria || colors[1] || mainColor;

    const padding = { top: 65, right: 30, bottom: (rotacaoLabels !== 0 ? 55 : 45), left: 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    // Multi-series
    let isMulti = Array.isArray(series) && series.length > 0;
    let seriesList = [];
    if (isMulti) {
      seriesList = series.map((s, i) => ({
        nome: s.nome || `Série ${i + 1}`,
        valores: (s.valores || []).map(Number),
        cor: s.cor || colors[i % colors.length]
      }));
    } else if (Array.isArray(valores) && Array.isArray(valores[0])) {
      isMulti = true;
      seriesList = valores.map((sub, i) => ({
        nome: `Série ${i + 1}`,
        valores: sub.map(Number),
        cor: colors[i % colors.length]
      }));
    }

    let minVal, maxVal;
    if (isMulti && modo === 'stacked') {
      const numPoints = Math.max(...seriesList.map(s => s.valores.length));
      let posSums = new Array(numPoints).fill(0);
      let negSums = new Array(numPoints).fill(0);
      seriesList.forEach(s => {
        s.valores.forEach((v, idx) => {
          if (v >= 0) posSums[idx] += v;
          else negSums[idx] += v;
        });
      });
      maxVal = Math.max(...posSums, Number(meta) || 0, 10);
      minVal = Math.min(0, ...negSums);
    } else if (isMulti) {
      const flat = seriesList.flatMap(s => s.valores);
      maxVal = Math.max(...flat, Number(meta) || 0, 10);
      minVal = Math.min(0, ...flat);
    } else {
      maxVal = Math.max(...valores, Number(meta) || 0, 10);
      minVal = Math.min(0, ...valores);
    }

    const range = maxVal - minVal || 1;
    const zeroY = padding.top + chartH - ((0 - minVal) / range) * chartH;

    const numSlots = isMulti ? Math.max(...seriesList.map(s => s.valores.length)) : valores.length;
    const step = chartW / (numSlots || 1);
    const slotW = step * 0.75;
    const cornerR = raioBarra !== null ? Number(raioBarra) : 6;

    const svgGrids = buildGridLines({ padding, width, chartH, minVal, range, t, grade, corGrade, estiloGrade, moeda, compacto, casasDecimais, prefixo, sufixo });
    const svgRefs = buildReferenceLines({ padding, width, chartH, minVal, range, valores, meta, corMeta, labelMeta, media, corMedia, labelMedia, linhasGuia, moeda, compacto });

    let svgBars = '';
    let svgLabels = '';

    if (isMulti && modo === 'grouped') {
      const numSeries = seriesList.length;
      const autoW = Math.max(6, Math.min(32, (slotW / numSeries) - 2));
      const barW = espessuraBarra !== null ? Number(espessuraBarra) : autoW;

      for (let idx = 0; idx < numSlots; idx++) {
        const slotX = padding.left + idx * step + (step - slotW) / 2;
        const lbl = labels[idx] || `#${idx + 1}`;

        seriesList.forEach((s, sIdx) => {
          const v = s.valores[idx] || 0;
          const barX = slotX + sIdx * (barW + 2);
          let yPos, bHeight;
          if (v >= 0) {
            yPos = padding.top + chartH - ((v - minVal) / range) * chartH;
            bHeight = Math.max(2, zeroY - yPos);
          } else {
            yPos = zeroY;
            bHeight = Math.max(2, ((0 - v) / range) * chartH);
          }

          svgBars += `
            <g class="bar-item">
              <rect x="${barX}" y="${yPos}" width="${barW}" height="${bHeight}" rx="${cornerR}" fill="${s.cor}" class="bar-rect" />
              <title>${escapeXml(s.nome)} - ${escapeXml(lbl)}: ${formatarNumero(v, { moeda, prefixo, sufixo, casasDecimais })}</title>
            </g>
          `;
        });

        const labelY = height - padding.bottom + 18;
        const rotTransform = rotacaoLabels ? `transform="rotate(${rotacaoLabels}, ${slotX + slotW / 2}, ${labelY})" text-anchor="start"` : 'text-anchor="middle"';
        svgLabels += `
          <text x="${slotX + slotW / 2}" y="${labelY}" fill="${t.textMuted}" font-size="11" ${rotTransform}>${escapeXml(lbl)}</text>
        `;
      }
    } else if (isMulti && modo === 'stacked') {
      const autoW = Math.max(12, Math.min(50, slotW));
      const barW = espessuraBarra !== null ? Number(espessuraBarra) : autoW;

      for (let idx = 0; idx < numSlots; idx++) {
        const xPos = padding.left + idx * step + (step - barW) / 2;
        const lbl = labels[idx] || `#${idx + 1}`;
        let curPos = zeroY;
        let curNeg = zeroY;

        seriesList.forEach((s) => {
          const v = s.valores[idx] || 0;
          const bH = (Math.abs(v) / range) * chartH;
          if (bH < 1) return;
          let yPos = 0;
          if (v >= 0) {
            yPos = curPos - bH;
            curPos = yPos;
          } else {
            yPos = curNeg;
            curNeg = curNeg + bH;
          }

          svgBars += `
            <g class="bar-item">
              <rect x="${xPos}" y="${yPos}" width="${barW}" height="${bH}" rx="${cornerR}" fill="${s.cor}" opacity="0.9" />
              <title>${escapeXml(s.nome)} - ${escapeXml(lbl)}: ${formatarNumero(v, { moeda, prefixo, sufixo, casasDecimais })}</title>
            </g>
          `;
        });

        const labelY = height - padding.bottom + 18;
        const rotTransform = rotacaoLabels ? `transform="rotate(${rotacaoLabels}, ${xPos + barW / 2}, ${labelY})" text-anchor="start"` : 'text-anchor="middle"';
        svgLabels += `
          <text x="${xPos + barW / 2}" y="${labelY}" fill="${t.textMuted}" font-size="11" ${rotTransform}>${escapeXml(lbl)}</text>
        `;
      }
    } else {
      const autoW = Math.max(12, Math.min(50, slotW));
      const barW = espessuraBarra !== null ? Number(espessuraBarra) : autoW;

      valores.forEach((v, idx) => {
        const xPos = padding.left + idx * step + (step - barW) / 2;
        const lbl = labels[idx] || `#${idx + 1}`;
        const vFmt = formatarNumero(v, { moeda, prefixo, sufixo, casasDecimais });
        const barColor = (cores && cores.length) ? colors[idx % colors.length] : (multiColor ? colors[idx % colors.length] : mainColor);

        let yPos, bHeight;
        if (v >= 0) {
          yPos = padding.top + chartH - ((v - minVal) / range) * chartH;
          bHeight = Math.max(3, zeroY - yPos);
        } else {
          yPos = zeroY;
          bHeight = Math.max(3, ((0 - v) / range) * chartH);
        }

        const labelY = v >= 0 ? yPos - 8 : yPos + bHeight + 14;
        const valTextColor = corValores || t.textPrimary;
        const valHalo = getTextHaloStyle(valTextColor, '2px');

        svgBars += `
          <g class="bar-item">
            <defs>
              <linearGradient id="barGrad${idx}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${barColor}" stop-opacity="1" />
                <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.8" />
              </linearGradient>
            </defs>
            <rect x="${xPos}" y="${yPos}" width="${barW}" height="${bHeight}" rx="${cornerR}" fill="url(#barGrad${idx})" class="bar-rect" />
            ${mostrarValores ? `<text x="${xPos + barW / 2}" y="${labelY}" fill="${valTextColor}" font-size="11" font-weight="800" text-anchor="middle" data-contrast="fixed" style="${valHalo}">${formatarNumero(v, { compacto, moeda, prefixo, sufixo, casasDecimais })}</text>` : ''}
            <title>${escapeXml(lbl)}: ${vFmt}</title>
          </g>
        `;

        const bottomLabelY = height - padding.bottom + 18;
        const rotTransform = rotacaoLabels ? `transform="rotate(${rotacaoLabels}, ${xPos + barW / 2}, ${bottomLabelY})" text-anchor="start"` : 'text-anchor="middle"';
        svgLabels += `
          <text x="${xPos + barW / 2}" y="${bottomLabelY}" fill="${t.textMuted}" font-size="11" ${rotTransform}>${escapeXml(lbl)}</text>
        `;
      });
    }

    // Legenda multi-séries
    let svgLegend = '';
    if (isMulti) {
      svgLegend = '<g class="chart-legend" transform="translate(' + (width - padding.right) + ', 30)">';
      let offset = 0;
      seriesList.slice().reverse().forEach((s) => {
        const textLen = (s.nome || '').length * 7 + 24;
        offset += textLen;
        svgLegend += `
          <g transform="translate(${-offset}, 0)">
            <circle cx="5" cy="-4" r="4.5" fill="${s.cor}" />
            <text x="14" y="0" fill="${t.textPrimary}" font-size="11" font-weight="600">${escapeXml(s.nome)}</text>
          </g>
        `;
      });
      svgLegend += '</g>';
    }

    const barCenterPoints = (valores || []).map((v, idx) => ({
      x: padding.left + idx * step + step / 2,
      y: v >= 0 ? padding.top + chartH - ((v - minVal) / range) * chartH : zeroY,
      v,
      lbl: labels[idx] || `#${idx + 1}`
    }));
    const svgPins = buildAnnotationPins({ points: barCenterPoints, anotacoes, chartH, padding, t });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        <style>
          .bar-rect { transition: transform 0.2s ease, opacity 0.2s ease; transform-origin: bottom; }
          .bar-item:hover .bar-rect { opacity: 0.85; filter: drop-shadow(0 0 8px ${mainColor}); }
          ${animado ? `
            @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
            .bar-rect { animation: barGrow 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          ` : ''}
        </style>
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgLegend}
        ${svgGrids}
        <line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" stroke="${t.textMuted}" stroke-width="1.2" opacity="0.4" />
        ${svgBars}
        ${svgLabels}
        ${svgRefs}
        ${svgPins}
      </svg>
    `.trim();
  }

  static renderAreaLineChart(params, isArea = true) {
    const {
      labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      valores = [35, 52, 48, 65, 78, 95],
      series = null,
      titulo = isArea ? 'Tendência de Crescimento (Área)' : 'Evolução Temporal (Linha)',
      subtitulo = '',
      rodape = '',
      width = 600,
      height = 320,
      tema = 'dark',
      paleta = 'ocean',
      cores = null,
      corPrimaria = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null,
      corTitulo = null,
      tamanhoTitulo = null,
      alinhamentoTitulo = 'left',
      corSubtitulo = null,
      grade = true,
      corGrade = null,
      estiloGrade = 'dashed',
      rotacaoLabels = 0,
      mostrarValores = false,
      corValores = null,
      moeda = null,
      compacto = false,
      casasDecimais = null,
      prefixo = '',
      sufixo = '',
      media = false,
      corMedia = null,
      labelMedia = null,
      meta = null,
      corMeta = null,
      labelMeta = null,
      linhasGuia = null,
      suave = true,
      pontos = true,
      tamanhoPontos = null,
      espessuraLinha = null,
      opacidadeArea = null,
      anotacoes = null,
      animado = true
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = corPrimaria || colors[0];

    const padding = { top: 65, right: 30, bottom: (rotacaoLabels !== 0 ? 55 : 45), left: 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    let isMulti = Array.isArray(series) && series.length > 0;
    let seriesList = [];
    if (isMulti) {
      seriesList = series.map((s, i) => ({
        nome: s.nome || `Série ${i + 1}`,
        valores: (s.valores || []).map(Number),
        cor: s.cor || colors[i % colors.length]
      }));
    } else if (Array.isArray(valores) && Array.isArray(valores[0])) {
      isMulti = true;
      seriesList = valores.map((sub, i) => ({
        nome: `Série ${i + 1}`,
        valores: sub.map(Number),
        cor: colors[i % colors.length]
      }));
    } else {
      seriesList = [{
        nome: titulo,
        valores: valores.map(Number),
        cor: mainColor
      }];
    }

    const flatVals = seriesList.flatMap(s => s.valores);
    const maxVal = Math.max(...flatVals, Number(meta) || 0, 10);
    const minVal = Math.min(...flatVals, 0);
    const range = maxVal - minVal || 1;
    const zeroY = padding.top + chartH - ((0 - minVal) / range) * chartH;

    const numPoints = Math.max(...seriesList.map(s => s.valores.length));
    const step = chartW / (numPoints - 1 || 1);

    const svgGrids = buildGridLines({ padding, width, chartH, minVal, range, t, grade, corGrade, estiloGrade, moeda, compacto, casasDecimais, prefixo, sufixo });
    const svgRefs = buildReferenceLines({ padding, width, chartH, minVal, range, valores: flatVals, meta, corMeta, labelMeta, media, corMedia, labelMedia, linhasGuia, moeda, compacto });

    let svgSeries = '';
    let svgDefs = '';
    const strokeW = espessuraLinha !== null ? Number(espessuraLinha) : 2.8;
    const dotR = tamanhoPontos !== null ? Number(tamanhoPontos) : 4.5;
    const areaOpac = opacidadeArea !== null ? Number(opacidadeArea) : 0.45;

    seriesList.forEach((s, sIdx) => {
      const sPoints = s.valores.map((v, idx) => ({
        x: padding.left + idx * step,
        y: padding.top + chartH - ((v - minVal) / range) * chartH,
        v,
        lbl: labels[idx] || `#${idx + 1}`
      }));

      if (sPoints.length === 0) return;

      let pathD = `M ${sPoints[0].x} ${sPoints[0].y}`;
      if (suave && sPoints.length > 2) {
        for (let i = 0; i < sPoints.length - 1; i++) {
          const p0 = sPoints[i];
          const p1 = sPoints[i + 1];
          const cpX1 = p0.x + (p1.x - p0.x) / 2;
          const cpY1 = p0.y;
          const cpX2 = p0.x + (p1.x - p0.x) / 2;
          const cpY2 = p1.y;
          pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
        }
      } else {
        for (let i = 1; i < sPoints.length; i++) {
          pathD += ` L ${sPoints[i].x} ${sPoints[i].y}`;
        }
      }

      const gradId = `areaGrad_${sIdx}`;
      svgDefs += `
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${s.cor}" stop-opacity="${areaOpac}" />
          <stop offset="100%" stop-color="${s.cor}" stop-opacity="0.0" />
        </linearGradient>
      `;

      const areaD = `${pathD} L ${sPoints[sPoints.length - 1].x} ${zeroY} L ${sPoints[0].x} ${zeroY} Z`;
      const svgPins = sIdx === 0
        ? buildAnnotationPins({ points: sPoints, anotacoes, chartH, padding, t })
        : '';

      let svgDots = '';
      if (pontos) {
        sPoints.forEach((p) => {
          const pointTextFill = corValores || t.textPrimary;
          const pointHalo = getTextHaloStyle(pointTextFill, '2px');
          svgDots += `
            <g class="dot-item">
              <circle cx="${p.x}" cy="${p.y}" r="${dotR}" fill="${s.cor}" stroke="${t.bg}" stroke-width="2.5" class="chart-dot" />
              ${mostrarValores ? `<text x="${p.x}" y="${p.y - dotR - 4}" fill="${pointTextFill}" font-size="10.5" font-weight="800" text-anchor="middle" data-contrast="fixed" style="${pointHalo}">${formatarNumero(p.v, { compacto, moeda, prefixo, sufixo, casasDecimais })}</text>` : ''}
              <title>${escapeXml(s.nome)} - ${escapeXml(p.lbl)}: ${formatarNumero(p.v, { moeda, prefixo, sufixo, casasDecimais })}</title>
            </g>
          `;
        });
      }

      svgSeries += `
        <g class="series-group">
          ${isArea ? `<path d="${areaD}" fill="url(#${gradId})" opacity="${isMulti ? 0.6 : 0.9}" />` : ''}
          <path d="${pathD}" fill="none" stroke="${s.cor}" stroke-width="${strokeW}" stroke-linecap="round" class="chart-line" />
          ${svgDots}
          ${svgPins}
        </g>
      `;
    });

    let svgLabels = '';
    for (let idx = 0; idx < numPoints; idx++) {
      const x = padding.left + idx * step;
      const lbl = labels[idx] || `#${idx + 1}`;
      const labelY = height - padding.bottom + 18;
      const rotTransform = rotacaoLabels ? `transform="rotate(${rotacaoLabels}, ${x}, ${labelY})" text-anchor="start"` : 'text-anchor="middle"';
      svgLabels += `
        <text x="${x}" y="${labelY}" fill="${t.textMuted}" font-size="11" ${rotTransform}>${escapeXml(lbl)}</text>
      `;
    }

    let svgLegend = '';
    if (isMulti) {
      svgLegend = '<g class="chart-legend" transform="translate(' + (width - padding.right) + ', 30)">';
      let offset = 0;
      seriesList.slice().reverse().forEach((s) => {
        const textLen = (s.nome || '').length * 7 + 24;
        offset += textLen;
        svgLegend += `
          <g transform="translate(${-offset}, 0)">
            <circle cx="5" cy="-4" r="4.5" fill="${s.cor}" />
            <text x="14" y="0" fill="${t.textPrimary}" font-size="11" font-weight="600">${escapeXml(s.nome)}</text>
          </g>
        `;
      });
      svgLegend += '</g>';
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        <style>
          .chart-dot { transition: transform 0.2s ease, r 0.2s ease; }
          .dot-item:hover .chart-dot { r: 7.5; fill: #ffffff; filter: drop-shadow(0 0 8px ${mainColor}); cursor: pointer; }
          ${animado ? `
            @keyframes pathDraw { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
            .chart-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: pathDraw 1.2s ease forwards; }
          ` : ''}
        </style>
        <defs>
          ${svgDefs}
        </defs>
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgLegend}
        ${svgGrids}
        <line x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" stroke="${t.textMuted}" stroke-width="1.2" opacity="0.4" />
        ${svgSeries}
        ${svgLabels}
        ${svgRefs}
      </svg>
    `.trim();
  }

  static renderDonutPie(params, isDonut = true) {
    const {
      labels = ['Alimentação', 'Tecnologia', 'Logística', 'Marketing'],
      valores = [40, 25, 20, 15],
      titulo = isDonut ? 'Distribuição por Categoria' : 'Proporção Geral',
      subtitulo = '',
      rodape = '',
      centroTexto = 'TOTAL',
      centroValor = null,
      semi = false,
      furo = null,
      destaqueFatia = null,
      posicaoLegenda = 'right',
      width = 520,
      height = 320,
      tema = 'dark',
      paleta = 'sunset',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null,
      corTitulo = null,
      tamanhoTitulo = null,
      alinhamentoTitulo = 'left',
      corSubtitulo = null,
      moeda = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    const padding = { top: 65, right: 30, bottom: 30, left: 30 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const total = valores.reduce((a, b) => a + Math.max(0, Number(b) || 0), 0) || 1;
    const hasLegend = posicaoLegenda !== 'none' && posicaoLegenda !== 'oculta';
    const cx = hasLegend ? (posicaoLegenda === 'bottom' ? width * 0.5 : width * 0.40) : width * 0.5;
    const cy = semi ? height * 0.70 : (posicaoLegenda === 'bottom' ? height * 0.44 : height * 0.54);
    const r = Math.min(cx, cy) - (semi ? 15 : (posicaoLegenda === 'bottom' ? 25 : 35));

    const defaultHole = isDonut ? (semi ? 0.65 : 0.6) : 0;
    const holeRatio = furo !== null ? Number(furo) : defaultHole;
    const innerR = r * Math.max(0, Math.min(0.95, holeRatio));

    const angleSpan = semi ? Math.PI : 2 * Math.PI;
    let currentAngle = semi ? -Math.PI : -Math.PI / 2;
    let svgSlices = '';
    let svgLegend = '';

    valores.forEach((rawV, idx) => {
      const v = Math.max(0, Number(rawV) || 0);
      const ratio = v / total;
      const sliceAngle = ratio * angleSpan;
      const color = colors[idx % colors.length];
      const lbl = labels[idx] || `Item ${idx + 1}`;
      const pct = (ratio * 100).toFixed(1) + '%';
      const isExploded = (destaqueFatia !== null && Number(destaqueFatia) === idx);

      if (v > 0) {
        if (ratio >= 0.999 && !semi) {
          svgSlices += `
            <g class="donut-slice">
              <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${t.bg}" stroke-width="2" class="slice-path" />
              <title>${escapeXml(lbl)}: ${formatarNumero(v, { moeda })} (${pct})</title>
            </g>
          `;
        } else {
          const endAngle = currentAngle + sliceAngle;
          const midAngle = currentAngle + sliceAngle / 2;
          const explodeX = isExploded ? Math.cos(midAngle) * 12 : 0;
          const explodeY = isExploded ? Math.sin(midAngle) * 12 : 0;

          const x1 = cx + r * Math.cos(currentAngle);
          const y1 = cy + r * Math.sin(currentAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          let d = '';
          if (innerR > 0) {
            const ix1 = cx + innerR * Math.cos(endAngle);
            const iy1 = cy + innerR * Math.sin(endAngle);
            const ix2 = cx + innerR * Math.cos(currentAngle);
            const iy2 = cy + innerR * Math.sin(currentAngle);
            d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
          } else {
            d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          }

          const transformStr = isExploded ? `transform="translate(${explodeX}, ${explodeY})"` : '';
          svgSlices += `
            <g class="donut-slice" ${transformStr}>
              <path d="${d}" fill="${color}" stroke="${t.bg}" stroke-width="2" class="slice-path" />
              <title>${escapeXml(lbl)}: ${formatarNumero(v, { moeda })} (${pct})</title>
            </g>
          `;
          currentAngle = endAngle;
        }
      }

      // Legenda
      if (hasLegend) {
        if (posicaoLegenda === 'bottom') {
          const itemW = width / Math.min(valores.length, 4);
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          const legX = padding.left + col * itemW;
          const legY = height - 35 + row * 16;
          svgLegend += `
            <g transform="translate(${legX}, ${legY})">
              <circle cx="5" cy="-3" r="4" fill="${color}" />
              <text x="14" y="0" fill="${t.textPrimary}" font-size="10.5" font-weight="600">${escapeXml(lbl)}: ${pct}</text>
            </g>
          `;
        } else {
          const legY = height * 0.24 + idx * 26;
          if (legY < height - 20) {
            svgLegend += `
              <g class="legend-item" transform="translate(${width * 0.68}, ${legY})">
                <rect x="0" y="-8" width="12" height="12" rx="3" fill="${color}" />
                <text x="18" y="2" fill="${t.textPrimary}" font-size="11.5" font-weight="600">${escapeXml(lbl)}</text>
                <text x="18" y="16" fill="${t.textMuted}" font-size="10">${pct} • ${formatarNumero(v, { compacto: true, moeda })}</text>
              </g>
            `;
          }
        }
      }
    });

    const displayCenterVal = centroValor !== null ? centroValor : formatarNumero(total, { compacto: true, moeda });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        <style>
          .slice-path { transition: transform 0.2s ease, opacity 0.2s ease; transform-origin: ${cx}px ${cy}px; }
          .donut-slice:hover .slice-path { transform: scale(1.04); opacity: 0.9; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); cursor: pointer; }
        </style>
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgSlices}
        ${innerR > 0 ? `
          <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${card.finalBg}" />
          <text x="${cx}" y="${cy - (semi ? 12 : 4)}" fill="${t.textMuted}" font-size="10.5" font-weight="700" text-anchor="middle">${escapeXml(centroTexto)}</text>
          <text x="${cx}" y="${cy + (semi ? 8 : 16)}" fill="${t.textPrimary}" font-size="14" font-weight="900" text-anchor="middle">${escapeXml(displayCenterVal)}</text>
        ` : ''}
        ${svgLegend}
      </svg>
    `.trim();
  }

  static renderGaugeChart(params) {
    const {
      valor = 78,
      min = 0,
      max = 100,
      meta = null,
      corMeta = null,
      labelMeta = null,
      titulo = 'Score de Performance',
      subtitulo = 'Meta Mensal Atingida',
      rodape = '',
      sufixo = '%',
      width = 420,
      height = 270,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      corPrimaria = null,
      espessuraArco = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null,
      corTitulo = null,
      tamanhoTitulo = null,
      alinhamentoTitulo = 'left',
      corSubtitulo = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = corPrimaria || colors[0];

    const padding = { top: 65, right: 30, bottom: 20, left: 30 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const cx = width / 2;
    const cy = height * 0.72;
    const r = Math.min(width, height) * 0.44;
    const thickness = espessuraArco !== null ? Number(espessuraArco) : 22;

    const numVal = Number(valor) || 0;
    const pct = Math.max(0, Math.min(1, (numVal - min) / (max - min || 1)));

    const startAngle = -Math.PI;
    const endAngle = 0;
    const currentAngle = startAngle + pct * Math.PI;

    function describeArc(radius, a1, a2) {
      const x1 = cx + radius * Math.cos(a1);
      const y1 = cy + radius * Math.sin(a1);
      const x2 = cx + radius * Math.cos(a2);
      const y2 = cy + radius * Math.sin(a2);
      const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    }

    const bgArc = describeArc(r, startAngle, endAngle);
    const valArc = describeArc(r, startAngle, currentAngle);

    let svgMeta = '';
    if (meta !== null) {
      const metaPct = Math.max(0, Math.min(1, (Number(meta) - min) / (max - min || 1)));
      const metaAngle = startAngle + metaPct * Math.PI;
      const mx1 = cx + (r - thickness / 2 - 4) * Math.cos(metaAngle);
      const my1 = cy + (r - thickness / 2 - 4) * Math.sin(metaAngle);
      const mx2 = cx + (r + thickness / 2 + 4) * Math.cos(metaAngle);
      const my2 = cy + (r + thickness / 2 + 4) * Math.sin(metaAngle);
      const cMeta = corMeta || '#ef4444';
      const lMeta = labelMeta || `Meta: ${meta}${escapeXml(sufixo)}`;
      svgMeta = `
        <line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="${cMeta}" stroke-width="3" stroke-linecap="round" />
        <text x="${cx + (r + thickness + 12) * Math.cos(metaAngle)}" y="${cy + (r + thickness + 12) * Math.sin(metaAngle)}" fill="${cMeta}" font-size="10" font-weight="700" text-anchor="middle">${escapeXml(lMeta)}</text>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        
        <path d="${bgArc}" fill="none" stroke="${t.grid}" stroke-width="${thickness}" stroke-linecap="round" />
        <path d="${valArc}" fill="none" stroke="${mainColor}" stroke-width="${thickness}" stroke-linecap="round" />
        ${svgMeta}

        <text x="${cx}" y="${cy - 12}" fill="${t.textPrimary}" font-size="34" font-weight="900" text-anchor="middle">${escapeXml(String(valor))}${escapeXml(sufixo)}</text>
        <text x="${cx}" y="${cy + 16}" fill="${t.textMuted}" font-size="12" font-weight="600" text-anchor="middle">Progresso: ${(pct * 100).toFixed(0)}%</text>

        <text x="${cx - r}" y="${cy + 30}" fill="${t.textMuted}" font-size="11" text-anchor="middle">${min}${escapeXml(sufixo)}</text>
        <text x="${cx + r}" y="${cy + 30}" fill="${t.textMuted}" font-size="11" text-anchor="middle">${max}${escapeXml(sufixo)}</text>
      </svg>
    `.trim();
  }

  static renderKpiCard(params) {
    const {
      titulo = 'Faturamento Mensal',
      valor = 'R$ 148.920,00',
      badge = '+18.4%',
      subtitulo = 'vs. mês anterior',
      rodape = '',
      sparkline = [20, 35, 30, 45, 40, 60, 55, 75, 70, 95],
      width = 360,
      height = 180,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });

    const badgeStr = String(badge || '').trim();
    const isNeg = badgeStr.startsWith('-');
    const isPos = badgeStr.startsWith('+') || (!isNeg && Number(badgeStr.replace('%', '')) > 0);
    const badgeColor = isNeg ? '#ef4444' : (isPos ? '#10b981' : t.textMuted);
    const badgeBg = isNeg ? 'rgba(239,68,68,0.18)' : (isPos ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)');
    const arrow = isNeg ? '▼' : (isPos ? '▲' : '•');
    const mainColor = colors[0];

    const sparkW = width - 40;
    const sparkH = 45;
    const numSpark = (sparkline && sparkline.length ? sparkline : [20, 35, 40, 55, 70, 90]).map(Number);
    const minS = Math.min(...numSpark);
    const maxS = Math.max(...numSpark) || 1;
    const rangeS = maxS - minS || 1;
    const stepS = sparkW / (numSpark.length - 1 || 1);

    const sPoints = numSpark.map((v, i) => ({
      x: 20 + i * stepS,
      y: height - 20 - ((v - minS) / rangeS) * sparkH
    }));

    let pathD = `M ${sPoints[0].x} ${sPoints[0].y}`;
    for (let i = 0; i < sPoints.length - 1; i++) {
      const p0 = sPoints[i];
      const p1 = sPoints[i + 1];
      const cpX = p0.x + (p1.x - p0.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const areaD = `${pathD} L ${sPoints[sPoints.length - 1].x} ${height - 15} L ${sPoints[0].x} ${height - 15} Z`;
    const badgeW = Math.max(70, badgeStr.length * 8 + 24);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        <defs>
          <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${mainColor}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${mainColor}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${card.rectBg}
        <text x="20" y="30" fill="${t.textMuted}" font-size="12" font-weight="600">${escapeXml(titulo)}</text>
        <text x="20" y="68" fill="${t.textPrimary}" font-size="26" font-weight="900">${escapeXml(String(valor))}</text>
        ${subtitulo ? `<text x="20" y="88" fill="${t.textMuted}" font-size="11">${escapeXml(subtitulo)}</text>` : ''}

        <g transform="translate(${width - badgeW - 20}, 20)">
          <rect width="${badgeW}" height="24" rx="12" fill="${badgeBg}" />
          <text x="${badgeW / 2}" y="16" fill="${badgeColor}" font-size="11" font-weight="700" text-anchor="middle">${arrow} ${escapeXml(badgeStr)}</text>
        </g>

        <path d="${areaD}" fill="url(#kpiGrad)" />
        <path d="${pathD}" fill="none" stroke="${mainColor}" stroke-width="2.5" stroke-linecap="round" />
        ${rodape ? `<text x="${width - 20}" y="${height - 8}" fill="${t.textMuted}" font-size="9" text-anchor="end" opacity="0.7">${escapeXml(rodape)}</text>` : ''}
      </svg>
    `.trim();
  }

  static renderProgressBar(params) {
    const {
      titulo = 'Progresso Geral',
      subtitulo = '',
      rodape = '',
      items = null,
      valor = 75,
      total = 100,
      width = 540,
      height = null,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      corPrimaria = null,
      moeda = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null,
      animado = true
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    let barList = [];
    if (Array.isArray(items) && items.length > 0) {
      barList = items.map((it, i) => ({
        label: it.label || it.nome || `Meta ${i + 1}`,
        valor: Number(it.valor) || 0,
        total: Number(it.total) || 100,
        cor: it.cor || colors[i % colors.length]
      }));
    } else {
      barList = [{
        label: titulo,
        valor: Number(valor) || 0,
        total: Number(total) || 100,
        cor: corPrimaria || colors[0]
      }];
    }

    const calcH = height || Math.max(160, 75 + barList.length * 52);
    const padding = { top: 60, right: 30, bottom: 20, left: 30 };
    const barAreaW = width - padding.left - padding.right;

    const card = buildCardContainer({ width, height: calcH, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height: calcH, padding, t, titulo, subtitulo, rodape });

    let svgRows = '';
    barList.forEach((b, idx) => {
      const y = padding.top + idx * 52;
      const pct = Math.max(0, Math.min(100, (b.valor / (b.total || 1)) * 100));
      const fillW = Math.max(6, (pct / 100) * barAreaW);
      const valFmt = formatarNumero(b.valor, { moeda });
      const totalFmt = formatarNumero(b.total, { moeda });

      svgRows += `
        <g class="prog-row" transform="translate(${padding.left}, ${y})">
          <text x="0" y="14" fill="${t.textPrimary}" font-size="12" font-weight="700">${escapeXml(b.label)}</text>
          <text x="${barAreaW}" y="14" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="end">${valFmt} / ${totalFmt} (${pct.toFixed(1)}%)</text>
          <rect x="0" y="24" width="${barAreaW}" height="12" rx="6" fill="${t.grid}" />
          <rect x="0" y="24" width="${fillW}" height="12" rx="6" fill="${b.cor}" class="prog-fill" />
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${calcH}" width="${width}" height="${calcH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        <style>
          ${animado ? `
            @keyframes progExpand { from { width: 0; } }
            .prog-fill { animation: progExpand 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          ` : ''}
        </style>
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderWaterfallChart(params) {
    const {
      labels = ['Receita Bruta', 'Deduções', 'Custos CMV', 'Despesas Op.', 'Lucro Líquido'],
      valores = [150000, -22500, -55000, -28000, 44500],
      titulo = 'Demonstrativo de Resultado DRE (Cascata)',
      subtitulo = 'Análise Financeira de Entradas, Deduções e Lucro',
      rodape = '',
      width = 620,
      height = 340,
      tema = 'dark',
      cores = null,
      moeda = 'BRL',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const padding = { top: 65, right: 30, bottom: 45, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    let runningTotal = 0;
    const barsData = valores.map((val, idx) => {
      const isTotal = idx === valores.length - 1;
      let start = runningTotal;
      let end = isTotal ? val : runningTotal + val;
      if (!isTotal) runningTotal = end;
      return {
        val,
        start: isTotal ? 0 : start,
        end,
        isPositive: val >= 0,
        isTotal,
        lbl: labels[idx] || `Etapa ${idx + 1}`
      };
    });

    const allValues = [0, ...barsData.map(b => b.start), ...barsData.map(b => b.end)];
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(...allValues, 10);
    const range = maxVal - minVal || 1;

    const step = chartW / (valores.length || 1);
    const bW = Math.max(14, Math.min(48, step * 0.6));

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (chartH / 4) * i;
      const yVal = minVal + (range / 4) * (4 - i);
      svgGrids += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${t.grid}" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="10.5" text-anchor="end">${formatarNumero(yVal, { compacto: true, moeda })}</text>
      `;
    }

    let svgBars = '';
    let svgLabels = '';

    barsData.forEach((b, idx) => {
      const cx = padding.left + idx * step + step / 2;
      const x = cx - bW / 2;

      const yTopVal = Math.max(b.start, b.end);
      const yBottomVal = Math.min(b.start, b.end);

      const y = padding.top + chartH - ((yTopVal - minVal) / range) * chartH;
      const barHeight = Math.max(4, ((yTopVal - yBottomVal) / range) * chartH);

      let color = b.isTotal ? '#38bdf8' : (b.isPositive ? '#10b981' : '#ef4444');
      if (cores && cores[idx]) color = cores[idx];
      const valFmt = (b.isPositive && !b.isTotal ? '+' : '') + formatarNumero(b.val, { compacto: true, moeda });

      svgBars += `
        <g class="waterfall-bar">
          <rect x="${x}" y="${y}" width="${bW}" height="${barHeight}" rx="4" fill="${color}" opacity="0.9" />
          <text x="${cx}" y="${y - 6}" fill="${color}" font-size="10" font-weight="700" text-anchor="middle">${valFmt}</text>
          <title>${escapeXml(b.lbl)}: ${formatarNumero(b.val, { moeda })}</title>
        </g>
      `;

      if (idx < barsData.length - 1) {
        const nextCx = padding.left + (idx + 1) * step + step / 2;
        const connectY = padding.top + chartH - ((b.end - minVal) / range) * chartH;
        svgBars += `
          <line x1="${cx + bW / 2}" y1="${connectY}" x2="${nextCx - bW / 2}" y2="${connectY}" stroke="${t.textMuted}" stroke-width="1" stroke-dasharray="2,2" opacity="0.6" />
        `;
      }

      svgLabels += `
        <text x="${cx}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="10.5" font-weight="600" text-anchor="middle">${escapeXml(b.lbl)}</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${svgBars}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderBulletChart(params) {
    const {
      titulo = 'Performance vs Meta (Bullet)',
      subtitulo = 'Faixas de Tolerância: Ruim (40%), Médio (70%), Excelente (100%)',
      rodape = '',
      labels = ['Meta Anual', 'Q1 Realizado', 'Q2 Realizado', 'Q3 Realizado'],
      valores = [82, 65, 90, 75],
      width = 600,
      height = 320,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      moeda = 'BRL',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const padding = { top: 70, right: 30, bottom: 30, left: 110 };
    const chartW = width - padding.left - padding.right;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    let svgRows = '';
    const rowH = 46;

    valores.forEach((v, idx) => {
      const y = padding.top + idx * (rowH + 12);
      const lbl = labels[idx] || `Item ${idx + 1}`;
      const cor = colors[idx % colors.length];

      const wRuim = chartW * 0.40;
      const wMedio = chartW * 0.70;
      const wBom = chartW * 1.0;
      const wVal = Math.min(chartW, (v / 100) * chartW);
      const targetX = padding.left + chartW * 0.85;

      svgRows += `
        <g>
          <text x="${padding.left - 12}" y="${y + rowH / 2 + 4}" fill="${t.textPrimary}" font-size="12" font-weight="700" text-anchor="end">${escapeXml(lbl)}</text>
          <rect x="${padding.left}" y="${y}" width="${wBom}" height="${rowH}" rx="4" fill="rgba(255,255,255,0.04)" />
          <rect x="${padding.left}" y="${y}" width="${wMedio}" height="${rowH}" rx="4" fill="rgba(255,255,255,0.06)" />
          <rect x="${padding.left}" y="${y}" width="${wRuim}" height="${rowH}" rx="4" fill="rgba(255,255,255,0.08)" />
          <rect x="${padding.left}" y="${y + 11}" width="${wVal}" height="${rowH - 22}" rx="3" fill="${cor}" />
          <line x1="${targetX}" y1="${y + 4}" x2="${targetX}" y2="${y + rowH - 4}" stroke="#ef4444" stroke-width="3" />
          <text x="${padding.left + wVal + 8}" y="${y + rowH / 2 + 4}" fill="${cor}" font-size="11.5" font-weight="800">${v}%</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderRadialBarChart(params) {
    const {
      labels = ['Meta Vendas', 'Retenção', 'Conversão', 'NPS Clientes'],
      valores = [88, 74, 92, 65],
      titulo = 'Metas de Desempenho (Radial Bar)',
      subtitulo = 'Progresso Trimestral por Indicador',
      rodape = '',
      width = 560,
      height = 340,
      tema = 'dark',
      paleta = 'neon',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding: { left: 24, right: 24 }, t, titulo, subtitulo, rodape });

    const cx = width * 0.40;
    const cy = height * 0.55;
    const maxRadius = 100;
    const barWidth = 12;
    const gap = 6;

    let svgBars = '';
    let svgLegend = '';

    valores.forEach((val, i) => {
      const r = maxRadius - i * (barWidth + gap);
      const circumference = 2 * Math.PI * r;
      const pct = Math.min(100, Math.max(0, val));
      const strokeDashoffset = circumference - (pct / 100) * circumference;
      const cor = colors[i % colors.length];
      const lbl = labels[i] || `Meta ${i + 1}`;

      svgBars += `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${barWidth}" opacity="0.15" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="${barWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" />
      `;

      const legY = 100 + i * 36;
      svgLegend += `
        <g transform="translate(${width * 0.65}, ${legY})">
          <circle cx="0" cy="0" r="5" fill="${cor}" />
          <text x="12" y="3" fill="${t.textPrimary}" font-size="12" font-weight="700">${escapeXml(lbl)}</text>
          <text x="12" y="18" fill="${cor}" font-size="11" font-weight="800">${pct}% Concluído</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgBars}
        ${svgLegend}
      </svg>
    `.trim();
  }

  static renderHeatmapMatrix(params) {
    const {
      dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      horas = ['Manhã', 'Almoço', 'Tarde', 'Noite'],
      matriz = [
        [45, 60, 52, 70, 85, 92, 40],
        [75, 90, 85, 110, 140, 160, 85],
        [60, 80, 75, 95, 120, 135, 70],
        [30, 45, 40, 65, 95, 115, 60]
      ],
      titulo = 'Mapa de Calor de Vendas & Atendimentos',
      subtitulo = 'Volume por Dia da Semana e Turno',
      rodape = '',
      width = 580,
      height = 320,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const baseColor = colors[0];

    const padding = { top: 65, right: 30, bottom: 35, left: 80 };
    const gridW = width - padding.left - padding.right;
    const gridH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const numCols = dias.length;
    const numRows = horas.length;
    const cellW = (gridW - (numCols - 1) * 6) / numCols;
    const cellH = (gridH - (numRows - 1) * 6) / numRows;

    let maxVal = 1;
    matriz.forEach(row => row.forEach(val => { if (val > maxVal) maxVal = val; }));

    let svgCells = '';
    let svgColLabels = '';
    let svgRowLabels = '';

    dias.forEach((d, colIdx) => {
      const x = padding.left + colIdx * (cellW + 6);
      svgColLabels += `
        <text x="${x + cellW / 2}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="middle">${escapeXml(d)}</text>
      `;
    });

    horas.forEach((h, rowIdx) => {
      const y = padding.top + rowIdx * (cellH + 6);
      svgRowLabels += `
        <text x="${padding.left - 12}" y="${y + cellH / 2 + 4}" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="end">${escapeXml(h)}</text>
      `;

      dias.forEach((d, colIdx) => {
        const x = padding.left + colIdx * (cellW + 6);
        const val = (matriz[rowIdx] && matriz[rowIdx][colIdx] !== undefined) ? matriz[rowIdx][colIdx] : 0;
        const opacity = Math.max(0.12, Math.min(1.0, val / maxVal));
        const cellTextFill = opacity > 0.45 ? getContrastTextColor(baseColor) : t.textPrimary;
        const cellHalo = getTextHaloStyle(cellTextFill, '2px');

        svgCells += `
          <g class="heat-cell">
            <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="5" fill="${baseColor}" opacity="${opacity.toFixed(2)}" />
            <text x="${x + cellW / 2}" y="${y + cellH / 2 + 4}" fill="${cellTextFill}" font-size="10.5" font-weight="900" text-anchor="middle" data-contrast="fixed" style="${cellHalo}">${val}</text>
            <title>${escapeXml(d)} • ${escapeXml(h)}: ${val} registros</title>
          </g>
        `;
      });
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgCells}
        ${svgColLabels}
        ${svgRowLabels}
      </svg>
    `.trim();
  }

  static renderScatterChart(params) {
    const {
      labels = ['Lead A', 'Lead B', 'Lead C', 'Lead D', 'Lead E', 'Lead F', 'Lead G'],
      valores = [15, 28, 42, 60, 75, 88, 95],
      pontos = null,
      titulo = 'Dispersão de Dados (Scatter Plot)',
      subtitulo = 'Correlação entre Investimento (X) e Retorno (Y)',
      rodape = '',
      width = 600,
      height = 340,
      tema = 'dark',
      paleta = 'neon',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const padding = { top: 65, right: 35, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    let dataPts = pontos;
    if (!dataPts || !Array.isArray(dataPts)) {
      dataPts = valores.map((v, i) => ({
        x: (i + 1) * 12 + (v % 20),
        y: v,
        r: 6 + (v % 8),
        label: labels[i] || `Ponto ${i + 1}`
      }));
    }

    const maxX = Math.max(...dataPts.map(p => Number(p.x) || 0), 10);
    const maxY = Math.max(...dataPts.map(p => Number(p.y) || 0), 10);

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const x = padding.left + (chartW / 4) * i;
      const valY = Math.round(maxY - (maxY / 4) * i);
      const valX = Math.round((maxX / 4) * i);

      svgGrids += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${t.grid}" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="${t.textMuted}" font-size="10" text-anchor="end">${valY}</text>
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="${t.grid}" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${x}" y="${height - padding.bottom + 16}" fill="${t.textMuted}" font-size="10" text-anchor="middle">${valX}</text>
      `;
    }

    let svgCircles = '';
    dataPts.forEach((p, idx) => {
      const cx = padding.left + (p.x / maxX) * chartW;
      const cy = padding.top + chartH - (p.y / maxY) * chartH;
      const r = p.r || 8;
      const cor = colors[idx % colors.length];

      svgCircles += `
        <g class="scatter-point">
          <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${cor}" opacity="0.2" />
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor}" stroke="#fff" stroke-width="1.5" />
          <text x="${cx}" y="${cy - r - 6}" fill="${t.textPrimary}" font-size="10" font-weight="700" text-anchor="middle">${escapeXml(p.label)}</text>
          <title>${escapeXml(p.label)} (X: ${p.x}, Y: ${p.y})</title>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${svgCircles}
      </svg>
    `.trim();
  }

  static renderTreemapChart(params) {
    const {
      labels = ['Smartphones', 'Notebooks', 'Acessórios', 'Monitores', 'Serviços'],
      valores = [450, 320, 180, 140, 90],
      titulo = 'Market Share por Categoria (Treemap)',
      subtitulo = 'Volume de Vendas Faturadas',
      rodape = '',
      width = 600,
      height = 340,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      moeda = 'BRL',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const padding = { top: 65, right: 24, bottom: 20, left: 24 };
    const mapW = width - padding.left - padding.right;
    const mapH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const total = valores.reduce((a, b) => a + Number(b), 0) || 1;

    const col1W = mapW * 0.58;
    const col2W = mapW * 0.42;

    const b1H = mapH * 0.65;
    const b2H = mapH * 0.35;
    const b3H = mapH * 0.45;
    const b4H = mapH * 0.30;
    const b5H = mapH * 0.25;

    const boxes = [
      { x: padding.left, y: padding.top, w: col1W - 4, h: b1H - 4, label: labels[0] || 'Cat 1', val: valores[0] || 0, cor: colors[0] },
      { x: padding.left, y: padding.top + b1H, w: col1W - 4, h: b2H, label: labels[1] || 'Cat 2', val: valores[1] || 0, cor: colors[1] },
      { x: padding.left + col1W, y: padding.top, w: col2W, h: b3H - 4, label: labels[2] || 'Cat 3', val: valores[2] || 0, cor: colors[2] },
      { x: padding.left + col1W, y: padding.top + b3H, w: col2W, h: b4H - 4, label: labels[3] || 'Cat 4', val: valores[3] || 0, cor: colors[3] },
      { x: padding.left + col1W, y: padding.top + b3H + b4H, w: col2W, h: b5H, label: labels[4] || 'Cat 5', val: valores[4] || 0, cor: colors[4 % colors.length] }
    ];

    let svgBoxes = '';
    boxes.forEach(b => {
      const pct = ((b.val / total) * 100).toFixed(1);
      const textFill = getContrastTextColor(b.cor);
      const textHalo = getTextHaloStyle(textFill, '2.5px');
      svgBoxes += `
        <g class="treemap-box">
          <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${b.cor}" opacity="0.92" stroke="${t.bg}" stroke-width="2" />
          <text x="${b.x + 12}" y="${b.y + 24}" fill="${textFill}" font-size="13" font-weight="900" data-contrast="fixed" style="${textHalo}">${escapeXml(b.label)}</text>
          <text x="${b.x + 12}" y="${b.y + 42}" fill="${textFill}" font-size="11.5" font-weight="800" data-contrast="fixed" style="${textHalo}">${formatarNumero(b.val, { moeda, compacto: true })} (${pct}%)</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgBoxes}
      </svg>
    `.trim();
  }

  static renderStepLineChart(params) {
    const {
      labels = ['08h', '10h', '12h', '14h', '16h', '18h', '20h'],
      valores = [40, 40, 85, 85, 120, 95, 60],
      titulo = 'Estoque & Nível de Serviço (Step Line)',
      subtitulo = 'Variações em Degraus Discretos',
      rodape = '',
      width = 600,
      height = 320,
      tema = 'dark',
      paleta = 'violet',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const cor = colors[0];
    const padding = { top: 65, right: 30, bottom: 35, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const maxVal = Math.max(...valores, 10);
    const stepX = chartW / (valores.length - 1 || 1);

    let dPath = '';
    let svgDots = '';
    let svgLabels = '';

    valores.forEach((v, idx) => {
      const x = padding.left + idx * stepX;
      const y = padding.top + chartH - (v / maxVal) * chartH;
      const lbl = labels[idx] || `#${idx + 1}`;

      if (idx === 0) {
        dPath = `M ${x} ${y}`;
      } else {
        const prevY = padding.top + chartH - (valores[idx - 1] / maxVal) * chartH;
        dPath += ` L ${x} ${prevY} L ${x} ${y}`;
      }

      svgDots += `
        <circle cx="${x}" cy="${y}" r="4" fill="${cor}" stroke="#fff" stroke-width="1.5" />
      `;
      svgLabels += `
        <text x="${x}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="11" text-anchor="middle">${escapeXml(lbl)}</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        <path d="${dPath}" fill="none" stroke="${cor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="miter" />
        ${svgDots}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderPyramidChart(params) {
    const {
      labels = ['18-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55+ anos'],
      valores = [35, 75, 95, 60, 30],
      titulo = 'Distribuição de Clientes por Faixa Etária (Pirâmide)',
      subtitulo = 'Volume Centralizado de Compradores',
      rodape = '',
      width = 600,
      height = 320,
      tema = 'dark',
      paleta = 'sunset',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const padding = { top: 65, right: 40, bottom: 25, left: 40 };
    const chartW = width - padding.left - padding.right;
    const midX = width / 2;
    const maxVal = Math.max(...valores, 10);
    const rowH = 34;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    let svgBars = '';
    valores.forEach((v, idx) => {
      const y = padding.top + idx * (rowH + 10);
      const w = (v / maxVal) * (chartW * 0.44);
      const cor = colors[idx % colors.length];
      const lbl = labels[idx] || `Faixa ${idx + 1}`;
      const textFill = getContrastTextColor(cor);
      const haloStyle = getTextHaloStyle(textFill, '2px');

      svgBars += `
        <g>
          <rect x="${midX - w}" y="${y}" width="${w}" height="${rowH}" rx="4" fill="${cor}" opacity="0.92" />
          <rect x="${midX}" y="${y}" width="${w}" height="${rowH}" rx="4" fill="${cor}" opacity="0.92" />
          <text x="${midX}" y="${y + rowH / 2 + 4}" fill="${textFill}" font-size="11.5" font-weight="900" text-anchor="middle" data-contrast="fixed" style="${haloStyle}">${escapeXml(lbl)} (${v})</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgBars}
      </svg>
    `.trim();
  }

  static renderLollipopChart(params) {
    const {
      labels = ['São Paulo', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador'],
      valores = [95, 68, 54, 42, 38],
      titulo = 'Desempenho por Unidade (Pirulito / Lollipop)',
      subtitulo = 'Design minimalista e arejado',
      rodape = '',
      width = 580,
      height = 320,
      tema = 'dark',
      paleta = 'neon',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const padding = { top: 65, right: 50, bottom: 25, left: 130 };
    const chartW = width - padding.left - padding.right;
    const maxVal = Math.max(...valores, 10);
    const rowH = (height - padding.top - padding.bottom) / (valores.length || 1);

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    let svgRows = '';
    valores.forEach((v, idx) => {
      const y = padding.top + idx * rowH + rowH / 2;
      const xEnd = padding.left + (v / maxVal) * chartW;
      const cor = colors[idx % colors.length];
      const lbl = labels[idx] || `Item ${idx + 1}`;

      svgRows += `
        <g>
          <text x="${padding.left - 12}" y="${y + 4}" fill="${t.textPrimary}" font-size="12" font-weight="600" text-anchor="end">${escapeXml(lbl)}</text>
          <line x1="${padding.left}" y1="${y}" x2="${xEnd}" y2="${y}" stroke="${cor}" stroke-width="2.5" opacity="0.8" />
          <circle cx="${xEnd}" cy="${y}" r="7" fill="${cor}" stroke="#fff" stroke-width="2" />
          <text x="${xEnd + 14}" y="${y + 4}" fill="${cor}" font-size="11.5" font-weight="800">${v}</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderDumbbellChart(params) {
    const {
      labels = ['NPS Score', 'Taxa Conversão', 'Ticket Médio', 'Retenção', 'Engajamento'],
      valoresAntes = [45, 12, 110, 68, 35],
      valoresDepois = [78, 22, 165, 84, 58],
      titulo = 'Evolução de Indicadores (Dumbbell Antes vs Depois)',
      subtitulo = 'Comparativo de Impacto após Modernização',
      rodape = '',
      width = 600,
      height = 320,
      tema = 'dark',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const padding = { top: 65, right: 40, bottom: 25, left: 130 };
    const chartW = width - padding.left - padding.right;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const all = [...valoresAntes, ...valoresDepois];
    const maxVal = Math.max(...all, 10);
    const rowH = (height - padding.top - padding.bottom) / (labels.length || 1);

    let svgRows = '';
    labels.forEach((lbl, idx) => {
      const y = padding.top + idx * rowH + rowH / 2;
      const vA = valoresAntes[idx] || 0;
      const vD = valoresDepois[idx] || 0;
      const xA = padding.left + (vA / maxVal) * chartW;
      const xD = padding.left + (vD / maxVal) * chartW;

      svgRows += `
        <g>
          <text x="${padding.left - 12}" y="${y + 4}" fill="${t.textPrimary}" font-size="12" font-weight="600" text-anchor="end">${escapeXml(lbl)}</text>
          <line x1="${Math.min(xA, xD)}" y1="${y}" x2="${Math.max(xA, xD)}" y2="${y}" stroke="${t.textMuted}" stroke-width="2.5" opacity="0.5" />
          <circle cx="${xA}" cy="${y}" r="6" fill="#ef4444" stroke="#fff" stroke-width="1.5" />
          <circle cx="${xD}" cy="${y}" r="6" fill="#10b981" stroke="#fff" stroke-width="1.5" />
        </g>
      `;
    });

    const svgLegend = `
      <g transform="translate(${width - padding.right - 140}, 30)">
        <circle cx="0" cy="0" r="4.5" fill="#ef4444" />
        <text x="10" y="3.5" fill="${t.textMuted}" font-size="10.5">Antes</text>
        <circle cx="65" cy="0" r="4.5" fill="#10b981" />
        <text x="75" y="3.5" fill="${t.textMuted}" font-size="10.5">Depois</text>
      </g>
    `;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgLegend}
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderWaffleChart(params) {
    const {
      valor = 68,
      total = 100,
      titulo = 'Taxa de Sucesso & Fidelidade (Waffle 100%)',
      subtitulo = 'Proporção em Grade 10x10',
      rodape = '',
      width = 460,
      height = 320,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const activeColor = colors[0];

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding: { left: 24, right: 24 }, t, titulo, subtitulo, rodape });

    const pct = Math.max(0, Math.min(100, Math.round((Number(valor) / (Number(total) || 100)) * 100)));
    const startX = 35;
    const startY = 75;
    const cellSize = 17;
    const gap = 4;

    const emptyCellFill = (t && t.grid) ? t.grid : 'rgba(255,255,255,0.08)';
    let svgCells = '';
    for (let i = 0; i < 100; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const x = startX + col * (cellSize + gap);
      const y = startY + (9 - row) * (cellSize + gap); // bottom to top
      const isFilled = i < pct;
      const fill = isFilled ? activeColor : emptyCellFill;

      svgCells += `
        <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fill}" />
      `;
    }

    const sideX = startX + 10 * (cellSize + gap) + 30;
    const svgSide = `
      <g transform="translate(${sideX}, 130)">
        <text x="0" y="20" fill="${activeColor}" font-size="44" font-weight="900">${pct}%</text>
        <text x="0" y="44" fill="${t.textPrimary}" font-size="14" font-weight="700">Objetivo Cumprido</text>
        <text x="0" y="62" fill="${t.textMuted}" font-size="11.5">${valor} de ${total} unidades</text>
      </g>
    `;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgCells}
        ${svgSide}
      </svg>
    `.trim();
  }

  static renderBadge(params) {
    const {
      label = 'Ponte APIs',
      status = '99.98% uptime',
      cor = '#10b981',
      bgLabel = '#090d16',
      altura = 28
    } = params;

    const lblText = String(label || 'status').trim();
    const stText = String(status || 'online').trim();
    const w1 = Math.max(30, lblText.length * 7.5 + 16);
    const w2 = Math.max(30, stText.length * 7.5 + 16);
    const totalW = Math.round(w1 + w2);
    const h = Number(altura) || 28;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${h}" width="${totalW}" height="${h}" role="img" aria-label="${escapeXml(lblText)}: ${escapeXml(stText)}" style="display:inline-block;vertical-align:middle">
        <clipPath id="badgeClip">
          <rect width="${totalW}" height="${h}" rx="6" />
        </clipPath>
        <g clip-path="url(#badgeClip)">
          <rect width="${w1}" height="${h}" fill="${bgLabel}" />
          <rect x="${w1}" width="${w2}" height="${h}" fill="${cor}" />
          <text x="${w1 / 2}" y="${h / 2 + 4}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">${escapeXml(lblText)}</text>
          <text x="${w1 + w2 / 2}" y="${h / 2 + 4}" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">${escapeXml(stText)}</text>
        </g>
      </svg>
    `.trim();
  }

  static renderFunnelChart(params) {
    const {
      labels = ['Visitantes', 'Leads Qualificados', 'Propostas Enviadas', 'Vendas Concluídas'],
      valores = [12000, 4500, 1800, 620],
      titulo = 'Funil de Vendas & Conversão',
      subtitulo = 'Métricas de Aquisição e Retenção',
      rodape = '',
      width = 540,
      height = 340,
      tema = 'dark',
      paleta = 'violet',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    const padding = { top: 65, bottom: 20, left: 24, right: 24 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const maxVal = valores[0] || 1;
    const rowH = (height - padding.top - padding.bottom) / valores.length;
    const funnelMaxW = (width - padding.left - padding.right) * 0.52;

    let svgRows = '';
    valores.forEach((v, idx) => {
      const y = padding.top + idx * rowH;
      const nextV = idx < valores.length - 1 ? valores[idx + 1] : v * 0.65;

      const topW = Math.max(12, (v / maxVal) * funnelMaxW);
      const botW = Math.max(8, (nextV / maxVal) * funnelMaxW);

      const topX1 = padding.left + (funnelMaxW - topW) / 2;
      const topX2 = topX1 + topW;
      const botX1 = padding.left + (funnelMaxW - botW) / 2;
      const botX2 = botX1 + botW;

      const color = colors[idx % colors.length];
      const lbl = labels[idx] || `Etapa ${idx + 1}`;
      const convTopPct = ((v / maxVal) * 100).toFixed(1) + '%';
      const stepDropPct = idx > 0 ? (((valores[idx - 1] - v) / valores[idx - 1]) * 100).toFixed(0) : null;

      svgRows += `
        <g class="funnel-row">
          <polygon points="${topX1},${y + 2} ${topX2},${y + 2} ${botX2},${y + rowH - 4} ${botX1},${y + rowH - 4}" fill="${color}" opacity="0.9" />
          <text x="${width * 0.58}" y="${y + rowH / 2 - 2}" fill="${t.textPrimary}" font-size="12.5" font-weight="700">${escapeXml(lbl)}</text>
          <text x="${width * 0.58}" y="${y + rowH / 2 + 14}" fill="${t.textMuted}" font-size="11">${v.toLocaleString('pt-BR')} (${convTopPct})${stepDropPct ? ` • -${stepDropPct}% drop` : ''}</text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderMapaBrasil(params) {
    const {
      dados = { SP: 950, RJ: 420, MG: 380, RS: 290, PR: 260, BA: 210, SC: 180, PE: 150, CE: 140, GO: 130, DF: 120 },
      titulo = 'Distribuição Geográfica de Vendas (Brasil)',
      subtitulo = 'Métricas Regionais e Ranking por Unidade Federativa',
      rodape = '',
      width = 600,
      height = 360,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = colors[0];

    const padding = { top: 65, right: 24, bottom: 20, left: 24 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const REGIOES = [
      { id: 'SE', nome: 'Sudeste', ufs: ['SP', 'RJ', 'MG', 'ES'] },
      { id: 'S', nome: 'Sul', ufs: ['RS', 'PR', 'SC'] },
      { id: 'NE', nome: 'Nordeste', ufs: ['BA', 'PE', 'CE', 'MA', 'RN', 'PB', 'AL', 'PI', 'SE'] },
      { id: 'CO', nome: 'Centro-Oeste', ufs: ['GO', 'MT', 'MS', 'DF'] },
      { id: 'N', nome: 'Norte', ufs: ['AM', 'PA', 'RO', 'TO', 'AC', 'AP', 'RR'] }
    ];

    const regStats = REGIOES.map(reg => {
      const soma = reg.ufs.reduce((acc, uf) => acc + (Number(dados[uf]) || 0), 0);
      return { ...reg, soma };
    });

    const totalBrasil = Object.values(dados).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
    const topUfs = Object.entries(dados)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);

    let svgRegioes = '';
    const regW = (width - 48 - 4 * 10) / 5;
    regStats.forEach((r, idx) => {
      const x = 24 + idx * (regW + 10);
      const pct = ((r.soma / totalBrasil) * 100).toFixed(1) + '%';
      svgRegioes += `
        <g transform="translate(${x}, 72)">
          <rect width="${regW}" height="56" rx="8" fill="rgba(255,255,255,0.04)" stroke="${t.border}" />
          <text x="10" y="20" fill="${t.textPrimary}" font-size="12" font-weight="800">${r.nome}</text>
          <text x="10" y="36" fill="${mainColor}" font-size="13" font-weight="900">${r.soma.toLocaleString('pt-BR')}</text>
          <text x="10" y="48" fill="${t.textMuted}" font-size="9.5">${pct} do total</text>
        </g>
      `;
    });

    let svgTopRanking = '<text x="24" y="154" fill="' + t.textPrimary + '" font-size="12.5" font-weight="800">Top 5 Estados em Volume</text>';
    const topRef = (topUfs[0] && topUfs[0][1]) || 1;
    topUfs.forEach(([uf, val], idx) => {
      const y = 172 + idx * 32;
      const barW = Math.max(10, (val / topRef) * 160);
      svgTopRanking += `
        <g transform="translate(24, ${y})">
          <text x="0" y="14" fill="${t.textPrimary}" font-size="12" font-weight="700">${uf}</text>
          <rect x="30" y="4" width="${barW}" height="12" rx="4" fill="${mainColor}" opacity="0.85" />
          <text x="${36 + barW}" y="14" fill="${t.textMuted}" font-size="10.5" font-weight="600">${Number(val).toLocaleString('pt-BR')}</text>
        </g>
      `;
    });

    const all27 = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES', 'AM', 'PA', 'MT', 'MS', 'MA', 'RN', 'PB', 'AL', 'PI', 'SE', 'RO', 'TO', 'AC', 'AP', 'RR'];
    const maxValState = Math.max(...Object.values(dados).map(Number), 10);
    let svgBadges = '';

    all27.forEach((uf, idx) => {
      const v = Number(dados[uf]) || 0;
      const pct = Math.max(0.12, v / maxValState);
      const col = idx % 9;
      const row = Math.floor(idx / 9);
      const x = 270 + col * 34;
      const y = 165 + row * 44;

      svgBadges += `
        <g transform="translate(${x}, ${y})">
          <rect width="30" height="34" rx="6" fill="${mainColor}" fill-opacity="${pct.toFixed(2)}" stroke="${t.border}" />
          <text x="15" y="16" fill="${t.textPrimary}" font-size="10" font-weight="800" text-anchor="middle">${uf}</text>
          <text x="15" y="28" fill="${t.textPrimary}" font-size="8" font-weight="600" text-anchor="middle">${v > 0 ? (v >= 1000 ? (v/1000).toFixed(1)+'k' : v) : '-'}</text>
          <title>${uf}: ${v.toLocaleString('pt-BR')}</title>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRegioes}
        ${svgTopRanking}
        ${svgBadges}
      </svg>
    `.trim();
  }

  static renderBarHorizontal(params) {
    const {
      labels = ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná', 'Rio Grande do Sul'],
      valores = [85000, 52000, 43000, 31000, 24000],
      titulo = 'Ranking Regional de Vendas',
      subtitulo = '',
      rodape = '',
      ordenar = null,
      width = 580,
      height = 320,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      corPrimaria = null,
      moeda = 'BRL',
      compacto = true,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    let items = labels.map((lbl, i) => ({
      lbl,
      v: Number(valores[i]) || 0
    }));

    if (ordenar === 'desc') items.sort((a, b) => b.v - a.v);
    else if (ordenar === 'asc') items.sort((a, b) => a.v - b.v);

    const padding = { top: 60, bottom: 20, left: 140, right: 90 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const maxVal = Math.max(...items.map(it => it.v), 10);
    const minVal = Math.min(0, ...items.map(it => it.v));
    const range = maxVal - minVal || 1;
    const rowH = (height - padding.top - padding.bottom) / (items.length || 1);
    const maxBarW = width - padding.left - padding.right;
    const zeroX = padding.left + ((0 - minVal) / range) * maxBarW;

    let svgRows = '';
    items.forEach((it, idx) => {
      const y = padding.top + idx * rowH;
      const vFmt = formatarNumero(it.v, { moeda, compacto });

      let barX, bW;
      if (it.v >= 0) {
        barX = zeroX;
        bW = Math.max(4, (it.v / range) * maxBarW);
      } else {
        bW = Math.max(4, ((0 - it.v) / range) * maxBarW);
        barX = zeroX - bW;
      }

      svgRows += `
        <g class="hbar-item">
          <text x="${padding.left - 12}" y="${y + rowH / 2 + 4}" fill="${t.textPrimary}" font-size="12" font-weight="600" text-anchor="end">${escapeXml(it.lbl)}</text>
          <rect x="${barX}" y="${y + 6}" width="${bW}" height="${Math.max(12, rowH - 12)}" rx="5" fill="${colors[idx % colors.length]}" opacity="0.9" />
          <text x="${it.v >= 0 ? barX + bW + 8 : barX - 8}" y="${y + rowH / 2 + 4}" fill="${t.textMuted}" font-size="11" font-weight="700" text-anchor="${it.v >= 0 ? 'start' : 'end'}">${vFmt}</text>
          <title>${escapeXml(it.lbl)}: ${formatarNumero(it.v, { moeda })}</title>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        <line x1="${zeroX}" y1="${padding.top}" x2="${zeroX}" y2="${height - padding.bottom}" stroke="${t.textMuted}" stroke-width="1.2" opacity="0.4" />
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderRadarChart(params) {
    const {
      labels = ['Câmera', 'Bateria', 'Tela', 'Desempenho', 'Acabamento', 'Preço'],
      valores = [92, 85, 96, 94, 88, 79],
      series = null,
      max = 100,
      titulo = 'Análise Multidimensional',
      subtitulo = 'Avaliação Técnica Polar (Score 0-100)',
      rodape = '',
      width = 500,
      height = 360,
      tema = 'dark',
      paleta = 'ocean',
      cores = null,
      corPrimaria = null,
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);

    const padding = { top: 65, right: 24, bottom: 20, left: 24 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const cx = width / 2;
    const cy = height * 0.58;
    const r = Math.min(width, height) * 0.35;
    const totalSides = Math.max(3, labels.length);

    let svgRings = '';
    [0.25, 0.5, 0.75, 1.0].forEach(factor => {
      let ringPoints = [];
      for (let i = 0; i < totalSides; i++) {
        const angle = (Math.PI * 2 / totalSides) * i - Math.PI / 2;
        const px = cx + (r * factor) * Math.cos(angle);
        const py = cy + (r * factor) * Math.sin(angle);
        ringPoints.push(`${px},${py}`);
      }
      svgRings += `<polygon points="${ringPoints.join(' ')}" fill="none" stroke="${t.grid}" stroke-width="1.2" stroke-dasharray="3,3" />`;
    });

    let svgSpokes = '';
    for (let i = 0; i < totalSides; i++) {
      const angle = (Math.PI * 2 / totalSides) * i - Math.PI / 2;
      const lx = cx + (r + 26) * Math.cos(angle);
      const ly = cy + (r + 26) * Math.sin(angle);
      const sx = cx + r * Math.cos(angle);
      const sy = cy + r * Math.sin(angle);

      svgSpokes += `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="${t.grid}" stroke-width="1.2" />`;
      const lbl = labels[i] || `Eixo ${i + 1}`;
      const textAnchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : (Math.cos(angle) > 0 ? 'start' : 'end');
      svgSpokes += `<text x="${lx}" y="${ly + 4}" fill="${t.textMuted}" font-size="10.5" font-weight="600" text-anchor="${textAnchor}">${escapeXml(lbl)}</text>`;
    }

    let seriesList = [];
    if (Array.isArray(series) && series.length > 0) {
      seriesList = series.map((s, i) => ({
        nome: s.nome || `Série ${i + 1}`,
        valores: (s.valores || []).map(Number),
        cor: s.cor || colors[i % colors.length]
      }));
    } else {
      seriesList = [{
        nome: titulo,
        valores: valores.map(Number),
        cor: corPrimaria || colors[0]
      }];
    }

    let svgPolygons = '';
    seriesList.forEach((s) => {
      let polyPoints = [];
      let svgDots = '';
      for (let i = 0; i < totalSides; i++) {
        const angle = (Math.PI * 2 / totalSides) * i - Math.PI / 2;
        const v = s.valores[i] !== undefined ? s.valores[i] : 50;
        const valFactor = Math.max(0.05, Math.min(1, v / (max || 100)));
        const vx = cx + (r * valFactor) * Math.cos(angle);
        const vy = cy + (r * valFactor) * Math.sin(angle);
        polyPoints.push(`${vx},${vy}`);

        svgDots += `
          <circle cx="${vx}" cy="${vy}" r="4" fill="${s.cor}" stroke="${t.bg}" stroke-width="2" />
        `;
      }
      svgPolygons += `
        <polygon points="${polyPoints.join(' ')}" fill="${s.cor}" fill-opacity="0.22" stroke="${s.cor}" stroke-width="2.2" />
        ${svgDots}
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRings}
        ${svgSpokes}
        ${svgPolygons}
      </svg>
    `.trim();
  }

  static renderComboChart(params) {
    const {
      labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      valores = [35000, 48000, 42000, 61000, 75000, 92000],
      linhaValores = [12, 16, 14, 21, 24, 28],
      titulo = 'Faturamento (Barras) vs Margem % (Linha)',
      subtitulo = 'Gráfico Misto Multi-Escala com 2 Eixos Y',
      rodape = '',
      width = 620,
      height = 340,
      tema = 'dark',
      paleta = 'sunset',
      cores = null,
      moeda = 'BRL',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const barColor = colors[0];
    const lineColor = colors[1] || '#38bdf8';

    const padding = { top: 65, right: 60, bottom: 45, left: 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const maxBar = Math.max(...valores, 10);
    const maxLine = Math.max(...linhaValores, 10);
    const step = chartW / valores.length;
    const barW = Math.max(12, Math.min(42, step * 0.55));

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (chartH / 4) * i;
      const valLeft = (maxBar / 4) * (4 - i);
      const valRight = (maxLine / 4) * (4 - i);
      svgGrids += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${t.grid}" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="10.5" text-anchor="end">${formatarNumero(valLeft, { compacto: true, moeda })}</text>
        <text x="${width - padding.right + 10}" y="${yPos + 4}" fill="${lineColor}" font-size="10.5" font-weight="700" text-anchor="start">${valRight.toFixed(0)}%</text>
      `;
    }

    let svgBars = '';
    let svgLabels = '';
    valores.forEach((v, idx) => {
      const xPos = padding.left + idx * step + (step - barW) / 2;
      const bH = Math.max(4, (v / maxBar) * chartH);
      const yPos = padding.top + chartH - bH;
      const lbl = labels[idx] || `#${idx + 1}`;

      svgBars += `
        <g class="combo-bar">
          <rect x="${xPos}" y="${yPos}" width="${barW}" height="${bH}" rx="5" fill="${barColor}" opacity="0.85" />
          <title>${escapeXml(lbl)}: ${formatarNumero(v, { moeda })}</title>
        </g>
      `;
      svgLabels += `
        <text x="${xPos + barW / 2}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="11" text-anchor="middle">${escapeXml(lbl)}</text>
      `;
    });

    const linePoints = linhaValores.map((lv, idx) => {
      const x = padding.left + idx * step + step / 2;
      const y = padding.top + chartH - (lv / maxLine) * chartH;
      return { x, y, lv };
    });

    let pathD = `M ${linePoints[0].x} ${linePoints[0].y}`;
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p0 = linePoints[i];
      const p1 = linePoints[i + 1];
      const cpX = p0.x + (p1.x - p0.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    let svgDots = '';
    linePoints.forEach(p => {
      svgDots += `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${lineColor}" stroke="${t.bg}" stroke-width="2" />
        <text x="${p.x}" y="${p.y - 8}" fill="${lineColor}" font-size="10.5" font-weight="800" text-anchor="middle">${p.lv}%</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${svgBars}
        <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2.8" stroke-linecap="round" />
        ${svgDots}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderCandlestickChart(params) {
    const {
      labels = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      candles = [
        { open: 120, high: 128, low: 118, close: 126 },
        { open: 126, high: 132, low: 124, close: 130 },
        { open: 130, high: 131, low: 121, close: 122 },
        { open: 122, high: 127, low: 119, close: 125 },
        { open: 125, high: 135, low: 124, close: 134 },
        { open: 134, high: 138, low: 129, close: 131 },
        { open: 131, high: 142, low: 130, close: 140 },
        { open: 140, high: 145, low: 137, close: 143 }
      ],
      titulo = 'Mercado Financeiro • Ações & Cripto (Candlestick)',
      subtitulo = 'Intervalo OHLC com Pavio de Alta e Baixa',
      rodape = '',
      width = 600,
      height = 340,
      tema = 'dark',
      bg = undefined,
      borda = undefined,
      raioBorda = null,
      vidro = false,
      fonte = null
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const padding = { top: 65, right: 30, bottom: 45, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const safeCandles = (Array.isArray(candles) && candles.length > 0) ? candles : [
      { open: 120, high: 128, low: 118, close: 126 },
      { open: 126, high: 132, low: 124, close: 130 }
    ];

    const allLows = safeCandles.map(c => Number(c.low) || 0);
    const allHighs = safeCandles.map(c => Number(c.high) || 0);
    const minVal = Math.min(...allLows) - 2;
    const maxVal = Math.max(...allHighs) + 2;
    const range = maxVal - minVal || 1;

    const step = chartW / (safeCandles.length || 1);
    const cW = Math.max(8, Math.min(28, step * 0.55));

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (chartH / 4) * i;
      const yVal = minVal + (range / 4) * (4 - i);
      svgGrids += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${t.grid}" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="10.5" text-anchor="end">R$ ${yVal.toFixed(0)}</text>
      `;
    }

    let svgCandles = '';
    let svgLabels = '';

    safeCandles.forEach((c, idx) => {
      const open = Number(c.open) || 0;
      const high = Number(c.high) || open;
      const low = Number(c.low) || open;
      const close = Number(c.close) || open;

      const isUp = close >= open;
      const color = isUp ? '#10b981' : '#ef4444';
      const cx = padding.left + idx * step + step / 2;

      const yHigh = padding.top + chartH - ((high - minVal) / range) * chartH;
      const yLow = padding.top + chartH - ((low - minVal) / range) * chartH;
      const yOpen = padding.top + chartH - ((open - minVal) / range) * chartH;
      const yClose = padding.top + chartH - ((close - minVal) / range) * chartH;

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));

      svgCandles += `
        <g class="candle-item">
          <line x1="${cx}" y1="${yHigh}" x2="${cx}" y2="${yLow}" stroke="${color}" stroke-width="1.8" />
          <rect x="${cx - cW / 2}" y="${bodyTop}" width="${cW}" height="${bodyHeight}" rx="2" fill="${color}" />
          <title>${escapeXml(labels[idx] || '')} • O: ${open} | H: ${high} | L: ${low} | C: ${close}</title>
        </g>
      `;

      svgLabels += `
        <text x="${cx}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="10" text-anchor="middle">${escapeXml(labels[idx] || '')}</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${svgCandles}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderSparklinePure(params) {
    const {
      valores = [20, 35, 25, 45, 40, 60, 55, 75, 70, 95],
      width = 160,
      height = 45,
      paleta = 'emerald',
      cores = null,
      corPrimaria = null
    } = params;

    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = corPrimaria || colors[0];

    const safeVals = valores.map(Number);
    const minV = Math.min(...safeVals);
    const maxV = Math.max(...safeVals) || 1;
    const range = maxV - minV || 1;
    const step = width / (safeVals.length - 1 || 1);

    const points = safeVals.map((v, i) => ({
      x: i * step,
      y: height - 4 - ((v - minV) / range) * (height - 8)
    }));

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = p0.x + (p1.x - p0.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Sparkline" style="display:inline-block;overflow:visible">
        <path d="${pathD}" fill="none" stroke="${mainColor}" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="3.5" fill="${mainColor}" />
      </svg>
    `.trim();
  }

  
  static renderTickerChart(params) {
    const {
      simbolo = 'USD/BRL',
      preco = '5.8240',
      variacao = '+1.42%',
      maxima = '5.8510',
      minima = '5.7890',
      volume = 'R$ 48.2M',
      valores = [5.789, 5.795, 5.812, 5.804, 5.818, 5.824],
      width = 580,
      height = 280,
      tema = 'dark',
      paleta = 'emerald',
      corPrimaria = null,
      animado = true,
      bg, borda, raioBorda, vidro, fonte
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const isPositivo = !String(variacao).startsWith('-');
    const statusColor = isPositivo ? '#10b981' : '#ef4444';
    const chartColor = corPrimaria || statusColor;

    const padding = { top: 90, bottom: 40, left: 30, right: 30 };
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });

    const safeVals = (Array.isArray(valores) && valores.length ? valores : [10, 20, 15, 30, 25, 40]).map(Number);
    const minV = Math.min(...safeVals);
    const maxV = Math.max(...safeVals);
    const range = maxV - minV || 1;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const step = chartW / (safeVals.length - 1 || 1);

    const points = safeVals.map((v, i) => ({
      x: padding.left + i * step,
      y: padding.top + chartH - ((v - minV) / range) * chartH
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const areaD = `${pathD} L ${lastPoint.x.toFixed(1)} ${padding.top + chartH} L ${firstPoint.x.toFixed(1)} ${padding.top + chartH} Z`;

    const gradId = `tickerGrad_${String(fnv1a(simbolo) || 'def').replace(/[^a-zA-Z0-9]/g, '')}`;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(simbolo)}: ${escapeXml(preco)}" style="${card.svgStyle}">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${chartColor}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${chartColor}" stop-opacity="0.0" />
          </linearGradient>
          <filter id="glow_${gradId}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        ${card.rectBg}

        <!-- HEADER FINANCEIRO -->
        <g transform="translate(24, 28)">
          <text x="0" y="0" fill="${t.textMuted}" font-size="12" font-weight="700" font-family="system-ui, sans-serif" letter-spacing="0.5">${escapeXml(simbolo)} • COTAÇÃO AO VIVO</text>
          <text x="0" y="32" fill="${t.textPrimary}" font-size="28" font-weight="900" font-family="'JetBrains Mono', monospace">${escapeXml(preco)}</text>
          
          <!-- BADGE DE DELTA -->
          <g transform="translate(${Math.max(160, String(preco).length * 17 + 10)}, 8)">
            <rect width="82" height="26" rx="6" fill="${statusColor}" fill-opacity="0.16" stroke="${statusColor}" stroke-opacity="0.4" />
            <text x="41" y="18" fill="${statusColor}" font-size="12" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">${escapeXml(variacao)}</text>
          </g>
        </g>

        <!-- MÉTRICAS SECUNDÁRIAS (MÁX/MÍN/VOL) -->
        <g transform="translate(${width - 165}, 28)">
          <text x="0" y="2" fill="${t.textMuted}" font-size="10.5" font-family="system-ui, sans-serif">Máx: <tspan fill="${t.textPrimary}" font-weight="700">${escapeXml(maxima)}</tspan></text>
          <text x="0" y="18" fill="${t.textMuted}" font-size="10.5" font-family="system-ui, sans-serif">Mín: <tspan fill="${t.textPrimary}" font-weight="700">${escapeXml(minima)}</tspan></text>
          <text x="0" y="34" fill="${t.textMuted}" font-size="10.5" font-family="system-ui, sans-serif">Vol: <tspan fill="${t.textPrimary}" font-weight="700">${escapeXml(volume)}</tspan></text>
        </g>

        <!-- GRÁFICO DE CURVA COM GLOW -->
        <path d="${areaD}" fill="url(#${gradId})" />
        <path d="${pathD}" fill="none" stroke="${chartColor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow_${gradId})" />

        <!-- BEACON PULSANTE NO PREÇO ATUAL -->
        <g transform="translate(${lastPoint.x}, ${lastPoint.y})">
          ${animado ? `
            <circle cx="0" cy="0" r="10" fill="${chartColor}" opacity="0.4">
              <animate attributeName="r" values="4;14;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          ` : ''}
          <circle cx="0" cy="0" r="5" fill="${chartColor}" stroke="#ffffff" stroke-width="2" />
        </g>

        <!-- LINHA DE BASE -->
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="${t.grid}" stroke-width="1" />
      </svg>
    `.trim();
  }

  static renderParetoChart(params) {
    const {
      labels = ['Atraso Logística', 'Falha Pagamento', 'Erro Cadastro', 'Estoque Baixo', 'Dúvida Frete', 'Outros'],
      valores = [140, 95, 45, 28, 16, 8],
      titulo = 'Análise de Pareto (Princípio 80/20)',
      subtitulo = 'Frequência das Ocorrências e % Acumulado',
      width = 620,
      height = 340,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 70, right: 60, bottom: 45, left: 60 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const pairs = labels.map((l, i) => ({ l, v: Math.max(0, Number(valores[i]) || 0) })).sort((a, b) => b.v - a.v);
    const totalSoma = pairs.reduce((acc, p) => acc + p.v, 0) || 1;
    const maxVal = pairs[0]?.v || 10;
    const step = chartW / (pairs.length || 1);
    const bW = Math.max(12, Math.min(48, step * 0.6));

    let runningSum = 0;
    const cumPcts = pairs.map(p => {
      runningSum += p.v;
      return (runningSum / totalSoma) * 100;
    });

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (chartH / 4) * i;
      const vLeft = Math.round(maxVal - (maxVal / 4) * i);
      const vRight = Math.round(100 - 25 * i);
      svgGrids += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${t.grid}" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="10.5" text-anchor="end">${vLeft}</text>
        <text x="${width - padding.right + 10}" y="${yPos + 4}" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="start">${vRight}%</text>
      `;
    }

    const y80 = padding.top + chartH - (80 / 100) * chartH;
    const line80 = `
      <line x1="${padding.left}" y1="${y80}" x2="${width - padding.right}" y2="${y80}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
      <text x="${width - padding.right - 6}" y="${y80 - 6}" fill="#ef4444" font-size="10" font-weight="800" text-anchor="end">Corte 80%</text>
    `;

    let svgBars = '';
    let svgLabels = '';
    pairs.forEach((p, idx) => {
      const cx = padding.left + idx * step + step / 2;
      const x = cx - bW / 2;
      const bH = Math.max(4, (p.v / maxVal) * chartH);
      const y = padding.top + chartH - bH;
      const cor = colors[idx % colors.length];

      svgBars += `
        <rect x="${x}" y="${y}" width="${bW}" height="${bH}" rx="5" fill="${cor}" opacity="0.88">
          <title>${escapeXml(p.l)}: ${p.v} ocorrências (${((p.v / totalSoma) * 100).toFixed(1)}%)</title>
        </rect>
        <text x="${cx}" y="${y - 6}" fill="${t.textPrimary}" font-size="10.5" font-weight="700" text-anchor="middle">${p.v}</text>
      `;
      svgLabels += `
        <text x="${cx}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="10.5" font-weight="600" text-anchor="middle">${escapeXml(p.l)}</text>
      `;
    });

    const linePoints = cumPcts.map((pct, idx) => ({
      x: padding.left + idx * step + step / 2,
      y: padding.top + chartH - (pct / 100) * chartH,
      pct
    }));
    let pathD = `M ${linePoints[0].x} ${linePoints[0].y}`;
    for (let i = 0; i < linePoints.length - 1; i++) {
      const p0 = linePoints[i];
      const p1 = linePoints[i + 1];
      const cpX = p0.x + (p1.x - p0.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    let svgPoints = '';
    linePoints.forEach(p => {
      svgPoints += `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#f59e0b" stroke="${t.bg}" stroke-width="2" />
        <text x="${p.x}" y="${p.y - 8}" fill="#f59e0b" font-size="9.5" font-weight="800" text-anchor="middle">${p.pct.toFixed(0)}%</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${line80}
        ${svgBars}
        <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
        ${svgPoints}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderGanttChart(params) {
    const {
      labels = ['Planejamento', 'Design & UX', 'Arquitetura APIs', 'Frontend Web', 'Homologação QA', 'Deploy Cloud'],
      inicio = [0, 2, 4, 6, 9, 11],
      duracao = [3, 4, 5, 5, 3, 2],
      progresso = [100, 90, 75, 45, 15, 0],
      totalSemanas = 14,
      titulo = 'Cronograma de Projeto & Sprints (Gantt)',
      subtitulo = 'Prazos, Marcos e Progresso em Semanas',
      width = 640,
      height = 360,
      tema = 'dark',
      paleta = 'ocean',
      cores = null,
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 75, right: 35, bottom: 25, left: 140 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const chartW = width - padding.left - padding.right;
    const taskCount = labels.length;
    const rowH = Math.min(38, (height - padding.top - padding.bottom) / (taskCount || 1));
    const maxSem = Number(totalSemanas) || 14;

    let svgCols = '';
    for (let s = 0; s <= maxSem; s += 2) {
      const x = padding.left + (s / maxSem) * chartW;
      svgCols += `
        <line x1="${x}" y1="${padding.top - 12}" x2="${x}" y2="${height - padding.bottom}" stroke="${t.grid}" stroke-width="1" stroke-dasharray="2,2" />
        <text x="${x}" y="${padding.top - 16}" fill="${t.textMuted}" font-size="9.5" font-weight="700" text-anchor="middle">S${s}</text>
      `;
    }

    let svgTasks = '';
    labels.forEach((lbl, idx) => {
      const y = padding.top + idx * rowH;
      const ini = (inicio && inicio[idx] !== undefined) ? Number(inicio[idx]) : idx * 2;
      const dur = (duracao && duracao[idx] !== undefined) ? Number(duracao[idx]) : 3;
      const prog = (progresso && progresso[idx] !== undefined) ? Number(progresso[idx]) : 50;

      const x = padding.left + (ini / maxSem) * chartW;
      const w = Math.max(12, (dur / maxSem) * chartW);
      const bH = Math.max(12, rowH - 12);
      const cor = colors[idx % colors.length];

      svgTasks += `
        <g class="gantt-task">
          <text x="${padding.left - 12}" y="${y + bH / 2 + 5}" fill="${t.textPrimary}" font-size="11.5" font-weight="600" text-anchor="end">${escapeXml(lbl)}</text>
          <rect x="${x}" y="${y}" width="${w}" height="${bH}" rx="5" fill="${cor}" fill-opacity="0.25" stroke="${cor}" stroke-width="1.2" />
          <rect x="${x}" y="${y}" width="${w * (prog / 100)}" height="${bH}" rx="5" fill="${cor}" />
          <text x="${x + w + 8}" y="${y + bH / 2 + 4}" fill="${cor}" font-size="10" font-weight="800">${prog}%</text>
          <title>${escapeXml(lbl)}: Início S${ini}, Duração ${dur} sem, ${prog}% pronto</title>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgCols}
        ${svgTasks}
      </svg>
    `.trim();
  }

  static renderBoxPlotChart(params) {
    const {
      labels = ['Engenharia', 'Vendas B2B', 'Suporte N2', 'Marketing', 'Financeiro'],
      boxes = [
        { min: 3200, q1: 5200, med: 7800, q3: 11500, max: 16000 },
        { min: 2500, q1: 4200, med: 6800, q3: 9800, max: 14200 },
        { min: 2200, q1: 3400, med: 4600, q3: 6200, max: 8900 },
        { min: 2800, q1: 4600, med: 7100, q3: 10200, max: 13500 },
        { min: 3500, q1: 5800, med: 8200, q3: 12000, max: 17500 }
      ],
      titulo = 'Distribuição Salarial por Departamento (Box Plot)',
      subtitulo = 'Mínimo, 1º Quartil, Mediana, 3º Quartil e Máximo',
      width = 620,
      height = 350,
      tema = 'dark',
      paleta = 'violet',
      cores = null,
      moeda = 'BRL',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 70, right: 35, bottom: 45, left: 70 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const allMins = boxes.map(b => b.min);
    const allMaxs = boxes.map(b => b.max);
    const minVal = Math.min(...allMins);
    const maxVal = Math.max(...allMaxs) || 10;
    const range = maxVal - minVal || 1;

    const step = chartW / (boxes.length || 1);
    const bW = Math.max(16, Math.min(50, step * 0.5));

    let svgGrids = '';
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (chartH / 4) * i;
      const vY = minVal + (range / 4) * (4 - i);
      svgGrids += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="${t.grid}" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="${t.textMuted}" font-size="10.5" text-anchor="end">${formatarNumero(vY, { compacto: true, moeda })}</text>
      `;
    }

    let svgBoxes = '';
    let svgLabels = '';

    boxes.forEach((b, idx) => {
      const cx = padding.left + idx * step + step / 2;
      const lbl = labels[idx] || `Grupo ${idx + 1}`;
      const cor = colors[idx % colors.length];

      const yMin = padding.top + chartH - ((b.min - minVal) / range) * chartH;
      const yMax = padding.top + chartH - ((b.max - minVal) / range) * chartH;
      const yQ1 = padding.top + chartH - ((b.q1 - minVal) / range) * chartH;
      const yQ3 = padding.top + chartH - ((b.q3 - minVal) / range) * chartH;
      const yMed = padding.top + chartH - ((b.med - minVal) / range) * chartH;

      const boxTop = Math.min(yQ1, yQ3);
      const boxH = Math.max(4, Math.abs(yQ3 - yQ1));

      svgBoxes += `
        <g class="boxplot-item">
          <line x1="${cx}" y1="${yMin}" x2="${cx}" y2="${yMax}" stroke="${cor}" stroke-width="2" stroke-dasharray="3,3" />
          <line x1="${cx - bW / 3}" y1="${yMin}" x2="${cx + bW / 3}" y2="${yMin}" stroke="${cor}" stroke-width="2" />
          <line x1="${cx - bW / 3}" y1="${yMax}" x2="${cx + bW / 3}" y2="${yMax}" stroke="${cor}" stroke-width="2" />
          <rect x="${cx - bW / 2}" y="${boxTop}" width="${bW}" height="${boxH}" rx="4" fill="${cor}" fill-opacity="0.3" stroke="${cor}" stroke-width="2" />
          <line x1="${cx - bW / 2}" y1="${yMed}" x2="${cx + bW / 2}" y2="${yMed}" stroke="#ffffff" stroke-width="3" />
          <title>${escapeXml(lbl)}: Mín ${b.min}, Q1 ${b.q1}, Med ${b.med}, Q3 ${b.q3}, Máx ${b.max}</title>
        </g>
      `;

      svgLabels += `
        <text x="${cx}" y="${height - padding.bottom + 18}" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="middle">${escapeXml(lbl)}</text>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgGrids}
        ${svgBoxes}
        ${svgLabels}
      </svg>
    `.trim();
  }

  static renderSankeyChart(params) {
    const {
      origens = [
        { nome: 'Vendas E-commerce', valor: 85000, cor: '#38bdf8' },
        { nome: 'Lojas Físicas', valor: 45000, cor: '#10b981' },
        { nome: 'Contratos B2B', valor: 30000, cor: '#818cf8' }
      ],
      destinos = [
        { nome: 'Custos CMV', valor: 65000, cor: '#ef4444' },
        { nome: 'Folha & Pessoal', valor: 38000, cor: '#f97316' },
        { nome: 'Marketing & Ads', valor: 18000, cor: '#f59e0b' },
        { nome: 'Lucro Líquido', valor: 39000, cor: '#10b981' }
      ],
      titulo = 'Fluxo de Recursos & DRE (Sankey Flow)',
      subtitulo = 'Da Origem das Vendas para os Centros de Custo e Lucro',
      width = 640,
      height = 360,
      tema = 'dark',
      moeda = 'BRL',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 75, right: 140, bottom: 25, left: 140 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const totalIn = origens.reduce((acc, o) => acc + o.valor, 0) || 1;
    const totalOut = destinos.reduce((acc, d) => acc + d.valor, 0) || 1;
    const chartH = height - padding.top - padding.bottom;
    const nodeW = 16;

    const xLeft = padding.left;
    const xRight = width - padding.right - nodeW;

    let svgLeftNodes = '';
    let currYIn = padding.top;
    const leftYs = origens.map(o => {
      const nH = Math.max(14, (o.valor / totalIn) * chartH * 0.85);
      const y = currYIn;
      currYIn += nH + 12;
      svgLeftNodes += `
        <rect x="${xLeft}" y="${y}" width="${nodeW}" height="${nH}" rx="4" fill="${o.cor}" />
        <text x="${xLeft - 10}" y="${y + nH / 2 - 2}" fill="${t.textPrimary}" font-size="11.5" font-weight="700" text-anchor="end">${escapeXml(o.nome)}</text>
        <text x="${xLeft - 10}" y="${y + nH / 2 + 12}" fill="${o.cor}" font-size="10.5" font-weight="800" text-anchor="end">${formatarNumero(o.valor, { compacto: true, moeda })}</text>
      `;
      return { y, h: nH, cor: o.cor };
    });

    let svgRightNodes = '';
    let currYOut = padding.top;
    const rightYs = destinos.map(d => {
      const nH = Math.max(14, (d.valor / totalOut) * chartH * 0.85);
      const y = currYOut;
      currYOut += nH + 10;
      svgRightNodes += `
        <rect x="${xRight}" y="${y}" width="${nodeW}" height="${nH}" rx="4" fill="${d.cor}" />
        <text x="${xRight + nodeW + 10}" y="${y + nH / 2 - 2}" fill="${t.textPrimary}" font-size="11.5" font-weight="700" text-anchor="start">${escapeXml(d.nome)}</text>
        <text x="${xRight + nodeW + 10}" y="${y + nH / 2 + 12}" fill="${d.cor}" font-size="10.5" font-weight="800" text-anchor="start">${formatarNumero(d.valor, { compacto: true, moeda })}</text>
      `;
      return { y, h: nH, cor: d.cor };
    });

    let svgRibbons = '';
    leftYs.forEach((l) => {
      rightYs.forEach((r) => {
        const x1 = xLeft + nodeW;
        const y1Top = l.y;
        const y1Bottom = l.y + l.h;
        const x2 = xRight;
        const y2Top = r.y;
        const y2Bottom = r.y + r.h;

        const cpX1 = x1 + (x2 - x1) * 0.5;
        const cpX2 = x1 + (x2 - x1) * 0.5;

        svgRibbons += `
          <path d="M ${x1} ${y1Top} C ${cpX1} ${y1Top}, ${cpX2} ${y2Top}, ${x2} ${y2Top} L ${x2} ${y2Bottom} C ${cpX2} ${y2Bottom}, ${cpX1} ${y1Bottom}, ${x1} ${y1Bottom} Z" fill="${l.cor}" fill-opacity="0.12" stroke="${l.cor}" stroke-width="0.5" stroke-opacity="0.25" />
        `;
      });
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgRibbons}
        ${svgLeftNodes}
        ${svgRightNodes}
      </svg>
    `.trim();
  }

  static renderCalendarHeatmap(params) {
    const {
      semanas = 52,
      titulo = 'Histórico Anual de Atividade & Vendas (Calendar Heatmap)',
      subtitulo = 'Densidade de Transações Diárias ao Longo do Ano',
      width = 680,
      height = 230,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const colors = (Array.isArray(cores) && cores.length) ? cores : resolvePaleta(paleta);
    const mainColor = colors[0];
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 75, right: 30, bottom: 25, left: 45 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const numWeeks = Math.min(52, Math.max(12, Number(semanas) || 52));
    const cellW = 8.5;
    const gap = 3;

    let svgCells = '';
    for (let w = 0; w < numWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        const x = padding.left + w * (cellW + gap);
        const y = padding.top + d * (cellW + gap);
        const seed = (w * 7 + d * 13) % 100;
        let opacity = 0.12;
        if (seed > 80) opacity = 0.95;
        else if (seed > 60) opacity = 0.72;
        else if (seed > 40) opacity = 0.48;
        else if (seed > 20) opacity = 0.28;

        svgCells += `
          <rect x="${x}" y="${y}" width="${cellW}" height="${cellW}" rx="2" fill="${mainColor}" opacity="${opacity}" />
        `;
      }
    }

    let svgDayLabels = `
      <text x="${padding.left - 8}" y="${padding.top + 0 * (cellW + gap) + 8}" fill="${t.textMuted}" font-size="10" font-weight="600" text-anchor="end">Seg</text>
      <text x="${padding.left - 8}" y="${padding.top + 2 * (cellW + gap) + 8}" fill="${t.textMuted}" font-size="10" font-weight="600" text-anchor="end">Qua</text>
      <text x="${padding.left - 8}" y="${padding.top + 4 * (cellW + gap) + 8}" fill="${t.textMuted}" font-size="10" font-weight="600" text-anchor="end">Sex</text>
    `;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let svgMonths = '';
    meses.forEach((m, i) => {
      const col = Math.floor((i / 12) * numWeeks);
      const x = padding.left + col * (cellW + gap);
      svgMonths += `<text x="${x}" y="${padding.top - 8}" fill="${t.textMuted}" font-size="10.5" font-weight="700">${m}</text>`;
    });

    let svgLegend = `
      <g transform="translate(${width - 160}, ${height - 14})">
        <text x="-6" y="7" fill="${t.textMuted}" font-size="10" font-weight="600" text-anchor="end">Menos</text>
        <rect x="0" y="0" width="8" height="8" rx="2" fill="${mainColor}" opacity="0.15" />
        <rect x="11" y="0" width="8" height="8" rx="2" fill="${mainColor}" opacity="0.35" />
        <rect x="22" y="0" width="8" height="8" rx="2" fill="${mainColor}" opacity="0.65" />
        <rect x="33" y="0" width="8" height="8" rx="2" fill="${mainColor}" opacity="0.95" />
        <text x="48" y="7" fill="${t.textMuted}" font-size="10" font-weight="600">Mais</text>
      </g>
    `;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgMonths}
        ${svgDayLabels}
        ${svgCells}
        ${svgLegend}
      </svg>
    `.trim();
  }

  static renderTornadoChart(params) {
    const {
      labels = ['Preço Unitário', 'Volume Vendas', 'Custo Insumos', 'Taxa Câmbio', 'Descontos'],
      valoresEsquerda = [42000, 31000, 24000, 18000, 12000],
      valoresDireita = [58000, 49000, 36000, 27000, 19000],
      nomeEsquerda = 'Cenário Pessimista',
      nomeDireita = 'Cenário Otimista',
      titulo = 'Análise de Sensibilidade & Impacto (Tornado)',
      subtitulo = 'Variação Projetada em Risco vs Oportunidade',
      width = 620,
      height = 340,
      tema = 'dark',
      moeda = 'BRL',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 75, right: 40, bottom: 25, left: 40 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const chartW = width - padding.left - padding.right;
    const midX = padding.left + chartW / 2;
    const maxVal = Math.max(...valoresEsquerda, ...valoresDireita, 10);
    const rowH = 40;
    const barH = 20;

    let svgRows = '';
    labels.forEach((lbl, idx) => {
      const y = padding.top + idx * rowH;
      const vE = valoresEsquerda[idx] || 0;
      const vD = valoresDireita[idx] || 0;

      const wE = (vE / maxVal) * (chartW * 0.40);
      const wD = (vD / maxVal) * (chartW * 0.40);

      svgRows += `
        <g class="tornado-row">
          <rect x="${midX - wE}" y="${y}" width="${wE}" height="${barH}" rx="4" fill="#ef4444" opacity="0.88" />
          <text x="${midX - wE - 8}" y="${y + barH / 2 + 4}" fill="#ef4444" font-size="10.5" font-weight="700" text-anchor="end">${formatarNumero(vE, { compacto: true, moeda })}</text>
          
          <text x="${midX}" y="${y + barH / 2 + 4}" fill="${t.textPrimary}" font-size="11" font-weight="800" text-anchor="middle">${escapeXml(lbl)}</text>
          
          <rect x="${midX}" y="${y}" width="${wD}" height="${barH}" rx="4" fill="#10b981" opacity="0.88" />
          <text x="${midX + wD + 8}" y="${y + barH / 2 + 4}" fill="#10b981" font-size="10.5" font-weight="700" text-anchor="start">${formatarNumero(vD, { compacto: true, moeda })}</text>
          <title>${escapeXml(lbl)}: -${vE} vs +${vD}</title>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        <line x1="${midX}" y1="${padding.top - 8}" x2="${midX}" y2="${height - padding.bottom}" stroke="${t.grid}" stroke-width="1.5" />
        <text x="${midX - 30}" y="${padding.top - 14}" fill="#ef4444" font-size="11" font-weight="800" text-anchor="end">◀ ${escapeXml(nomeEsquerda)}</text>
        <text x="${midX + 30}" y="${padding.top - 14}" fill="#10b981" font-size="11" font-weight="800" text-anchor="start">${escapeXml(nomeDireita)} ▶</text>
        ${svgRows}
      </svg>
    `.trim();
  }

  static renderVennDiagram(params) {
    const {
      conjuntoA = { nome: 'Online', valor: 1400, cor: '#38bdf8' },
      conjuntoB = { nome: 'Loja Física', valor: 950, cor: '#10b981' },
      intersecao = { nome: 'Omnichannel', valor: 420 },
      titulo = 'Interseção de Clientes (Diagrama de Venn)',
      subtitulo = 'Sobreposição de Comportamento de Compra',
      width = 540,
      height = 340,
      tema = 'dark',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 75, right: 30, bottom: 25, left: 30 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const cY = height * 0.58;
    const r = 90;
    const dist = 110;
    const cxA = width / 2 - dist / 2;
    const cxB = width / 2 + dist / 2;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        <circle cx="${cxA}" cy="${cY}" r="${r}" fill="${conjuntoA.cor || '#38bdf8'}" fill-opacity="0.35" stroke="${conjuntoA.cor || '#38bdf8'}" stroke-width="2.5" />
        <circle cx="${cxB}" cy="${cY}" r="${r}" fill="${conjuntoB.cor || '#10b981'}" fill-opacity="0.35" stroke="${conjuntoB.cor || '#10b981'}" stroke-width="2.5" />
        
        <text x="${cxA - 35}" y="${cY - 8}" fill="#ffffff" font-size="13" font-weight="800" text-anchor="middle">${escapeXml(conjuntoA.nome)}</text>
        <text x="${cxA - 35}" y="${cY + 14}" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="middle">${conjuntoA.valor}</text>

        <text x="${width / 2}" y="${cY - 8}" fill="#ffffff" font-size="12" font-weight="800" text-anchor="middle">${escapeXml(intersecao.nome || 'Ambos')}</text>
        <text x="${width / 2}" y="${cY + 14}" fill="#f59e0b" font-size="13" font-weight="900" text-anchor="middle">${intersecao.valor}</text>

        <text x="${cxB + 35}" y="${cY - 8}" fill="#ffffff" font-size="13" font-weight="800" text-anchor="middle">${escapeXml(conjuntoB.nome)}</text>
        <text x="${cxB + 35}" y="${cY + 14}" fill="${t.textMuted}" font-size="11" font-weight="600" text-anchor="middle">${conjuntoB.valor}</text>
      </svg>
    `.trim();
  }

  static renderRiskMatrix(params) {
    const {
      riscos = null,
      valores = null,
      titulo = 'Matriz de Riscos & Compliance (5x5)',
      subtitulo = 'Probabilidade vs Impacto Negocial',
      rodape = '',
      width = 560,
      height = 380,
      tema = 'dark',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 65, right: 30, bottom: 50, left: 95 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const gridW = width - padding.left - padding.right;
    const gridH = height - padding.top - padding.bottom;
    const cellW = gridW / 5;
    const cellH = gridH / 5;

    function getScoreColor(p, i) {
      const score = p * i;
      if (score >= 15) return 'rgba(239, 68, 68, 0.45)';
      if (score >= 10) return 'rgba(249, 115, 22, 0.38)';
      if (score >= 5) return 'rgba(234, 179, 8, 0.30)';
      return 'rgba(16, 185, 129, 0.22)';
    }

    let svgCells = '';
    for (let row = 0; row < 5; row++) {
      const p = 5 - row;
      const y = padding.top + row * cellH;

      for (let col = 0; col < 5; col++) {
        const imp = col + 1;
        const x = padding.left + col * cellW;
        const fill = getScoreColor(p, imp);

        svgCells += `
          <rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" rx="3" fill="${fill}" stroke="rgba(255,255,255,0.08)" />
          <text x="${x + cellW / 2}" y="${y + cellH / 2 + 4}" fill="${t.textMuted}" font-size="11" font-weight="800" opacity="0.85" text-anchor="middle">${p * imp}</text>
        `;
      }
    }

    const pLabels = ['5 Muito Alta', '4 Alta', '3 Média', '2 Baixa', '1 Muito Baixa'];
    let svgAxisY = '';
    pLabels.forEach((lbl, idx) => {
      const y = padding.top + idx * cellH + cellH / 2 + 4;
      svgAxisY += `<text x="${padding.left - 8}" y="${y}" fill="${t.textMuted}" font-size="10.5" font-weight="700" text-anchor="end">${escapeXml(lbl)}</text>`;
    });

    const iLabels = ['1 Insignif.', '2 Baixo', '3 Médio', '4 Alto', '5 Crítico'];
    let svgAxisX = '';
    iLabels.forEach((lbl, idx) => {
      const x = padding.left + idx * cellW + cellW / 2;
      svgAxisX += `<text x="${x}" y="${height - padding.bottom + 16}" fill="${t.textMuted}" font-size="10.5" font-weight="700" text-anchor="middle">${escapeXml(lbl)}</text>`;
    });

    let riskItems = riscos;
    if (!riskItems && valores) {
      if (typeof valores === 'string') {
        riskItems = valores.split(/[,;]/).map((part, idx) => {
          const [p, i, nome] = part.split(':').map(s => s.trim());
          return { p: Number(p) || 3, i: Number(i) || 3, nome: nome || `Risco ${idx + 1}`, tag: `R${idx + 1}` };
        });
      } else if (Array.isArray(valores)) {
        riskItems = valores.map((v, idx) => ({ p: Number(v.p || v[0] || 3), i: Number(v.i || v[1] || 3), nome: v.nome || `Risco ${idx + 1}`, tag: `R${idx + 1}` }));
      }
    }
    if (!riskItems || !riskItems.length) {
      riskItems = [
        { nome: 'Vazamento de Dados', p: 4, i: 5, tag: 'R1' },
        { nome: 'Indisponibilidade API', p: 3, i: 5, tag: 'R2' },
        { nome: 'Atraso em Sprint', p: 4, i: 2, tag: 'R3' },
        { nome: 'Bug Visual Mobile', p: 2, i: 2, tag: 'R4' },
        { nome: 'Flutuação Cambial', p: 5, i: 3, tag: 'R5' }
      ];
    }

    let svgPlots = '';
    riskItems.forEach((r, idx) => {
      const pVal = Math.max(1, Math.min(5, Number(r.p) || 3));
      const iVal = Math.max(1, Math.min(5, Number(r.i) || 3));
      const cx = padding.left + (iVal - 0.5) * cellW;
      const cy = padding.top + (5 - pVal + 0.5) * cellH;
      const tag = r.tag || `R${idx + 1}`;
      const score = pVal * iVal;
      const dotColor = score >= 15 ? '#ef4444' : (score >= 10 ? '#f97316' : (score >= 5 ? '#eab308' : '#10b981'));

      svgPlots += `
        <g class="risk-plot">
          <circle cx="${cx}" cy="${cy}" r="11" fill="${dotColor}" stroke="#ffffff" stroke-width="2" style="filter:drop-shadow(0 0 6px ${dotColor})" />
          <text x="${cx}" y="${cy + 3.5}" fill="#040711" font-size="9" font-weight="900" text-anchor="middle">${escapeXml(tag)}</text>
          <title>${escapeXml(tag)}: ${escapeXml(r.nome)} (P:${pVal} x I:${iVal} = Score ${score})</title>
        </g>
      `;
    });

    const axisTitles = `
      <text x="24" y="${padding.top + gridH / 2}" fill="${t.textPrimary}" font-size="10.5" font-weight="800" transform="rotate(-90 24 ${padding.top + gridH / 2})" text-anchor="middle">PROBABILIDADE</text>
      <text x="${padding.left + gridW / 2}" y="${height - 12}" fill="${t.textPrimary}" font-size="10.5" font-weight="800" text-anchor="middle">IMPACTO NEGOCIAL</text>
    `;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgCells}
        ${svgAxisY}
        ${svgAxisX}
        ${svgPlots}
        ${axisTitles}
      </svg>
    `.trim();
  }

  static renderSunburstChart(params) {
    const {
      dados = [
        {
          nome: 'Tecnologia',
          cor: '#38bdf8',
          filhos: [
            { nome: 'Cloud', valor: 35 },
            { nome: 'SaaS', valor: 25 },
            { nome: 'Devs', valor: 20 }
          ]
        },
        {
          nome: 'Marketing',
          cor: '#ec4899',
          filhos: [
            { nome: 'Tráfego', valor: 30 },
            { nome: 'Eventos', valor: 15 }
          ]
        },
        {
          nome: 'Operações',
          cor: '#10b981',
          filhos: [
            { nome: 'Logística', valor: 25 },
            { nome: 'Suporte', valor: 20 }
          ]
        }
      ],
      titulo = 'Distribuição Hierárquica (Sunburst Solar)',
      subtitulo = 'Visualização Multinível por Categoria e Sub-itens',
      rodape = '',
      width = 540,
      height = 360,
      tema = 'dark',
      bg, borda, raioBorda, vidro, fonte,
      corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 65, right: 30, bottom: 25, left: 30 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo });

    const cx = width / 2;
    const cy = height * 0.58;
    const maxR = Math.min(width, height) * 0.36;
    const r0 = maxR * 0.28;
    const r1 = maxR * 0.62;
    const r2 = maxR;

    let safeData = dados;
    if (!Array.isArray(safeData) || safeData.length === 0) {
      safeData = [
        { nome: 'Produto A', cor: '#38bdf8', filhos: [{ nome: 'Web', valor: 40 }, { nome: 'App', valor: 30 }] },
        { nome: 'Produto B', cor: '#10b981', filhos: [{ nome: 'B2B', valor: 50 }, { nome: 'B2C', valor: 20 }] }
      ];
    }

    let totalGlobal = 0;
    safeData.forEach(cat => {
      const catSum = (cat.filhos || []).reduce((a, b) => a + Number(b.valor || 0), 0) || Number(cat.valor || 1);
      cat._sum = catSum;
      totalGlobal += catSum;
    });
    if (totalGlobal <= 0) totalGlobal = 1;

    function arcPath(innerRadius, outerRadius, a1, a2) {
      const x1 = cx + outerRadius * Math.cos(a1);
      const y1 = cy + outerRadius * Math.sin(a1);
      const x2 = cx + outerRadius * Math.cos(a2);
      const y2 = cy + outerRadius * Math.sin(a2);
      const ix1 = cx + innerRadius * Math.cos(a2);
      const iy1 = cy + innerRadius * Math.sin(a2);
      const ix2 = cx + innerRadius * Math.cos(a1);
      const iy2 = cy + innerRadius * Math.sin(a1);
      const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
      return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    }

    let svgInnerArcs = '';
    let svgOuterArcs = '';
    let curAngle = -Math.PI / 2;

    safeData.forEach((cat) => {
      const catSpan = (cat._sum / totalGlobal) * 2 * Math.PI;
      const catEnd = curAngle + catSpan;
      const catColor = cat.cor || '#38bdf8';

      const pathInner = arcPath(r0, r1, curAngle, catEnd - 0.015);
      const midAngle = curAngle + catSpan / 2;
      const midR1 = (r0 + r1) / 2;
      const labelX1 = cx + midR1 * Math.cos(midAngle);
      const labelY1 = cy + midR1 * Math.sin(midAngle);

      svgInnerArcs += `
        <g class="sunburst-cat">
          <path d="${pathInner}" fill="${catColor}" opacity="0.9" stroke="${t.bg}" stroke-width="1.5" />
          <title>${escapeXml(cat.nome)}: ${cat._sum} (${((cat._sum / totalGlobal) * 100).toFixed(1)}%)</title>
          ${catSpan > 0.4 ? `<text x="${labelX1}" y="${labelY1 + 3.5}" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">${escapeXml(cat.nome)}</text>` : ''}
        </g>
      `;

      let childAngle = curAngle;
      (cat.filhos || []).forEach((ch, chIdx) => {
        const chVal = Number(ch.valor || 0);
        const chSpan = (chVal / cat._sum) * catSpan;
        const chEnd = childAngle + chSpan;
        const pathOuter = arcPath(r1 + 2, r2, childAngle, chEnd - 0.015);
        const chMidAngle = childAngle + chSpan / 2;
        const midR2 = (r1 + r2) / 2;
        const labelX2 = cx + midR2 * Math.cos(chMidAngle);
        const labelY2 = cy + midR2 * Math.sin(chMidAngle);

        const childOpac = 0.65 + (chIdx % 3) * 0.12;

        svgOuterArcs += `
          <g class="sunburst-child">
            <path d="${pathOuter}" fill="${catColor}" opacity="${childOpac.toFixed(2)}" stroke="${t.bg}" stroke-width="1.2" />
            <title>${escapeXml(cat.nome)} > ${escapeXml(ch.nome)}: ${chVal}</title>
            ${chSpan > 0.3 ? `<text x="${labelX2}" y="${labelY2 + 3}" fill="#ffffff" font-size="8.5" font-weight="700" text-anchor="middle">${escapeXml(ch.nome)}</text>` : ''}
          </g>
        `;
        childAngle = chEnd;
      });

      curAngle = catEnd;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${svgInnerArcs}
        ${svgOuterArcs}
        <circle cx="${cx}" cy="${cy}" r="${r0 - 2}" fill="${card.finalBg}" />
        <text x="${cx}" y="${cy - 3}" fill="${t.textMuted}" font-size="9.5" font-weight="700" text-anchor="middle">TOTAL</text>
        <text x="${cx}" y="${cy + 13}" fill="${t.textPrimary}" font-size="12.5" font-weight="900" text-anchor="middle">${formatarNumero(totalGlobal, { compacto: true })}</text>
      </svg>
    `.trim();
  }

  static renderDashboard(params) {
    const {
      titulo = 'Painel Executivo Integrado (Dashboard 2x2)',
      subtitulo = 'Métricas Consolidadas de Performance e Crescimento',
      rodape = 'Ponte APIs • Enterprise Edge Analytics',
      width = 720,
      height = 460,
      tema = 'dark',
      paleta = 'emerald',
      cores = null,
      moeda = 'BRL',
      bg, borda, raioBorda, vidro, fonte,
      kpiValor = null,
      kpiBadge = null,
      labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      valores = [35000, 48000, 42000, 61000, 75000, 92000],
      donutLabels = ['SaaS', 'E-com', 'Serviços'],
      donutValores = [55, 30, 15],
      rankingLabels = labels.slice(0, 4),
      rankingValores = valores.slice(0, 4)
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;
    const card = buildCardContainer({ width, height, t, bg, borda, raioBorda, vidro, fonte });
    const padding = { top: 70, right: 20, bottom: 25, left: 20 };
    const { svgHeader, svgFooter } = buildHeaderFooter({ width, height, padding, t, titulo, subtitulo, rodape });

    const colW = (width - 60) / 2;
    const rowH = (height - 110) / 2;
    const x1 = 20;
    const x2 = 40 + colW;
    const y1 = 70;
    const y2 = 85 + rowH;
    const trendValues = (valores.length ? valores : [0]).slice(0, 12);
    const trendLabels = (labels.length ? labels : trendValues.map((_, i) => `#${i + 1}`)).slice(0, trendValues.length);
    const trendMin = Math.min(...trendValues);
    const trendRange = Math.max(...trendValues) - trendMin || 1;
    const trendPoints = trendValues.map((value, i) => ({
      x: 20 + i * (300 / Math.max(1, trendValues.length - 1)),
      y: 110 - ((value - trendMin) / trendRange) * 80
    }));
    const trendPath = trendPoints.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const trendArea = `${trendPath} L ${trendPoints[trendPoints.length - 1].x} 130 L ${trendPoints[0].x} 130 Z`;
    const trendTotal = trendValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
    const displayKpi = kpiValor || formatarNumero(trendTotal, { moeda });
    const firstTrendValue = Number(trendValues[0]) || 0;
    const lastTrendValue = Number(trendValues[trendValues.length - 1]) || 0;
    const displayBadge = String(kpiBadge || (firstTrendValue
      ? `${lastTrendValue >= firstTrendValue ? '+' : ''}${(((lastTrendValue - firstTrendValue) / Math.abs(firstTrendValue)) * 100).toFixed(1)}%`
      : ''));
    const donutTotal = donutValores.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) || 1;
    const donutCircumference = 2 * Math.PI * 45;
    let donutOffset = 0;
    const donutSegments = donutValores.map((value, i) => {
      const segmentLength = donutCircumference * Math.max(0, Number(value) || 0) / donutTotal;
      const segment = `<circle cx="${colW * 0.38}" cy="${rowH * 0.58}" r="45" fill="none" stroke="${['#10b981', '#38bdf8', '#f59e0b', '#a855f7', '#f43f5e'][i % 5]}" stroke-width="16" stroke-dasharray="${segmentLength} ${donutCircumference - segmentLength}" stroke-dashoffset="${-donutOffset}" transform="rotate(-90 ${colW * 0.38} ${rowH * 0.58})" />`;
      donutOffset += segmentLength;
      return segment;
    }).join('');

    // Q1: KPI Card
    const q1 = `
      <g transform="translate(${x1}, ${y1})">
        <rect width="${colW}" height="${rowH}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${t.border}" />
        <text x="16" y="26" fill="${t.textMuted}" font-size="11" font-weight="700">VALOR TOTAL ACUMULADO</text>
        <text x="16" y="60" fill="${t.textPrimary}" font-size="24" font-weight="900">${escapeXml(displayKpi)}</text>
        ${displayBadge ? `<g transform="translate(${colW - 85}, 16)">
          <rect width="70" height="22" rx="11" fill="rgba(16,185,129,0.18)" />
          <text x="35" y="15" fill="#10b981" font-size="10.5" font-weight="800" text-anchor="middle">${displayBadge.startsWith('-') ? '▼' : '▲'} ${escapeXml(displayBadge)}</text>
        </g>` : ''}
        <path d="${trendPath}" fill="none" stroke="#10b981" stroke-width="2.5" transform="translate(-4, 0) scale(${(colW - 32) / 300}, 1)" />
      </g>
    `;

    // Q2: Donut proporcional
    const q2 = `
      <g transform="translate(${x2}, ${y1})">
        <rect width="${colW}" height="${rowH}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${t.border}" />
        <text x="16" y="26" fill="${t.textMuted}" font-size="11" font-weight="700">DISTRIBUIÇÃO POR CATEGORIA</text>
        ${donutSegments}
        <text x="${colW * 0.38}" y="${rowH * 0.58 + 4}" fill="${t.textPrimary}" font-size="12" font-weight="900" text-anchor="middle">100%</text>
        <g transform="translate(${colW * 0.68}, ${rowH * 0.35})">
          ${donutValores.slice(0, 4).map((value, i) => `
            <circle cx="0" cy="${i * 22}" r="4" fill="${['#10b981', '#38bdf8', '#f59e0b', '#a855f7'][i]}" />
            <text x="10" y="${i * 22 + 3.5}" fill="${t.textPrimary}" font-size="10">${escapeXml(donutLabels[i] || `Item ${i + 1}`)}: ${Math.round((Math.max(0, Number(value) || 0) / donutTotal) * 100)}%</text>
          `).join('')}
        </g>
      </g>
    `;

    // Q3: Evolução de Área
    const q3 = `
      <g transform="translate(${x1}, ${y2})">
        <rect width="${colW}" height="${rowH}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${t.border}" />
        <text x="16" y="24" fill="${t.textMuted}" font-size="11" font-weight="700">TENDÊNCIA (${trendValues.length} PONTOS)</text>
        <path d="${trendArea}" fill="rgba(56,189,248,0.18)" transform="translate(-4, 0) scale(${(colW - 32) / 300}, 1)" />
        <path d="${trendPath}" fill="none" stroke="#38bdf8" stroke-width="2.5" transform="translate(-4, 0) scale(${(colW - 32) / 300}, 1)" />
        ${trendLabels.map((label, i) => {
          const x = trendPoints[i].x;
          return `<text x="${x}" y="145" fill="${t.textMuted}" font-size="9.5" text-anchor="middle">${escapeXml(label)}</text>`;
        }).join('')}
      </g>
    `;

    // Q4: Ranking de Barras
    const q4 = `
      <g transform="translate(${x2}, ${y2})">
        <rect width="${colW}" height="${rowH}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${t.border}" />
        <text x="16" y="24" fill="${t.textMuted}" font-size="11" font-weight="700">RANKING DE DADOS</text>
        ${rankingLabels.slice(0, 4).map((lbl, i) => {
          const barY = 40 + i * 26;
          const maxRanking = Math.max(1, ...rankingValores.slice(0, 4).map(value => Number(value) || 0));
          const value = Number(rankingValores[i]) || 0;
          const barW = Math.max(0, (value / maxRanking) * (colW - 120));
          return `
            <text x="16" y="${barY + 11}" fill="${t.textPrimary}" font-size="10.5" font-weight="700">${escapeXml(lbl)}</text>
            <rect x="45" y="${barY}" width="${barW}" height="14" rx="4" fill="#10b981" opacity="0.85" />
            <text x="${52 + barW}" y="${barY + 11}" fill="${t.textMuted}" font-size="10" font-weight="600">${escapeXml(formatarNumero(value, { moeda, compacto: true }))}</text>
          `;
        }).join('')}
      </g>
    `;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(titulo)}" style="${card.svgStyle}">
        ${card.rectBg}
        ${svgHeader}
        ${svgFooter}
        ${q1}
        ${q2}
        ${q3}
        ${q4}
      </svg>
    `.trim();
  }

  static renderErrorCard(params) {
    const {
      mensagem = 'Parâmetros inválidos para renderização de gráfico.',
      tipo = 'desconhecido',
      width = 500,
      height = 200,
      tema = 'dark'
    } = params;

    const t = TEMAS[tema] || TEMAS.dark;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Erro no Gráfico" style="width:100%;height:auto;max-width:100%;display:block;aspect-ratio:${width}/${height};background:${t.bg};border-radius:14px;border:1px solid rgba(239, 68, 68, 0.3)">
        <rect width="${width}" height="${height}" rx="14" fill="${t.bg}" />
        <g transform="translate(24, 28)">
          <circle cx="20" cy="20" r="18" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" stroke-width="2" />
          <text x="20" y="26" fill="#ef4444" font-size="18" font-weight="900" text-anchor="middle">!</text>
          <text x="50" y="16" fill="${t.textPrimary}" font-size="15" font-weight="800">Ponte APIs • Graficos Pro</text>
          <text x="50" y="34" fill="#ef4444" font-size="12" font-weight="600">Aviso: Tipo '${escapeXml(tipo)}'</text>
        </g>
        <rect x="24" y="80" width="${width - 48}" height="80" rx="8" fill="rgba(255,255,255,0.03)" stroke="${t.border}" />
        <text x="40" y="112" fill="${t.textMuted}" font-size="12">${escapeXml(mensagem)}</text>
        <text x="40" y="138" fill="${t.textMuted}" font-size="11" font-family="monospace">Dica: Use /api/grafico?tipo=area&amp;valores=10,20,30 ou consulte https://ponte.ozpro.com.br</text>
      </svg>
    `.trim();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER NORMALIZADOR DE OPÇÕES GRANULARES (INTUITIVO & AMIGÁVEL)
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeGranularOptions(params = {}, url = null) {
  const get = (keys, def = undefined) => {
    for (const k of keys) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') return params[k];
      if (url && url.searchParams.has(k)) {
        const val = url.searchParams.get(k);
        if (val !== '') return val;
      }
    }
    return def;
  };

  const getBool = (keys, def = undefined) => {
    const val = get(keys);
    if (val === undefined) return def;
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1' || val === 'sim' || val === 'yes';
  };

  const getNum = (keys, def = null) => {
    const val = get(keys);
    if (val === null || val === undefined) return def;
    const n = Number(val);
    return isNaN(n) ? def : n;
  };

  // Cores customizadas
  const rawCores = get(['cores', 'colors', 'palette_colors', 'custom_colors']);
  let cores = null;
  if (rawCores) {
    if (Array.isArray(rawCores)) {
      cores = rawCores.map(c => String(c).trim()).map(c => c.startsWith('#') || c.startsWith('rgb') ? c : '#' + c);
    } else if (typeof rawCores === 'string') {
      cores = rawCores.split(',').map(s => s.trim()).filter(Boolean).map(c => c.startsWith('#') || c.startsWith('rgb') ? c : '#' + c);
    }
  }

  // Estilo visual
  const bg = get(['bg', 'fundo', 'background', 'cor_fundo']);
  const borda = get(['borda', 'border', 'border_color', 'cor_borda']);
  const raioBorda = getNum(['raio_borda', 'radius', 'corner_radius', 'arredondamento', 'raio']);
  const vidro = getBool(['vidro', 'glass', 'glassmorphism'], false);

  // Tipografia
  const fonte = get(['fonte', 'font', 'font_family', 'fontFamily']);
  const corTitulo = get(['cor_titulo', 'title_color']);
  const tamanhoTitulo = getNum(['tamanho_titulo', 'title_size']);
  const alinhamentoTitulo = get(['alinhamento_titulo', 'title_align', 'align_title'], 'left');
  const corSubtitulo = get(['cor_subtitulo', 'subtitle_color']);
  const rodape = get(['rodape', 'footer', 'fonte_dados', 'source', 'creditos']);

  // Grade e eixos
  const grade = getBool(['grade', 'grid', 'linhas_grade'], true);
  const corGrade = get(['cor_grade', 'grid_color']);
  const estiloGrade = get(['estilo_grade', 'grid_style'], 'dashed');
  const rotacaoLabels = getNum(['rotacao_labels', 'label_rotation', 'rotacionar_labels'], 0);

  // Valores nos elementos
  const mostrarValores = getBool(['mostrar_valores', 'show_values', 'exibir_valores', 'valores_visiveis'], true);
  const corValores = get(['cor_valores', 'value_color']);
  const posicaoValores = get(['posicao_valores', 'value_position'], 'top');

  // Barras
  const espessuraGeral = getNum(['espessura', 'thickness', 'stroke', 'largura']);
  const espessuraBarra = getNum(['espessura_barra', 'bar_width', 'largura_barra']) || espessuraGeral;
  const raioBarra = getNum(['raio_barra', 'bar_radius', 'corner_bar']);
  const multiColor = getBool(['multi_color', 'multicolor', 'colorido'], false);

  // Linhas / Área
  const espessuraLinha = getNum(['espessura_linha', 'stroke_width', 'line_width']) || espessuraGeral;
  const espessuraArco = getNum(['espessura_arco', 'arc_thickness', 'espessura']) || espessuraGeral;
  const suave = getBool(['suave', 'smooth', 'curvo'], true);
  const pontos = getBool(['pontos', 'show_dots', 'markers', 'bolinhas'], true);
  const tamanhoPontos = getNum(['tamanho_pontos', 'dot_size']);
  const opacidadeArea = getNum(['opacidade_area', 'area_opacity']);

  // Donut / Pie
  const furo = getNum(['furo', 'inner_radius', 'raio_interno', 'donut_hole']);
  const destaqueFatia = getNum(['destaque_fatia', 'explode_slice', 'destaque']);
  const centroTexto = get(['centro_texto', 'center_text', 'centroTexto']);
  const centroValor = get(['centro_valor', 'center_value', 'centroValor']);
  const posicaoLegenda = get(['posicao_legenda', 'legend_position', 'legenda'], 'right');

  // Metas e Médias
  const corMeta = get(['cor_meta', 'meta_color']);
  const labelMeta = get(['label_meta', 'meta_label']);
  const corMedia = get(['cor_media', 'media_color', 'average_color']);
  const labelMedia = get(['label_media', 'media_label']);
  const linhasGuia = get(['linhas_guia', 'guide_lines', 'linhasGuia']);
  const anotacoes = get(['anotacoes', 'annotations', 'pins']);

  // Números
  const casasDecimais = getNum(['casas_decimais', 'decimals', 'decimais']);
  const prefixo = get(['prefixo', 'prefix'], '');
  const sufixo = get(['sufixo', 'suffix'], '');

  return {
    cores, bg, borda, raioBorda, vidro,
    fonte, corTitulo, tamanhoTitulo, alinhamentoTitulo, corSubtitulo, rodape,
    grade, corGrade, estiloGrade, rotacaoLabels,
    mostrarValores, corValores, posicaoValores,
    espessuraBarra, raioBarra, multiColor,
    espessuraLinha, espessuraArco, suave, pontos, tamanhoPontos, opacidadeArea,
    furo, destaqueFatia, centroTexto, centroValor, posicaoLegenda,
    corMeta, labelMeta, corMedia, labelMedia, linhasGuia,
    anotacoes,
    casasDecimais, prefixo, sufixo
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER HTTP OFICIAL DA PONTE APIS
// ─────────────────────────────────────────────────────────────────────────────


const HTML_GRAFICOS_STUDIO = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gr?ficos Pro ? Est?dio Vetorial Anycast (39 Tipos em SVG Puro)</title>
  <meta name="description" content="Est?dio na nuvem para gera??o instant?nea de 39 tipos de gr?ficos em SVG vetorial puro na borda Cloudflare Anycast sem bibliotecas pesadas.">
  <link rel="stylesheet" href="ponte-suite.css">
  <style>
    .chart-viewport {
      background: var(--forest-850);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px;
      display: grid;
      place-items: center;
      min-height: 340px;
      overflow: hidden;
    }
    .chart-viewport svg {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
  </style>
</head>
<body>

  <div class="app-shell">
    <!-- SIDEBAR DA SU?TE PONTE -->
    <aside class="sidebar">
      <a class="brand" href="https://ponte-marketplace.maputo2.workers.dev/#catalogo">
        <div class="brand-mark">?</div>
        <div class="brand-copy">
          <strong>ponte</strong>
          <small>API MARKET ? OZPRO</small>
        </div>
      </a>

      <div class="nav-section-label">APIs de Design & Assets</div>
      <nav class="primary-nav">
        <a class="nav-link" href="https://icons-pro-api.maputo2.workers.dev/">
          <span>??</span> <span>?cones & Assets Pro</span>
        </a>
        <a class="nav-link is-active" href="#">
          <span>??</span> <span>Gr?ficos Pro (39 Tipos)</span>
        </a>
      </nav>

      <div class="nav-section-label">Valida??o & Pagamentos</div>
      <nav class="primary-nav">
        <a class="nav-link" href="https://clepta2.github.io/boletovalidator-pro/">
          <span>??</span> <span>BoletoValidator Pro</span>
        </a>
        <a class="nav-link" href="https://clepta2.github.io/pixvalidator-pro/">
          <span>??</span> <span>Pix Gateway Pro</span>
        </a>
        <a class="nav-link" href="https://clepta2.github.io/antifraude-pro/">
          <span>???</span> <span>Seguran?a & Antifraude</span>
        </a>
        <a class="nav-link" href="https://clepta2.github.io/passvalidator-pro/">
          <span>??</span> <span>PassValidator HIBP</span>
        </a>
      </nav>

      <div class="sidebar-bottom">
        <div class="status-row">
          <span class="status-dot"></span>
          <span>Borda Cloudflare Anycast</span>
        </div>
      </div>
    </aside>

    <!-- ?REA PRINCIPAL -->
    <main class="main-area">
      <!-- TOPBAR UNIFICADA -->
      <header class="topbar">
        <div class="breadcrumb">
          <a href="https://ponte-marketplace.maputo2.workers.dev/#catalogo">Workspace</a>
          <span>?</span>
          <a href="https://ponte-marketplace.maputo2.workers.dev/#catalogo">Design & Assets</a>
          <span>?</span>
          <strong>Gr?ficos Pro Studio</strong>
        </div>

        <div class="topbar-actions">
          <div class="api-key-box">
            <span>??</span>
            <input type="text" id="inputApiKey" placeholder="gra_live_... (ou Demo)" />
            <button class="ponte-btn-save" id="btnSalvarKey">Salvar</button>
          </div>
          <button class="theme-toggle-btn" id="themeToggle" title="Alternar tema">??</button>
        </div>
      </header>

      <!-- CONTE?DO -->
      <div class="content-wrap">
        <!-- GUIA DID?TICO: O QUE EST? ACONTECENDO -->
        <div class="guide-card">
          <div class="guide-header">
            <strong>?? O que esta ferramenta faz e como utilizar?</strong>
            <span class="badge green">39 Modelos Vetoriais Nativos</span>
          </div>
          <div class="guide-steps">
            <div class="guide-step">
              <span class="guide-step-tag">Passo 1: Tipo & Dados</span>
              <p>Selecione um dos 39 modelos (Barras, Linhas, Donut, Velas, Radar, etc.) e informe seus r?tulos e valores num?ricos.</p>
            </div>
            <div class="guide-step">
              <span class="guide-step-tag">Passo 2: Paleta & Estilo</span>
              <p>Escolha a paleta de cores (Mint, Fintech, Cyberpunk, etc.) e ative efeitos de gradiente, tema claro/escuro ou anima??es.</p>
            </div>
            <div class="guide-step">
              <span class="guide-step-tag">Passo 3: Exportar SVG / Link</span>
              <p>Copie o c?digo SVG vetorial puro (sem precisar de Chart.js ou canvas) ou copie a URL direta para usar em tags <code>&lt;img&gt;</code>.</p>
            </div>
          </div>
        </div>

        <div class="badges-bar">
          <span class="badge green">? 39 Tipos de Gr?ficos</span>
          <span class="badge blue">? Renderiza??o SVG Nativa (<2ms)</span>
          <span class="badge">?? Sem Bibliotecas JS Pesadas</span>
          <span class="badge">?? 100% Responsivo & Escalon?vel</span>
        </div>

        <div class="grid-layout">
          <!-- PAINEL ESQUERDO: CONFIGURADOR DE DADOS -->
          <div class="card">
            <div class="card-title">
              <span>Configura??o do Gr?fico</span>
              <div class="btn-row">
                <button class="btn btn-secondary btn-sm" id="btnPresetVendas">Vendas</button>
                <button class="btn btn-secondary btn-sm" id="btnPresetFinanceiro">Financeiro</button>
                <button class="btn btn-secondary btn-sm" id="btnPresetMetas">Metas</button>
              </div>
            </div>

            <div class="form-group">
              <label for="selTipo">Tipo de Gr?fico (39 Modelos Oficiais)</label>
              <select id="selTipo">
                <optgroup label="B?sicos & Tend?ncia">
                  <option value="line" selected>Linha Suave com ?rea (Line & Area)</option>
                  <option value="bar">Barras Verticais (Bar Chart)</option>
                  <option value="horizontal_bar">Barras Horizontais (Horizontal Bar)</option>
                  <option value="step_line">Degraus (Step Line)</option>
                  <option value="sparkline">Sparkline Minimalista</option>
                </optgroup>
                <optgroup label="Distribui??o & Propor??o">
                  <option value="donut">Donut com Furo Central</option>
                  <option value="pie">Pizza Cl?ssica (Pie Chart)</option>
                  <option value="treemap">Treemap de Blocos Proporcionais</option>
                  <option value="waffle">Grade Waffle 100%</option>
                  <option value="funnel">Funil de Convers?o</option>
                </optgroup>
                <optgroup label="Metas & Indicadores">
                  <option value="gauge">Veloc?metro / Man?metro (Gauge)</option>
                  <option value="bullet">Bullet / Term?metro de Meta</option>
                  <option value="radial_bar">Barras Radiais Conc?ntricas</option>
                  <option value="kpi">Card de Indicador KPI com Varia??o</option>
                  <option value="progress">Barra de Progresso</option>
                </optgroup>
                <optgroup label="Financeiros & Avan?ados">
                  <option value="candlestick">Candlestick (Velas de Mercado)</option>
                  <option value="ticker">Ticker de Cota??o de Moeda</option>
                  <option value="radar">Radar / Teia de Compet?ncias</option>
                  <option value="scatter">Dispers?o (Scatter Plot)</option>
                </optgroup>
              </select>
            </div>

            <div class="form-group">
              <label for="txtTitulo">T?tulo do Gr?fico</label>
              <input type="text" id="txtTitulo" value="Tend?ncia de Crescimento Mensal" />
            </div>

            <div class="form-group">
              <label for="txtLabels">R?tulos / Meses (separados por v?rgula)</label>
              <input type="text" id="txtLabels" value="Jan, Fev, Mar, Abr, Mai, Jun" />
            </div>

            <div class="form-group">
              <label for="txtValores">Valores Num?ricos (separados por v?rgula)</label>
              <input type="text" id="txtValores" value="35, 52, 48, 65, 78, 95" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label for="selPaleta">Paleta de Cores</label>
                <select id="selPaleta">
                  <option value="mint" selected>Ponte Mint (#a3e635)</option>
                  <option value="emerald">Emerald Nature (#10b981)</option>
                  <option value="fintech">Fintech Blue (#38bdf8)</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="sunset">Sunset Gradient</option>
                  <option value="monocromatica">Monocrom?tica</option>
                </select>
              </div>
              <div class="form-group">
                <label for="selTema">Tema de Fundo</label>
                <select id="selTema">
                  <option value="dark" selected>Dark Forest (#090d16)</option>
                  <option value="light">Light Paper (#ffffff)</option>
                  <option value="transparent">Transparente</option>
                </select>
              </div>
            </div>

            <div class="btn-row" style="margin-top: 4px;">
              <button class="btn btn-primary" id="btnGerar" style="flex:1;">?? Renderizar Gr?fico</button>
            </div>
          </div>

          <!-- PAINEL DIREITO: PREVIEW & EXPORTA??O -->
          <div class="card">
            <div class="card-title">
              <span>Visualiza??o do SVG Vetorial</span>
              <span class="badge green" id="badgeLatencia">< 2ms (Anycast)</span>
            </div>

            <div class="chart-viewport" id="viewportGrafico">
              <!-- Renderizado dinamicamente via API -->
            </div>

            <div class="btn-row">
              <button class="btn btn-primary" id="btnCopiarSvg" style="flex:1;">?? Copiar C?digo SVG</button>
              <button class="btn btn-secondary" id="btnCopiarUrl">?? Copiar URL da Imagem</button>
            </div>

            <!-- SNIPPETS DE C?DIGO MULTILINGUAGEM -->
            <div class="snippet-panel">
              <div class="snippet-header">
                <div class="snippet-tabs">
                  <button class="snippet-tab active" data-lang="curl">cURL</button>
                  <button class="snippet-tab" data-lang="html">HTML</button>
                  <button class="snippet-tab" data-lang="js">Node.js</button>
                  <button class="snippet-tab" data-lang="py">Python</button>
                </div>
                <button class="btn btn-secondary btn-sm" id="btnCopiarSnippet">Copiar</button>
              </div>
              <pre class="snippet-code"><code id="codeSnippet">curl "https://graficos-pro-api.maputo2.workers.dev/api/grafico?tipo=line&valores=35,52,48,65,78,95&labels=Jan,Fev,Mar,Abr,Mai,Jun"</code></pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script type="module">
    // Gerenciador de Chave de API
    const inputApiKey = document.getElementById('inputApiKey');
    inputApiKey.value = localStorage.getItem('graficos_api_key') || '';
    document.getElementById('btnSalvarKey').addEventListener('click', () => {
      localStorage.setItem('graficos_api_key', inputApiKey.value.trim());
      alert('Chave de API salva com sucesso no seu navegador!');
    });

    // Alternador de Tema
    const themeBtn = document.getElementById('themeToggle');
    const updateIcon = () => themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '??' : '??';
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', cur);
      localStorage.setItem('ponte.theme', cur);
      updateIcon();
    });
    updateIcon();

    const selTipo = document.getElementById('selTipo');
    const txtTitulo = document.getElementById('txtTitulo');
    const txtLabels = document.getElementById('txtLabels');
    const txtValores = document.getElementById('txtValores');
    const selPaleta = document.getElementById('selPaleta');
    const selTema = document.getElementById('selTema');
    const viewport = document.getElementById('viewportGrafico');
    const codeSnippet = document.getElementById('codeSnippet');
    let snippetLang = 'curl';

    // Presets R?pidos
    document.getElementById('btnPresetVendas').addEventListener('click', () => {
      selTipo.value = 'line';
      txtTitulo.value = 'Faturamento Mensal (R$ Milhares)';
      txtLabels.value = 'Jan, Fev, Mar, Abr, Mai, Jun';
      txtValores.value = '42, 58, 64, 71, 85, 110';
      selPaleta.value = 'mint';
      renderizarGrafico();
    });

    document.getElementById('btnPresetFinanceiro').addEventListener('click', () => {
      selTipo.value = 'donut';
      txtTitulo.value = 'Distribui??o de Custos Operacionais';
      txtLabels.value = 'Infra, Folha, Marketing, Impostos, P&D';
      txtValores.value = '25, 40, 15, 12, 8';
      selPaleta.value = 'fintech';
      renderizarGrafico();
    });

    document.getElementById('btnPresetMetas').addEventListener('click', () => {
      selTipo.value = 'gauge';
      txtTitulo.value = 'Atingimento da Meta Q4';
      txtLabels.value = 'Meta';
      txtValores.value = '84';
      selPaleta.value = 'emerald';
      renderizarGrafico();
    });

    document.getElementById('btnGerar').addEventListener('click', renderizarGrafico);

    function montarUrl() {
      const tipo = selTipo.value;
      const tit = encodeURIComponent(txtTitulo.value.trim());
      const lbl = encodeURIComponent(txtLabels.value.trim());
      const val = encodeURIComponent(txtValores.value.trim());
      const paleta = selPaleta.value;
      const tema = selTema.value;

      return \`https://graficos-pro-api.maputo2.workers.dev/api/grafico?tipo=\${tipo}&valores=\${val}&labels=\${lbl}&titulo=\${tit}&paleta=\${paleta}&tema=\${tema}\`;
    }

    async function renderizarGrafico() {
      const url = montarUrl();
      viewport.innerHTML = \`<div style="color:var(--muted);font-size:12px;">? Renderizando na borda Anycast...</div>\`;

      try {
        const resp = await fetch(url);
        const svgText = await resp.text();
        viewport.innerHTML = svgText;
      } catch (err) {
        viewport.innerHTML = \`<img src="\${url}" style="max-width:100%;height:auto;" />\`;
      }

      atualizarSnippet();
    }

    function atualizarSnippet() {
      const url = montarUrl();
      if (snippetLang === 'curl') {
        codeSnippet.textContent = \`curl "\${url}"\`;
      } else if (snippetLang === 'html') {
        codeSnippet.textContent = \`<img src="\${url}" alt="\${txtTitulo.value}" />\`;
      } else if (snippetLang === 'js') {
        codeSnippet.textContent = \`const res = await fetch("\${url}");\\nconst svg = await res.text();\`;
      } else if (snippetLang === 'py') {
        codeSnippet.textContent = \`import requests\\nres = requests.get("\${url}")\\nsvg_content = res.text\`;
      }
    }

    document.querySelectorAll('.snippet-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.snippet-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        snippetLang = btn.dataset.lang;
        atualizarSnippet();
      });
    });

    document.getElementById('btnCopiarSvg').addEventListener('click', () => {
      const svg = viewport.innerHTML;
      navigator.clipboard.writeText(svg);
      alert('C?digo SVG vetorial copiado para a ?rea de transfer?ncia!');
    });

    document.getElementById('btnCopiarUrl').addEventListener('click', () => {
      navigator.clipboard.writeText(montarUrl());
      alert('URL oficial da imagem vetorial copiada!');
    });

    document.getElementById('btnCopiarSnippet').addEventListener('click', () => {
      navigator.clipboard.writeText(codeSnippet.textContent);
      alert('Snippet copiado!');
    });

    // Renderiza gr?fico inicial
    renderizarGrafico();
  </script>
</body>
</html>
`;

export async function handleRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Se for navegador acessando a raiz sem par?metros espec?ficos, serve o Est?dio Visual
  const acceptsHtml = (request.headers.get('Accept') || '').includes('text/html');
  const hasSpecificChart = url.searchParams.has('tipo') || url.searchParams.has('valores') || url.searchParams.has('chart') || url.searchParams.has('prompt');
  const pathClean = url.pathname.toLowerCase().replace(/\/$/, '') || '/';

  if ((pathClean === '/' || pathClean === '/demo' || pathClean === '/estudio' || pathClean === '/index.html') && acceptsHtml && !hasSpecificChart) {
    return new Response(HTML_GRAFICOS_STUDIO, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS }
    });
  }

  // Descoberta do Catálogo de Gráficos (/api/grafico/tipos ou ?catalogo=true)
  const path = url.pathname.toLowerCase();
  if (path.endsWith('/tipos') || path.endsWith('/catalogo') || path.endsWith('/ajuda') || url.searchParams.get('catalogo') === 'true') {
    return new Response(JSON.stringify({
      ok: true,
      servico: 'Ponte APIs • Graficos Pro',
      versao: '2.6.0',
      totalTipos: CATALOGO_GRAFICOS.length,
      tipos: CATALOGO_GRAFICOS,
      paletasDisponiveis: Object.keys(PALETAS),
      temasDisponiveis: Object.keys(TEMAS),
      customizacoesDisponiveis: {
        cores: 'Lista de cores hex (#ff0055,#00ffee) para personalizar cada barra, fatia ou ponto',
        fundo_e_borda: 'bg (#hex/transparent), borda (#hex/none), raio_borda (0-30px), vidro (true/false)',
        tipografia: 'fonte, tamanho_titulo, alinhamento_titulo (left/center/right), cor_titulo, cor_subtitulo, rodape',
        grade_e_eixos: 'grade (true/false), cor_grade, estilo_grade (dashed/solid/dotted), rotacao_labels (0/45/90)',
        rotulos_de_dados: 'mostrar_valores (true/false), cor_valores, casas_decimais, prefixo, sufixo',
        linhas_de_apoio: 'meta, cor_meta, label_meta, media, cor_media, label_media, linhas_guia',
        anotacoes: 'anotacoes no formato índice:texto:cor, separados por vírgula; índices de pontos começam em 1',
        barras: 'espessura_barra, raio_barra, multi_color',
        linhas_e_areas: 'espessura_linha, suave (true/false), pontos (true/false), tamanho_pontos, opacidade_area',
        prompt: 'descrição heurística de até 500 caracteres; parâmetros explícitos prevalecem; interpretar=true retorna os parâmetros em JSON, sem chamada de IA externa',
        dashboard: 'tipo=dashboard gera 4 quadrantes em um único SVG; labels/valores alimentam tendência e ranking',
        donut_e_pizza: 'furo (0 a 0.95), destaque_fatia (0 a N), centro_texto, centro_valor, posicao_legenda (right/bottom/none)'
      },
      formatosSuportados: ['svg', 'json', 'datauri', 'html'],
      exemploCustomizado: 'GET /api/grafico?tipo=bar&valores=100,-40,70&cores=#10b981,#ef4444,#38bdf8&bg=#000&raio=18&rodape=Fonte:%20OZPro',
      documentacao: 'https://ponte.ozpro.com.br'
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }

  // Rate Limiting nativo na Ponte APIs
  const clientIpAddr = clientIp(request);
  const isLocal = clientIpAddr === '127.0.0.1' || clientIpAddr === '::1' || clientIpAddr === 'localhost' || clientIpAddr === 'unknown';
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  const cleanKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isAuth = Boolean(
    cleanKey && (
      cleanKey.startsWith('gra_live_') || 
      cleanKey.startsWith('gra_pro_') || 
      cleanKey.startsWith('gra_master_') || 
      cleanKey.startsWith('pnt_live_') ||
      (env && (env.API_KEY === cleanKey || env.PRO_KEY === cleanKey))
    ) && cleanKey.length >= 16
  );
  const maxReqs = isLocal ? 10000 : (isAuth ? 3000 : 1200);
  const rl = isLocal ? { ok: true } : await rateLimit(`graficos:${clientIpAddr}`, maxReqs, 60, env);

  if (!rl.ok) {
    const wantsJson = (url.searchParams.get('formato') === 'json') ||
      (request.headers.get('Accept') && request.headers.get('Accept').includes('application/json'));

    if (wantsJson) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Limite de requisições excedido. Limite gratuito: 1.200 requisições/minuto. Utilize sua Chave de API da Ponte APIs (https://ponte.ozpro.com.br).',
        retryAfterSeconds: Math.ceil((rl.resetAt - Date.now()) / 1000)
      }, null, 2), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          ...CORS_HEADERS
        }
      });
    }

    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="240" style="background:#090d16;border-radius:14px;border:1px solid #eab308">
        <rect width="600" height="240" rx="14" fill="#090d16" />
        <circle cx="300" cy="80" r="30" fill="rgba(234,179,8,0.15)" stroke="#eab308" stroke-width="2" />
        <text x="300" y="88" fill="#eab308" font-size="28" font-weight="900" text-anchor="middle">!</text>
        <text x="300" y="140" fill="#f8fafc" font-size="16" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">Limite de Requisições da Borda Atingido (HTTP 429)</text>
        <text x="300" y="165" fill="#94a3b8" font-size="13" text-anchor="middle" font-family="system-ui, sans-serif">Utilize sua Chave de API (x-api-key) gratuita em https://ponte.ozpro.com.br</text>
        <text x="300" y="195" fill="#38bdf8" font-size="11" font-family="monospace" text-anchor="middle">Ponte APIs &bull; Cloudflare Edge</text>
      </svg>
    `.trim();

    return new Response(fallbackSvg, {
      status: 429,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
        ...CORS_HEADERS
      }
    });
  }

  // Extração de Parâmetros (GET via URL ou POST via JSON)
  let params = {};
  if (request.method === 'POST') {
    try {
      params = await request.json();
    } catch (_) {}
  }

  const queryParams = Object.fromEntries(url.searchParams.entries());
  const promptText = params.prompt ?? url.searchParams.get('prompt') ?? '';
  if (typeof promptText !== 'string') {
    return new Response(JSON.stringify({ ok: false, error: 'O prompt deve ser texto.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }
  if (promptText.length > 500) {
    return new Response(JSON.stringify({ ok: false, error: 'O prompt deve ter no máximo 500 caracteres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }
  const inferredParams = parsePromptToParams(promptText);
  if (url.searchParams.get('interpretar') === 'true') {
    return new Response(JSON.stringify({ ok: true, params: inferredParams }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }
  params = { ...inferredParams, ...queryParams, ...params };

  const rawTipo = (params.tipo || url.searchParams.get('tipo') || 'area').toLowerCase().trim();
  const tema = (params.tema || url.searchParams.get('tema') || 'dark').toLowerCase();
  const paleta = (params.paleta || url.searchParams.get('paleta') || url.searchParams.get('cor') || 'emerald').toLowerCase();
  const corPrimaria = params.corPrimaria || url.searchParams.get('cor_hex') || null;
  const titulo = params.titulo || url.searchParams.get('titulo') || '';
  const subtitulo = params.subtitulo || url.searchParams.get('subtitulo') || '';
  const moeda = params.moeda || url.searchParams.get('moeda') || null;
  const compacto = params.compacto !== undefined ? params.compacto : url.searchParams.get('compacto') === 'true';
  const animado = params.animado !== undefined ? params.animado : url.searchParams.get('animado') !== 'false';
  const media = params.media !== undefined ? params.media : url.searchParams.get('media') === 'true';
  const meta = params.meta || url.searchParams.get('meta') || null;
  const ordenar = params.ordenar || url.searchParams.get('ordenar') || null;
  const semi = params.semi !== undefined ? params.semi : url.searchParams.get('semi') === 'true';

  const width = Math.max(100, Math.min(2400, parseInt(params.largura || params.width || url.searchParams.get('largura') || url.searchParams.get('w') || 600, 10)));
  const height = Math.max(40, Math.min(2400, parseInt(params.altura || params.height || url.searchParams.get('altura') || url.searchParams.get('h') || 320, 10)));

  const rawLabels = params.labels || url.searchParams.get('labels');
  const rawValores = params.valores || url.searchParams.get('valores') || url.searchParams.get('dados');

  const labels = rawLabels ? parseArrayParam(rawLabels) : undefined;
  let valores = rawValores ? parseNumberArray(rawValores) : undefined;

  let series = params.series || params.datasets || null;
  if (!series && typeof rawValores === 'string' && rawValores.includes(';')) {
    const parts = rawValores.split(';');
    series = parts.map((part, idx) => ({
      nome: `Série ${idx + 1}`,
      valores: parseNumberArray(part.trim())
    }));
  }

  // Normalização de TODAS as opções granulares intuitivas
  const gOpts = normalizeGranularOptions(params, url);

  const sharedProps = {
    labels, valores, series,
    titulo, subtitulo, rodape: gOpts.rodape,
    width, height,
    tema, paleta,
    cores: gOpts.cores,
    corPrimaria,
    bg: gOpts.bg,
    borda: gOpts.borda,
    raioBorda: gOpts.raioBorda,
    vidro: gOpts.vidro,
    fonte: gOpts.fonte,
    corTitulo: gOpts.corTitulo,
    tamanhoTitulo: gOpts.tamanhoTitulo,
    alinhamentoTitulo: gOpts.alinhamentoTitulo,
    corSubtitulo: gOpts.corSubtitulo,
    grade: gOpts.grade,
    corGrade: gOpts.corGrade,
    estiloGrade: gOpts.estiloGrade,
    rotacaoLabels: gOpts.rotacaoLabels,
    mostrarValores: gOpts.mostrarValores,
    corValores: gOpts.corValores,
    posicaoValores: gOpts.posicaoValores,
    moeda, compacto,
    casasDecimais: gOpts.casasDecimais,
    prefixo: gOpts.prefixo,
    sufixo: gOpts.sufixo,
    media,
    corMedia: gOpts.corMedia,
    labelMedia: gOpts.labelMedia,
    meta,
    corMeta: gOpts.corMeta,
    labelMeta: gOpts.labelMeta,
    linhasGuia: gOpts.linhasGuia,
    animado,
    espessuraBarra: gOpts.espessuraBarra,
    raioBarra: gOpts.raioBarra,
    multiColor: gOpts.multiColor || params.multiColor || url.searchParams.get('multi_color') === 'true',
    espessuraLinha: gOpts.espessuraLinha,
    espessuraArco: gOpts.espessuraArco,
    suave: gOpts.suave,
    pontos: gOpts.pontos,
    tamanhoPontos: gOpts.tamanhoPontos,
    opacidadeArea: gOpts.opacidadeArea,
    anotacoes: gOpts.anotacoes,
    furo: gOpts.furo,
    destaqueFatia: gOpts.destaqueFatia,
    centroTexto: gOpts.centroTexto || params.centroTexto || url.searchParams.get('centro_texto') || 'TOTAL',
    centroValor: gOpts.centroValor || params.centroValor || url.searchParams.get('centro_valor') || null,
    posicaoLegenda: gOpts.posicaoLegenda,
    semi
  };

  let svgOutput = '';

  switch (rawTipo) {
    case 'dashboard':
    case 'painel':
      svgOutput = GraficosProEngine.renderDashboard({
        ...sharedProps,
        kpiValor: params.kpiValor || params.kpi_valor || url.searchParams.get('kpiValor') || undefined,
        kpiBadge: params.kpiBadge || params.kpi_badge || url.searchParams.get('kpiBadge') || undefined,
        donutLabels: params.donutLabels ? parseArrayParam(params.donutLabels) : undefined,
        donutValores: params.donutValores ? parseNumberArray(params.donutValores) : undefined,
        rankingLabels: params.rankingLabels ? parseArrayParam(params.rankingLabels) : undefined,
        rankingValores: params.rankingValores ? parseNumberArray(params.rankingValores) : undefined
      });
      break;

    case 'bar':
    case 'column':
    case 'coluna':
    case 'barras':
    case 'colunas':
      svgOutput = GraficosProEngine.renderBarChart({ ...sharedProps, modo: params.modo || 'grouped', titulo: titulo || 'Comparativo de Vendas' });
      break;

    case 'stacked_bar':
    case 'barras_empilhadas':
    case 'colunas_empilhadas':
      svgOutput = GraficosProEngine.renderBarChart({ ...sharedProps, modo: 'stacked', titulo: titulo || 'Composição por Categoria (Empilhado)' });
      break;

    case 'line':
    case 'linha':
      svgOutput = GraficosProEngine.renderAreaLineChart({ ...sharedProps, titulo: titulo || 'Evolução Temporal' }, false);
      break;

    case 'area':
      svgOutput = GraficosProEngine.renderAreaLineChart({ ...sharedProps, titulo: titulo || 'Tendência de Crescimento' }, true);
      break;

    case 'donut':
    case 'rosca':
      svgOutput = GraficosProEngine.renderDonutPie({ ...sharedProps, titulo: titulo || 'Distribuição de Faturamento' }, true);
      break;

    case 'pie':
    case 'pizza':
      svgOutput = GraficosProEngine.renderDonutPie({ ...sharedProps, titulo: titulo || 'Proporção Geral' }, false);
      break;

    case 'gauge':
    case 'velocimetro':
      const valG = parseFloat(params.valor || url.searchParams.get('valor') || 78);
      const minG = parseFloat(params.min || url.searchParams.get('min') || 0);
      const maxG = parseFloat(params.max || url.searchParams.get('max') || 100);
      const sufixoG = params.sufixo || url.searchParams.get('sufixo') || '%';
      svgOutput = GraficosProEngine.renderGaugeChart({ ...sharedProps, valor: valG, min: minG, max: maxG, meta, sufixo: sufixoG, titulo: titulo || 'Velocímetro de Meta' });
      break;

    case 'kpi_card':
    case 'card':
    case 'metrica':
    case 'kpi':
      const valKpi = params.valor || url.searchParams.get('valor') || 'R$ 148.920,00';
      const badgeKpi = params.badge || url.searchParams.get('badge') || '+18.4%';
      const subKpi = params.subtitulo || url.searchParams.get('subtitulo') || 'vs. mês anterior';
      svgOutput = GraficosProEngine.renderKpiCard({ ...sharedProps, titulo: titulo || 'Faturamento Mensal', valor: valKpi, badge: badgeKpi, subtitulo: subKpi, sparkline: valores });
      break;

    case 'progress':
    case 'progress_bar':
    case 'barra_progresso':
    case 'progresso':
      svgOutput = GraficosProEngine.renderProgressBar({ ...sharedProps, titulo: titulo || 'Metas e Progresso', items: params.items, valor: params.valor || (valores && valores[0]) || 75, total: params.total || 100 });
      break;

    case 'waterfall':
    case 'cascata':
    case 'dre':
      svgOutput = GraficosProEngine.renderWaterfallChart({ ...sharedProps, titulo: titulo || 'Demonstrativo de Resultado DRE' });
      break;

    case 'bullet':
    case 'marcador':
    case 'target':
    case 'okr':
      svgOutput = GraficosProEngine.renderBulletChart({ ...sharedProps, titulo: titulo || 'Performance vs Meta (Bullet)' });
      break;

    case 'rings':
    case 'radial_rings':
    case 'radial_bar':
    case 'radial':
    case 'aneis':
      svgOutput = GraficosProEngine.renderRadialBarChart({ ...sharedProps, titulo: titulo || 'Metas de Desempenho (Radial Bar)' });
      break;

    case 'heatmap':
    case 'calor':
    case 'matriz':
      svgOutput = GraficosProEngine.renderHeatmapMatrix({ ...sharedProps, dias: labels, horas: params.horas, matriz: params.matriz, titulo: titulo || 'Mapa de Calor de Atendimentos' });
      break;

    case 'scatter':
    case 'dispersao':
    case 'bolhas':
      svgOutput = GraficosProEngine.renderScatterChart({ ...sharedProps, pontos: params.pontos, titulo: titulo || 'Dispersão de Dados (Scatter)' });
      break;

    case 'treemap':
    case 'arvore':
    case 'blocos':
      svgOutput = GraficosProEngine.renderTreemapChart({ ...sharedProps, titulo: titulo || 'Market Share por Categoria (Treemap)' });
      break;

    case 'step_line':
    case 'step':
    case 'degrau':
    case 'degraus':
      svgOutput = GraficosProEngine.renderStepLineChart({ ...sharedProps, titulo: titulo || 'Nível de Serviço em Degraus' });
      break;

    case 'pyramid':
    case 'piramide':
    case 'demografia':
      svgOutput = GraficosProEngine.renderPyramidChart({ ...sharedProps, titulo: titulo || 'Distribuição Centralizada (Pirâmide)' });
      break;

    case 'lollipop':
    case 'pirulito':
      svgOutput = GraficosProEngine.renderLollipopChart({ ...sharedProps, titulo: titulo || 'Ranking Minimalista (Lollipop)' });
      break;

    case 'dumbbell':
    case 'halteres':
    case 'antes_depois':
      let vAnt = params.valoresAntes || (valores ? valores.slice(0, Math.floor(valores.length / 2)) : [40, 15, 100]);
      let vDep = params.valoresDepois || (valores ? valores.slice(Math.floor(valores.length / 2)) : [80, 25, 170]);
      svgOutput = GraficosProEngine.renderDumbbellChart({ ...sharedProps, valoresAntes: vAnt, valoresDepois: vDep, titulo: titulo || 'Evolução de Indicadores (Dumbbell)' });
      break;

    case 'waffle':
    case 'grade_waffle':
    case 'waffle_100':
      svgOutput = GraficosProEngine.renderWaffleChart({ ...sharedProps, valor: params.valor || (valores && valores[0]) || 68, total: params.total || 100, titulo: titulo || 'Taxa de Sucesso (Waffle 100%)' });
      break;

    
    case 'ticker':
    case 'crypto':
    case 'moeda':
    case 'cotacao':
      svgOutput = GraficosProEngine.renderTickerChart({
        simbolo: params.simbolo || url.searchParams.get('simbolo') || 'USD/BRL',
        preco: params.preco || url.searchParams.get('preco') || (params.valor ? String(params.valor) : '5.8240'),
        variacao: params.variacao || params.badge || url.searchParams.get('variacao') || url.searchParams.get('badge') || '+1.42%',
        maxima: params.maxima || url.searchParams.get('maxima') || '5.8510',
        minima: params.minima || url.searchParams.get('minima') || '5.7890',
        volume: params.volume || url.searchParams.get('volume') || 'R$ 48.2M',
        valores: valores || [5.789, 5.795, 5.812, 5.804, 5.818, 5.824],
        width, height, tema, paleta, corPrimaria, animado,
        bg: gOpts.bg, borda: gOpts.borda, raioBorda: gOpts.raioBorda, vidro: gOpts.vidro, fonte: gOpts.fonte
      });
      break;

    case 'badge':
    case 'selo':
    case 'shields':
      svgOutput = GraficosProEngine.renderBadge({ label: params.label || url.searchParams.get('label') || 'Ponte APIs', status: params.status || url.searchParams.get('status') || '99.98% uptime', cor: params.cor || gOpts.cores?.[0] || '#10b981', bgLabel: params.bgLabel || '#090d16', altura: params.altura || height });
      break;

    case 'funnel':
    case 'funil':
      svgOutput = GraficosProEngine.renderFunnelChart({ ...sharedProps, titulo: titulo || 'Funil de Vendas & Conversão' });
      break;

    case 'mapa_brasil':
    case 'mapa':
    case 'brasil':
    case 'ufs':
      let mapData = params.dados;
      if (!mapData && url.searchParams.get('dados')) {
        mapData = {};
        url.searchParams.get('dados').split(',').forEach(pair => {
          const [uf, n] = pair.split(':');
          if (uf && n) mapData[uf.trim().toUpperCase()] = Number(n) || 0;
        });
      }
      svgOutput = GraficosProEngine.renderMapaBrasil({ ...sharedProps, dados: mapData, titulo: titulo || 'Distribuição de Vendas (Brasil)' });
      break;

    case 'bar_horizontal':
    case 'hbar':
    case 'horizontal':
    case 'ranking':
      svgOutput = GraficosProEngine.renderBarHorizontal({ ...sharedProps, ordenar, titulo: titulo || 'Ranking de Vendas' });
      break;

    case 'radar':
    case 'polar':
    case 'spider':
    case 'teia':
      const maxR = parseFloat(params.max || url.searchParams.get('max') || 100);
      svgOutput = GraficosProEngine.renderRadarChart({ ...sharedProps, max: maxR, titulo: titulo || 'Análise Multidimensional' });
      break;

    case 'combo':
    case 'misto':
      let lVals = params.linhaValores || url.searchParams.get('linha') || url.searchParams.get('linha_valores');
      const linhaParsed = lVals ? parseNumberArray(lVals) : [12, 16, 14, 21, 24, 28];
      svgOutput = GraficosProEngine.renderComboChart({ ...sharedProps, linhaValores: linhaParsed, titulo: titulo || 'Faturamento vs Margem %' });
      break;

    case 'candlestick':
    case 'candles':
    case 'crypto':
    case 'acoes':
    case 'ohlc':
      let cData = params.candles;
      if (!cData && url.searchParams.get('candles')) {
        const rawC = url.searchParams.get('candles');
        try {
          if (rawC.startsWith('[')) cData = JSON.parse(rawC);
          else {
            cData = rawC.split(';').map(part => {
              const [open, high, low, close] = part.split(/[:,]/).map(Number);
              return { open, high, low, close };
            });
          }
        } catch (_) {}
      }
      svgOutput = GraficosProEngine.renderCandlestickChart({ ...sharedProps, candles: cData, titulo: titulo || 'Mercado Financeiro (Candlestick)' });
      break;

    case 'sparkline':
      svgOutput = GraficosProEngine.renderSparklinePure({ valores, width: width || 160, height: height || 45, paleta, corPrimaria });
      break;

    case 'pareto':
    case '80_20':
      svgOutput = GraficosProEngine.renderParetoChart({ ...sharedProps, titulo: titulo || 'Análise de Pareto (Princípio 80/20)' });
      break;

    case 'gantt':
    case 'cronograma':
    case 'sprints':
      svgOutput = GraficosProEngine.renderGanttChart({ ...sharedProps, titulo: titulo || 'Cronograma de Projeto (Gantt)', tasks: params.tasks });
      break;

    case 'boxplot':
    case 'box_plot':
    case 'caixas':
      svgOutput = GraficosProEngine.renderBoxPlotChart({ ...sharedProps, titulo: titulo || 'Distribuição Estatística (Box Plot)', boxes: params.boxes });
      break;

    case 'sankey':
    case 'fluxo':
      svgOutput = GraficosProEngine.renderSankeyChart({ ...sharedProps, titulo: titulo || 'Fluxo Financeiro de Recursos (Sankey)', origens: params.origens, destinos: params.destinos });
      break;

    case 'calendar':
    case 'calendar_heatmap':
    case 'calendario':
      svgOutput = GraficosProEngine.renderCalendarHeatmap({ ...sharedProps, titulo: titulo || 'Histórico Anual de Atividade (Calendar Heatmap)', semanas: params.semanas });
      break;

    case 'tornado':
    case 'sensibilidade':
      svgOutput = GraficosProEngine.renderTornadoChart({ ...sharedProps, titulo: titulo || 'Análise de Sensibilidade (Tornado Chart)', valoresEsquerda: params.valoresEsquerda, valoresDireita: params.valoresDireita });
      break;

    case 'venn':
    case 'conjuntos':
      svgOutput = GraficosProEngine.renderVennDiagram({ ...sharedProps, titulo: titulo || 'Diagrama de Venn (Interseção)' });
      break;

    case 'risk_matrix':
    case 'matriz_risco':
    case 'risco':
    case 'riscos':
    case 'compliance':
      svgOutput = GraficosProEngine.renderRiskMatrix({ ...sharedProps, riscos: params.riscos, titulo: titulo || 'Matriz de Riscos & Compliance (5x5)' });
      break;

    case 'sunburst':
    case 'solar':
    case 'hierarquico':
      svgOutput = GraficosProEngine.renderSunburstChart({ ...sharedProps, dados: params.dados, titulo: titulo || 'Distribuição Hierárquica (Sunburst Solar)' });
      break;

    default:
      svgOutput = GraficosProEngine.renderAreaLineChart({ ...sharedProps, titulo: titulo || 'Gráfico de Desempenho' }, true);
      break;
  }

  const formato = (params.formato || url.searchParams.get('formato') || 'svg').toLowerCase();
  const etag = `"${fnv1a(svgOutput)}"`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        ...CORS_HEADERS
      }
    });
  }

  if (formato === 'json') {
    const statsVals = Array.isArray(valores) ? (Array.isArray(valores[0]) ? valores.flat() : valores) : [];
    const stats = calculateStats(statsVals);
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgOutput)}`;
    const htmlEmbed = `<img src="https://ponte.ozpro.com.br/api/grafico?tipo=${encodeURIComponent(rawTipo)}&amp;tema=${encodeURIComponent(tema)}&amp;paleta=${encodeURIComponent(paleta)}" alt="${escapeXml(titulo || 'Gráfico Ponte APIs')}" style="max-width:100%;height:auto;display:block;" />`;

    return new Response(JSON.stringify({
      ok: true,
      tipo: rawTipo,
      tema,
      paleta,
      dimensoes: { width, height },
      personalizacoes: {
        cores: gOpts.cores || null,
        fundo: gOpts.bg || tema,
        borda: gOpts.borda || null,
        raioBorda: gOpts.raioBorda,
        rodape: gOpts.rodape || null,
        grade: gOpts.grade,
        mostrarValores: gOpts.mostrarValores
      },
      estatisticas: stats,
      dataUri,
      htmlEmbed,
      svg: svgOutput,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'ETag': etag,
        ...CORS_HEADERS
      }
    });
  }

  if (formato === 'datauri' || formato === 'data-url') {
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgOutput)}`;
    return new Response(dataUri, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'ETag': etag,
        ...CORS_HEADERS
      }
    });
  }

  if (formato === 'html') {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(titulo || 'Graficos Pro • Ponte APIs')}</title>
  <style>
    body { margin:0; padding:24px; background:#040711; display:flex; justify-content:center; align-items:center; min-height:100vh; font-family:system-ui,sans-serif; }
    .card { max-width:${width}px; width:100%; }
  </style>
</head>
<body>
  <div class="card">${svgOutput}</div>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'ETag': etag,
        ...CORS_HEADERS
      }
    });
  }

  return new Response(svgOutput, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'ETag': etag,
      ...CORS_HEADERS
    }
  });
}

export default {
  fetch: handleRequest,
  onRequest: handleRequest,
  handleRequest
};
