import { useCallback, useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { useTheme } from "@/context/ThemeProvider";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ className="", duration=400 }) {
  const { theme, setTheme }=useTheme();
  const isDark=theme === "dark";
  const buttonRef=useRef(null);

  useEffect(() => {
    const id="tt-vt-override";
    if (document.getElementById(id)) return;
    const el=document.createElement("style");
    el.id=id;
    el.textContent=`
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
      }
    `;
    document.head.appendChild(el);
  }, []);

  const toggle=useCallback(async () => {
    if (!buttonRef.current) return;

    const newTheme=isDark ? "light":"dark";

    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const { top, left, width, height }=
      buttonRef.current.getBoundingClientRect();
    const x=left + width / 2;
    const y=top + height / 2;
    const maxRadius=Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    );

    await document.startViewTransition(() => {
      flushSync(() => setTheme(newTheme));
    }).ready;

    document.documentElement.animate(
      {
        clipPath:[
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing:"ease-in-out",
        pseudoElement:"::view-transition-new(root)",
      }
    );
  }, [isDark, setTheme, duration]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      className={`${styles.btn} ${isDark ? styles.dark:""} ${className}`}
      aria-label={isDark ? "Switch to light mode":"Switch to dark mode"}
      title={isDark ? "Switch to light mode":"Switch to dark mode"}
    >
      <span className={styles.iconWrap} aria-hidden="true">
        {isDark ? <Sun size={18} />:<Moon size={18} />}
      </span>
    </button>
  );
}
