import { PLATFORM_VERSION } from '@specialist-gtm/shared-types';

export default function Home() {
  return (
    <main>
      <h1>Specialist GTM Dashboard</h1>
      <p>Versão da plataforma: {PLATFORM_VERSION}</p>
    </main>
  );
}
