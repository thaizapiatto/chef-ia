import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem fornecida" },
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

    // Converter imagens para base64
    const imagePromises = images.map(async (image) => {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = image.type;
      return `data:${mimeType};base64,${base64}`;
    });

    const base64Images = await Promise.all(imagePromises);

    // Criar mensagens para a API da OpenAI com múltiplas imagens
    const imageContents = base64Images.map((base64Image) => ({
      type: "image_url" as const,
      image_url: {
        url: base64Image,
      },
    }));

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
            content: "Você é um especialista em identificação de alimentos. Analise as imagens fornecidas e identifique TODOS os alimentos visíveis. Retorne APENAS uma lista em formato JSON com os nomes dos ingredientes em português, sem explicações adicionais.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identifique todos os alimentos e ingredientes visíveis nestas imagens. Liste cada ingrediente de forma clara e específica. Retorne APENAS um JSON no formato: {\"ingredients\": [\"ingrediente1\", \"ingrediente2\", ...]}",
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da OpenAI:", errorData);
      return NextResponse.json(
        { error: "Erro ao analisar imagens. Verifique sua chave da OpenAI." },
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

    // Remover duplicatas e normalizar
    const uniqueIngredients = [...new Set(result.ingredients)];

    return NextResponse.json({ ingredients: uniqueIngredients });
  } catch (error) {
    console.error("Erro ao analisar imagens:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar imagens" },
      { status: 500 }
    );
  }
}
