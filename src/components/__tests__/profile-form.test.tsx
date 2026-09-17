import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const updateProfileMock = vi.fn();
vi.mock("@/app/profile/actions", () => ({
  updateProfile: (...args: unknown[]) => updateProfileMock(...args),
}));

const { ProfileForm } = await import("@/components/profile-form");

const baseUser = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  gender: "WOMAN" as const,
  city: "Madrid",
  major: "Computer Science",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ProfileForm", () => {
  test("renders fields pre-filled with the user's data", () => {
    render(<ProfileForm user={baseUser} />);

    expect(screen.getByLabelText("Complete name")).toHaveValue(
      "Ada Lovelace",
    );
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toHaveValue("WOMAN");
    expect(screen.getByLabelText("City")).toHaveValue("Madrid");
    expect(screen.getByLabelText("Major")).toHaveValue("Computer Science");
  });

  test("falls back to empty strings for missing user fields", () => {
    render(
      <ProfileForm
        user={{
          name: null,
          email: "ada@example.com",
          gender: null,
          city: null,
          major: null,
        }}
      />,
    );

    expect(screen.getByLabelText("Complete name")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("Major")).toHaveValue("");
  });

  test("updates controlled fields as the user types", () => {
    render(<ProfileForm user={baseUser} />);

    fireEvent.change(screen.getByLabelText("Complete name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Barcelona" },
    });
    fireEvent.change(screen.getByLabelText("Major"), {
      target: { value: "Mathematics" },
    });

    expect(screen.getByLabelText("Complete name")).toHaveValue(
      "Grace Hopper",
    );
    expect(screen.getByLabelText("City")).toHaveValue("Barcelona");
    expect(screen.getByLabelText("Major")).toHaveValue("Mathematics");
  });

  test("submits the form with the current field values", async () => {
    updateProfileMock.mockResolvedValueOnce({ success: true });
    render(<ProfileForm user={baseUser} />);

    fireEvent.change(screen.getByLabelText("Complete name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.change(screen.getByLabelText("Gender"), {
      target: { value: "NON_BINARY" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalled();
    });
    const formData = updateProfileMock.mock.calls[0][1] as FormData;
    expect(formData.get("name")).toBe("Grace Hopper");
    expect(formData.get("gender")).toBe("NON_BINARY");
    expect(formData.get("city")).toBe("Madrid");
    expect(formData.get("major")).toBe("Computer Science");
  });

  test("disables the submit button and shows saving label while pending", async () => {
    let resolveUpdate: (value: object) => void = () => {};
    updateProfileMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(<ProfileForm user={baseUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();

    resolveUpdate({ success: true });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save profile" }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    updateProfileMock.mockResolvedValueOnce({ error: "Something failed." });
    render(<ProfileForm user={baseUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something failed.",
    );
  });

  test("shows a success message returned from the action", async () => {
    updateProfileMock.mockResolvedValueOnce({ success: true });
    render(<ProfileForm user={baseUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your profile has been updated.",
    );
  });
});
