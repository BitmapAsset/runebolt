import ClaimPageClient from './ClaimPageClient';

// Generate static params for export
export function generateStaticParams() {
  return [
    { id: 'demo' },
    { id: 'sample' },
  ];
}

export default function ClaimPage() {
  return <ClaimPageClient />;
}
