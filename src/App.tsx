import {
	framer,
	Draggable,
	useIsAllowedTo,
	isFrameNode,
	isWebPageNode,
	isComponentNode,
	type CanvasRootNode,
	type FrameNode,
} from "framer-plugin";
import { useEffect, useRef, useState } from "react";
import AdminUI from "./AdminUI";
import { SearchIcon } from "./Icons";
import "./App.css";
import vectorsData from "./data/vectors.json";
import cx from "classnames";

const IS_CANVAS = framer.mode === "canvas";
const IS_LOCALHOST =
	typeof window !== "undefined" &&
	(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const PERMISSION_METHODS = IS_CANVAS
	? ["addSVG", "createFrameNode", "setImage", "addComponentInstance"]
	: ["setImage"];

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

type VectorItem = {
	id: string;
	name: string;
	svg: string;
	componentUrl: string;
	color: string | null;
};
const vectors = vectorsData as VectorItem[];

type InsertAs = "vectorSet" | "svg" | "image";

const INSERT_AS_TITLES = {
	vectorSet: "Vector Set",
	svg: "SVG",
	image: "Image",
};

const INSERT_AS_WIDTH = {
	svg: 60,
	vectorSet: 95,
	image: 70,
};

const INSERT_AS_STORAGE_KEY = "framer-payment-card-logos.insertAs";

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
	const isAllowedToEdit = useIsAllowedTo(
		...(PERMISSION_METHODS as unknown as Parameters<typeof useIsAllowedTo>)
	);

	const [query, setQuery] = useState("");
	const [insertAs, setInsertAs] = useState<InsertAs>(() => {
		try {
			const raw = window.localStorage.getItem(INSERT_AS_STORAGE_KEY);
			if (raw && raw in INSERT_AS_TITLES) return raw as InsertAs;
		} catch {
			// Ignore storage errors (private mode / sandboxed environments).
		}
		return "vectorSet";
	});

	const insertRequestIdRef = useRef(0);
	const [insertingVectorId, setInsertingVectorId] = useState<string | null>(null);

	useEffect(() => {
		try {
			window.localStorage.setItem(INSERT_AS_STORAGE_KEY, insertAs);
		} catch {
			// Ignore storage errors.
		}
	}, [insertAs]);

	const filteredVectors = vectors.filter((item) => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return item.name.toLowerCase().includes(q);
	});

	const onVectorClick = async (item: VectorItem) => {
		if (!isAllowedToEdit) {
			framer.notify("You do not have permissions to edit this project", { variant: "error" });
			return;
		}

		const vectorName = formatVectorName(item.name);
		const requestId = ++insertRequestIdRef.current;
		setInsertingVectorId(item.id);

		try {
			if (!IS_CANVAS) {
				await framer.setImage({
					name: vectorName,
					image: svgToImageDataUrl(item.svg),
					altText: vectorName,
				});
				framer.closePlugin();
			}

			switch (insertAs) {
				case "svg": {
					const [selection, canvasRoot] = await Promise.all([
						framer.getSelection(),
						framer.getCanvasRoot(),
					]);
					const canvasRootChildren = await canvasRoot.getChildren();

					const selectedNodes: (CanvasRootNode | FrameNode)[] = [canvasRoot];

					for (const node of selection) {
						if (isFrameNode(node)) {
							if (selectedNodes.length >= 50) {
								break;
							}
							selectedNodes.push(node);
						}
					}

					const primaryFrame = canvasRootChildren.find(
						(child) => isFrameNode(child) && (child.isPrimaryBreakpoint || child.isPrimaryVariant)
					);
					if (primaryFrame && isFrameNode(primaryFrame)) {
						selectedNodes.push(primaryFrame);
					}

					const beforeUnknownNodeIds: string[] = [];
					const allBeforeChildrenArrays = await Promise.all(
						selectedNodes.map((node) => node.getChildren())
					);
					for (const children of allBeforeChildrenArrays) {
						for (const child of children) {
							if (child["__class"] === "UnknownNode") {
								beforeUnknownNodeIds.push(child.id);
							}
						}
					}

					await framer.addSVG({ svg: item.svg, name: vectorName });

					const afterUnknownNodeIds = [];
					const allAfterChildrenArrays = await Promise.all(
						selectedNodes.map((node) => node.getChildren())
					);
					for (const children of allAfterChildrenArrays) {
						for (const child of children) {
							if (child["__class"] === "UnknownNode") {
								afterUnknownNodeIds.push(child.id);
							}
						}
					}

					const newNodeIds = afterUnknownNodeIds.filter((id) => !beforeUnknownNodeIds.includes(id));

					if (newNodeIds.length > 0) {
						framer.setSelection(newNodeIds);
						framer.zoomIntoView(newNodeIds, {
							maxZoom: 1,
							skipIfVisible: true,
						});
					}
					break;
				}
				case "vectorSet": {
					// `vectors.json` provides the module URL we can use to insert the ComponentInstance.
					const componentUrl = item.componentUrl;
					if (typeof componentUrl !== "string" || !componentUrl) {
						framer.notify(`Missing component URL for ${vectorName}`, { variant: "error" });
						return;
					}

					const parentId = await calculateParentId();

					const componentInstanceNode = await framer.addComponentInstance({ url: componentUrl });
					if (componentInstanceNode) {
						await framer.setParent(componentInstanceNode.id, parentId);
						framer.setSelection([componentInstanceNode.id]);
						await new Promise((resolve) => setTimeout(resolve, 50));
						framer.zoomIntoView(componentInstanceNode.id, {
							maxZoom: 1,
						});
					}
					break;
				}
				case "image": {
					const parentId = await calculateParentId();

					const image = await framer.uploadImage({
						image: svgToImageDataUrl(item.svg),
						altText: vectorName,
					});
					const frame = await framer.createFrameNode(
						{
							name: vectorName,
							width: "50px",
							height: "32px",
							backgroundImage: image,
						},
						parentId
					);
					if (frame) {
						framer.setSelection([frame.id]);
					}
					break;
				}
				default: {
					framer.notify("Unsupported insert as selection", { variant: "error" });
					return;
				}
			}

			framer.notify(`Inserted ${vectorName} card as ${INSERT_AS_TITLES[insertAs] || insertAs}`, {
				variant: "success",
			});
		} finally {
			// Avoid clobbering the state if a second insert was started.
			if (insertRequestIdRef.current === requestId) {
				setInsertingVectorId(null);
			}
		}
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
						autoFocus
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
						style={{ width: INSERT_AS_WIDTH[insertAs] ?? 95 }}
					>
						<option value="" disabled>
							Insert as…
						</option>
						<option value="vectorSet">{INSERT_AS_TITLES.vectorSet}</option>
						<option value="svg">{INSERT_AS_TITLES.svg}</option>
						<option value="image">{INSERT_AS_TITLES.image}</option>
					</select>
				)}
			</div>
			{filteredVectors.length === 0 ? (
				<div className="empty-state">No results for "{query}"</div>
			) : (
				<div
					className={cx("vectors-grid", IS_CANVAS ? "canvas" : "image")}
					role="grid"
					aria-label="Payment card logos"
				>
					{filteredVectors.map((item) => {
						const vectorName = formatVectorName(item.name);
						return (
							<Draggable
								key={item.id}
								data={() => {
									switch (insertAs) {
										case "vectorSet": {
											return {
												type: "componentInstance",
												url: item.componentUrl,
											};
										}
										case "image": {
											return {
												type: "image",
												image: svgToImageDataUrl(item.svg),
												altText: vectorName,
												name: vectorName,
											};
										}
										case "svg":
										default: {
											return {
												type: "svg",
												svg: item.svg,
												invertInDarkMode: false,
											};
										}
									}
								}}
							>
								<div
									key={item.id}
									className={cx("vector-tile", item.color === null && "no-bg-color")}
									role="gridcell"
									title={vectorName}
									onClick={() => {
										if (insertingVectorId === item.id) return;
										onVectorClick(item);
									}}
									style={{
										color: item.color || "var(--framer-color-text)",
									}}
								>
									{item.color && (
										<div className="vector-tile-bg" style={{ backgroundColor: item.color }} />
									)}
									<div
										className={cx(
											"spinner-container",
											insertingVectorId === item.id && "is-visible"
										)}
									>
										<div className="framer-spinner" />
									</div>
									<div
										className={cx(
											"vector-tile-content",
											insertingVectorId === item.id && "is-inserting"
										)}
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
											<span className="vector-name">{vectorName}</span>
										</div>
									</div>
								</div>
							</Draggable>
						);
					})}
				</div>
			)}
		</main>
	);
}

function svgToImageDataUrl(svg: string) {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function calculateParentId() {
	const selection = await framer.getSelection();
	const selectedFrames = selection.filter(isFrameNode);
	let parentId = selectedFrames[0]?.id;

	if (!parentId) {
		const canvasRoot = await framer.getCanvasRoot();
		if (isWebPageNode(canvasRoot)) {
			const children = await canvasRoot.getChildren();
			const primaryBreakpoint = children?.find(
				(child) => isFrameNode(child) && child.isPrimaryBreakpoint
			);

			if (primaryBreakpoint) {
				parentId = primaryBreakpoint.id;
			}
		} else if (isComponentNode(canvasRoot)) {
			const children = await canvasRoot.getChildren();
			const primaryVariant = children?.find(
				(child) => isFrameNode(child) && child.isPrimaryVariant
			);

			if (primaryVariant) {
				parentId = primaryVariant.id;
			}
		}
	}

	return parentId;
}
