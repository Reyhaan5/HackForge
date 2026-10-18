import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import "./ArrowFillButton.css";

const SIZES = {
  sm: {
    height: "h-9",
    padding: "pl-4 pr-11",
    text: "text-xs font-semibold",
    circle: 24,
    right: 6,
    arrowSize: "size-3.5",
  },
  md: {
    height: "h-11",
    padding: "pl-6 pr-14",
    text: "text-sm font-semibold",
    circle: 30,
    right: 7,
    arrowSize: "size-4",
  },
  lg: {
    height: "h-13",
    padding: "pl-7 pr-16",
    text: "text-base font-semibold",
    circle: 36,
    right: 8,
    arrowSize: "size-5",
  },
};

export default function ArrowFillButton({
  btnText = "Get Started",
  to,
  href,
  onClick,
  className = "",
  size = "md",
  gradient = false,
  bgColor = "#5E01CE",
  textColor = "#ffffff",
  fillBgColor = "#ffffff",
  fillTextColor = "#5E01CE",
  hoverFillBgColor = "#ffffff",
  hoverFillTextColor = "#5E01CE",
  arrowColor,
  hoverArrowColor,
  icon: Icon = ArrowRight,
  disabled = false,
  type,
  ...props
}) {
  const [isReady, setIsReady] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimeoutRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => {
      window.cancelAnimationFrame(frame);
      if (releaseTimeoutRef.current) window.clearTimeout(releaseTimeoutRef.current);
    };
  }, []);

  const clearPressed = () => {
    if (releaseTimeoutRef.current) window.clearTimeout(releaseTimeoutRef.current);
    releaseTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
      releaseTimeoutRef.current = null;
    }, 450);
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    props.onPointerDown?.(e);
    if (e.pointerType === "mouse") return;
    if (releaseTimeoutRef.current) window.clearTimeout(releaseTimeoutRef.current);
    setIsPressed(true);
  };

  const handlePointerUp = (e) => {
    if (disabled) return;
    props.onPointerUp?.(e);
    if (e.pointerType !== "mouse") clearPressed();
  };

  const currentSize = SIZES[size] || SIZES.md;
  const hasUtilityBg = className.includes("bg-") || className.includes("from-") || className.includes("via-") || className.includes("to-");
  const bgStyleClass = gradient
    ? "bg-gradient-to-r from-[#5E01CE] via-[#8D64ED] to-[#FE00A4] border-transparent"
    : hasUtilityBg
    ? "border-transparent"
    : "bg-[var(--btn-bg)] border-[var(--btn-bg)]";

  const disabledClass = disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer active:scale-95";

  const baseClasses = cn(
    "arrow-fill-btn group/btn relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border whitespace-nowrap leading-none select-none shadow-sm transition-all duration-300 hover:shadow-md",
    "[text-rendering:geometricPrecision]",
    currentSize.height,
    "w-fit min-w-fit max-w-none",
    currentSize.padding,
    currentSize.text,
    bgStyleClass,
    "text-[var(--btn-text)]",
    disabledClass,
    className
  );

  const insetY = currentSize.right; // Equal to right margin for perfect concentric circularity

  const styleObj = {
    "--btn-bg": bgColor,
    "--btn-text": textColor,
    "--btn-fill-bg": fillBgColor,
    "--btn-fill-text": fillTextColor,
    "--btn-fill-bg-hover": hoverFillBgColor,
    "--btn-fill-text-hover": hoverFillTextColor,
    "--btn-arrow": arrowColor || fillTextColor,
    "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
    "--icon-circle": `${currentSize.circle}px`,
    "--icon-right": `${currentSize.right}px`,
    "--circle-inset-y": `${insetY}px`,
    visibility: isReady ? "visible" : "hidden",
    ...props.style,
  };

  const buttonInner = (
    <>
      <span className="relative z-10 pb-px">{btnText}</span>

      {/* Expanding circle background on hover */}
      <div
        aria-hidden="true"
        className="arrow-fill-bg"
      />

      {/* Clipped text overlay matching fill state */}
      <div
        aria-hidden="true"
        className={cn(
          "arrow-fill-text-clip",
          currentSize.padding,
          className.includes("justify-center") ? "justify-center" : "justify-start"
        )}
      >
        <span className="relative z-10 pb-px whitespace-nowrap">{btnText}</span>
      </div>

      {/* Concentric circular icon container */}
      <span
        aria-hidden="true"
        className="arrow-fill-icon-circle"
        style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)", maskImage: "radial-gradient(white, black)" }}
      >
        <Icon
          className={cn("arrow-fill-icon-in", currentSize.arrowSize, "text-current")}
          strokeWidth={2.2}
        />
        <Icon
          className={cn("arrow-fill-icon-out", currentSize.arrowSize, "text-current")}
          strokeWidth={2.2}
        />
      </span>
    </>
  );

  const Comp = to ? Link : href ? "a" : "button";

  return (
    <Comp
      to={to}
      href={href}
      type={!to && !href ? (type || "button") : undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      data-pressed={isPressed ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={baseClasses}
      style={styleObj}
      {...props}
    >
      {buttonInner}
    </Comp>
  );
}
