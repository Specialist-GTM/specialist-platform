export class ClickDeduplicator {
  private readonly windowMs: number;
  private readonly byDestination = new Map<string, number>();
  private readonly byElement = new WeakMap<Element, number>();

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  isDuplicate(destination: string, element: Element): boolean {
    const now = Date.now();
    const elementLast = this.byElement.get(element);
    const destinationLast = this.byDestination.get(destination);
    const last = Math.max(elementLast ?? -Infinity, destinationLast ?? -Infinity);
    if (now - last < this.windowMs) {
      return true;
    }
    this.byElement.set(element, now);
    this.byDestination.set(destination, now);
    return false;
  }

  reset(): void {
    this.byDestination.clear();
  }
}