const paths = {
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  system: "M3 4h18v13H3Zm9 13v4m-5 0h10",
  home: "m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10",
  pizza: "M5 3c6-1 13 3 16 8L6 22 3 6ZM5 7c5 0 9 2 12 5M8 11h.01M7 16h.01M12 13h.01",
  book: "M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1m0-16c4-3 8-2 10-1v16c-4-2-7-1-10 1Zm0 0v16",
  journal: "M5 3h15v18H5ZM8 3v18M11 7h6m-6 4h6m-6 4h4M3 7h3m-3 5h3m-3 5h3",
  sprout: "M12 22v-9M12 17C5 17 3 13 3 8c6 0 9 3 9 9Zm0-5c0-6 3-9 9-10 0 6-3 10-9 10Z",
  wheat: "M5 22 17 3M8 17c-5-1-5-5-5-5 4 0 6 2 5 5Zm3-5C6 11 6 7 6 7c4 0 6 2 5 5Zm3-5C10 6 11 2 11 2c4 1 4 3 3 5Zm-6 10c2-4 5-4 7-3-1 4-4 5-7 3Zm3-5c2-4 5-4 7-3-1 4-4 5-7 3Z",
  edit: "m4 16-1 5 5-1L21 7l-4-4ZM14 6l4 4",
  calculator: "M5 2h14v20H5ZM8 5h8v4H8Zm0 8h1m3 0h1m3 0h.01M8 17h1m3 0h1m3 0h.01",
  chevron: "m9 5 7 7-7 7",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  phone: "M7 2h10v20H7Zm4 17h2",
  settings: "m10 2-.6 3-2 .9-2.6-1.3-2 3.4 2.3 2v2l-2.3 2 2 3.4L7.4 16l2 .9.6 3.1h4l.6-3.1 2-.9 2.6 1.4 2-3.4-2.3-2v-2l2.3-2-2-3.4L16.6 6l-2-.9L14 2Zm5 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  dough: "M3 15c0-5 4-9 9-9s9 4 9 9c0 4-18 4-18 0Zm5-4 1-1m5 0 1 1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  evening: "M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14m-10 4h1m4 0h1m-6 3h1",
  arrow: "M4 12h16m-6-6 6 6-6 6",
} as const;
export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
