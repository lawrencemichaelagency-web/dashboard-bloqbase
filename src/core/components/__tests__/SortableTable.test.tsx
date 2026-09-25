import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fireEvent } from "@testing-library/react";
import { SortableTable, type SortableColumn } from "../SortableTable";

type Row = { id: string; name: string; value: number };

const rows: Row[] = [
  { id: "a", name: "Alpha", value: 30 },
  { id: "b", name: "Bravo", value: 10 },
  { id: "c", name: "Charlie", value: 20 },
];

const columns: SortableColumn<Row>[] = [
  { header: "Nombre", render: (row) => row.name, sortValue: (row) => row.name },
  { header: "Valor", align: "right", render: (row) => String(row.value), sortValue: (row) => row.value },
];

describe("SortableTable", () => {
  it("sorts descending by the default column on mount", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKey={(row) => row.id} defaultSortIndex={1} defaultSortDesc />
    );
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const firstRowText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(firstRowText).toBe("30");
    const lastRowText = within(bodyRows[bodyRows.length - 1] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(lastRowText).toBe("10");
  });

  it("reorders by column when its header is clicked", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKey={(row) => row.id} defaultSortIndex={1} defaultSortDesc />
    );
    const headers = container.querySelectorAll(".bq-th");
    fireEvent.click(headers[0]); // sort by Nombre, defaults to desc on new column
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const firstRowText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[0].textContent;
    expect(firstRowText).toContain("Charlie");
  });

  it("reverses order on a second click of the same header", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKey={(row) => row.id} defaultSortIndex={1} defaultSortDesc />
    );
    const headers = container.querySelectorAll(".bq-th");
    // first click on Valor (already sorted desc by default) -> flips to asc
    fireEvent.click(headers[1]);
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const firstRowText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(firstRowText).toBe("10");
  });

  it("shows 'Sin filas que mostrar.' when rows is empty", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={[]} rowKey={(row) => row.id} />
    );
    expect(within(container).getByText("Sin filas que mostrar.")).toBeInTheDocument();
  });
});
