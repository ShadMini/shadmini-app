import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET: جلب رسائل محادثة محددة
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
          }

            const client = await clientPromise;
              const db = client.db('shadmini');
                const chat = await db.collection('chats').findOne({
                    _id: new ObjectId(params.id),
                        userId: session.user.email,
                          });

                            if (!chat) {
                                return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });
                                  }

                                    return NextResponse.json({
                                        messages: chat.messages || [],
                                          });
                                          }

                                          // PATCH: تحديث المحادثة (العنوان، النموذج، إضافة رسالة)
                                          export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
                                            const session = await getServerSession(authOptions);
                                              if (!session?.user) {
                                                  return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
                                                    }

                                                      const { title, model, messages } = await req.json();
                                                        const updateData: any = { updatedAt: new Date() };
                                                          if (title) updateData.title = title;
                                                            if (model) updateData.model = model;
                                                              if (messages) updateData.messages = messages;

                                                                const client = await clientPromise;
                                                                  const db = client.db('shadmini');
                                                                    await db.collection('chats').updateOne(
                                                                        { _id: new ObjectId(params.id), userId: session.user.email },
                                                                            { $set: updateData }
                                                                              );

                                                                                return NextResponse.json({ success: true });
                                                                                }

                                                                                // DELETE: حذف محادثة
                                                                                export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
                                                                                  const session = await getServerSession(authOptions);
                                                                                    if (!session?.user) {
                                                                                        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
                                                                                          }

                                                                                            const client = await clientPromise;
                                                                                              const db = client.db('shadmini');
                                                                                                await db.collection('chats').deleteOne({
                                                                                                    _id: new ObjectId(params.id),
                                                                                                        userId: session.user.email,
                                                                                                          });

                                                                                                            return NextResponse.json({ success: true });
                                                                                                            } 