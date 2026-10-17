"use client";

import React from "react";

interface Props {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error(
			"[ErrorBoundary] Caught:",
			error.message,
			info.componentStack,
		);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="p-4 text-center text-gray-500">
						<p>Something went wrong rendering this component.</p>
						<button type="button"
							className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							Try Again
						</button>
					</div>
				)
			);
		}
		return this.props.children;
	}
}
