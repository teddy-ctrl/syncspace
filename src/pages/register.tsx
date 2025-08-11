import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../components/Header";
import styles from "../styles/Auth.module.css";
import { useAuth } from "../contexts/AuthContext";
import { User, Mail, KeyRound } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to register");
      }
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.formWrapper}>
          <h1 className={styles.title}>Create an Account</h1>

          {success && <p className={styles.success}>{success}</p>}
          {error && <p className={styles.error}>{error}</p>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <User className={styles.inputIcon} />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={styles.input}
                placeholder=" "
              />
              <label htmlFor="name" className={styles.label}>
                Full Name
              </label>
            </div>
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
                Email Address
              </label>
            </div>
            <div className={styles.inputGroup}>
              <KeyRound className={styles.inputIcon} />
              <input
                id="password"
                type="password"
                value={password}
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
                placeholder=" "
              />
              <label htmlFor="password" className={styles.label}>
                Password (6+ characters)
              </label>
            </div>
            <button
              type="submit"
              className={`${styles.button} ${
                isSubmitting ? styles.disabledButton : ""
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className={styles.linkText}>
            Already have an account?{" "}
            <Link href="/login" className={styles.link}>
              Log In
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
