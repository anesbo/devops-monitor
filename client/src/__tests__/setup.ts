import '@testing-library/jest-dom';

// JSDOM mock for Element.prototype.scrollIntoView
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}

