import App from '../App';

export default function HomePage() {
  return (
    <>
      <noscript>
        <section
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            padding: '2rem 1.25rem',
            fontFamily: 'sans-serif',
            color: '#e2e8f0',
          }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Portugal 2100 Simulator</h1>
          <p style={{ lineHeight: 1.6, color: '#cbd5e1' }}>
            Explore how fertility, migration, mortality, and retirement policy affect Portugal&apos;s population structure and fiscal pressure from 2026 to 2100.
            This simulator uses INE and Eurostat baseline data and requires JavaScript to run.
          </p>
        </section>
      </noscript>
      <App />
    </>
  );
}
