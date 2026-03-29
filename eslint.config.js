// ESLint v9 flat config — Grandpa's Creative Universe
// Vanilla JS, ES modules, no frameworks.

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    // Apply to all JS source files; ignore generated/vendor directories
    files: ['**/*.js'],
    ignores: [
      'node_modules/**',
      'ios/**',
      'dist/**',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window:        'readonly',
        document:      'readonly',
        navigator:     'readonly',
        console:       'readonly',
        setTimeout:    'readonly',
        clearTimeout:  'readonly',
        setInterval:   'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame:  'readonly',
        HTMLElement:   'readonly',
        Event:         'readonly',
        CustomEvent:   'readonly',
        Image:         'readonly',
        Audio:         'readonly',
        AudioContext:  'readonly',
        fetch:         'readonly',
        URL:           'readonly',
        Map:           'readonly',
        Set:           'readonly',
        Promise:       'readonly',
        performance:   'readonly',
        localStorage:  'readonly',
        sessionStorage:'readonly',
        location:      'readonly',
        history:       'readonly',
        getComputedStyle: 'readonly',
        matchMedia:    'readonly',
        Worker:        'readonly',
        crypto:        'readonly',
        atob:          'readonly',
        btoa:          'readonly',
        MutationObserver:    'readonly',
        ResizeObserver:      'readonly',
        IntersectionObserver:'readonly',
        SpeechSynthesisUtterance: 'readonly',
        speechSynthesis: 'readonly',
      },
    },
    rules: {
      // ── Errors ───────────────────────────────────────────────────────────
      'no-undef':            'error',
      'no-unused-vars':      ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-var':              'error',

      // ── Warnings (style) ─────────────────────────────────────────────────
      'prefer-const':        'warn',
      'eqeqeq':              ['warn', 'always', { null: 'ignore' }],
      'no-console':          'off',    // console.log is fine in this codebase

      // ── Off — patterns used intentionally in GCU ─────────────────────────
      'no-unused-expressions': 'off',  // element.offsetHeight triggers reflow intentionally
    },
  },
];
