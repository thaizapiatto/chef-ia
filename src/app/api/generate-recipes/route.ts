import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json();

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Nenhum ingrediente fornecido" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave da OpenAI não configurada. Configure nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    // Prompt otimizado para gerar receitas
    const prompt = `Você é um chef especialista. Com base nos seguintes ingredientes disponíveis, crie 3 receitas práticas e deliciosas:

Ingredientes disponíveis: ${ingredients.join(", ")}

IMPORTANTE:
- Crie receitas que usem PRINCIPALMENTE os ingredientes fornecidos
- Pode adicionar ingredientes básicos comuns (sal, pimenta, água, óleo)
- Seja criativo e prático
- Varie entre receitas doces e salgadas quando possível

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "recipes": [
    {
      "name": "Nome da Receita",
      "type": "doce" ou "salgado",
      "ingredients": ["ingrediente 1 com quantidade", "ingrediente 2 com quantidade"],
      "instructions": ["passo 1", "passo 2", "passo 3"],
      "prepTime": "tempo em minutos (ex: 30 min)",
      "calories": número aproximado de calorias,
      "servings": número de porções
    }
  ]
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um chef especialista que cria receitas práticas e deliciosas. Sempre retorne respostas em JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da OpenAI:", errorData);
      return NextResponse.json(
        { error: "Erro ao gerar receitas. Verifique sua chave da OpenAI." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Limpar markdown se houver
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/```\n?/g, "");
    }

    const result = JSON.parse(cleanContent);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao gerar receitas:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar receitas" },
      { status: 500 }
    );
  }
}
