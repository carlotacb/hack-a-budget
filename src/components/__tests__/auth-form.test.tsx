import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const loginMock = vi.fn();
const loginWithGoogleMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  loginWithGoogle: (...args: unknown[]) => loginWithGoogleMock(...args),
}));

const { AuthForm } = await import("@/components/auth-form");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AuthForm", () => {
  test("renders the login fields", () => {
    render(<AuthForm googleEnabled={false} />);

    expect(screen.getByText("Sign in to BudgetHack")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  test("does not render the Google button when googleEnabled is false", () => {
    render(<AuthForm googleEnabled={false} />);

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });

  test("renders the Google button when googleEnabled is true", () => {
    render(<AuthForm googleEnabled={true} />);

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  test("submits login with the entered email and password", async () => {
    loginMock.mockResolvedValueOnce({});
    render(<AuthForm googleEnabled={false} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
    });
    const formData = loginMock.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("password")).toBe("password123");
  });

  test("disables the submit button and shows the pending label while submitting", async () => {
    let resolveLogin: (value: object) => void = () => {};
    loginMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    render(<AuthForm googleEnabled={false} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("button", { name: "Please wait..." }),
    ).toBeDisabled();

    resolveLogin({});
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign in" }),
      ).not.toBeDisabled();
    });
  });

  test("shows an error message returned from the action", async () => {
    loginMock.mockResolvedValueOnce({ error: "Invalid credentials." });
    render(<AuthForm googleEnabled={false} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials.",
    );
  });
});
