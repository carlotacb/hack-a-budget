import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { getRoleSettings } from "@/lib/role-settings";

const saveMetadataMock = vi.fn();
vi.mock("@/app/organizer/settings/actions", () => ({
  saveMetadata: (...args: unknown[]) => saveMetadataMock(...args),
}));

const { RoleSettingsFields } = await import(
  "@/components/role-settings-fields"
);
const { RoleSettingsForm } = await import("@/components/role-settings-form");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

function renderFields(settings?: unknown) {
  const { container } = render(
    <form>
      <RoleSettingsFields
        initialSettings={settings ? getRoleSettings(settings) : undefined}
      />
    </form>,
  );
  const form = container.querySelector("form")!;
  return () => new FormData(form);
}

describe("RoleSettingsFields", () => {
  test("always shows Admin (fixed) and Participant (renamable)", () => {
    renderFields();

    const names = screen.getAllByLabelText("Role name");
    expect(names[0]).toHaveValue("Admin");
    expect(names[0]).toBeDisabled();
    expect(names[1]).toHaveValue("Participant");
    expect(names[1]).toBeEnabled();
  });

  test("locks the admin's permissions", () => {
    renderFields();

    const adminSeeBudget = document.querySelector(
      'input[name="role:ADMIN:permission:seeBudget"]',
    );
    expect(adminSeeBudget).toBeChecked();
    expect(adminSeeBudget).toBeDisabled();
    expect(screen.getAllByText("(soon)").length).toBeGreaterThan(0);
  });

  test("only renders the optional roles that are enabled", () => {
    const values = renderFields({
      roles: {
        ORGANIZER: { enabled: true },
        ORGANIZER_LEAD: { enabled: false },
        DIRECTOR: { enabled: false },
      },
    });

    expect(values().get("role:ORGANIZER:enabled")).toBe("on");
    expect(values().get("role:DIRECTOR:enabled")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Organizer" }),
    ).toBeInTheDocument();
  });

  test("adds and removes optional roles", () => {
    const values = renderFields({
      roles: {
        ORGANIZER: { enabled: false },
        ORGANIZER_LEAD: { enabled: false },
        DIRECTOR: { enabled: false },
      },
    });

    fireEvent.change(screen.getByLabelText("Add a role"), {
      target: { value: "DIRECTOR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(values().get("role:DIRECTOR:enabled")).toBe("on");
    expect(screen.getByLabelText("Add a role")).toHaveValue("ORGANIZER");

    fireEvent.click(screen.getByRole("button", { name: "Remove Director" }));

    expect(values().get("role:DIRECTOR:enabled")).toBeNull();
  });

  test("hides the add row once every role is added", () => {
    renderFields();

    expect(screen.queryByLabelText("Add a role")).not.toBeInTheDocument();
  });

  test("explains department scoping when a role is tied to a department", () => {
    renderFields({ roles: { ORGANIZER: { enabled: true } } });

    const checkbox = document.querySelector(
      'input[name="role:ORGANIZER:requiresDepartment"]',
    )!;
    expect(
      screen.queryByText(/pick one of the hackathon/),
    ).not.toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(screen.getByText(/pick one of the hackathon/)).toBeInTheDocument();
  });
});

describe("RoleSettingsForm", () => {
  test("submits the role settings operation and shows success", async () => {
    saveMetadataMock.mockResolvedValueOnce({ success: true });
    render(<RoleSettingsForm roleSettings={getRoleSettings(null)} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveMetadataMock).toHaveBeenCalled());
    const formData = saveMetadataMock.mock.calls[0][1] as FormData;
    expect(formData.get("operation")).toBe("updateRoleSettings");
    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });

  test("shows an error returned from the action", async () => {
    saveMetadataMock.mockResolvedValueOnce({
      error: "Only admins can edit metadata.",
    });
    render(<RoleSettingsForm roleSettings={getRoleSettings(null)} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only admins can edit metadata.",
    );
  });
});
