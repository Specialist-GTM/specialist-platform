import type { TrackEvent } from '@specialist-gtm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tracker } from '../index.js';

function customData(event: TrackEvent): Record<string, unknown> {
  return (event.payload.custom_data ?? {}) as Record<string, unknown>;
}

const trackers: Tracker[] = [];

function newTracker(options: { trackClicks?: boolean } = {}): Tracker {
  const tracker = new Tracker('test-key', options);
  trackers.push(tracker);
  return tracker;
}

function subscribe(tracker: Tracker): TrackEvent[] {
  const events: TrackEvent[] = [];
  tracker.subscribe((event) => events.push(event));
  return events;
}

function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
}

describe('ClickListener', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    trackers.length = 0;
  });

  afterEach(() => {
    for (const tracker of trackers) {
      tracker.stopClickTracking();
    }
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('tracks WhatsAppClick and Contact when a nested element is clicked', () => {
    document.body.innerHTML = `
      <a id="wa" class="cta whats" href="https://wa.me/5511999999999">
        <span>Falar no Whats</span>
      </a>
    `;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.querySelector('#wa span')!);

    const names = events.map((event) => event.payload.event_name);
    expect(names).toEqual(['WhatsAppClick', 'Contact']);

    const whatsEvent = events.find((event) => event.payload.event_name === 'WhatsAppClick');
    const data = customData(whatsEvent!);
    expect(data.contact_type).toBe('whatsapp');
    expect(data.clean_phone).toBe('5511999999999');
    expect(data.url).toBe('https://wa.me/5511999999999');
    expect(data.element_text).toBe('Falar no Whats');
    expect(data.element_id).toBe('wa');
    expect(data.element_classes).toBe('cta whats');
  });

  it('tracks PhoneCallClick for tel links', () => {
    document.body.innerHTML = `<a id="call" href="tel:+5511999999999">Ligar</a>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.getElementById('call')!);

    expect(events.map((event) => event.payload.event_name)).toEqual(['PhoneCallClick', 'Contact']);
    expect(customData(events[0]!).clean_phone).toBe('5511999999999');
  });

  it('tracks EmailClick for mailto links with subject and body', () => {
    document.body.innerHTML = `<a href="mailto:comercial@empresa.com.br?subject=Duvida%20de%20produto">Email</a>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.querySelector('a')!);

    expect(events.map((event) => event.payload.event_name)).toEqual(['EmailClick', 'Contact']);
    const data = customData(events[0]!);
    expect(data.email).toBe('comercial@empresa.com.br');
    expect(data.subject).toBe('Duvida de produto');
  });

  it('ignores normal links', () => {
    document.body.innerHTML = `<a href="/politica-de-privacidade">Privacy</a>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.querySelector('a')!);
    expect(events).toHaveLength(0);
  });

  it('supports button[data-href]', () => {
    document.body.innerHTML = `<button id="btn" data-href="https://wa.me/5521988887777">Whats</button>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.getElementById('btn')!);

    expect(events.map((event) => event.payload.event_name)).toEqual(['WhatsAppClick', 'Contact']);
  });

  it('supports [data-sgtm-click] markers', () => {
    document.body.innerHTML = `<div id="dsc" data-sgtm-click="whatsapp://send?phone=5531977776666">Chat</div>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.getElementById('dsc')!);

    expect(events.map((event) => event.payload.event_name)).toEqual(['WhatsAppClick', 'Contact']);
  });

  it('handles clicks on nested svg elements', () => {
    document.body.innerHTML = `
      <a id="svgWa" href="https://wa.me/5511999999999"><svg><path /></svg></a>
    `;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.querySelector('#svgWa path')!);
    expect(events.map((event) => event.payload.event_name)).toEqual(['WhatsAppClick', 'Contact']);
  });

  it('deduplicates rapid repeated clicks', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<a id="wa" href="https://wa.me/5511999999999">Whats</a>`;
    const tracker = newTracker();
    const events = subscribe(tracker);
    const link = document.getElementById('wa')!;

    click(link);
    click(link);
    click(link);
    expect(events).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    click(link);
    expect(events).toHaveLength(4);
  });

  it('does not deduplicate different contact destinations', () => {
    document.body.innerHTML = `
      <a id="wa" href="https://wa.me/5521988887777">Whats</a>
      <a id="call" href="tel:+5511999999999">Ligar</a>
    `;
    const tracker = newTracker();
    const events = subscribe(tracker);
    click(document.getElementById('wa')!);
    click(document.getElementById('call')!);

    expect(events.map((event) => event.payload.event_name)).toEqual([
      'WhatsAppClick',
      'Contact',
      'PhoneCallClick',
      'Contact',
    ]);
  });

  it('does not track clicks when trackClicks is disabled', () => {
    document.body.innerHTML = `<a href="https://wa.me/5511999999999">Whats</a>`;
    const tracker = newTracker({ trackClicks: false });
    const events = subscribe(tracker);
    const link = document.querySelector('a')!;

    click(link);
    expect(events).toHaveLength(0);

    tracker.startClickTracking();
    click(link);
    expect(events).toHaveLength(2);
  });
});