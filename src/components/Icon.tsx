import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm4 5-3 5-5 3 3-5Z",
  dough: "M3 15c0-5 4-9 9-9s9 4 9 9c0 4-18 4-18 0Zm5-4 1-1m5 0 1 1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  book: "M12 6C9 4 5 4 3 5v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Zm0 0v15",
  calendar: "M5 5h14v16H5ZM8 3v4m8-4v4M5 10h14m-10 4h1m4 0h1m-6 3h1",
  bag: "M5 7h14l2 14H3ZM8 8V6a4 4 0 0 1 8 0v2",
  flame:
    "M13 3c2 5-3 5-1 9 2-1 3-3 3-4 6 5 6 13-3 13-8 0-10-8-5-12 0 3 2 4 3 4-2-5 3-6 3-10Z",
  pen: "m4 16 12-12 4 4L8 20H4Zm10-10 4 4M3 22h18",
  heart: "M12 21 3 12C-2 4 8 0 12 7c4-7 14-3 9 5Z",
  academy: "m2 8 10-5 10 5-10 5Zm4 2v7c4 3 8 3 12 0v-7m4-2v9",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
};
export function Icon({
  name,
  className = "",
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.compass} />
    </svg>
  );
}
