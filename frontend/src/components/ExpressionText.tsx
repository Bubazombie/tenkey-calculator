import { Fragment } from "react";
import type { ExpressionPart } from "../calculator/expression";
import styles from "./ExpressionText.module.css";
import { SquareRootSign } from "./SquareRootSign";
import { VisuallyHidden } from "./VisuallyHidden";

function Part({ part }: { part: ExpressionPart }) {
  switch (part.kind) {
    case "number":
      // Numbers never break across lines; lines break at spaces only.
      return <span className={styles.number}>{part.text}</span>;
    case "squareRoot":
      return (
        <>
          <SquareRootSign />
          <VisuallyHidden>square root of </VisuallyHidden>
        </>
      );
    case "symbol":
      return part.spoken === undefined ? (
        part.text
      ) : (
        <>
          <span aria-hidden="true">{part.text}</span>
          <VisuallyHidden>{part.spoken}</VisuallyHidden>
        </>
      );
    case "word":
      return part.text;
  }
}

/** An expression as it appears on the tape and the display's top line. */
export function ExpressionText({
  parts,
}: {
  parts: readonly ExpressionPart[];
}) {
  return parts.map((part, index) => {
    const afterSquareRoot = parts[index - 1]?.kind === "squareRoot";
    return (
      // Parts never reorder, so the index is a stable key.
      <Fragment key={index}>
        {index > 0 && !afterSquareRoot && " "}
        <Part part={part} />
      </Fragment>
    );
  });
}
