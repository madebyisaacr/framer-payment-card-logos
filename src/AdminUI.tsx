import { framer, isVectorSetItemNode } from "framer-plugin";
import { copyToClipboard } from "./utils";
import { useState } from "react";

const VECTOR_SET_NAME = "Payment Card Logos";

export default function AdminUI() {
	const [isLoading, setIsLoading] = useState(false);

	const onCopyAll = async () => {
		setIsLoading(true);

		const vectorSets = await framer.getNodesWithType("VectorSetNode");
    
		const vectorSet = vectorSets.find((vectorSet) => vectorSet.name === VECTOR_SET_NAME);
		const vectorSetItems = (await vectorSet?.getChildren())?.filter(isVectorSetItemNode);

    // console.log(vectorSetItems?.map(v => v.id))

		if (Array.isArray(vectorSetItems)) {
			const result = [];

			for (const vectorSetItem of vectorSetItems) {
				const svg = await vectorSetItem.getSVG();
				if (!svg) continue;

				result.push({ name: vectorSetItem.name, svg });
			}

      // const componentInstances = await framer.getNodesWithType("ComponentInstanceNode");

			const success = await copyToClipboard(JSON.stringify(result, null, 2));
			if (success) {
				framer.notify("All vectors copied to clipboard", { variant: "success" });
			} else {
				framer.notify("Failed to copy all vectors to clipboard", { variant: "error" });
			}
		}

		setIsLoading(false);
	};

	return (
		<main className="admin-ui">
			<button onClick={onCopyAll}>
				{isLoading ? <div className="framer-spinner" /> : "Copy Vectors"}
			</button>
		</main>
	);
}
