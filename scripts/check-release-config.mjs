if (process.env.VITE_AUTH_MODE === "local") {
  console.log(
    "Lokaler Live-Modus: keine Anmeldung und keine Cloud-Zugangsdaten erforderlich.",
  );
} else {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (
    url !== "https://jhweepsclnottxqgppqf.supabase.co" ||
    !key?.startsWith("sb_publishable_")
  ) {
    console.error(
      "Release gestoppt: VITE_SUPABASE_URL und ein öffentlicher VITE_SUPABASE_PUBLISHABLE_KEY für ciao-pizza müssen in GitHub Actions Variables oder Secrets gesetzt sein.",
    );
    process.exit(1);
  }
  console.log("Öffentliche Supabase-Releasekonfiguration vorhanden.");
}
