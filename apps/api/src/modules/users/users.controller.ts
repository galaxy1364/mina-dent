import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { Role as Role, Role } from "@prisma/client";

@Controller("users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class UsersController {
  @Get("ping")
  @Roles(Role.MANAGER)
  ping() {
    return { ok: true };
  }
}

