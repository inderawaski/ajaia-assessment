const paths = {
  back: "M19 12H5m7 7-7-7 7-7",
  rename: "m14 6 4 4M4 20l4-.8L20 7l-4-4L4 15z",
  bold: "M7 12h7a4 4 0 0 1 0 8H7zm0 0V4h6a4 4 0 0 1 0 8",
  italic: "M10 4h10M4 20h10m1-16L9 20",
  underline: "M6 4v8a6 6 0 0 0 12 0V4M4 21h16",
  heading: "M5 4v16M19 4v16M5 12h14",
  bullets: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  numbered: "M10 6h10m-10 6h10m-10 6h10M4 4l2-1v6M4 14a2 2 0 1 1 3 2l-3 4h4",
  reload: "M20 4v6h-6m6 0a8 8 0 1 0 0 5",
  copy: "M9 9h11v12H9zM5 16H4V3h12v2",
  remove: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13m-8 4v5m4-5v5",
} as const;

export function DocumentIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
