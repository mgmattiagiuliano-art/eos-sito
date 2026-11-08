/**
 * Animazioni della home (GSAP + ScrollTrigger da npm).
 * - Si inizializzano dopo il caricamento dei font (le misure dipendono dal testo).
 * - Con prefers-reduced-motion: niente pin, niente scrub, niente animazioni (stato finale statico).
 * - Ordine: prima il pin della hero, poi i trigger che stanno sotto (ScrollTrigger lo richiede).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reachedNodes, segmentPath, serpentinePath, type Point } from '../lib/wire';

gsap.registerPlugin(ScrollTrigger);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const REDUCED = '(prefers-reduced-motion: reduce)';

const cssPx = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

function lightUp(el: Element): void {
  el.classList.remove('is-lit');
  void (el as HTMLElement).offsetWidth; // riavvia l'animazione CSS
  el.classList.add('is-lit');
}

// ---------------- Hero ----------------
function initHero(mm: gsap.MatchMedia): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const track = hero?.querySelector<HTMLElement>('[data-hero-track]');
  if (!hero || !track) return;
  const slides = track.querySelectorAll('[data-hero-slide]').length;
  const sparks = Array.from(hero.querySelectorAll('.spark'));

  mm.add(
    { horizontal: `(min-width: 768px) and ${MOTION_OK}`, stacked: `(max-width: 767px) and ${MOTION_OK}` },
    (ctx) => {
      const { horizontal } = ctx.conditions as { horizontal: boolean };
      if (!horizontal) {
        sparks.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => lightUp(el) }));
        return;
      }
      hero.classList.add('hero--horizontal');
      const tween = gsap.to(track, {
        x: () => -(track.scrollWidth - hero.clientWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          pin: true,
          scrub: 0.6,
          start: () => `top ${cssPx('--header-h-compact')}px`,
          end: () => `+=${(slides - 1) * 550}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      // L'impulso parte quando la parola entra orizzontalmente nella slide visibile
      sparks.forEach((el) =>
        ScrollTrigger.create({
          trigger: el,
          containerAnimation: el.closest('[data-hero-slide]') === track.firstElementChild ? undefined : tween,
          start: el.closest('[data-hero-slide]') === track.firstElementChild ? 'top 90%' : 'left 75%',
          onEnter: () => lightUp(el),
          onEnterBack: () => lightUp(el),
        }),
      );
      return () => hero.classList.remove('hero--horizontal');
    },
  );

  // Video della slide 5: parte solo quando la slide è visibile e il movimento è consentito
  const video = hero.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (video) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && window.matchMedia(MOTION_OK).matches) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    io.observe(video.closest('[data-hero-slide]') ?? video);
  }
}

// ---------------- Cavo elettrico ----------------
interface WireLayout {
  total: number;
  cumulative: number[];
}

function layoutWire(scope: HTMLElement, wire: HTMLElement): WireLayout {
  const svg = wire.querySelector<SVGSVGElement>('[data-wire-svg]')!;
  const tube = wire.querySelector<SVGPathElement>('[data-wire-tube]')!;
  const copper = wire.querySelector<SVGPathElement>('[data-wire-copper]')!;
  const nodes = Array.from(wire.querySelectorAll<HTMLElement>('[data-wire-node]'));
  const box = scope.getBoundingClientRect();
  const w = scope.clientWidth;
  const h = scope.scrollHeight;

  const points: Point[] = nodes.map((node) => {
    const anchor = document.getElementById(node.dataset.anchor ?? '');
    const r = anchor?.getBoundingClientRect();
    const at = Number(node.dataset.at ?? 0.5);
    const y = r ? r.top - box.top + at * r.height : 0;
    const x = node.dataset.side === 'right' ? 0.96 * w : 0.04 * w;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    return { x, y };
  });

  // viewBox = dimensioni reali in px: nessuna deformazione (in più vector-effect nel CSS)
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const d = serpentinePath(points);
  tube.setAttribute('d', d);
  copper.setAttribute('d', d);

  // Lunghezza cumulata fino a ciascun vertice, per accendere le icone col progresso del tratto
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(probe);
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    probe.setAttribute('d', segmentPath(points[i - 1]!, points[i]!));
    cumulative.push(cumulative[i - 1]! + probe.getTotalLength());
  }
  probe.remove();
  const total = copper.getTotalLength();
  copper.style.strokeDasharray = `${total}`;
  wire.classList.add('is-ready');
  return { total, cumulative };
}

function initWire(mm: gsap.MatchMedia): void {
  const scope = document.querySelector<HTMLElement>('[data-wire-scope]');
  const wire = scope?.querySelector<HTMLElement>('[data-wire]');
  if (!scope || !wire) return;
  const copper = wire.querySelector<SVGPathElement>('[data-wire-copper]')!;
  const nodes = Array.from(wire.querySelectorAll<HTMLElement>('[data-wire-node]'));

  mm.add('(min-width: 1100px)', () => {
    let layout = layoutWire(scope, wire);
    const state = { p: 0 };
    const render = () => {
      const drawn = layout.total * state.p;
      copper.style.strokeDashoffset = `${layout.total - drawn}`;
      reachedNodes(layout.cumulative, drawn).forEach((on, i) => nodes[i]?.classList.toggle('is-active', on));
    };

    const reduced = window.matchMedia(REDUCED).matches;
    let trigger: ScrollTrigger | null = null;
    if (reduced) {
      state.p = 1; // cavo statico, tutto acceso
    } else {
      const toP = gsap.quickTo(state, 'p', { duration: 0.4, ease: 'power1.out', onUpdate: render });
      trigger = ScrollTrigger.create({
        trigger: scope,
        start: 'top 80%',
        end: 'bottom bottom',
        onUpdate: (self) => toP(self.progress),
      });
      state.p = trigger.progress;
    }
    render();

    // Ricalcolo: dopo ogni refresh di ScrollTrigger e quando cambia l'altezza delle sezioni
    const onRefresh = () => {
      layout = layoutWire(scope, wire);
      render();
    };
    ScrollTrigger.addEventListener('refresh', onRefresh);
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    ro.observe(scope);

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      ro.disconnect();
      trigger?.kill();
      wire.classList.remove('is-ready');
      nodes.forEach((n) => n.classList.remove('is-active'));
    };
  });
}

// ---------------- Testi e card ----------------
function initReveals(mm: gsap.MatchMedia): void {
  mm.add(MOTION_OK, () => {
    document.querySelectorAll('[data-wire-scope] .spark').forEach((el) =>
      ScrollTrigger.create({ trigger: el, start: 'top 85%', onEnter: () => lightUp(el) }),
    );
    gsap.utils.toArray<HTMLElement>('.reveal').forEach((el, i) => {
      gsap.from(el, {
        y: 35,
        opacity: 0,
        duration: 0.7,
        delay: (i % 3) * 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      });
    });
  });
}

export async function initAnimations(): Promise<void> {
  // Le misure (hero, cavo) dipendono dai font: aspettiamo che siano caricati
  if ('fonts' in document) await document.fonts.ready;
  const mm = gsap.matchMedia();
  initHero(mm);
  initWire(mm);
  initReveals(mm);
  ScrollTrigger.refresh();
}
