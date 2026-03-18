import { framer } from "framer-plugin";
import { useState, useEffect } from "react";
import AdminUI from "./AdminUI";
import { SearchIcon } from "./Icons";
import "./App.css";
import vectorsData from "./data/vectors.json";

void framer.showUI({
	position: "top right",
	width: 260,
	height: 400,
});

const isLocalhost =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

type VectorItem = { name: string; svg: string };
const vectors = vectorsData as VectorItem[];

export function App() {
	const [showAdminUI, setShowAdminUI] = useState(false);

	useEffect(() => {
		if (!isLocalhost) {
			void framer.setMenu([]);
			return;
		}
		void framer.setMenu([
			{
				label: showAdminUI ? "Back" : "Admin Menu",
				onAction: () => setShowAdminUI((prev) => !prev),
			},
		]);
	}, [showAdminUI]);

	return isLocalhost && showAdminUI ? <AdminUI /> : <PaymentCardLogosApp />;
}

function PaymentCardLogosApp() {
	const [query, setQuery] = useState("");

	const filteredVectors = vectors.filter((item) => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return item.name.toLowerCase().includes(q);
	});

	return (
		<main className="payment-card-logos">
			<div className="search-header">
				<input
					type="text"
					placeholder="Search…"
					value={query}
					className="search-input"
					onChange={(e) => setQuery(e.target.value)}
				/>
				<div className="search-icon-wrap">
					<SearchIcon />
				</div>
			</div>

			<div className="vectors-grid" role="grid" aria-label="Payment card logos">
				{filteredVectors.map((item) => (
					<div key={item.name} className="vector-tile" role="gridcell" title={item.name}>
						<div
							className="vector-svg"
							dangerouslySetInnerHTML={{
								__html: item.svg,
							}}
						/>
						<div className="vector-name">{item.name}</div>
					</div>
				))}
			</div>
		</main>
	);
}
