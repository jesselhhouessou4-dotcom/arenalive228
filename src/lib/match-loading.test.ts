import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("./match.functions", () => ({ getPublicMatch: vi.fn() }));
import { getPublicMatch } from "./match.functions";
import { matchQuery } from "./queries";

describe("Match loading", () => {
  const id = "a3000000-0000-0000-0000-000000000001";
  it("loads the requested match into the cache used by the page", async () => {
    vi.mocked(getPublicMatch).mockResolvedValue(null);
    const client = new QueryClient();
    await client.ensureQueryData(matchQuery(id));
    expect(getPublicMatch).toHaveBeenCalledWith({ data: { id } });
    expect(client.getQueryData(["match", id])).toBeNull();
  });
  it("exposes a failed read and allows a fresh attempt", async () => {
    vi.mocked(getPublicMatch).mockRejectedValueOnce(new Error("Connexion interrompue")).mockResolvedValueOnce(null);
    const client = new QueryClient();
    await expect(client.ensureQueryData(matchQuery(id))).rejects.toThrow("Connexion interrompue");
    expect(client.getQueryState(["match", id])?.status).toBe("error");
    await expect(client.ensureQueryData(matchQuery(id))).resolves.toBeNull();
  });
});