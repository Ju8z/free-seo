import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
	if (typeof document === "undefined") {
		return "light";
	}

	return document.documentElement.dataset.theme === "dark"
		? "dark"
		: "light";
}

export default function useTheme() {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	function toggleTheme() {
		setTheme((currentTheme) => (
			currentTheme === "light" ? "dark" : "light"
		));
	}

	return {
		theme,
		setTheme,
		toggleTheme,
	};
}
