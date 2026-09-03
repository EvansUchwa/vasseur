"use client";

import { useEffect } from "react";

/**
 * Reproduces the two behaviors the design tool baked into the mockups:
 *
 *  1. `data-hover` attributes (converted from the maquettes' `style-hover`)
 *     apply their declarations while the pointer is over the element, exactly
 *     like the design runtime did by mutating the inline style.
 *  2. Quote forms (`<form data-quote-form>`) intercept submit, keep the page
 *     put and swap the submit button to the “sent” state, matching the
 *     mockups' onSubmit handler.
 */
export default function SiteBehavior() {
  useEffect(() => {
    const previous = new WeakMap<HTMLElement, Map<string, string | null>>();
    let current: HTMLElement | null = null;

    const parseDeclarations = (hover: string) => {
      const out: Array<[string, string]> = [];
      for (const decl of hover.split(";")) {
        const sep = decl.indexOf(":");
        if (sep < 0) continue;
        const prop = decl.slice(0, sep).trim();
        const value = decl.slice(sep + 1).trim();
        if (prop && value) out.push([prop, value]);
      }
      return out;
    };

    const applyHover = (el: HTMLElement) => {
      const stored = new Map<string, string | null>();
      for (const [prop, value] of parseDeclarations(
        el.getAttribute("data-hover") || "",
      )) {
        stored.set(prop, el.style.getPropertyValue(prop));
        el.style.setProperty(prop, value);
      }
      previous.set(el, stored);
    };

    const clearHover = (el: HTMLElement) => {
      const stored = previous.get(el);
      if (!stored) return;
      for (const [prop, value] of stored) {
        if (value) el.style.setProperty(prop, value);
        else el.style.removeProperty(prop);
      }
      previous.delete(el);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[data-hover]") as HTMLElement | null;
      if (el === current) return;
      if (current) clearHover(current);
      current = el;
      if (el) applyHover(el);
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!current) return;
      const next = e.relatedTarget as Node | null;
      if (!next || !current.contains(next)) {
        clearHover(current);
        current = null;
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form?.hasAttribute?.("data-quote-form")) return;
      e.preventDefault();
      const button = form.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      if (button) {
        button.textContent = "Demande envoyée — Julien vous rappelle";
        button.style.background = "#0061C6";
      }
    };

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("submit", onSubmit);
      if (current) {
        clearHover(current);
        current = null;
      }
    };
  }, []);

  return null;
}
