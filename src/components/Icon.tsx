const paths = {
  dough: "M3 15c0-5 4-9 9-9s9 4 9 9c0 4-18 4-18 0Zm5-4 1-1m5 0 1 1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  evening: "M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14m-10 4h1m4 0h1m-6 3h1",
  arrow: "M4 12h16m-6-6 6 6-6 6",
} as const;
export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
