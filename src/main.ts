import "./style.css";
import { initHero } from "./webgl/hero";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ---------- Nav: scrolled state + mobile menu ---------- */
function initNav(): void {
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  if (!nav || !burger) return;

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll<HTMLAnchorElement>(".nav__links a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Scroll reveal via IntersectionObserver ---------- */
function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Slight stagger for grouped elements.
          window.setTimeout(
            () => entry.target.classList.add("is-visible"),
            Math.min(i * 60, 240)
          );
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));

  // Failsafe: never leave content permanently hidden if the observer never
  // fires (e.g. a never-focused/background tab where IO reports no
  // intersections, or an unexpected error). Reveal anything still hidden.
  window.setTimeout(() => {
    document
      .querySelectorAll<HTMLElement>(".reveal:not(.is-visible)")
      .forEach((el) => {
        io.unobserve(el);
        el.classList.add("is-visible");
      });
  }, 2600);
}

/* ---------- Architecture diagram: cycle active ingress node ---------- */
function initArchDiagram(): void {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(".arch__node")
  );
  if (nodes.length === 0 || prefersReducedMotion) return;

  let i = 0;
  const tick = () => {
    nodes.forEach((n) => n.classList.remove("is-active"));
    nodes[i % nodes.length].classList.add("is-active");
    i += 1;
  };
  tick();
  window.setInterval(tick, 1800);
}

/* ---------- CTA form (no backend; graceful confirmation) ---------- */
function initForm(): void {
  const form = document.getElementById("cta-form") as HTMLFormElement | null;
  const note = document.getElementById("cta-note");
  if (!form || !note) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="email"]');
    const email = input?.value.trim() ?? "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      note.textContent = "Please enter a valid work email.";
      note.classList.remove("ok");
      input?.focus();
      return;
    }
    note.textContent = `Thanks — we'll reach out to ${email} to schedule your demo.`;
    note.classList.add("ok");
    form.reset();
  });
}

/* ---------- Boot ---------- */
function boot(): void {
  initNav();
  initReveal();
  initArchDiagram();
  initForm();

  const canvas = document.getElementById(
    "hero-canvas"
  ) as HTMLCanvasElement | null;
  const hero = document.getElementById("hero");
  if (canvas && hero) {
    const ok = initHero(canvas, { reducedMotion: prefersReducedMotion });
    if (!ok) hero.classList.add("no-webgl");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
