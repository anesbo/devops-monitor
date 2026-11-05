import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

// JSDOM mock for Element.prototype.scrollIntoView
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}


