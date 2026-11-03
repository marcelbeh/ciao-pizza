import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudWorkspace } from "./CloudWorkspace";
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  verify: vi.fn(),
  session: vi.fn(),
}));
vi.mock("../infrastructure/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: mocks.session,
      signInWithOtp: mocks.send,
      verifyOtp: mocks.verify,
    },
  },
}));
beforeEach(() => {
  vi.stubEnv("VITE_AUTH_MODE", "cloud");
  mocks.session.mockResolvedValue({ data: { session: null }, error: null });
  mocks.send.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ error: null });
  vi.clearAllMocks();
});
describe("private account entry", () => {
  it("opens the local app without requesting authentication", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "local");
    render(
      <CloudWorkspace>
        <div>Lokaler Pizza-Pilot</div>
      </CloudWorkspace>,
    );
    expect(screen.getByText("Lokaler Pizza-Pilot")).toBeInTheDocument();
    expect(
      screen.getByText(/Deine Pläne und Profile bleiben auf diesem Gerät/),
    ).toBeInTheDocument();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Anmeldecode senden" }),
    ).not.toBeInTheDocument();
  });
  it("keeps app contents hidden and verifies the code against the address it was sent to", async () => {
    render(
      <CloudWorkspace>
        <div>Private Teigpläne</div>
      </CloudWorkspace>,
    );
    expect(
      await screen.findByRole("heading", { name: "Deine Pizza. Dein Konto." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Private Teigpläne")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Anmeldecode senden" })
        .closest("form")!,
    );
    const code = await screen.findByLabelText(
      "Anmeldecode für person@example.com",
    );
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "other@example.com" },
    });
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Anmelden" }).closest("form")!,
    );
    await waitFor(() =>
      expect(mocks.verify).toHaveBeenCalledWith({
        email: "person@example.com",
        token: "123456",
        type: "email",
      }),
    );
    expect(mocks.send).toHaveBeenCalledWith({
      email: "person@example.com",
      options: { shouldCreateUser: true },
    });
  });
  it("reports mail-service errors without pretending a code was sent", async () => {
    mocks.send.mockResolvedValue({ error: new Error("SMTP unavailable") });
    render(
      <CloudWorkspace>
        <div>Private Teigpläne</div>
      </CloudWorkspace>,
    );
    fireEvent.change(await screen.findByLabelText("E-Mail-Adresse"), {
      target: { value: "person@example.com" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Anmeldecode senden" })
        .closest("form")!,
    );
    await screen.findByText(/Code konnte nicht angefordert werden/);
    expect(
      screen.queryByRole("button", { name: "Anmelden" }),
    ).not.toBeInTheDocument();
  });
});
