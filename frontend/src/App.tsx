import styles from "./App.module.css";
import { Machine } from "./components/Machine";
import { fixtureFromSearch } from "./fixtures/fixtures";

export function App() {
  // Static stage: the machine shows a fixture picked with ?fixture=name.
  const view = fixtureFromSearch(window.location.search);
  return (
    <main className={styles.page}>
      <Machine view={view} />
    </main>
  );
}
