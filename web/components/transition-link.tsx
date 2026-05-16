"use client"

// Thin re-export so existing imports keep working while we migrate to
// next-view-transitions, which wraps Next's Link with the browser's
// native View Transitions API (smooth cross-fade by default + morphs
// between elements that share `view-transition-name`).
export { Link as TransitionLink } from "next-view-transitions"
