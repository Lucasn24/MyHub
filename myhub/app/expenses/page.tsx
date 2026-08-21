import styles from "./page.module.css";

export default async function Expenses() {
    return (
        <div className={styles.page}>
            <h1>Expenses</h1>
            <p>This is the expenses page.</p>
        </div>
    );
}