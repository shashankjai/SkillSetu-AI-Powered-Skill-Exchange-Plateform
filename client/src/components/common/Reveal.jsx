import React, { useEffect, useRef } from "react";

/** Fades/slides children in once when scrolled into view. `stagger` animates direct children one by one. */
const Reveal = ({ children, className = "", stagger = false, as: Tag = "div", ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("in");
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${stagger ? "stg" : "reveal"} ${className}`} {...rest}>
      {children}
    </Tag>
  );
};

export default Reveal;
