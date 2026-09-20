// The isolated fixture has no Next router. Production still uses next/link.
import type { ComponentProps } from "react";
export default function Link(props: ComponentProps<"a">) {
  return <a {...props} />;
}
