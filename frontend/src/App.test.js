import { render, screen } from "@testing-library/react";
import BulkDeleteConfirmation from "./components/table/BulkDeleteConfirmation";
import { filterDashboardRecords } from "./utils/dashboardResultFilters";

test("bulk delete modal uses singular lead wording", () => {
  render(
    <BulkDeleteConfirmation
      count={1}
      entityLabel="leads"
      onCancel={() => {}}
      onConfirm={() => {}}
    />
  );

  expect(screen.getByText("Delete selected lead?")).toBeInTheDocument();
});

test("bulk delete modal uses plural call log wording", () => {
  render(
    <BulkDeleteConfirmation
      count={3}
      entityLabel="call logs"
      onCancel={() => {}}
      onConfirm={() => {}}
    />
  );

  expect(screen.getByText("Delete 3 selected call logs?")).toBeInTheDocument();
});

test("dashboard filters return canonical new, booked, and drop-off leads", () => {
  const leads = [
    { id:1, status:"New" },
    { id:2, status:"fresh_lead" },
    { id:3, status:"Booked" },
    { id:4, status:"Unqualified" },
  ];

  expect(filterDashboardRecords("new-leads", { leads }).map((lead) => lead.id)).toEqual([1]);
  expect(filterDashboardRecords("booked-leads", { leads }).map((lead) => lead.id)).toEqual([3]);
  expect(filterDashboardRecords("drop-off-leads", { leads }).map((lead) => lead.id)).toEqual([4]);
});

test("dashboard filters return active tasks and overdue activity", () => {
  const tasks = [
    { id:1, status:"Open", dueDate:"2026-01-01T00:00:00.000Z" },
    { id:2, status:"Completed", dueDate:"2026-01-01T00:00:00.000Z" },
  ];

  expect(filterDashboardRecords("active-tasks", { tasks }).map((task) => task.id)).toEqual([1]);
  expect(filterDashboardRecords("mfa", { tasks }).map((task) => task.id)).toEqual([1]);
});
