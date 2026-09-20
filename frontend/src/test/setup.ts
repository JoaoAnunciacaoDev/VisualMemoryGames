import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
  configurable: true,
  value(this: HTMLFormElement, submitter?: HTMLElement) {
    this.dispatchEvent(new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
      submitter: submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
        ? submitter
        : null,
    }));
  },
});

document.addEventListener('click', (event) => {
  const submitter = event.target instanceof Element
    ? event.target.closest<HTMLButtonElement | HTMLInputElement>('button, input')
    : null;
  if (!submitter || submitter.type !== 'submit' || !submitter.form || event.defaultPrevented) return;

  event.preventDefault();
  submitter.form.requestSubmit(submitter);
}, true);
