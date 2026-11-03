import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);
