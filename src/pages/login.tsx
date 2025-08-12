import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Auth.module.css";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import Header from "../components/Header";
import { KeyRound, Mail, Apple, Facebook, Bot } from "lucide-react"; // Note: Apple, Facebook, Bot are not standard lucide icons, assuming you have custom components for them.

// Placeholder icons for social login
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.712,34.464,44,28.286,44,20C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);
const AppleIcon = () => <Apple />;
const FacebookIcon = () => <Facebook />;
const MicrosoftIcon = () => <Bot />;


export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/check-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (data.exists) {
        setStep("password");
      } else {
        setError("No account found with this email. Please sign up.");
      }
    } catch { // FIX: Removed unused 'err' variable
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to login");
      }
      const data = await res.json();
      login(data.accessToken);
    } catch (err: unknown) { // FIX: Typed error as 'unknown' for type safety
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    alert(`Signing in with ${provider} is not yet implemented.`);
  };

  if (isAuthLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.formWrapper}>
          {step === "password" && (
            <button
              onClick={() => setStep("email")}
              className={styles.backButton}
            >
              <ChevronLeftIcon width={16} height={16} /> Back
            </button>
          )}
          <h1 className={styles.title}>
            {step === "email" ? "Sign In" : "Enter Password"}
          </h1>
          {error && <p className={styles.error}>{error}</p>}

          {step === "email" ? (
            <form onSubmit={handleNext} className={styles.form}>
              <div className={styles.inputGroup}>
                <Mail className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  placeholder=" "
                />
                <label htmlFor="email" className={styles.label}>
                  Email address
                </label>
              </div>
              <button
                type="submit"
                className={`${styles.button} ${
                  isSubmitting ? styles.disabledButton : ""
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Checking..." : "Next"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <p className={styles.emailDisplay}>{email}</p>
              <div className={styles.inputGroup}>
                <KeyRound className={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                  placeholder=" "
                  autoFocus
                />
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
              </div>
              <button
                type="submit"
                className={`${styles.button} ${
                  isSubmitting ? styles.disabledButton : ""
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>
          )}

          <div className={styles.socialDivider}>or sign in with</div>
          <div className={styles.socialGrid}>
            <button
              className={styles.socialButton}
              onClick={() => handleSocialLogin("SSO")}
            >
              <KeyRound /> SSO
            </button>
            <button
              className={styles.socialButton}
              onClick={() => handleSocialLogin("Google")}
            >
              <GoogleIcon /> Google
            </button>
            <button
              className={styles.socialButton}
              onClick={() => handleSocialLogin("Apple")}
            >
              <AppleIcon /> Apple
            </button>
            <button
              className={styles.socialButton}
              onClick={() => handleSocialLogin("Facebook")}
            >
              <FacebookIcon /> Facebook
            </button>
            <button
              className={styles.socialButton}
              onClick={() => handleSocialLogin("Microsoft")}
            >
              <MicrosoftIcon /> Microsoft
            </button>
          </div>
          <p className={styles.linkText}>
            {/* FIX: Escaped apostrophe */}
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.link}>
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}