import worker, { GraficosProEngine, PALETAS, TEMAS, getContrastTextColor, getTextHaloStyle } from './worker.js';

console.log('🧪 Iniciando Bateria de Testes do GraficosPro (39 Tipos de Gráficos SVG)...\\n');

let pass = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${msg}`);
  } else {
    console.error(`  ❌ FALHA: ${msg}`);
    throw new Error(msg);
  }
}

// 1. Teste de Gráfico de Área
const reqArea = new Request('https://api.test/api/grafico?tipo=area&valores=10,20,30,40&labels=A,B,C,D');
const resArea = await worker.fetch(reqArea);
assert(resArea.status === 200, 'Rota /api/grafico (area) responde 200 OK');
assert(resArea.headers.get('Content-Type').includes('image/svg+xml'), 'Content-Type é image/svg+xml');
const svgArea = await resArea.text();
assert(svgArea.includes('<svg') && svgArea.includes('</svg>'), 'Gera SVG de área válido');

// 2. Teste de Colunas
const reqBar = new Request('https://api.test/api/grafico?tipo=bar&valores=50,80,30&labels=Jan,Fev,Mar');
const resBar = await worker.fetch(reqBar);
assert(resBar.status === 200, 'Gráfico de barras/colunas responde 200 OK');

// 3. Teste de Rosca (Donut)
const reqDonut = new Request('https://api.test/api/grafico?tipo=donut&valores=40,60&labels=Sim,Nao');
const resDonut = await worker.fetch(reqDonut);
assert(resDonut.status === 200, 'Gráfico donut responde 200 OK');

// 4. Teste de Velocímetro (Gauge)
const reqGauge = new Request('https://api.test/api/grafico?tipo=gauge&valor=85&meta=100');
const resGauge = await worker.fetch(reqGauge);
assert(resGauge.status === 200, 'Gráfico gauge responde 200 OK');

// 5. Teste de Card KPI
const reqKpi = new Request('https://api.test/api/grafico?tipo=card&titulo=Receita&valor=150000&variacao=+12.5%');
const resKpi = await worker.fetch(reqKpi);
assert(resKpi.status === 200, 'Card KPI responde 200 OK');

// 6. Teste de Live Ticker com Beacon
const reqTicker = new Request('https://api.test/api/grafico?tipo=ticker&simbolo=BTC&preco=492000&variacao=+3.2%');
const resTicker = await worker.fetch(reqTicker);
assert(resTicker.status === 200, 'Live Ticker responde 200 OK');
const svgTicker = await resTicker.text();
assert(svgTicker.includes('BTC') && svgTicker.includes('492000'), 'Ticker contém símbolo e preço formatado');

// 7. Teste de Dashboard 2x2
const reqDash = new Request('https://api.test/api/grafico?tipo=dashboard');
const resDash = await worker.fetch(reqDash);
assert(resDash.status === 200, 'Dashboard 2x2 responde 200 OK');

// 8. Teste de Formato JSON
const reqJson = new Request('https://api.test/api/grafico?tipo=bar&valores=10,20,30&formato=json');
const resJson = await worker.fetch(reqJson);
assert(resJson.status === 200, 'Formato JSON responde 200 OK');
const bodyJson = await resJson.json();
assert(bodyJson.ok === true && bodyJson.estatisticas !== undefined, 'JSON traz estatísticas matemáticas calculadas');

// 9. Teste do Motor de Contraste WCAG 2.1 & Text-Halo
console.log('\n--- Teste de Contraste e Acessibilidade Visual (WCAG 2.1 AAA) ---');
const textOnYellow = getContrastTextColor('#ffe600');
assert(textOnYellow === '#090d16', 'Fundo amarelo (#ffe600) recebe texto escuro (#090d16)');

const textOnDarkBlue = getContrastTextColor('#1e40af');
assert(textOnDarkBlue === '#ffffff', 'Fundo azul escuro (#1e40af) recebe texto claro (#ffffff)');

const textOnWhite = getContrastTextColor('#ffffff');
assert(textOnWhite === '#090d16', 'Fundo branco (#ffffff) recebe texto escuro (#090d16)');

const haloDark = getTextHaloStyle('#ffffff');
assert(haloDark.includes('stroke:rgba(9, 13, 22'), 'Texto branco recebe halo protetor escuro');

// 10. Teste de Renderização com Treemap e Contraste Dinâmico
const reqTreemap = new Request('https://api.test/api/grafico?tipo=treemap&valores=50,30,20&labels=A,B,C&paleta=contrast');
const resTreemap = await worker.fetch(reqTreemap);
assert(resTreemap.status === 200, 'Treemap responde 200 OK');
const svgTreemap = await resTreemap.text();
assert(svgTreemap.includes('treemap-box') && svgTreemap.includes('paint-order'), 'Treemap renderiza blocos com halo de proteção de texto');

// 11. Teste de Heatmap com Contraste Dinâmico
const reqHeat = new Request('https://api.test/api/grafico?tipo=heatmap');
const resHeat = await worker.fetch(reqHeat);
assert(resHeat.status === 200, 'Heatmap responde 200 OK');
const svgHeat = await resHeat.text();
assert(svgHeat.includes('heat-cell') && svgHeat.includes('paint-order'), 'Heatmap renderiza células com contraste calculado');

console.log(`\n🎉 Todos os ${pass} testes do GraficosPro passaram com 100% de sucesso!`);
