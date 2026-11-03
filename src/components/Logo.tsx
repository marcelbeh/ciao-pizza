export function Logo({
  compact = false,
  dark = false,
}: {
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <img
      className={compact ? "ciao-logo compact" : "ciao-logo"}
      src={`${import.meta.env.BASE_URL}brand/ciao-${compact ? "wordmark" : "logo"}${dark ? "-dark" : ""}.svg`}
      width={420}
      height={compact ? 226 : 266}
      alt="Ciao! – Der Pizzateig-Assistent"
    />
  );
}
