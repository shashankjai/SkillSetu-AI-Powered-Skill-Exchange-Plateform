// client/src/components/background/Background.jsx
import React from "react";

/** Soft page backdrop: dot grid + two slow floating slate blobs. Purely decorative. */
const Background = () => (
  <div aria-hidden="true" className="dot-grid pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="blob -left-24 top-10 h-72 w-72 bg-slate-300/40" />
    <div className="blob blob-b -right-16 top-1/2 h-80 w-80 bg-slate-200/60" />
  </div>
);

export default Background;
