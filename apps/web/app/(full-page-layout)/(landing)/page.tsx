import { ComponentExample } from "@/components/component-example";
import { Nav } from "./nav";
import { Hero } from "./hero";

export default function LandingPage() {
  return (
    <main>
      <Nav/>
      <Hero/>
      <ComponentExample />
    </main>
  );
}
