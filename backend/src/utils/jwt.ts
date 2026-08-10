import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type Role = "admin" | "mentor" | "intern";

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
