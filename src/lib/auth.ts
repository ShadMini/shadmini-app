import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "./mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
    session: { strategy: "jwt" },
      providers: [
          GitHub({
                clientId: process.env.AUTH_GITHUB_ID!,
                      clientSecret: process.env.AUTH_GITHUB_SECRET!,
                          }),
                              Google({
                                    clientId: process.env.AUTH_GOOGLE_ID!,
                                          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
                                              }),
                                                  Credentials({
                                                        name: "credentials",
                                                              credentials: {
                                                                      email: { label: "Email", type: "email" },
                                                                              password: { label: "Password", type: "password" }
                                                                                    },
                                                                                          async authorize(credentials) {
                                                                                                  // سنضيف التحقق من كلمة المرور لاحقًا
                                                                                                          return null
                                                                                                                }
                                                                                                                    })
                                                                                                                      ],
                                                                                                                        pages: {
                                                                                                                            signIn: "/login",
                                                                                                                              },
                                                                                                                              })