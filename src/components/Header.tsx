import { useAuth } from "@/contexts/AuthContext";
import styles from "../styles/Header.module.css";
import { useRouter } from "next/router";
import Image from 'next/image'; // Import the Next.js Image component
import logo from '../../public/logo.png'; // Import the static image asset
import {
  Home,
  MessageSquare,
  CalendarDays,
  FileText,
  ClipboardPen,
  MoreHorizontal,
  LogOut,
  UserCircle2,
  Bell,
  Search,
} from "lucide-react";
import { KeyboardEvent } from "react";

interface NavItemProps {
  label: string;
  href: string | null;
  Icon: React.ElementType;
}

const NavItem = ({ label, href, Icon }: NavItemProps) => {
  const router = useRouter();
  const isActive = router.pathname === href;

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      alert(`${label} feature is not yet implemented.`);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      handleClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyPress} // Using onKeyDown is slightly more conventional for keyboard events
      className={`${styles.navButton} ${isActive ? styles.active : ""}`}
      aria-current={isActive ? "page" : undefined}
      role="link"
      tabIndex={0} // Ensure the button is focusable
    >
      <Icon className={styles.navIcon} aria-hidden="true" />
      <span className={styles.navText}>{label}</span>
    </button>
  );
};

export default function Header() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className={styles.header}>
      {/* Left Section */}
      <div className={styles.leftSection}>
        {/* FIX: Replaced <img> with the optimized Next.js Image component */}
        <Image
          src={logo}
          alt="Unity Utopia Logo"
          className={styles.logo}
          width={40} // Provide explicit width for layout stability
          height={40} // Provide explicit height for layout stability
          priority // Prioritize loading as it's likely part of the LCP
        />
      </div>

      {/* Center Section */}
      <nav className={styles.centerSection} aria-label="Main navigation">
        <NavItem label="Home" href="/" Icon={Home} />
        {/* Note: In Zoom, "Meetings" and "Scheduler" are often related. We'll use "Scheduler". */}
        <NavItem label="Team Chat" href={null} Icon={MessageSquare} />
        <NavItem label="Scheduler" href={null} Icon={CalendarDays} />
        <NavItem label="Docs" href={null} Icon={FileText} />
        <NavItem label="Whiteboards" href={null} Icon={ClipboardPen} />
        <NavItem label="More" href={null} Icon={MoreHorizontal} />
      </nav>

      {/* Right Section */}
      <div className={styles.rightSection}>
        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search"
            className={styles.searchInput}
          />
        </div>

        {!isLoading && user && (
          <>
            <button className={styles.iconButton} title="Notifications">
              <Bell />
            </button>
            <div className={styles.userMenu}>
              <button className={styles.userButton} title="My Account">
                <UserCircle2 className={styles.userIcon} />
                <span>{user.name}</span>
              </button>
              <button
                onClick={logout}
                className={styles.logoutButton}
                title="Logout"
              >
                <LogOut />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}