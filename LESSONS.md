# LESSONS.md — WaterTank v2 Redesign
# Append an entry here after every completed task.
# Format:
#   ## TASK-NNN: Title
#   - Tricky: what was unexpectedly complex
#   - Learned: key insight for future tasks
#   - Deviation: what differed from the spec (or "none")

## TASK-030: Update color palette — PennyWise-inspired dark theme
- Tricky: 
- Learned: 
- Deviation: none

## TASK-031: Create i18n translations file
- Tricky: 
- Learned: 
- Deviation: none

## TASK-032: Create LanguageContext
- Tricky: 
- Learned: 
- Deviation: none

## TASK-033: Update Event model labels and add HIDDEN_EVENT_TYPES
- Tricky: 
- Learned: 
- Deviation: none

## TASK-034: Update formatters (12-hour time, no decimals)
- Tricky: 
- Learned: 
- Deviation: none

## TASK-035: Create WaterTankWidget component (SVG cylinder)
- Tricky: 
- Learned: 
- Deviation: none

## TASK-036: Update StatusDot to use translations
- Tricky: 
- Learned: 
- Deviation: none

## TASK-037: Update EventRow — hide BLE_SYNCED, 12h time, rounded tank%
- Tricky: 
- Learned: 
- Deviation: none

## TASK-038: Create combined Records screen
- Tricky: 
- Learned: 
- Deviation: none

## TASK-039: Update Dashboard — WaterTankWidget, friendly labels, remove Pump State card
- Tricky: 
- Learned: 
- Deviation: none

## TASK-040: Update Settings — language picker, hide DEBUG, friendly labels
- Tricky: 
- Learned: 
- Deviation: none

## TASK-041: Reduce to 3 tabs and delete old tab files
- Tricky: 
- Learned: 
- Deviation: none

## TASK-042: Create Onboarding screen
- Tricky: 
- Learned: 
- Deviation: none

## TASK-043: Wire onboarding gate and LanguageProvider into root layout
- Tricky: 
- Learned: 
- Deviation: none

## TASK-044 through TASK-062: v3 redesign (full Sonnet pass)
- Learned: ollama-27b via aider is too slow for large message tasks (TASK-044's message was ~7KB). Killed runner, switched to Sonnet direct.
- Learned: `Translator = (key: string) => string` conflicts with LanguageContext `t: (key: keyof Translations) => string`. Fix: import Translations type and use `keyof Translations` in all Translator type definitions.
- Learned: expo-notifications scheduleNotificationAsync trigger:null works fine for immediate; no need for null cast.
- Learned: formatters.ts importing `type { Translations }` from i18n creates a circular-ish dep at type level only — it's fine at runtime.
- Deviation: TASK-049, 050, 051 absorbed into Sonnet TASK-055/056/settings rewrite (combined to avoid merge conflicts).

## TASK-064: Groww-style bottom tab bar — height, border, no shadow
- Tricky: 
- Learned: 
- Deviation: none

## TASK-066: Add "Try Demo" button to Dashboard disconnected state
- Tricky: 
- Learned: 
- Deviation: none

## TASK-067: Onboarding swipe navigation via pagingEnabled ScrollView
- Tricky: 
- Learned: 
- Deviation: none

## v5 release — Reanimated bridgeless crash fix
- Tricky: `useAnimatedStyle` and `useAnimatedProps` both crash at module load time in RN 0.76 bridgeless mode with `TypeError: Object is not a function` on the UI thread worklet. ErrorBoundary cannot catch it — the JS runtime dies before render.
- Learned: In RN 0.76 bridgeless (default), ALL Reanimated worklets are registered at module load — even from unrendered components. Built-in `Animated` API with `useNativeDriver: true` is safe. Fix: PulsingDots → `Animated.Value`/`Animated.loop`/`Animated.sequence`; WaterTankWidget → `useState`+`setInterval` interpolation (30 steps × 20ms).
- Deviation: WaterTankWidget no longer uses SVG AnimatedRect/AnimatedEllipse — uses plain `Rect`/`Path` driven by state interpolation instead.
