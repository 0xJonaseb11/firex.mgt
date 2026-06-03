import { useState, type FormEvent } from "react";
import { changePasswordSchema, updateProfileSchema } from "@repo/contracts";

import { authApi } from "@web/api/auth";
import { ApiError } from "@web/api/client";
import { ErrorAlert } from "@web/components/ErrorAlert";
import { FormField } from "@web/components/FormField";
import { PageHeader } from "@web/components/PageHeader";
import { StatusBadge } from "@web/components/StatusBadge";
import { useAuth } from "@web/contexts/AuthContext";
import { useConfirm } from "@web/contexts/ConfirmContext";
import { useToast } from "@web/contexts/ToastContext";
import { roleLabels } from "@web/lib/labels";
import { zodFieldErrors } from "@web/lib/form-errors";

export function ProfilePage() {
	const { user, refreshUser } = useAuth();
	const { confirm } = useConfirm();
	const toast = useToast();

	const [firstName, setFirstName] = useState(user?.firstName ?? "");
	const [lastName, setLastName] = useState(user?.lastName ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [profileErrors, setProfileErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [profileMessage, setProfileMessage] = useState<string | null>(null);
	const [profileSubmitting, setProfileSubmitting] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [passwordErrors, setPasswordErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
	const [passwordSubmitting, setPasswordSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!user) {
		return null;
	}

	const handleProfileSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setProfileErrors({});
		setProfileMessage(null);
		setError(null);

		const parsed = updateProfileSchema.safeParse({
			firstName: firstName !== user.firstName ? firstName : undefined,
			lastName: lastName !== user.lastName ? lastName : undefined,
			email: email !== user.email ? email : undefined,
		});
		if (!parsed.success) {
			setProfileErrors(zodFieldErrors(parsed.error));
			return;
		}

		setProfileSubmitting(true);
		try {
			await authApi.updateProfile(parsed.data);
			await refreshUser();
			setProfileMessage("Profile updated.");
			toast.success("Profile updated.");
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to update profile.";
			setError(message);
			toast.error(message);
		} finally {
			setProfileSubmitting(false);
		}
	};

	const handlePasswordSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setPasswordErrors({});
		setPasswordMessage(null);
		setError(null);

		const parsed = changePasswordSchema.safeParse({
			currentPassword,
			newPassword,
		});
		if (!parsed.success) {
			setPasswordErrors(zodFieldErrors(parsed.error));
			return;
		}

		const confirmed = await confirm({
			title: "Change password",
			message: "Update your account password?",
			confirmLabel: "Change password",
		});
		if (!confirmed) {
			return;
		}

		setPasswordSubmitting(true);
		try {
			const response = await authApi.changePassword(parsed.data);
			setCurrentPassword("");
			setNewPassword("");
			setPasswordMessage("Password updated.");
			toast.success("Password updated.");
		} catch (err) {
			const message =
				err instanceof ApiError
					? err.message
					: "Unable to change password.";
			setError(message);
			toast.error(message);
		} finally {
			setPasswordSubmitting(false);
		}
	};

	return (
		<div className="page">
			<PageHeader
				title="Profile"
				description="Manage account details and credentials."
			/>
			{error ? <ErrorAlert message={error} onDismiss={() => setError(null)} /> : null}

			<section className="panel profile-summary">
				<p className="detail-label">Role</p>
				<StatusBadge value={user.role} label={roleLabels[user.role]} />
			</section>

			<form className="panel form-stack form-max" onSubmit={handleProfileSubmit} noValidate>
				<h2 className="panel__title">Account details</h2>
				{profileMessage ? (
					<div className="alert alert-success" role="status">
						{profileMessage}
					</div>
				) : null}
				<div className="form-row">
					<FormField
						label="First name"
						name="firstName"
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						error={profileErrors.firstName}
						required
					/>
					<FormField
						label="Last name"
						name="lastName"
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						error={profileErrors.lastName}
						required
					/>
				</div>
				<FormField
					label="Email"
					type="email"
					name="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					error={profileErrors.email}
					required
				/>
				<button type="submit" className="btn btn-primary" disabled={profileSubmitting}>
					{profileSubmitting ? "Saving..." : "Save profile"}
				</button>
			</form>

			<form className="panel form-stack form-max" onSubmit={handlePasswordSubmit} noValidate>
				<h2 className="panel__title">Change password</h2>
				{passwordMessage ? (
					<div className="alert alert-success" role="status">
						{passwordMessage}
					</div>
				) : null}
				<FormField
					label="Current password"
					type="password"
					name="currentPassword"
					autoComplete="current-password"
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
					error={passwordErrors.currentPassword}
					required
				/>
				<FormField
					label="New password"
					type="password"
					name="newPassword"
					autoComplete="new-password"
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
					error={passwordErrors.newPassword}
					required
				/>
				<button type="submit" className="btn btn-primary" disabled={passwordSubmitting}>
					{passwordSubmitting ? "Updating..." : "Update password"}
				</button>
			</form>
		</div>
	);
}
