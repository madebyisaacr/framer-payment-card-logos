import { framer, isVectorSetItemNode, isFrameNode } from "framer-plugin";
import { copyToClipboard } from "./utils";
import { useState } from "react";
import vectorsData from "./data/vectors.json";

const VECTOR_SET_NAME = "Payment Card Logos";

export default function AdminUI() {
	const [isLoading, setIsLoading] = useState(false);

	const onCopyAll = async () => {
		setIsLoading(true);

		const vectorSets = await framer.getNodesWithType("VectorSetNode");

		const vectorSet = vectorSets.find((vectorSet) => vectorSet.name === VECTOR_SET_NAME);
		const vectorSetItems = (await vectorSet?.getChildren())?.filter(isVectorSetItemNode);

		const componentInstances = await framer.getNodesWithType("ComponentInstanceNode");
		const componentInstancesByName = {};
		for (const componentInstance of componentInstances) {
			componentInstancesByName[componentInstance.name] = componentInstance;
		}

		const pages = await framer.getNodesWithType("WebPageNode");
		console.log(pages);
		const homePage = pages.find((page) => page.path === "/");
		const homePageChildren = await homePage?.getChildren();
		const primaryBreakpoint = homePageChildren?.find(
			(child) => isFrameNode(child) && child.isPrimaryBreakpoint
		);
		const primaryBreakpointChildren = await primaryBreakpoint?.getChildren();
		const colorsNode = primaryBreakpointChildren?.find(
			(child) => isFrameNode(child) && child.name === "Colors"
		);
		const colorFrames = await colorsNode?.getChildren();
		const colorsByName = {};
		if (Array.isArray(colorFrames)) {
			for (const colorFrame of colorFrames.filter(isFrameNode)) {
				if (colorFrame.backgroundColor && typeof colorFrame.backgroundColor === "string") {
					colorsByName[colorFrame.name] = rgbToHex(colorFrame.backgroundColor);
				}
			}
		}

		if (Array.isArray(vectorSetItems)) {
			const result = [];

			for (const vectorSetItem of vectorSetItems) {
				const svg = await vectorSetItem.getSVG();
				if (!svg) continue;

				const componentInstance = componentInstancesByName[vectorSetItem.name];
				let componentUrl = componentInstance ? componentInstance.insertURL : null;

				if (typeof componentUrl === "string") {
					componentUrl = componentUrl.replace(/@.*$/, "");
				}

				result.push({
					name: vectorSetItem.name,
					svg,
					componentUrl,
					color: colorsByName[vectorSetItem.name] || null,
				});
			}

			const success = await copyToClipboard(JSON.stringify(result, null, 2));
			if (success) {
				framer.notify("All vectors copied to clipboard", { variant: "success" });
			} else {
				framer.notify("Failed to copy all vectors to clipboard", { variant: "error" });
			}
		}

		setIsLoading(false);
	};

	const onInsertFramesClick = async () => {
		const selection = await framer.getSelection();
		const selectedFrame = selection.length === 1 && isFrameNode(selection[0]) ? selection[0] : null;
		if (selectedFrame) {
			for (const vector of vectorsData) {
				framer.createFrameNode(
					{
						name: vector.name,
						width: "50px",
						height: "32px",
					},
					selectedFrame.id
				);
			}
		}
	};

	return (
		<main className="admin-ui">
			<button onClick={onCopyAll}>
				{isLoading ? <div className="framer-spinner" /> : "Copy Vectors"}
			</button>
			<button onClick={onInsertFramesClick}>Insert Frames</button>
		</main>
	);
}

function rgbToHex(rgb: string): string {
	// Match rgba or rgb strings
	const match = rgb
		.replace(/\s+/g, "")
		.match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,(0|1|0?\.\d+))?\)$/i);
	if (!match) return rgb; // fallback: return input if format unknown

	const r = parseInt(match[1], 10);
	const g = parseInt(match[2], 10);
	const b = parseInt(match[3], 10);

	// Limit to 0-255
	const toHex = (v: number) => {
		const hex = Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
		return hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
