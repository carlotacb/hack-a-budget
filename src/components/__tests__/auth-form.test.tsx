import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const loginMock = vi.fn();
const registerMock = vi.fn();
const loginWithGoogleMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  register: (...args: unknown[]) => registerMock(...args),
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
  test("renders login fields only for login mode", () => {
    render(<AuthForm mode="login" googleEnabled={false} />);

    expect(screen.getByText("Sign in to BudgetHack")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Complete name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Gender")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("City")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Major")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  test("renders additional fields for register mode", () => {
    render(<AuthForm mode="register" googleEnabled={false} />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByLabelText("Complete name")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("Major")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  test("does not render the Google button when googleEnabled is false", () => {
    render(<AuthForm mode="login" googleEnabled={false} />);

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });

  test("renders the Google button when googleEnabled is true", () => {
    render(<AuthForm mode="login" googleEnabled={true} />);

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  test("submits login with the entered email and password", async () => {
    loginMock.mockResolvedValueOnce({});
    render(<AuthForm mode="login" googleEnabled={false} />);

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
    expect(registerMock).not.toHaveBeenCalled();
    const formData = loginMock.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("password")).toBe("password123");
  });

  test("submits register with all fields", async () => {
    registerMock.mockResolvedValueOnce({});
    render(<AuthForm mode="register" googleEnabled={false} />);

    fireEvent.change(screen.getByLabelText("Complete name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Gender"), {
      target: { value: "WOMAN" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Madrid" },
    });
    fireEvent.change(screen.getByLabelText("Major"), {
      target: { value: "Computer Science" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });
    const formData = registerMock.mock.calls[0][1] as FormData;
    expect(formData.get("name")).toBe("Ada Lovelace");
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("gender")).toBe("WOMAN");
    expect(formData.get("city")).toBe("Madrid");
    expect(formData.get("major")).toBe("Computer Science");
  });

  test("disables the submit button and shows the pending label while submitting", async () => {
    let resolveLogin: (value: object) => void = () => {};
    loginMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    render(<AuthForm mode="login" googleEnabled={false} />);

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
    render(<AuthForm mode="login" googleEnabled={false} />);

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

  test("links to the register page from login mode and login page from register mode", () => {
    const { rerender } = render(
      <AuthForm mode="login" googleEnabled={false} />,
    );
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/register");

    rerender(<AuthForm mode="register" googleEnabled={false} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
