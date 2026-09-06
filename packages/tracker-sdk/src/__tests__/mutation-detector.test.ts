import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MutationDetector } from '../index.js';

describe('MutationDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects a success element added to the DOM', async () => {
    document.body.innerHTML = `<form id="f"></form>`;
    const onSuccess = vi.fn();
    const detector = new MutationDetector(onSuccess);
    detector.start();

    const success = document.createElement('div');
    success.className = 'wpcf7-mail-sent-ok';
    success.textContent = 'Mensagem enviada com sucesso.';
    document.getElementById('f')!.appendChild(success);

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toEqual({
      selector: '.wpcf7-mail-sent-ok',
      text: 'Mensagem enviada com sucesso.',
    });
    detector.stop();
  });

  it('detects a success descendant inside an added element', async () => {
    document.body.innerHTML = `<div id="root"></div>`;
    const onSuccess = vi.fn();
    const detector = new MutationDetector(onSuccess);
    detector.start();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="form-success">Tudo certo</div>`;
    document.getElementById('root')!.appendChild(wrapper);

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0].selector).toBe('.form-success');
    expect(onSuccess.mock.calls[0]![0].text).toBe('Tudo certo');
    detector.stop();
  });

  it('detects when an existing element receives a success class', async () => {
    document.body.innerHTML = `<div id="status" class="w-form">WhatsApp</div>`;
    const onSuccess = vi.fn();
    const detector = new MutationDetector(onSuccess);
    detector.start();

    document.getElementById('status')!.classList.add('form-success');

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0].selector).toBe('.form-success');
    expect(onSuccess.mock.calls[0]![0].text).toBe('WhatsApp');
    detector.stop();
  });

  it('emits once per element even with repeated mutations', async () => {
    document.body.innerHTML = `<div id="root"></div>`;
    const onSuccess = vi.fn();
    const detector = new MutationDetector(onSuccess);
    detector.start();

    const success = document.createElement('div');
    success.className = 'w-form-done';
    const root = document.getElementById('root')!;
    root.appendChild(success);
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    success.className = 'w-form-done outra-classe';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    detector.stop();
  });

  it('ignores unrelated DOM changes', async () => {
    document.body.innerHTML = `<div id="root"></div>`;
    const onSuccess = vi.fn();
    const detector = new MutationDetector(onSuccess);
    detector.start();

    const plain = document.createElement('p');
    plain.textContent = 'qualquer coisa';
    document.getElementById('root')!.appendChild(plain);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onSuccess).not.toHaveBeenCalled();
    detector.stop();
  });
});