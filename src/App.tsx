import { framer, Draggable } from "framer-plugin";
import { useState, useEffect } from "react";
import AdminUI from "./AdminUI";
import { SearchIcon } from "./Icons";
import "./App.css";
import vectorsData from "./data/vectors.json";

const IS_CANVAS = framer.mode === "canvas";
const IS_LOCALHOST =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

void framer.showUI({
	position: "top right",
	width: IS_CANVAS ? 260 : 600,
	minWidth: IS_CANVAS ? 260 : 600,
	maxWidth: 600,
	height: IS_CANVAS ? 450 : 625,
	minHeight: 400,
	maxHeight: 740,
	resizable: IS_CANVAS,
});

type VectorItem = { name: string; svg: string };
const vectors = vectorsData as VectorItem[];

export function App() {
	const [showAdminUI, setShowAdminUI] = useState(false);

	useEffect(() => {
		if (!IS_LOCALHOST) {
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

	return IS_LOCALHOST && showAdminUI ? <AdminUI /> : <PaymentCardLogosApp />;
}

function PaymentCardLogosApp() {
	const [query, setQuery] = useState("");

	const filteredVectors = vectors.filter((item) => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return item.name.toLowerCase().includes(q);
	});

	const onVectorClick = async (item: VectorItem) => {
		await framer.addSVG({ svg: item.svg });

		framer.notify(`Inserted ${item.name}`, { variant: "success" });
	};

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
					<Draggable
						key={item.name}
						data={{
							type: "svg",
							svg: item.svg,
							invertInDarkMode: false,
						}}
					>
						<div
							key={item.name}
							className="vector-tile"
							role="gridcell"
							title={item.name}
							onClick={() => {
								onVectorClick(item);
							}}
						>
							<div className="vector-svg-container">
								<div
									className="vector-svg"
									dangerouslySetInnerHTML={{
										__html: item.svg,
									}}
								/>
							</div>
							<div className="vector-name-container">
								<span className="vector-name">{item.name}</span>
							</div>
						</div>
					</Draggable>
				))}
			</div>
		</main>
	);
}
