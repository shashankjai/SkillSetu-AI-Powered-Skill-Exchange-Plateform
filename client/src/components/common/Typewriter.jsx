import React, { useEffect, useState } from "react";

/** Types and deletes a rotating list of words. Shows the first word statically if reduced motion is on. */
const Typewriter = ({ words, className = "" }) => {
  const [i, setI] = useState(0);
  const [txt, setTxt] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTxt(words[0]);
      return undefined;
    }
    const w = words[i];
    let t;
    if (!del && txt === w) t = setTimeout(() => setDel(true), 1600);
    else if (del && txt === "") {
      setDel(false);
      setI((i + 1) % words.length);
    } else {
      t = setTimeout(() => setTxt(del ? w.slice(0, txt.length - 1) : w.slice(0, txt.length + 1)), del ? 35 : 75);
    }
    return () => clearTimeout(t);
  }, [txt, del, i, words]);

  return (
    <span className={className} aria-label={words[0]}>
      <span aria-hidden="true">{txt}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  );
};

export default Typewriter;
