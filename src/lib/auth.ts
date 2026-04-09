import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { EmployeeRepository } from "@/repositories/employee.repository"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const employee = await EmployeeRepository.findByEmail(credentials.email)
        if (!employee || !employee.passwordHash || !employee.isActive) return null

        const isValid = await bcrypt.compare(credentials.password, employee.passwordHash)
        if (!isValid) return null

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email!,
          role: employee.role,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role.toLowerCase()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.name = token.name as string
        session.user.role = token.role === "user" ? "employee" : token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
