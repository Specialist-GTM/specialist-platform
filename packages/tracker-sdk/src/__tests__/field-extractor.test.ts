import { beforeEach, describe, expect, it } from 'vitest';

import { extractFormFields } from '../index.js';

describe('extractFormFields', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts fields and contact data from an HTML form', () => {
    document.body.innerHTML = `
      <form id="form-lead" name="contato" action="/api/lead">
        <input type="text" id="nome" name="nome" value="João Silva" />
        <input type="email" id="email" name="email" value="joao@exemplo.com" />
        <input type="tel" id="telefone" name="telefone" value="(11) 99999-9999" />
        <input type="password" id="senha" name="senha" value="segredo" />
        <input type="submit" name="enviar" value="Enviar" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('form')!;
    const data = extractFormFields(form);

    expect(data.formId).toBe('form-lead');
    expect(data.formName).toBe('contato');
    expect(data.formAction).toContain('/api/lead');
    expect(data.fields).toEqual({
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      telefone: '(11) 99999-9999',
    });
    expect(data.email).toBe('joao@exemplo.com');
    expect(data.phone).toBe('11999999999');
    expect(data.name).toBe('João Silva');
  });

  it('skips sensitive, disabled and control-only fields', () => {
    document.body.innerHTML = `
      <form>
        <input name="email" value="ana@exemplo.com" />
        <input name="cartao" value="4111111111111111" />
        <input name="cvv" value="123" />
        <input name="desativado" value="x" disabled />
        <input type="reset" name="limpar" value="Limpar" />
        <button type="button" name="botao" value="b">B</button>
      </form>
    `;
    const data = extractFormFields(document.querySelector<HTMLFormElement>('form')!);
    expect(data.fields).toEqual({ email: 'ana@exemplo.com' });
  });

  it('includes checked checkboxes and radio buttons', () => {
    document.body.innerHTML = `
      <form>
        <input type="checkbox" name="news" value="sim" checked />
        <input type="checkbox" name="promo" value="sim" />
        <input type="radio" name="interesse" value="plano" checked />
        <input type="radio" name="interesse" value="duvida" />
      </form>
    `;
    const data = extractFormFields(document.querySelector<HTMLFormElement>('form')!);
    expect(data.fields).toEqual({ news: 'sim', interesse: 'plano' });
  });

  it('uses the element id when the field has no name', () => {
    document.body.innerHTML = `
      <form>
        <input id="somente-id" value="ok" />
      </form>
    `;
    const data = extractFormFields(document.querySelector<HTMLFormElement>('form')!);
    expect(data.fields).toEqual({ 'somente-id': 'ok' });
  });

  it('extracts fields from FormData', () => {
    const formData = new FormData();
    formData.append('nome', 'Maria');
    formData.append('email', 'maria@exemplo.com');
    formData.append('telefone', '11988887777');
    formData.append('senha', 'secret');

    const data = extractFormFields(formData);
    expect(data.fields).toEqual({
      nome: 'Maria',
      email: 'maria@exemplo.com',
      telefone: '11988887777',
    });
    expect(data.email).toBe('maria@exemplo.com');
    expect(data.phone).toBe('11988887777');
    expect(data.name).toBe('Maria');
  });

  it('extracts fields from a plain object, ignoring nullish and sensitive values', () => {
    const data = extractFormFields({
      email: 'contato@exemplo.com',
      telefone: '5521988776655',
      vazio: '',
      nulo: null,
      token: 'abc123',
      senha: 'x',
    });
    expect(data.fields).toEqual({ email: 'contato@exemplo.com', telefone: '5521988776655' });
    expect(data.phone).toBe('5521988776655');
  });

  it('does not guess contact data when fields do not match', () => {
    const data = extractFormFields({ mensagem: 'Olá', assunto: 'Orçamento' });
    expect(data.fields).toEqual({ mensagem: 'Olá', assunto: 'Orçamento' });
    expect(data.email).toBeUndefined();
    expect(data.phone).toBeUndefined();
    expect(data.name).toBeUndefined();
  });
});