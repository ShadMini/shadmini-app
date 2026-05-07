import { NextRequest, NextResponse } from 'next/server';

const MODELS_LIBRARY: Record<string, any> = {
  'gpt-4o-mini': {
    provider: 'github',
    modelId: 'gpt-4o-mini',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '⚡ عام | مساعد سريع',
  },
  'deepseek-r1': {
    provider: 'github',
    modelId: 'DeepSeek-R1',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '🧠 منطق | تحليل عميق',
  },
  'Llama-3.3-70B-Instruct': {
    provider: 'github',
    modelId: 'Llama-3.3-70B-Instruct',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '🦙 باك-إند | كود إبداعي',
  },
  'Mistral-Large-2411': {
    provider: 'github',
    modelId: 'Mistral-Large-2411',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '🌪️ ديف أوبس | متقدم',
  },
  'Phi-4': {
    provider: 'github',
    modelId: 'Phi-4',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '🔬 علوم | دقيق',
  },
  'Codestral-2501': {
    provider: 'github',
    modelId: 'Codestral-2501',
    endpoint: 'https://models.inference.ai.azure.com/chat/completions',
    auth: () => \`Bearer \${process.env.GITHUB_TOKEN}\`,
    description: '💻 فول-ستاك | تطوير',
  },
};

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'gpt-4o-mini' } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'الرجاء إرسال سجل المحادثة' }, { status: 400 });
    }
    const modelConfig = MODELS_LIBRARY[model];
    if (!modelConfig) {
      return NextResponse.json({ error: \`نموذج غير مدعوم: \${model}\` }, { status: 400 });
    }
    const response = await fetch(modelConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: modelConfig.auth(),
      },
      body: JSON.stringify({
        model: modelConfig.modelId,
        messages: messages,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(\`API Error \${response.status}: \${errorText}\`);
    }
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return NextResponse.json({ result: data.choices[0].message.content });
    } else if (data.error) {
      throw new Error(data.error.message || 'خطأ من الخادم');
    } else {
      throw new Error('لم يتم استلام رد صحيح');
    }
  } catch (error: any) {
    console.error('خطأ في الخادم الوسيط:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
