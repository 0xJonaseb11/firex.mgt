import type {
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

interface BaseFieldProps {
	label: string;
	error?: string;
	hint?: string;
	required?: boolean;
}

type InputFieldProps = BaseFieldProps &
	InputHTMLAttributes<HTMLInputElement> & {
		as?: "input";
	};

type TextareaFieldProps = BaseFieldProps &
	TextareaHTMLAttributes<HTMLTextAreaElement> & {
		as: "textarea";
	};

type SelectFieldProps = BaseFieldProps &
	SelectHTMLAttributes<HTMLSelectElement> & {
		as: "select";
		children: ReactNode;
	};

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
	const { label, error, hint, required, id, ...rest } = props;
	const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

	return (
		<div className={`form-field${error ? " form-field--error" : ""}`}>
			<label htmlFor={fieldId} className="form-field__label">
				{label}
				{required ? <span className="form-field__required">*</span> : null}
			</label>
			{props.as === "textarea" ? (
				<textarea
					id={fieldId}
					className="form-field__control"
					aria-invalid={Boolean(error)}
					{...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
				/>
			) : props.as === "select" ? (
				<select
					id={fieldId}
					className="form-field__control"
					aria-invalid={Boolean(error)}
					{...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
				>
					{props.children}
				</select>
			) : (
				<input
					id={fieldId}
					className="form-field__control"
					aria-invalid={Boolean(error)}
					{...(rest as InputHTMLAttributes<HTMLInputElement>)}
				/>
			)}
			{hint && !error ? <p className="form-field__hint">{hint}</p> : null}
			{error ? <p className="form-field__error">{error}</p> : null}
		</div>
	);
}
