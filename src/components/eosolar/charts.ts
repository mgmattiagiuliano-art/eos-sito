/**
 * Grafici Chart.js del calcolatore. Caricato on demand (import dinamico) solo dopo lo sblocco.
 * Colori letti dai token CSS; ogni canvas ha al massimo un grafico: quello vecchio viene distrutto.
 */
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js';
import { MESI } from '../../lib/eosolar/defaults';
import { fmtEur, fmtKwh } from '../../lib/eosolar/format';
import type { SimulationResult } from '../../lib/eosolar/types';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip, Filler);

const instances = new Map<HTMLCanvasElement, Chart>();

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
}

function applyDefaults(): void {
  Chart.defaults.font.family = token('--font-body', 'sans-serif');
  Chart.defaults.color = token('--c-text', '#475569');
  Chart.defaults.borderColor = token('--c-border', '#e2e8f0');
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 };
}

function draw<T extends ChartType>(canvas: HTMLCanvasElement, config: ChartConfiguration<T>): void {
  applyDefaults();
  instances.get(canvas)?.destroy();
  instances.set(canvas, new Chart(canvas, config as ChartConfiguration));
}

export function renderBars(canvas: HTMLCanvasElement, r: SimulationResult): void {
  const m = r.mesiAnno1;
  draw(canvas, {
    type: 'bar',
    data: {
      labels: [...MESI],
      datasets: [
        { label: 'Produzione', data: m.map((x) => x.produzione), backgroundColor: token('--c-green-chart', '#10b981'), borderRadius: 4 },
        { label: 'Consumo', data: m.map((x) => x.consumoDiurno + x.consumoNotturno), backgroundColor: token('--c-ink', '#0f172a'), borderRadius: 4 },
        {
          label: 'Autoconsumo (diretto + batteria)',
          data: m.map((x) => x.autoconsumoDiretto + x.scaricaBatteria),
          backgroundColor: token('--c-amber', '#f59e0b'),
          borderRadius: 4,
        },
      ],
    },
    options: {
      scales: { y: { ticks: { callback: (v) => fmtKwh(Number(v)) } } },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtKwh(c.parsed.y ?? 0)}` } } },
    },
  });
}

export function renderNpvCurve(
  canvas: HTMLCanvasElement,
  curves: { label: string; points: { kwp: number; npv: number }[] }[],
  kwpOttimo: number,
): void {
  const palette = [token('--c-green-chart', '#10b981'), token('--c-blue', '#0044bd')];
  const labels = curves[0]?.points.map((p) => p.kwp) ?? [];
  draw(canvas, {
    type: 'line',
    data: {
      labels: labels.map((k) => `${String(k).replace('.', ',')}`),
      datasets: curves.map((c, i) => ({
        label: c.label,
        data: c.points.map((p) => p.npv),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length],
        borderWidth: 3,
        tension: 0.3,
        pointRadius: c.points.map((p) => (i === 0 && p.kwp === kwpOttimo ? 6 : 0)),
      })),
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Potenza (kWp)' } },
        y: { ticks: { callback: (v) => fmtEur(Number(v)) } },
      },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtEur(c.parsed.y ?? 0)}` } } },
    },
  });
}

export function renderCashflow(canvas: HTMLCanvasElement, r: SimulationResult): void {
  const ink = token('--c-ink', '#0f172a');
  const green = token('--c-green-chart', '#10b981');
  draw(canvas, {
    type: 'line',
    data: {
      labels: ['0', ...r.flussi.map((f) => String(f.anno))],
      datasets: [
        {
          label: 'Cassa cumulata attualizzata',
          data: [-r.capex.totale, ...r.flussi.map((f) => f.cumulatoAttualizzato)],
          borderColor: ink,
          backgroundColor: alpha(green, 0.12),
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Anno' } },
        y: { ticks: { callback: (v) => fmtEur(Number(v)) } },
      },
      plugins: { tooltip: { callbacks: { label: (c) => fmtEur(c.parsed.y ?? 0) } } },
    },
  });
}
