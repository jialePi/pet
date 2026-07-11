import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddItems } from "./AddItems";
import type { InventoryItem } from "../../types/domain";

const bananas: InventoryItem = {
  id: "bananas",
  name: "Bananas",
  category: "produce",
  quantity: 6,
  unit: "item",
  storageLocation: "counter",
  purchaseDate: "2026-07-08",
  suggestedUseByDate: "2026-07-12",
  source: "manual",
  confidence: { name: 1, category: 1, suggestedUseByDate: 1 },
  status: "active",
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
};

describe("AddItems", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows purchase guard for duplicate active items before adding", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onNavigate = vi.fn();

    render(
      <AddItems
        items={[bananas]}
        onAdd={onAdd}
        onNavigate={onNavigate}
        onRecordPurchaseDecision={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Bananas");
    await user.click(screen.getByRole("button", { name: "Add checked item" }));

    expect(screen.getByRole("alert")).toHaveTextContent("This could become waste");
    expect(screen.getByRole("alert")).toHaveTextContent("We already have");
    expect(onAdd).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("allows override after purchase guard", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onNavigate = vi.fn();
    const onRecordPurchaseDecision = vi.fn();

    render(
      <AddItems
        items={[bananas]}
        onAdd={onAdd}
        onNavigate={onNavigate}
        onRecordPurchaseDecision={onRecordPurchaseDecision}
      />,
    );

    await user.type(screen.getByLabelText("Name"), "Bananas");
    await user.click(screen.getByRole("button", { name: "Add checked item" }));
    await user.click(screen.getByRole("button", { name: "Buy anyway override" }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bananas" }),
    );
    expect(onRecordPurchaseDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "bought_anyway", itemName: "Bananas" }),
    );
    expect(onNavigate).toHaveBeenCalledWith("dashboard");
  });

  it("adds an edited receipt candidate", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onNavigate = vi.fn();

    render(
      <AddItems
        items={[]}
        onAdd={onAdd}
        onNavigate={onNavigate}
        onRecordPurchaseDecision={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mock receipt/ }));
    const spinachCandidate = screen.getByRole("article", {
      name: "Spinach candidate",
    });

    await user.clear(within(spinachCandidate).getByLabelText("Name"));
    await user.type(within(spinachCandidate).getByLabelText("Name"), "Baby spinach");
    await user.clear(within(spinachCandidate).getByLabelText("Suggested use date"));
    await user.type(within(spinachCandidate).getByLabelText("Suggested use date"), "2026-07-14");
    await user.selectOptions(within(spinachCandidate).getByLabelText("Unit"), "g");
    await user.type(within(spinachCandidate).getByLabelText("Notes"), "5oz package");
    await user.click(
      within(spinachCandidate).getByRole("button", {
        name: "Confirm Spinach candidate",
      }),
    );

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Baby spinach",
        suggestedUseByDate: "2026-07-14",
        unit: "g",
        notes: "5oz package",
      }),
    );
    expect(onNavigate).toHaveBeenCalledWith("dashboard");
  });

  it("batch confirms only active candidates", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onNavigate = vi.fn();

    render(
      <AddItems
        items={[]}
        onAdd={onAdd}
        onNavigate={onNavigate}
        onRecordPurchaseDecision={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mock receipt/ }));
    await user.click(
      within(
        screen.getByRole("article", { name: "Greek yogurt candidate" }),
      ).getByRole("button", { name: "Reject Greek yogurt candidate" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm all active candidates" }),
    );

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Spinach" }));
    expect(onNavigate).toHaveBeenCalledWith("dashboard");
  });

  it("falls back to mock recognition when remote AI is not enabled", async () => {
    const user = userEvent.setup();

    render(
      <AddItems
        items={[]}
        onAdd={vi.fn()}
        onNavigate={vi.fn()}
        onRecordPurchaseDecision={vi.fn()}
      />,
    );

    const file = new File(["fake"], "receipt.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Upload image"), file);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Static QR demo uses stable mock recognition",
    );
    expect(screen.getByRole("heading", { name: "Receipt candidates" })).toBeInTheDocument();
  });

  it("accepts dragged fridge or food photos for mock recognition fallback", async () => {
    render(
      <AddItems
        items={[]}
        onAdd={vi.fn()}
        onNavigate={vi.fn()}
        onRecordPurchaseDecision={vi.fn()}
      />,
    );

    const file = new File(["fake"], "fridge.png", { type: "image/png" });
    fireEvent.drop(screen.getByLabelText("AI image upload dropzone"), {
      dataTransfer: {
        files: [file],
      },
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Static QR demo uses stable mock recognition",
    );
  });
});
