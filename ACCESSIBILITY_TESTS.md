# Accessibility Testing Protocol

This project targets **WCAG 2.1 Level AA compliance**.

Accessibility testing should be performed before major releases or semester launches.

---

## 1. Automated Testing

Run:

- **Lighthouse** Accessibility audit (Chrome DevTools → Lighthouse tab)
- **axe DevTools** browser extension

Pass criteria:

- No "critical" or "serious" accessibility violations.

---

## 2. Keyboard Navigation Test

Using **keyboard only** (no mouse):

### Global Navigation

1. Tab into the page
2. Focus lands on **Skip to main content** link
3. Press Enter
4. Focus moves to `<main>`

### Account Menu

1. Tab to account button
2. Press Enter — menu opens
3. Arrow keys navigate menu items
4. Escape closes menu
5. Focus returns to trigger button

### AI Tutor Panel

1. Tab to floating tutor button
2. Press Enter — tutor panel opens
3. Focus moves to message input
4. Escape closes panel
5. Focus returns to floating button

---

## 3. Screen Reader Smoke Test

Test with **NVDA** (Windows) or **VoiceOver** (macOS).

Verify:

- Page title is announced
- Skip link works
- Landmarks appear in the rotor/landmark navigation
- Form inputs announce labels
- Tutor responses trigger live region announcements

---

## 4. Form Validation

Verify:

- Errors include text (not just color)
- Invalid inputs include `aria-invalid="true"`
- Errors are linked via `aria-describedby`
- Submission errors move focus to the first error

Test pages:

- Onboarding modal
- Quiz component
- KnowledgeCheck component
- InstructorDashboard grade override
- Telemetry override modal

---

## 5. Zoom and Reflow

Test at **200% browser zoom** (Ctrl+= in Chrome/Edge).

Pass criteria:

- Main learning content does not require horizontal scrolling
- Code blocks may scroll horizontally (in their own scroll container)
- Sidebar remains usable or collapses correctly

---

## 6. Reduced Motion

Enable OS reduced motion setting:

- **Windows**: Settings → Accessibility → Visual Effects → Animation Effects → Off
- **macOS**: System Preferences → Accessibility → Display → Reduce motion

Verify:

- Animations stop (pulse, bounce, scan, blink)
- Transitions are effectively instant
- Smooth scrolling is disabled

---

## 7. Images and Diagrams

Verify:

- All informative images have descriptive `alt` text
- Decorative images use `alt=""` or `aria-hidden="true"`
- Complex diagrams have a **text version** in a `<details>` disclosure

Test pages:

- Week 01 lesson 1 — CLR and BCL architecture diagrams
- Week 02 section 2 — CPU architecture diagram
- Week 06 — Decision Engine flowchart
- Week 07 section 2 — AND/OR short-circuit evaluation diagrams
- Week 07 section 3 — NOT, AND, OR truth table diagrams

---

## 8. Manual Visual Review

Verify:

- Links are underlined or otherwise not identified by color alone
- Focus indicators are visible on all interactive elements
- Input borders meet contrast requirements (3:1 minimum)
- Error messages use text + icon, not just color
- Disabled text remains readable

---

## Testing Frequency

Run the full accessibility test:

- Before semester launches
- Before major UI changes
- Before releasing new interactive components

---

## Coverage Summary

| WCAG Area | Implementation |
|---|---|
| Skip navigation | Skip-to-content link on every page |
| Landmarks | `<header>`, `<nav>`, `<main>`, `<footer>` with roles |
| Heading structure | Logical h1→h2→h3 hierarchy |
| Accessible names | All controls labeled via `aria-label` or visible text |
| Keyboard access | Full keyboard navigation, Escape to close, arrow keys in menus |
| ARIA live regions | Dynamic tutor responses, error messages announced |
| Color contrast | All text meets 4.5:1, UI components meet 3:1 |
| Non-text content | Alt text on images, aria-hidden on decorative elements |
| Diagram alternatives | `<details>` text versions for complex diagrams |
| Form validation | `aria-invalid`, `aria-describedby`, `role="alert"`, focus management |
| Zoom/reflow | Content reflows at 200% zoom, no horizontal scroll |
| Reduced motion | Global `prefers-reduced-motion` disables all animations |
| Reading order | DOM order matches visual order (no CSS reordering) |
