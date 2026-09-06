import { extractFormFields } from './field-extractor.js';
import type { ExtractedFormData } from './field-extractor.js';

export class SubmitListener {
  private readonly handleSubmit: (event: SubmitEvent) => void;

  constructor(private readonly onSuccess: (data: ExtractedFormData) => void) {
    this.handleSubmit = (event: SubmitEvent) => {
      this.handleDocumentSubmit(event);
    };
  }

  start(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.addEventListener('submit', this.handleSubmit, true);
  }

  stop(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.removeEventListener('submit', this.handleSubmit, true);
  }

  private handleDocumentSubmit(event: SubmitEvent): void {
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }
    if (target.checkValidity() === false) {
      return;
    }
    this.onSuccess(extractFormFields(target));
  }
}