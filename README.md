# Graficos Pro — SDK & API de Gráficos SVG Anycast (<3ms)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edge Latency](https://img.shields.io/badge/Latency-%3C3ms-10b981.svg)](https://ponte.ozpro.com.br)
[![Modelos](https://img.shields.io/badge/Modelos-39%20Tipos-38bdf8.svg)](https://ponte.ozpro.com.br/graficos)

Motor de **39 tipos de gráficos vetoriais SVG e cards KPI executados na borda Cloudflare Edge Anycast** com animações CSS nativas, zero dependências e renderização em `<3ms`.

---

## 📊 39 Tipos de Gráficos Nativos Suportados

1. **Área com Gradiente** (`area`)
2. **Colunas / Barras Verticais** (`bar` / `column`)
3. **Barras Horizontais** (`bar_horizontal`)
4. **Barras Empilhadas** (`stacked_bar`)
5. **Linha Suave Bézier** (`line`)
6. **Linha em Degraus** (`step_line`)
7. **Rosca com Total** (`donut`)
8. **Pizza Proporcional** (`pie`)
9. **Velocímetro de Meta** (`gauge`)
10. **Barra de Progresso** (`progress`)
11. **Metas Radiais Circulares** (`radial_bar`)
12. **Treemap em Blocos** (`treemap`)
13. **Dispersão / Bolhas** (`scatter`)
14. **Performance Bullet / OKR** (`bullet`)
15. **Pirulito Minimalista** (`lollipop`)
16. **Hálteres Antes vs Depois** (`dumbbell`)
17. **Grade Waffle 100%** (`waffle`)
18. **Pirâmide Demográfica** (`pyramid`)
19. **Card Executivo KPI** (`card` / `kpi_card`)
20. **Demonstrativo DRE Cascata** (`waterfall`)
21. **Mapa de Calor** (`heatmap`)
22. **Radar Multidimensional** (`radar` / `spider`)
23. **Misto Barras + Linha** (`combo`)
24. **Candlestick de Mercado** (`candlestick` / `ohlc`)
25. **Sparkline Inline** (`sparkline`)
26. **Funil de Vendas** (`funnel`)
27. **Mapa do Brasil (27 UFs)** (`mapa_brasil`)
28. **Badge Shields.io** (`badge`)
29. **Matriz de Riscos 5x5** (`risk_matrix`)
30. **Solar Hierárquico** (`sunburst`)
31. **Dashboard Executivo 2x2** (`dashboard`)
32. **Live Ticker com Beacon Pulsante** (`ticker`)
33. **Análise de Pareto 80/20** (`pareto`)
34. **Cronograma de Sprints Gantt** (`gantt`)
35. **Box Plot de Caixas e Quartis** (`boxplot`)
36. **Diagrama de Fluxo Sankey** (`sankey`)
37. **Calendário Anual de Atividade** (`calendar`)
38. **Gráfico de Sensibilidade Tornado** (`tornado`)
39. **Diagrama de Venn de Conjuntos** (`venn`)

---

## 🚀 Uso Direto em HTML (Zero JS no Cliente)

```html
<!-- Gráfico de Área renderizado diretamente pela borda em <3ms -->
<img src="https://ponte.ozpro.com.br/api/grafico?tipo=area&labels=Jan,Fev,Mar,Abr&valores=30,50,45,70&tema=dark" width="600" height="320" alt="Gráfico" />
```

---

## 🧪 Testes Unitários

```bash
npm test
```

Licença **MIT** &copy; 2026 Clepta Tech.
