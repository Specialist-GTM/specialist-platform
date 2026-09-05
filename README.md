# Specialist-GTM — Platform

Plataforma SaaS de Tag Management Server-Side e Gateway de Conversões de Alta Performance.

## 🚀 Arquitetura do Monorepo

- `packages/tracker-sdk`: Vanilla TypeScript (<12KB gzipped), despachador resiliente e detecção inteligente.
- `packages/shared-types`: Contratos Zod e tipagens TypeScript compartilhadas.
- `packages/crypto-utils`: Algoritmos SHA-256 e normalização de dados para Advanced Matching.
- `apps/edge-ingestion`: Cloudflare Worker para ingestão de eventos ultra-rápida (<40ms).
- `apps/dispatcher-worker`: Processamento assíncrono e despacho para Meta CAPI, GA4, TikTok e Google Ads.
- `apps/dashboard`: Interface No-Code do Gestor de Tráfego com Live Event Debugger.
- `apps/api`: Backend control plane, multi-tenancy e cofre criptografado de credenciais.
- `infra/terraform`: Gerenciamento de domínios customizados (CNAME 1st-party) e infraestrutura.

Documentação completa de requisitos e SDLC disponível na wiki e issues do repositório.
