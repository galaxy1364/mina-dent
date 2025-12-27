import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AuditModule } from "./audit/audit.module";
import { HealthController } from "./health.controller";
import { DashboardModule } from '../dashboard/dashboard.module';
@Module({
  controllers: [HealthController],
  imports: [PrismaModule, AuthModule, UsersModule, AuditModule, DashboardModule],
})
export class AppModule {}

