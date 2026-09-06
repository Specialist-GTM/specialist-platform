export interface MutationSuccessDetails {
  selector: string;
  text: string;
}

export const SUCCESS_SELECTORS = [
  '.elementor-message-success',
  '.wpcf7-mail-sent-ok',
  '.w-form-done',
  '.form-success',
  '.submitted-message',
  '[data-form-success]',
] as const;

export class MutationDetector {
  private observer: MutationObserver | null = null;
  private readonly handled = new WeakSet<Element>();

  constructor(private readonly onSuccess: (details: MutationSuccessDetails) => void) {}

  start(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }
    if (this.observer !== null) {
      return;
    }
    const root = document.body ?? document.documentElement;
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  stop(): void {
    if (this.observer === null) {
      return;
    }
    this.observer.disconnect();
    this.observer = null;
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          this.checkElement(node);
        }
      }
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        this.checkElement(mutation.target);
      }
    }
  }

  private checkElement(element: Element): void {
    if (this.handled.has(element)) {
      return;
    }
    const match = this.matchSuccessSelector(element);
    if (match === null) {
      return;
    }
    this.handled.add(element);
    this.onSuccess(match);
  }

  private matchSuccessSelector(element: Element): MutationSuccessDetails | null {
    for (const selector of SUCCESS_SELECTORS) {
      if (element.matches(selector)) {
        return { selector, text: (element.textContent ?? '').trim() };
      }
    }
    for (const selector of SUCCESS_SELECTORS) {
      const descendant = element.querySelector(selector);
      if (descendant !== null) {
        return { selector, text: (descendant.textContent ?? '').trim() };
      }
    }
    return null;
  }
}