import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";

interface User {
  id: string;
  name: string;
  email: string;
}
interface DecodedToken {
  sub: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    // Redirect to login page unless already there
    if (router.pathname !== "/login") {
        router.push("/login");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser({ id: decoded.sub, name: decoded.name, email: decoded.email });
          setToken(storedToken);
        }
      }
    } catch (error) {
      console.error("Invalid token found, logging out.");
      logout();
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    const decoded = jwtDecode<DecodedToken>(newToken);
    setUser({ id: decoded.sub, name: decoded.name, email: decoded.email });
    setToken(newToken);
    router.push("/");
  };

  const value = { user, token, login, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};