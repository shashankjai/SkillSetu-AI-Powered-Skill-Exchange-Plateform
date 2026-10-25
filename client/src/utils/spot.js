// Cursor-follow glow + gentle 3D tilt for ".card-fx" elements.
// installGlobalSpot() (called once in main.jsx) handles every .card-fx on every page, so a card only needs the class.
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function spot(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
  // no tilt for big panels or anything with form fields (tilting under the cursor while typing feels wrong)
  const flat = reduce() || r.width > 720 || r.height > 520 || el.querySelector("input, textarea, select");
  el.style.setProperty("--ry", flat ? "0deg" : `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
  el.style.setProperty("--rx", flat ? "0deg" : `${-((e.clientY - r.top) / r.height - 0.5) * 6}deg`);
}

let installed = false;
export function installGlobalSpot() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  let last = null;
  document.addEventListener(
    "mousemove",
    (e) => {
      const el = e.target instanceof Element ? e.target.closest(".card-fx") : null;
      if (last && last !== el) {
        last.style.setProperty("--rx", "0deg");
        last.style.setProperty("--ry", "0deg");
      }
      last = el;
      if (el) spot({ currentTarget: el, clientX: e.clientX, clientY: e.clientY });
    },
    { passive: true }
  );
}
