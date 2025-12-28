import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

type LoginBodyDto = {
  email: string;
  password: string;
};

// حداقلِ امن برای user؛ اگر AuthService/JWT شما فیلدهای بیشتری دارد، همینجا توسعه بده.
type JwtUser = {
  sub?: string;
  id?: string;
  email?: string;
  roles?: string[];
  [k: string]: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getUserFromReq(req: Request): JwtUser | null {
  // passport معمولاً user را روی req می‌گذارد، اما تایپ express آن را تضمین نمی‌کند.
  const u = (req as Request & { user?: unknown }).user;
  return isObject(u) ? (u as JwtUser) : null;
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginBodyDto) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me")
  async me(@Req() req: Request) {
    const user = getUserFromReq(req);
    return { user };
  }
}
