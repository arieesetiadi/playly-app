import { Controller, Get } from "@nestjs/common";
import { Public } from "./modules/auth/decorators/public.decorator.js";

@Controller()
export class AppController {
  @Public()
  @Get()
  get(): string {
    return "API is running";
  }
}
