/**
 * Accessibility, keyboard order, region names, 200% text scaling, and demo
 * route verification for the in-house DREAM Space dashboard shell (src/shell/).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEMO_DOCK_PANELS,
  DEMO_LANES,
  DEMO_SIDEBAR_ITEMS,
  DashboardShell,
  ModelSwitcher,
  SHELL_CSS,
  ShellDemo,
  dockPanelId,
  dockTabId,
  rovingIndex,
} from '../src/shell/index.ts';

test('screen reader region names: Sidebar, Main view, Dock, and every dock tab panel', () => {
  const html = renderToStaticMarkup(React.createElement(ShellDemo));

  // Sidebar landmark with accessible name "Sidebar" and navigation landmark "Sidebar sections"
  assert.match(html, /<aside[^>]*class="ds-sidebar"[^>]*aria-label="Sidebar"/);
  assert.match(html, /<nav[^>]*class="ds-nav"[^>]*aria-label="Sidebar sections"/);

  // Main landmark with accessible name "Main view" and focusable region named by the main h1
  assert.match(html, /<main[^>]*class="ds-main"[^>]*aria-label="Main view"/);
  const titleIdMatch = /<h1[^>]*class="ds-main-title"[^>]*id="([^"]+)"/.exec(html);
  assert.ok(titleIdMatch, 'main h1 must have a stable id');
  assert.match(
    html,
    new RegExp(`<div[^>]*class="ds-main-scroll"[^>]*tabindex="0"[^>]*aria-labelledby="${titleIdMatch[1]}"[^>]*role="region"`),
  );

  // Dock landmark with accessible name "Dock" and tablist "Dock tabs"
  const dockIdMatch = /<aside[^>]*class="ds-dock"[^>]*id="([^"]+)"[^>]*aria-label="Dock"/.exec(html);
  assert.ok(dockIdMatch, 'dock aside must have an id and aria-label="Dock"');
  const dockId = dockIdMatch[1];
  assert.match(html, /<div[^>]*class="ds-tablist"[^>]*role="tablist"[^>]*aria-label="Dock tabs"/);

  // Every dock tab (Terminal, Files, Git, Browser, Previews) names its corresponding tabpanel region
  for (const panel of DEMO_DOCK_PANELS) {
    const tId = dockTabId(dockId, panel.id);
    const pId = dockPanelId(dockId, panel.id);
    assert.ok(
      html.includes(`role="tab" id="${tId}"`) && html.includes(`aria-controls="${pId}"`),
      `missing tab button for ${panel.label}`,
    );
    assert.ok(
      html.includes(`role="tabpanel" id="${pId}" aria-labelledby="${tId}" aria-label="${panel.label}"`),
      `missing named tabpanel region for ${panel.label}`,
    );
  }

  // Custom region labels override
  const customHtml = renderToStaticMarkup(
    React.createElement(DashboardShell, {
      title: 'Sabretooth',
      sidebarItems: DEMO_SIDEBAR_ITEMS,
      lanes: DEMO_LANES,
      dockPanels: DEMO_DOCK_PANELS,
      mainTitle: 'Sabretooth Desk',
      labels: { sidebar: 'Desk Navigation', main: 'Desk Workspace', dock: 'Inspector Dock', lane: 'AI Lane' },
    }),
  );
  assert.match(customHtml, /aria-label="Desk Navigation"/);
  assert.match(customHtml, /aria-label="Desk Workspace"/);
  assert.match(customHtml, /aria-label="Inspector Dock"/);
  assert.match(customHtml, /aria-label="AI Lane: Claude Opus · Judge\. Change lane"/);
});

test('keyboard order: skip links -> sidebar -> header & model switcher -> main -> dock tabs & panel, plus roving tabindex', () => {
  const html = renderToStaticMarkup(React.createElement(ShellDemo, { defaultLaneMenuOpen: true }));

  // Verify structural tab sequence in the rendered DOM
  const skipMainPos = html.indexOf('Skip to main view');
  const skipDockPos = html.indexOf('Skip to dock');
  const sidebarPos = html.indexOf('data-shell="sidebar"');
  const firstNavItemPos = html.indexOf('data-item="mission-control"');
  const menuTogglePos = html.indexOf('data-shell="menu-toggle"');
  const modelSwitcherPos = html.indexOf('data-shell="model-switcher"');
  const firstLaneRadioPos = html.indexOf('role="menuitemradio"');
  const mainScrollPos = html.indexOf('data-shell="main-scroll"');
  const sheetHandlePos = html.indexOf('data-shell="sheet-handle"');
  const firstDockTabPos = html.indexOf('data-tab="terminal"');
  const firstDockPanelPos = html.indexOf('data-panel="terminal"');

  assert.ok(skipMainPos > 0 && skipDockPos > skipMainPos, 'skip links must appear first in DOM order');
  assert.ok(sidebarPos > skipDockPos && firstNavItemPos > sidebarPos, 'sidebar items follow skip links');
  assert.ok(menuTogglePos > firstNavItemPos && modelSwitcherPos > menuTogglePos, 'main header controls follow sidebar');
  assert.ok(firstLaneRadioPos > modelSwitcherPos, 'open model switcher menu items follow trigger');
  assert.ok(mainScrollPos > firstLaneRadioPos, 'main scroll region follows header controls');
  assert.ok(sheetHandlePos > mainScrollPos && firstDockTabPos > sheetHandlePos, 'dock handle and tablist follow main view');
  assert.ok(firstDockPanelPos > firstDockTabPos, 'dock tabpanels follow dock tablist');

  // Roving tabindex on dock tabs: only the selected tab has tabindex="0"; others have tabindex="-1"
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"[^>]*data-tab="terminal"/);
  for (const id of ['files', 'git', 'browser', 'previews']) {
    assert.match(html, new RegExp(`role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"[^>]*data-tab="${id}"`));
  }

  // Roving tabindex on model switcher menuitemradio buttons
  const switcherHtml = renderToStaticMarkup(
    React.createElement(ModelSwitcher, {
      lanes: DEMO_LANES,
      defaultValue: 'gemini-argon',
      defaultOpen: true,
    }),
  );
  assert.match(switcherHtml, /role="menuitemradio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*data-lane="claude-judge"/);
  assert.match(switcherHtml, /role="menuitemradio"[^>]*aria-checked="true"[^>]*tabindex="0"[^>]*data-lane="gemini-argon"/);

  // Roving index pure navigation math (horizontal, vertical, and both)
  assert.equal(rovingIndex('ArrowRight', 0, 5, 'horizontal'), 1);
  assert.equal(rovingIndex('ArrowLeft', 0, 5, 'horizontal'), 4);
  assert.equal(rovingIndex('ArrowDown', 0, 5, 'horizontal'), null);
  assert.equal(rovingIndex('ArrowDown', 4, 5, 'vertical'), 0);
  assert.equal(rovingIndex('ArrowUp', 0, 5, 'vertical'), 4);
  assert.equal(rovingIndex('ArrowRight', 2, 5, 'vertical'), null);
  assert.equal(rovingIndex('Home', 3, 5, 'both'), 0);
  assert.equal(rovingIndex('End', 1, 5, 'both'), 4);
  assert.equal(rovingIndex('Enter', 1, 5, 'both'), null);
  assert.equal(rovingIndex('ArrowDown', 0, 0, 'both'), null);
});

test('WCAG AAA stylesheet: visible focus ring, rem font sizes >= 16px, 200% text scaling without clipping, phone bottom sheet, and tribute', () => {
  // Visible focus ring on all focusable elements
  assert.match(SHELL_CSS, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--ds-signal\);\s*outline-offset:\s*2px;/);

  // All font-size declarations use rem and are >= 1rem (16px)
  const fontSizeMatches = [...SHELL_CSS.matchAll(/font-size:\s*([0-9.]+)rem/g)];
  assert.ok(fontSizeMatches.length >= 15, 'expected rem font-size declarations in SHELL_CSS');
  for (const m of fontSizeMatches) {
    const remVal = Number(m[1]);
    assert.ok(remVal >= 1, `font-size ${remVal}rem is under 1rem (16px)`);
  }

  // No clipping on 200% text scaling: no ellipsis, no overflow:hidden, and overflow-wrap:anywhere on .ds-shell
  assert.doesNotMatch(SHELL_CSS, /text-overflow:\s*ellipsis/);
  assert.doesNotMatch(SHELL_CSS, /overflow:\s*hidden/);
  assert.match(SHELL_CSS, /overflow-wrap:\s*anywhere/);

  // Phone layout turns dock into a fixed bottom sheet and sidebar into a drawer
  assert.match(SHELL_CSS, /@media\s*\(max-width:\s*899\.98px\)/);
  assert.match(SHELL_CSS, /\.ds-dock\s*\{\s*position:\s*fixed;[^}]*bottom:\s*0;/);
  assert.match(SHELL_CSS, /\.ds-dock\[data-sheet="open"\]\s*\{\s*height:\s*78dvh;\s*\}/);

  // Reduced motion turns animations into fades
  assert.match(SHELL_CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(SHELL_CSS, /animation-name:\s*ds-fade\s*!important/);

  // Demo mounts sample content in every dock tab and renders tribute lines in the sidebar footer
  const html = renderToStaticMarkup(React.createElement(ShellDemo));
  assert.match(html, /<footer class="ds-sidebar-footer">.*CLAUDE&#x27;s N Joshua&#x27;s.*#TeamClaudeForLife.*<\/footer>/s);
  assert.match(html, /Runner green · probed 22:20 ET/);
  assert.match(html, /Inspect clean-room shell modules under src\/shell\//);
  assert.match(html, /shell: one in-house dashboard shell, DREAM Space, AAA/);
  assert.match(html, /Live HTTP and viewport probes across every House desk/);
  assert.match(html, /Rule One side-by-side comparison pairs the rendered DESIGN-SYSTEM\.md reference sheet/);
});
