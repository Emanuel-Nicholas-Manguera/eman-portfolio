const paths: Record<string, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  user: 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  work: 'M8 6V3h8v3M3 6h18v14H3zM3 11l9 4 9-4',
  layers: 'm12 3 10 5-10 5L2 8zm-10 10 10 5 10-5M2 18l10 5 10-5',
  education: 'm2 8 10-5 10 5-10 5zm4 3v6q6 5 12 0v-6M22 8v9',
  mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
  media: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M8 7h.01',
  arrow: 'M7 17 17 7M7 7h10v10',
  up: 'M12 19V5m-6 6 6-6 6 6',
  down: 'M12 5v14m-6-6 6 6 6-6',
  left: 'M19 12H5m6-6-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
  save: 'M5 3h12l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  archive: 'M3 3h18v5H3zM5 8v13h14V8M10 12h4',
  right: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  logout: 'M9 3H3v18h6m6-15 6 6-6 6M8 12h13',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
}
export function AdminIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.layers} />
    </svg>
  )
}

