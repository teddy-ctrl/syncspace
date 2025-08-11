import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Auth.module.css";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import Header from "../components/Header";
import { KeyRound, Mail } from "lucide-react";

// Placeholder icons for social login
const GoogleIcon = () => <span>G</span>;
const AppleIcon = () => <span>A</span>;
const FacebookIcon = () => <span>F</span>;
const MicrosoftIcon = () => <span>M</span>;

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
    } catch (err) {
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
    } catch (err: any) {
      setError(err.message);
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
            Don't have an account?{" "}
            <Link href="/register" className={styles.link}>
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
