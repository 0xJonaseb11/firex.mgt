import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import type { UserRole } from "@repo/contracts";

import { ConfirmDialog } from "@web/components/ConfirmDialog";
import { EmailVerificationBanner } from "@web/components/EmailVerificationBanner";
import { useAuth } from "@web/contexts/AuthContext";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { formatUserName, roleLabels } from "@web/lib/labels";

interface NavItem {
	to: string;
	label: string;
	roles?: UserRole[];
}

const navItems: NavItem[] = [
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/notifications", label: "Notifications" },
	{ to: "/extinguishers", label: "Extinguishers" },
	{ to: "/inspections", label: "Inspections" },
	{ to: "/maintenance", label: "Maintenance", roles: ["inspector", "admin"] },
	{ to: "/reports", label: "Reports", roles: ["inspector", "admin"] },
	{ to: "/users", label: "Users", roles: ["admin"] },
	...(import.meta.env.DEV
		? [{ to: "/dev-mail", label: "Dev mail", roles: ["admin"] as UserRole[] }]
		: []),
	{ to: "/profile", label: "Profile" },
];

export function AppLayout() {
	const { user, logout, logoutAll } = useAuth();
	const { confirm } = useConfirm();
	const navigate = useNavigate();
	const location = useLocation();
	const [navOpen, setNavOpen] = useState(false);

	const closeNav = useCallback(() => setNavOpen(false), []);

	useEffect(() => {
		closeNav();
	}, [location.pathname, closeNav]);

	useEffect(() => {
		if (!navOpen) {
			document.body.style.overflow = "";
			return;
		}
		document.body.style.overflow = "hidden";
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				closeNav();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [navOpen, closeNav]);

	if (!user) {
		return null;
	}

	const visibleNav = navItems.filter(
		(item) => !item.roles || item.roles.includes(user.role),
	);

	const handleLogout = async () => {
		const confirmed = await confirm({
			title: "Sign out",
			message: "Are you sure you want to sign out of this session?",
			confirmLabel: "Sign out",
		});
		if (!confirmed) {
			return;
		}
		await logout();
		navigate("/login");
	};

	const handleLogoutAll = async () => {
		const confirmed = await confirm({
			title: "Sign out everywhere",
			message:
				"This will end all active sessions on every device. Continue?",
			confirmLabel: "Sign out all",
			variant: "danger",
		});
		if (!confirmed) {
			return;
		}
		await logoutAll();
		navigate("/login");
	};

	const shellClass = navOpen ? "app-shell app-shell--nav-open" : "app-shell";

	return (
		<div className={shellClass}>
			<header className="mobile-topbar">
				<button
					type="button"
					className={`mobile-topbar__menu btn btn-secondary${navOpen ? " mobile-topbar__menu--open" : ""}`}
					aria-expanded={navOpen}
					aria-controls="app-sidebar"
					onClick={() => setNavOpen((open) => !open)}
				>
					<span className="mobile-topbar__menu-icon" aria-hidden="true" />
					<span className="visually-hidden">
						{navOpen ? "Close menu" : "Open menu"}
					</span>
				</button>
				<div className="mobile-topbar__brand">
					<span className="mobile-topbar__mark">TZW</span>
					<span className="mobile-topbar__title">Fire Safety</span>
				</div>
			</header>

			<button
				type="button"
				className="sidebar-backdrop"
				aria-label="Close menu"
				tabIndex={navOpen ? 0 : -1}
				onClick={closeNav}
			/>

			<aside id="app-sidebar" className="sidebar">
				<div className="sidebar__brand">
					<span className="sidebar__brand-mark">TZW</span>
					<div>
						<p className="sidebar__brand-title">Fire Safety</p>
						<p className="sidebar__brand-subtitle">Management</p>
					</div>
				</div>
				<nav className="sidebar__nav" aria-label="Main navigation">
					{visibleNav.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }: { isActive: boolean }) =>
								isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
							}
							onClick={closeNav}
						>
							{item.label}
						</NavLink>
					))}
				</nav>
				<div className="sidebar__footer">
					<div className="sidebar__user">
						<p className="sidebar__user-name">
							{formatUserName(user.firstName, user.lastName)}
						</p>
						<p className="sidebar__user-role">{roleLabels[user.role]}</p>
					</div>
					<div className="sidebar__actions">
						<button
							type="button"
							className="btn btn-secondary btn-sm btn-block"
							onClick={() => void handleLogout()}
						>
							Sign out
						</button>
						<button
							type="button"
							className="btn btn-ghost btn-sm btn-block"
							onClick={() => void handleLogoutAll()}
						>
							Sign out all
						</button>
					</div>
				</div>
			</aside>

			<main className="main-content">
				<EmailVerificationBanner />
				<div className="main-content__container">
					<Outlet />
				</div>
			</main>
			<ConfirmDialog />
		</div>
	);
}
