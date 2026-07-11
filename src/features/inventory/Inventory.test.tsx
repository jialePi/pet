import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Inventory } from "./Inventory";
import type { InventoryItem } from "../../types/domain";

const baseItem = {
  category: "produce",
  unit: "item",
  storageLocation: "fridge",
  purchaseDate: "2026-07-08",
  source: "manual",
  confidence: { name: 1, category: 1, suggestedUseByDate: 1 },
  createdAt: "2026-07-08T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
} satisfies Partial<InventoryItem>;

const items: InventoryItem[] = [
  {
    ...baseItem,
    id: "rice",
    name: "Rice",
    category: "pantry",
    quantity: 1,
    storageLocation: "pantry",
    suggestedUseByDate: "2026-10-01",
    status: "active",
  },
  {
    ...baseItem,
    id: "spinach",
    name: "Spinach",
    quantity: 1,
    unit: "bag",
    suggestedUseByDate: "2026-07-11",
    status: "active",
  },
  {
    ...baseItem,
    id: "yogurt",
    name: "Greek yogurt",
    category: "dairy",
    quantity: 4,
    suggestedUseByDate: "2026-07-13",
    status: "used",
  },
  {
    ...baseItem,
    id: "bread",
    name: "Bread",
    category: "bakery",
    quantity: 1,
    unit: "item",
    storageLocation: "freezer",
    suggestedUseByDate: "2026-07-20",
    status: "frozen",
  },
];

describe("Inventory", () => {
  it("defaults to available items including frozen food", () => {
    renderInventory();

    expect(getInventoryCount()).toHaveTextContent("3 of 4 shown");
    expect(screen.queryByText("Greek yogurt")).not.toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("frozen pause")).toBeInTheDocument();
    expect(screen.queryByText("use soon")).not.toBeInTheDocument();

    const visibleItems = screen.getAllByRole("article");
    expect(within(visibleItems[0]).getByText("Spinach")).toBeInTheDocument();
    expect(screen.getByText("Rice")).toBeInTheDocument();
  });

  it("filters by completed statuses", async () => {
    const user = userEvent.setup();
    renderInventory();

    await user.selectOptions(screen.getByLabelText("Status"), "used");

    expect(getInventoryCount()).toHaveTextContent("1 of 4 shown");
    expect(screen.getByText("Greek yogurt")).toBeInTheDocument();
    expect(screen.queryByText("Spinach")).not.toBeInTheDocument();
  });

  it("sorts visible items by risk", async () => {
    const user = userEvent.setup();
    renderInventory();

    await user.selectOptions(screen.getByLabelText("Sort"), "risk");

    const visibleItems = screen.getAllByRole("article");
    expect(within(visibleItems[0]).getByText("Spinach")).toBeInTheDocument();
    expect(within(visibleItems[1]).getByText("Rice")).toBeInTheDocument();
  });

  it("saves edited item fields", async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn();
    renderInventory({ onUpdateItem });

    const spinach = screen.getByRole("article", {
      name: "Spinach inventory item",
    });
    await user.click(within(spinach).getByRole("button", { name: "Edit" }));
    await user.clear(within(spinach).getByLabelText("Name"));
    await user.type(within(spinach).getByLabelText("Name"), "Baby spinach");
    await user.clear(within(spinach).getByLabelText("Quantity"));
    await user.type(within(spinach).getByLabelText("Quantity"), "2");
    await user.selectOptions(within(spinach).getByLabelText("Storage"), "freezer");
    await user.click(within(spinach).getByRole("button", { name: "Save" }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: "spinach" }),
      expect.objectContaining({
        name: "Baby spinach",
        quantity: 2,
        storageLocation: "freezer",
      }),
    );
  });
});

function renderInventory({
  onUpdateItem = vi.fn(),
  onRecordAction = vi.fn(),
  onClearAll = vi.fn(),
} = {}) {
  render(
    <Inventory
      items={items}
      today="2026-07-10"
      onUpdateItem={onUpdateItem}
      onRecordAction={onRecordAction}
      onClearAll={onClearAll}
    />,
  );
}

function getInventoryCount(): HTMLElement {
  return document.querySelector(".inventory-count") as HTMLElement;
}
