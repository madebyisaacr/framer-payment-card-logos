import { framer, Draggable } from "framer-plugin";
import { useState, useEffect } from "react";
import AdminUI from "./AdminUI";
import { SearchIcon } from "./Icons";
import "./App.css";
import vectorsData from "./data/vectors.json";
import cx from "classnames";

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

type VectorItem = { name: string; svg: string; componentUrl: string; color: string | null };
const vectors = vectorsData as VectorItem[];

type InsertAs = "svg" | "vectorSet" | "image";

const INSERT_AS_TITLES = {
	svg: "SVG",
	vectorSet: "Vector Set",
	image: "Image",
};

function formatVectorName(name: string) {
	// Removes everything in parentheses, e.g. "Apple Pay (Light)" -> "Apple Pay"
	return name.replace(/\s*\([^)]*\)/g, "").trim();
}

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
	const [insertAs, setInsertAs] = useState<InsertAs>("svg");

	const filteredVectors = vectors.filter((item) => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return item.name.toLowerCase().includes(q);
	});

	const onVectorClick = async (item: VectorItem) => {
		const vectorName = formatVectorName(item.name);

		if (!IS_CANVAS) {
			const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
			await framer.setImage({ name: vectorName, image: svgDataUrl, altText: vectorName });
			framer.closePlugin();
			return;
		}

		switch (insertAs) {
			case "svg": {
				await framer.addSVG({ svg: item.svg });
				break;
			}
			case "vectorSet": {
				// `vectors.json` provides the module URL we can use to insert the ComponentInstance.
				const componentUrl = item.componentUrl;
				if (typeof componentUrl !== "string" || !componentUrl) {
					framer.notify(`Missing component URL for ${vectorName}`, { variant: "error" });
					return;
				}
				await framer.addComponentInstance({ url: componentUrl });
				break;
			}
			case "image": {
				const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
				await framer.addImage({ name: vectorName, image: svgDataUrl, altText: vectorName });
				break;
			}
			default: {
				framer.notify("Unsupported insert as selection", { variant: "error" });
				return;
			}
		}

		framer.notify(`Inserted ${vectorName} as ${INSERT_AS_TITLES[insertAs] || insertAs}`, {
			variant: "success",
		});
	};

	return (
		<main className="payment-card-logos">
			<div className="toolbar">
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
				{IS_CANVAS && (
					<select
						className="insert-type-dropdown"
						value={insertAs}
						onChange={(e) => setInsertAs(e.target.value as InsertAs)}
					>
						<option value="" disabled>
							Insert as…
						</option>
						<option value="svg">{INSERT_AS_TITLES.svg}</option>
						<option value="vectorSet">{INSERT_AS_TITLES.vectorSet}</option>
						<option value="image">{INSERT_AS_TITLES.image}</option>
					</select>
				)}
			</div>
			<div
				className={cx("vectors-grid", IS_CANVAS ? "canvas" : "image")}
				role="grid"
				aria-label="Payment card logos"
			>
				{filteredVectors.map((item) => {
					const displayName = formatVectorName(item.name);
					return (
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
								className={cx("vector-tile", item.color === null && "no-bg-color")}
								role="gridcell"
								title={displayName}
								onClick={() => {
									onVectorClick(item);
								}}
								style={{
									color: item.color || "var(--framer-color-text)",
								}}
							>
								{item.color && (
									<div className="vector-tile-bg" style={{ backgroundColor: item.color }} />
								)}
								<div className="vector-svg-container">
									<div
										className="vector-svg"
										dangerouslySetInnerHTML={{
											__html: item.svg,
										}}
									/>
								</div>
								<div className="vector-name-container">
									<span className="vector-name">{displayName}</span>
								</div>
							</div>
						</Draggable>
					);
				})}
			</div>
		</main>
	);
}
