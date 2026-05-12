import { createFileRoute } from "@tanstack/react-router";
import ChemistryGame from "@/components/ChemistryGame";

export const Route = createFileRoute("/")({
  component: () => <ChemistryGame />,
});
