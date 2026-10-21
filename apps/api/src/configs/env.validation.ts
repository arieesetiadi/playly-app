import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  IsOptional,
  validateSync,
} from "class-validator";
import { plainToInstance, Transform } from "class-transformer";

enum NodeEnvironment {
  Local = "local",
  Development = "development",
  Test = "test",
  Production = "production",
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsNotEmpty()
  NODE_ENV: NodeEnvironment;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 4000))
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  TIMEZONE: string = "Asia/Jakarta";

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  BETTER_AUTH_SECRET: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  BETTER_AUTH_URL: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  FRONTEND_BASE_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
