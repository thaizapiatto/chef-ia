import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Helper function to safely parse JSON from AI response
function safeJSONParse(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Raw text:", text);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem fornecida" },
        { status: 400 }
      );
    }

    // Validate API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY não está configurada no ambiente");
      return NextResponse.json(
        { 
          error: "Chave da API OpenAI não configurada.",
          details: "Configure a variável OPENAI_API_KEY nas configurações do projeto."
        },
        { status: 500 }
      );
    }

    // Validate API key format (should start with sk-)
    if (!apiKey.startsWith('sk-')) {
      console.error("❌ OPENAI_API_KEY tem formato inválido (deve começar com 'sk-')");
      return NextResponse.json(
        { 
          error: "Chave da API OpenAI com formato inválido.",
          details: "A chave deve começar com 'sk-'. Verifique se copiou corretamente."
        },
        { status: 500 }
      );
    }

    console.log("✅ OPENAI_API_KEY configurada e com formato válido");

    // Create OpenAI instance
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Analyze images with GPT-4 Vision
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise as imagens fornecidas e identifique TODOS os alimentos/ingredientes visíveis com precisão profissional.
              
              Retorne APENAS um JSON válido (sem markdown, sem explicações) no seguinte formato:
              {
                "ingredients": ["ingrediente1", "ingrediente2", ...]
              }
              
              Regras importantes:
              - Seja específico e detalhado (ex: "tomate maduro", "frango em cubos", "queijo mussarela")
              - Liste TODOS os alimentos visíveis, mesmo os pequenos
              - Identifique o estado/preparo quando relevante (cru, cozido, picado, etc)
              - Inclua temperos e condimentos visíveis
              - Se houver dúvida, inclua como possibilidade
              - Retorne NO MÍNIMO 3 ingredientes`,
            },
            ...images.map((img: string) => ({
              type: "image_url" as const,
              image_url: {
                url: img,
                detail: "high" as const,
              },
            })),
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const ingredientsText = visionResponse.choices[0].message.content || "{}";
    const ingredientsData = safeJSONParse(ingredientsText);
    
    if (!ingredientsData || !Array.isArray(ingredientsData.ingredients)) {
      return NextResponse.json(
        { error: "Não foi possível identificar ingredientes nas imagens. Tente com fotos mais claras." },
        { status: 400 }
      );
    }

    const ingredients = ingredientsData.ingredients;

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "Nenhum ingrediente foi detectado nas imagens. Tente fotografar os alimentos mais de perto." },
        { status: 400 }
      );
    }

    // Generate HEALTHY recipes based on detected ingredients
    const recipesResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um chef renomado especializado em criar receitas SAUDÁVEIS, nutritivas e equilibradas.
          Você deve sugerir receitas que sejam:
          - SAUDÁVEIS e NUTRITIVAS (prioridade máxima)
          - Baixas em açúcar refinado, gorduras saturadas e sódio
          - Ricas em nutrientes, fibras, vitaminas e minerais
          - Balanceadas em macronutrientes (proteínas, carboidratos complexos, gorduras boas)
          - Fáceis de executar para pessoas comuns
          - Deliciosas e bem balanceadas
          - Criativas mas realistas
          - Com instruções claras e objetivas
          - Com informações nutricionais precisas
          
          EVITE: frituras, excesso de açúcar, farinhas refinadas, alimentos ultraprocessados
          PREFIRA: assados, grelhados, cozidos no vapor, ingredientes integrais e naturais
          
          SEMPRE retorne JSON válido sem markdown.`,
        },
        {
          role: "user",
          content: `Com base nestes ingredientes detectados: ${ingredients.join(", ")}
          
          Crie 4 receitas SAUDÁVEIS, VARIADAS e NUTRITIVAS (incluindo opções doces E salgadas quando os ingredientes permitirem).
          
          Retorne APENAS um JSON válido (sem markdown, sem explicações) no seguinte formato:
          {
            "recipes": [
              {
                "name": "Nome Atraente da Receita Saudável",
                "type": "doce" ou "salgado",
                "difficulty": "fácil" ou "médio" ou "difícil",
                "ingredients": ["ingrediente com quantidade precisa", ...],
                "instructions": ["passo detalhado 1", "passo detalhado 2", ...],
                "prepTime": "tempo em minutos (ex: 30 min)",
                "calories": número aproximado de calorias por porção,
                "servings": número de porções,
                "tags": ["tag1", "tag2", "tag3"],
                "nutritionInfo": {
                  "protein": "gramas de proteína",
                  "carbs": "gramas de carboidratos",
                  "fiber": "gramas de fibras",
                  "fat": "gramas de gordura"
                }
              }
            ]
          }
          
          Regras CRÍTICAS:
          1. TODAS as receitas devem ser SAUDÁVEIS e NUTRITIVAS
          2. PRIORIZE usar os ingredientes detectados como base principal
          3. Substitua ingredientes não saudáveis por versões saudáveis (ex: açúcar → mel/tâmaras, farinha branca → integral/aveia)
          4. Evite frituras - prefira assados, grelhados, cozidos
          5. Seja CRIATIVO com combinações saudáveis e saborosas
          6. Calcule calorias de forma REALISTA (considere todos os ingredientes)
          7. Inclua pelo menos 1 receita doce saudável e 2-3 salgadas (se ingredientes permitirem)
          8. Varie a dificuldade: pelo menos 2 fáceis, 1 média
          9. Tags devem incluir benefícios: "saudável", "proteico", "low-carb", "rico em fibras", "antioxidante", "vegetariano"
          10. Instruções devem ser CLARAS e DETALHADAS (mínimo 5 passos)
          11. Nomes das receitas devem ser ATRAENTES e destacar o aspecto saudável
          12. Cada receita deve ser ÚNICA e DIFERENTE das outras
          13. OBRIGATÓRIO: retorne exatamente 4 receitas
          14. Inclua informações nutricionais detalhadas (proteínas, carboidratos, fibras, gorduras)`,
        },
      ],
      max_tokens: 4500,
      temperature: 0.8,
    });

    const recipesText = recipesResponse.choices[0].message.content || "{}";
    const recipesData = safeJSONParse(recipesText);
    
    if (!recipesData || !Array.isArray(recipesData.recipes)) {
      return NextResponse.json(
        { error: "Erro ao gerar receitas. Tente novamente." },
        { status: 500 }
      );
    }

    const recipes = recipesData.recipes;

    // Validate recipe structure
    const validRecipes = recipes.filter((recipe: any) => {
      return (
        recipe.name &&
        recipe.type &&
        Array.isArray(recipe.ingredients) &&
        Array.isArray(recipe.instructions) &&
        recipe.ingredients.length > 0 &&
        recipe.instructions.length > 0
      );
    });

    if (validRecipes.length === 0) {
      return NextResponse.json(
        { error: "Não foi possível gerar receitas válidas. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ingredients,
      recipes: validRecipes,
    });
  } catch (error: any) {
    console.error("❌ Erro ao processar imagens:", error);
    console.error("Detalhes do erro:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type
    });
    
    // Handle specific OpenAI errors
    if (error?.status === 401 || error?.code === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: "Chave da API OpenAI inválida ou expirada.",
          details: "Sua chave OPENAI_API_KEY não está funcionando. Possíveis causas: 1) Chave expirada, 2) Chave incorreta, 3) Sem créditos na conta OpenAI. Gere uma nova chave em https://platform.openai.com/api-keys"
        },
        { status: 401 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: "Limite de requisições atingido",
          details: "Você atingiu o limite de uso da API OpenAI. Isso pode acontecer por:\n\n1. Limite de requisições por minuto excedido (aguarde 1 minuto)\n2. Cota mensal esgotada (verifique seu plano)\n3. Saldo de créditos insuficiente\n\nSoluções:\n• Aguarde alguns instantes e tente novamente\n• Verifique seu uso em: https://platform.openai.com/usage\n• Adicione créditos em: https://platform.openai.com/account/billing"
        },
        { status: 429 }
      );
    }

    if (error?.status === 403) {
      return NextResponse.json(
        { 
          error: "Acesso negado pela OpenAI.",
          details: "Sua conta OpenAI pode estar com problemas de pagamento ou restrições. Verifique em https://platform.openai.com/account/billing"
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Erro ao processar as imagens.",
        details: error?.message || "Erro desconhecido. Tente novamente."
      },
      { status: 500 }
    );
  }
}
