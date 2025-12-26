import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../services/prisma.service";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private accessTTL() {
    return Number(process.env.ACCESS_TTL_SECONDS ?? 900);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Bad credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Bad credentials");

    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
        expiresIn: this.accessTTL()
      }
    );

    const refreshRaw = crypto.randomBytes(48).toString("hex");
    const refreshHash = sha256(refreshRaw);

    await this.prisma.session.create({
      data: { userId: user.id, refreshHash }
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken: refreshRaw,
      accessTtlSeconds: this.accessTTL()
    };
  }
}
