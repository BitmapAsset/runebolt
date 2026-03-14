"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchOnHover?: boolean;
  autoGlitch?: boolean;
  color?: string;
  variant?: "glitch" | "neon" | "electric" | "meow" | "wow" | "rare";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p";
  trigger?: boolean;
}

const VARIANTS = {
  glitch: {
    animation: "animate-glitch",
    textShadow: "none",
  },
  neon: {
    animation: "animate-neon-flicker",
    textShadow: "0 0 4px currentColor, 0 0 11px currentColor, 0 0 19px currentColor",
  },
  electric: {
    animation: "",
    textShadow: "0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor",
  },
  meow: {
    animation: "animate-feels-good",
    textShadow: "0 0 10px #8B5CF6, 0 0 20px #06B6D4",
  },
  wow: {
    animation: "animate-wow-bounce",
    textShadow: "0 0 10px #DC2626, 0 0 20px #F9FAFB",
  },
  rare: {
    animation: "animate-feels-good",
    textShadow: "0 0 10px #10B981, 0 0 20px #EC4899",
  },
};

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl",
  "2xl": "text-6xl",
};

export function GlitchText({
  text,
  className = "",
  glitchOnHover = true,
  autoGlitch = false,
  color,
  variant = "glitch",
  size = "lg",
  as: Component = "span",
  trigger = false,
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(autoGlitch);
  const [displayText, setDisplayText] = useState(text);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger) {
      setIsGlitching(true);
      setKey(prev => prev + 1);
      
      // Glitch text effect
      let iterations = 0;
      const maxIterations = 10;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
      
      const interval = setInterval(() => {
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (index < iterations) return text[index];
              if (char === " ") return " ";
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );
        
        iterations += 1 / 3;
        if (iterations >= text.length) {
          clearInterval(interval);
          setDisplayText(text);
          setTimeout(() => setIsGlitching(false), 500);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [trigger, text]);

  const handleMouseEnter = () => {
    if (glitchOnHover) {
      setIsGlitching(true);
      
      // Brief scramble
      let iterations = 0;
      const interval = setInterval(() => {
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (Math.random() > 0.7) {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
                return chars[Math.floor(Math.random() * chars.length)];
              }
              return char;
            })
            .join("")
        );
        
        iterations++;
        if (iterations > 5) {
          clearInterval(interval);
          setDisplayText(text);
          setIsGlitching(false);
        }
      }, 50);
    }
  };

  const variantStyle = VARIANTS[variant];

  return (
    <motion.span
      key={key}
      className={`relative inline-block ${SIZE_CLASSES[size]} ${className}`}
      style={{ color: color || "inherit" }}
      onMouseEnter={handleMouseEnter}
      data-text={text}
    >
      <Component
        className={`relative z-10 ${isGlitching ? variantStyle.animation : ""}`}
        style={{
          textShadow: isGlitching ? variantStyle.textShadow : "none",
        }}
      >
        {displayText}
      </Component>
      
      {/* RGB Split layers for glitch effect */}
      {isGlitching && variant === "glitch" && (
        <>
          <span
            className="absolute inset-0 text-red-500 opacity-70"
            style={{
              clipPath: "inset(40% 0 61% 0)",
              transform: "translate(-2px, 2px)",
              animation: "glitch-text 0.3s infinite linear alternate-reverse",
            }}
          >
            {displayText}
          </span>
          <span
            className="absolute inset-0 text-green-500 opacity-70"
            style={{
              clipPath: "inset(25% 0 58% 0)",
              transform: "translate(2px, -2px)",
              animation: "glitch-text-alt 0.3s infinite linear alternate-reverse",
            }}
          >
            {displayText}
          </span>
        </>
      )}
      
      {/* Electric underline */}
      {(variant === "electric" || variant === "neon") && (
        <motion.span
          className="absolute -bottom-1 left-0 h-0.5 bg-current"
          initial={{ width: "0%" }}
          animate={{ width: isGlitching ? "100%" : "0%" }}
          transition={{ duration: 0.3 }}
          style={{
            boxShadow: `0 0 10px currentColor, 0 0 20px currentColor`,
          }}
        />
      )}
    </motion.span>
  );
}

// Specialized text components for each asset
export function BillyText({ text, ...props }: Omit<GlitchTextProps, "variant" | "color">) {
  return (
    <GlitchText
      text={text}
      variant="meow"
      color="#8B5CF6"
      {...props}
    />
  );
}

export function DogText({ text, ...props }: Omit<GlitchTextProps, "variant" | "color">) {
  return (
    <GlitchText
      text={text}
      variant="wow"
      color="#DC2626"
      {...props}
    />
  );
}

export function BitmapText({ text, ...props }: Omit<GlitchTextProps, "variant" | "color">) {
  return (
    <GlitchText
      text={text}
      variant="electric"
      color="#F7931A"
      {...props}
    />
  );
}

export function PepeText({ text, ...props }: Omit<GlitchTextProps, "variant" | "color">) {
  return (
    <GlitchText
      text={text}
      variant="rare"
      color="#10B981"
      {...props}
    />
  );
}

// Animated counter with glitch effect
export function GlitchCounter({
  value,
  prefix = "",
  suffix = "",
  className = "",
  color = "#F7931A",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  color?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
        setTimeout(() => setIsAnimating(false), 300);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <span
      className={`relative inline-block font-bold ${className}`}
      style={{ color }}
    >
      <span className={isAnimating ? "animate-glitch" : ""}>
        {prefix}{displayValue.toLocaleString()}{suffix}
      </span>
      {isAnimating && (
        <span
          className="absolute inset-0 text-white opacity-50"
          style={{
            animation: "glitch-text 0.2s infinite",
          }}
        >
          {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
      )}
    </span>
  );
}

// Success text with celebration
export function SuccessText({ text, active }: { text: string; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="relative"
        >
          <motion.span
            className="text-4xl font-bold text-green-400"
            animate={{
              textShadow: [
                "0 0 10px #22c55e, 0 0 20px #22c55e",
                "0 0 20px #22c55e, 0 0 40px #22c55e",
                "0 0 10px #22c55e, 0 0 20px #22c55e",
              ],
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {text}
          </motion.span>
          
          {/* Checkmark animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute -left-12 top-1/2 -translate-y-1/2"
          >
            <span className="text-4xl">⚡</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Connected status text
export function ConnectedText({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-green-400 font-bold text-sm flex items-center gap-2"
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-400"
            style={{ boxShadow: "0 0 10px #22c55e" }}
          />
          CONNECTED
        </motion.span>
      )}
    </AnimatePresence>
  );
}
