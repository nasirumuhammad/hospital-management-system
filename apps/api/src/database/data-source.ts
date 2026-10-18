import "dotenv/config";
import "reflect-metadata";
import { join } from "node:path";
import { DataSource } from "typeorm";

const SOURCE_ROOT = join(__dirname, "..");

export default new DataSource({
  type: "postgres",
  username: "postgres",
  password: "postgres",
  database: "health_system",
  entities: [join(SOURCE_ROOT, "**", "*.entity{.ts,.js}")],
  migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
  synchronize: false,
});
