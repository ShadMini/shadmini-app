import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { Chat } from '@/lib/models/Chat';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: جلب جميع محادثات المستخدم
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
          }

            const client = await clientPromise;
              const db = client.db('shadmini');
                const chats = await db
                    .collection('chats')
                        .find({ userId: session.user.email })
                            .sort({ updatedAt: -1 })
                                .toArray();

                                  return NextResponse.json({
                                      chats: chats.map((chat) => ({
                                            id: chat._id.toString(),
                                                  title: chat.title,
                                                        model: chat.model,
                                                              lastUpdated: chat.updatedAt?.getTime(),
                                                                  })),
                                                                    });
                                                                    }

                                                                    // POST: إنشاء محادثة جديدة
                                                                    export async function POST(req: NextRequest) {
                                                                      const session = await getServerSession(authOptions);
                                                                        if (!session?.user) {
                                                                            return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
                                                                              }

                                                                                const { title, model } = await req.json();
                                                                                  const client = await clientPromise;
                                                                                    const db = client.db('shadmini');

                                                                                      const newChat: Chat = {
                                                                                          userId: session.user.email!,
                                                                                              title: title || 'محادثة جديدة',
                                                                                                  model: model || 'gpt-4o-mini',
                                                                                                      messages: [],
                                                                                                          createdAt: new Date(),
                                                                                                              updatedAt: new Date(),
                                                                                                                };

                                                                                                                  const result = await db.collection('chats').insertOne(newChat);
                                                                                                                    return NextResponse.json({
                                                                                                                        id: result.insertedId.toString(),
                                                                                                                            title: newChat.title,
                                                                                                                                model: newChat.model,
                                                                                                                                    messages: [],
                                                                                                                                        lastUpdated: Date.now(),
                                                                                                                                          });
                                                                                                                                          }