import { Link } from "react-router-dom";
import { Button } from "@fluentui/react-components";
import { EmptyState } from "../components/states";

export function NotFoundPage(): JSX.Element {
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      message="That page doesn't exist in the Portfolio Hub."
      action={
        <Link to="/">
          <Button appearance="primary">Go to Home</Button>
        </Link>
      }
    />
  );
}
