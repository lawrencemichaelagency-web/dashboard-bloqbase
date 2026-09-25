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
  { key: "name", header: "Nombre", format: "text" },
  { key: "value", header: "Valor", align: "right", format: "number" },
];

describe("SortableTable", () => {
  it("sorts descending by the default column on mount", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKeyField="id" defaultSortIndex={1} defaultSortDesc />
    );
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const firstRowText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(firstRowText).toBe("30");
    const lastRowText = within(bodyRows[bodyRows.length - 1] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(lastRowText).toBe("10");
  });

  it("reorders by column when its header is clicked", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKeyField="id" defaultSortIndex={1} defaultSortDesc />
    );
    const headers = container.querySelectorAll(".bq-th");
    fireEvent.click(headers[0]); // sort by Nombre, defaults to desc on new column
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const firstRowText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[0].textContent;
    expect(firstRowText).toContain("Charlie");
  });

  it("reverses order on a second click of the same header", () => {
    const { container } = render(
      <SortableTable<Row> title="Test" columns={columns} rows={rows} rowKeyField="id" defaultSortIndex={1} defaultSortDesc />
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
      <SortableTable<Row> title="Test" columns={columns} rows={[]} rowKeyField="id" />
    );
    expect(within(container).getByText("Sin filas que mostrar.")).toBeInTheDocument();
  });

  it("shows the fallback ('—' by default) for a null column value", () => {
    type RowWithNull = { id: string; name: string; value: number | null };
    const rowsWithNull: RowWithNull[] = [{ id: "a", name: "Alpha", value: null }];
    const nullColumns: SortableColumn<RowWithNull>[] = [
      { key: "name", header: "Nombre", format: "text" },
      { key: "value", header: "Valor", align: "right", format: "number" },
    ];
    const { container } = render(
      <SortableTable<RowWithNull> title="Test" columns={nullColumns} rows={rowsWithNull} rowKeyField="id" />
    );
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const cellText = within(bodyRows[0] as HTMLElement).getAllByRole("cell")[1].textContent;
    expect(cellText).toBe("—");
  });

  it("formats percent and seconds columns correctly", () => {
    type MetricRow = { id: string; rate: number; duration: number };
    const metricRows: MetricRow[] = [{ id: "a", rate: 0.256, duration: 123.7 }];
    const metricColumns: SortableColumn<MetricRow>[] = [
      { key: "rate", header: "Rate", format: "percent" },
      { key: "duration", header: "Duration", format: "seconds" },
    ];
    const { container } = render(
      <SortableTable<MetricRow> title="Test" columns={metricColumns} rows={metricRows} rowKeyField="id" />
    );
    const bodyRows = container.querySelectorAll(".bq-tbody-row");
    const cells = within(bodyRows[0] as HTMLElement).getAllByRole("cell");
    expect(cells[0].textContent).toBe("25.60%");
    expect(cells[1].textContent).toBe("124s");
  });
});
