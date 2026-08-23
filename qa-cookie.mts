import { signIdentitySession } from "./lib/auth/session";
import { SESSION_COOKIE_NAME } from "./lib/auth/constants";
const [sub, email, role] = process.argv.slice(2);
const token = await signIdentitySession({ sub, email, role: role as "user" | "admin" | "superadmin" });
console.log(`${SESSION_COOKIE_NAME}=${token}`);
