import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { RolesGuard } from "../users/roles.guard";

@Module({
  controllers: [AuditController],
  providers: [RolesGuard]
})
export class AuditModule {}
