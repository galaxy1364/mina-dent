import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../services/prisma.service";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../users/roles.decorator";
import { RolesGuard } from "../users/roles.guard";
import { Role as Role } from "@prisma/client";

@Controller("audit")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles(Role.MANAGER)
  async list(@Query("take") take?: string) {
    const n = Math.min(Number(take ?? 50), 200);
    const rows = await this.prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: n });
    return { items: rows };
  }
}

