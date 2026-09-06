import type { ExtractedFormData, FormDetectionSource } from './field-extractor.js';
import { FetchInterceptor } from './fetch-interceptor.js';
import { EMPTY_FIELDS_FINGERPRINT, FormDeduplicator } from './form-deduplicator.js';
import { MutationDetector } from './mutation-detector.js';
import type { MutationSuccessDetails } from './mutation-detector.js';
import { SubmitListener } from './submit-listener.js';
import { checkThankYouPage } from './thank-you-detector.js';
import { XhrInterceptor } from './xhr-interceptor.js';

export interface FormSubmission extends ExtractedFormData {
  source: FormDetectionSource;
  selector?: string;
  message?: string;
  pattern?: string;
}

export class FormManager {
  private readonly deduplicator = new FormDeduplicator();
  private readonly submitListener = new SubmitListener((data) => this.handleFields(data, 'submit'));
  private readonly fetchInterceptor = new FetchInterceptor((data) => this.handleFields(data, 'fetch'));
  private readonly xhrInterceptor = new XhrInterceptor((data) => this.handleFields(data, 'xhr'));
  private readonly mutationDetector = new MutationDetector((details) => this.handleConfirmation(details));
  private started = false;
  private thankYouChecked = false;

  constructor(private readonly onSubmission: (submission: FormSubmission) => void) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.submitListener.start();
    this.fetchInterceptor.start();
    this.xhrInterceptor.start();
    this.mutationDetector.start();
    this.checkThankYou();
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.submitListener.stop();
    this.fetchInterceptor.stop();
    this.xhrInterceptor.stop();
    this.mutationDetector.stop();
  }

  private handleFields(data: ExtractedFormData, source: FormDetectionSource): void {
    if (source === 'mutation' || source === 'thank_you') {
      return;
    }
    if (this.deduplicator.isDuplicate(this.deduplicator.fingerprintFor(data.fields))) {
      return;
    }
    this.emit({ ...data, source });
  }

  private handleConfirmation(details: MutationSuccessDetails): void {
    if (this.deduplicator.isDuplicate(EMPTY_FIELDS_FINGERPRINT)) {
      return;
    }
    this.emit({ fields: {}, source: 'mutation', selector: details.selector, message: details.text });
  }

  private checkThankYou(): void {
    if (this.thankYouChecked) {
      return;
    }
    this.thankYouChecked = true;
    if (typeof location === 'undefined') {
      return;
    }
    const detection = checkThankYouPage(location.href);
    if (!detection.isThankYou) {
      return;
    }
    if (this.deduplicator.isDuplicate(EMPTY_FIELDS_FINGERPRINT)) {
      return;
    }
    this.emit({ fields: {}, source: 'thank_you', pattern: detection.pattern });
  }

  private emit(submission: FormSubmission): void {
    this.onSubmission(submission);
  }
}