import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PositionSelect } from "./PositionSelect";

afterEach(cleanup);

describe("PositionSelect", () => {
  it("changes a basketball player's position using only basketball options", () => {
    const change = vi.fn();
    render(<PositionSelect sport="basketball" value={null} onChange={change} label="Poste du joueur" />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Sans poste", "Meneur", "Arrière", "Ailier", "Ailier fort", "Pivot",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "Pivot", exact: true }));
    expect(change).toHaveBeenCalledWith("Pivot");
  });
  it("does not replace a legacy value when the selector is opened", () => {
    const change = vi.fn();
    render(<PositionSelect sport="football" value="GB" onChange={change} label="Poste du joueur" />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(change).not.toHaveBeenCalled();
    expect(screen.queryByRole("option", { name: "GB", exact: true })).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(11);
  });
});