import { plainToInstance, Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

const MIN_SECRET_LENGTH = 22;
const PLACEHOLDER_PREFIX = "replace_with";
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === "true";

export class EnvironmentVariables {
  @IsIn(["development", "production", "test"])
  NODE_ENV: string = "development";

  @IsIn(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
  LOG_LEVEL: string = "warn";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT: number = 4000;

  @Transform(toBoolean)
  @IsBoolean()
  DATABASE_SSL: boolean = false;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  ACCESS_TOKEN_TTL_SECONDS: number = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 14;

  @IsString()
  WEB_ORIGIN: string = "http://localhost:3000";

  @IsString()
  WEB_URL: string = "http://localhost:3000";

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsIn(["lax", "strict", "none"])
  COOKIE_SAME_SITE: "lax" | "strict" | "none" = "lax";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY?: number;

  @IsOptional()
  @IsString()
  ADMIN_NAME?: string;

  @IsOptional()
  @IsString()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  ADMIN_PASSWORD?: string;

  @Transform(toBoolean) @IsBoolean() REQUIRE_EMAIL_VERIFICATION: boolean =
    false;

  @IsIn(["smtp", "console"])
  MAIL_TRANSPORT: "smtp" | "console" = "console";

  @IsString()
  MAIL_FROM: string = "CarePoint <no-reply@carepoint.local>";

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  SMTP_PORT: number = 587;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @Transform(toBoolean)
  @IsBoolean()
  SMTP_SECURE: boolean = false;
}

function productionProblems(env: EnvironmentVariables): string[] {
  if (env.NODE_ENV !== "production") return [];
  const problems: string[] = [];
  if (env.JWT_SECRET.startsWith(PLACEHOLDER_PREFIX))
    problems.push("JWT_SECRET is still the placeholder value");
  if (env.MAIL_TRANSPORT !== "smtp")
    problems.push('MAIL_TRANSPORT must be "smtp" in production');
  if (env.MAIL_TRANSPORT === "smtp" && !env.SMTP_HOST)
    problems.push("SMTP_HOST is required when MAIL_TRANSPORT=smtp");
  if (!env.WEB_URL.startsWith("https://"))
    problems.push("WEB_URL must use https in production");
  return problems;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  const problems = [
    ...errors.map((error) => Object.values(error.constraints ?? {}).join(", ")),
    ...productionProblems(env),
  ];
  if (problems.length > 0)
    throw new Error(
      `Invalid environment configuration: ${problems.join("; ")}`,
    );
  return env;
}
