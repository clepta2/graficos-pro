export interface ChartOptions {
  tipo: string;
  valores: number[] | string;
  labels?: string[] | string;
  titulo?: string;
  subtitulo?: string;
  tema?: 'dark' | 'light' | 'auto' | 'transparent';
  paleta?: string;
  width?: number;
  height?: number;
  moeda?: string;
  formato?: 'svg' | 'json' | 'datauri' | 'html';
}

export class GraficosProEngine {
  static renderBarChart(options: ChartOptions): string;
  static renderLineChart(options: ChartOptions): string;
  static renderAreaChart(options: ChartOptions): string;
  static renderDonutChart(options: ChartOptions): string;
  static renderPieChart(options: ChartOptions): string;
  static renderGaugeChart(options: ChartOptions): string;
  static renderKpiCard(options: ChartOptions): string;
  static renderTickerChart(options: any): string;
  static renderDashboard(options: any): string;
  static renderSvgChart(options: ChartOptions): string;
}

export default GraficosProEngine;
