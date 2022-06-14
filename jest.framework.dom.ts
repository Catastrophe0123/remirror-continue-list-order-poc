import { jsdomPolyfill, remirrorMatchers } from 'jest-remirror';
import { prosemirrorMatchers } from 'jest-prosemirror';
/* Add jest-remirror assertions */
expect.extend(remirrorMatchers);

expect.extend(prosemirrorMatchers);

/* Polyfills for jsdom */
jsdomPolyfill();
